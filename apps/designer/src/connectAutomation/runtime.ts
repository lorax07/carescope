import { useSyncExternalStore } from "react";
import { readLimsSession } from "../limsSession";
import { currentInstanceId } from "../storageScope";
import { recordWorkflowDelivery } from "../pages/connect/connectStore";
import { createEngine, systemClock, type AutomationEngine } from "./engine";
import { onConnectSignal } from "./signals";
import { createAutomationStore, type AutomationStore } from "./store";
import type { AutomationDb } from "./types";

const listeners = new Set<() => void>();
let revision = 0;
let snapshot = "demo:0";

function refreshSnapshot(): void {
  snapshot = `${currentInstanceId()}:${revision}`;
}

function notify(): void {
  revision += 1;
  refreshSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storageKey(instanceId: string): string {
  return `carescope.connect_automation.v1:${instanceId}`;
}

function readDb(instanceId: string): AutomationDb | null {
  try {
    const raw = localStorage.getItem(storageKey(instanceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutomationDb;
    if (!parsed || !Array.isArray(parsed.workflows) || !Array.isArray(parsed.executions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

type Session = { instanceId: string; store: AutomationStore; engine: AutomationEngine };
let session: Session | null = null;

export function automationSession(): Session {
  const instanceId = currentInstanceId();
  if (session?.instanceId === instanceId) return session;
  const actor = readLimsSession()?.displayName || readLimsSession()?.username || "lab user";
  const store = createAutomationStore({
    load: () => readDb(instanceId),
    save: (db) => {
      localStorage.setItem(storageKey(instanceId), JSON.stringify(db));
      notify();
    },
  }, instanceId, actor);
  const engine = createEngine(store, systemClock(), {
    deliver: (input) => recordWorkflowDelivery(input),
  });
  session = { instanceId, store, engine };
  refreshSnapshot();
  return session;
}

export function useAutomation(): Session {
  useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return automationSession();
}

/** Persist connection events and resume due waits while this app is open. */
export function startConnectAutomation(): () => void {
  const stop = onConnectSignal((signal) => {
    const current = automationSession();
    if (signal.instanceId !== current.instanceId) return;
    current.engine.ingest({
      instanceId: current.instanceId,
      interfaceId: signal.interfaceId,
      interfaceKind: signal.interfaceKind,
      messageId: signal.messageId,
      eventType: signal.eventType,
      messageType: signal.messageType,
      summary: signal.summary,
      payload: signal.payload,
      idempotencyKey: `${signal.interfaceId}:${signal.messageId}:${signal.eventType}`,
    });
  });
  automationSession().engine.recover();
  const timer = window.setInterval(() => automationSession().engine.runDueSchedules(), 1000);
  return () => {
    stop();
    window.clearInterval(timer);
  };
}
