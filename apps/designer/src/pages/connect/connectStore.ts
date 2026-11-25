import { useSyncExternalStore } from "react";
import { currentInstanceId } from "../../storageScope";
import { emitConnectSignal } from "../../connectAutomation/signals";
import {
  catalogInstrument,
  connectorById,
  initialConnectState,
  targetLabel,
  withAppConnection,
  withInstrumentIntegration,
  withAttempt,
  withQuarantine,
  withTokenReplaced,
  withWorkflowDelivery,
  type ConnectState,
} from "./connectModel";

let state: ConnectState = initialConnectState();
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((listener) => listener());
}

function publishChanges(before: ConnectState, after: ConnectState) {
  for (const message of after.messages) {
    if (message.origin === "workflow") continue;
    const previous = before.messages.find((item) => item.id === message.id);
    const channel = after.interfaces.find((item) => item.id === message.interfaceId);
    const signal = {
      instanceId: currentInstanceId(),
      interfaceId: message.interfaceId,
      interfaceKind: channel?.kind ?? "",
      messageId: message.id,
      messageType: message.messageType,
      summary: message.summary,
      payload: message.payload,
    };
    if (!previous) {
      emitConnectSignal({ ...signal, eventType: "message.received" });
      if (channel?.kind === "File") emitConnectSignal({ ...signal, eventType: "file.received" });
      continue;
    }
    if (previous.status === message.status) continue;
    if (message.status === "delivered") {
      emitConnectSignal({ ...signal, eventType: "message.delivered" });
      emitConnectSignal({ ...signal, eventType: "ack.received" });
    }
    if (message.status === "failed") emitConnectSignal({ ...signal, eventType: "message.failed" });
    emitConnectSignal({ ...signal, eventType: "status.changed" });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState() {
  return state;
}

export function useConnect() {
  return useSyncExternalStore(subscribe, getState, getState);
}

function nowLabel() {
  return `${new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} CT`;
}

function updateMessage(id: string, next: (message: ConnectState["messages"][number]) => ConnectState["messages"][number]) {
  const before = state;
  state = {
    ...state,
    selectedId: id,
    messages: state.messages.map((message) => (message.id === id ? next(message) : message)),
  };
  emit();
  publishChanges(before, state);
}

export function selectMessage(id: string) {
  state = { ...state, selectedId: id };
  emit();
}

export function retryMessage(id: string) {
  const at = nowLabel();
  updateMessage(id, (message) => withAttempt(message, at, false));
}

export function replayMessage(id: string) {
  const at = nowLabel();
  updateMessage(id, (message) => withAttempt(message, at, true));
}

export function replaceToken(id: string) {
  const at = nowLabel();
  updateMessage(id, (message) => withTokenReplaced(message, at));
}

export function quarantineFile(id: string) {
  const at = nowLabel();
  updateMessage(id, (message) => withQuarantine(message, at));
}

export function startAppConnection(connectorId: string, account: string) {
  const connector = connectorById(connectorId);
  if (!connector) return;
  const before = state;
  state = withAppConnection(state, connector, account, nowLabel());
  emit();
  publishChanges(before, state);
}

export function startInstrumentIntegration(catalogId: string, site: string, labId: string) {
  const instrument = catalogInstrument(catalogId);
  if (!instrument) return;
  const before = state;
  state = withInstrumentIntegration(state, instrument, site, labId, nowLabel());
  emit();
  publishChanges(before, state);
}

export function recordWorkflowDelivery(input: { interfaceId: string; summary: string; payload: string }): { id: string; delivered: boolean; pending?: string } {
  if (!state.interfaces.some((item) => item.id === input.interfaceId)) {
    return { id: "", delivered: false, pending: "That connection is not in Sequence Connect." };
  }
  const id = `MSG-WF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  state = withWorkflowDelivery(state, { ...input, id, at: nowLabel() });
  emit();
  return { id, delivered: true };
}

export function setTransformTarget(id: string, target: string) {
  const before = state;
  state = {
    ...state,
    transforms: state.transforms.map((row) => (row.id === id ? { ...row, target } : row)),
  };
  if (id === "fhir-spec") {
    state = {
      ...state,
      messages: state.messages.map((message) => {
        if (message.id !== "MSG-24060") return message;
        const mapped = message.mapped.map((row) => (row.source === "specimen.coding" ? { ...row, target: target ? targetLabel(target) : "Unmapped" } : row));
        if (!target) {
          return {
            ...message,
            recoverable: false,
            mapped,
            attention: "specimen.coding has no Sequence field. The rest of the message transformed.",
            action: "Map specimen.coding on the Epic FHIR profile, then retry.",
          };
        }
        return {
          ...message,
          recoverable: true,
          mapped,
          attention: "specimen.coding is mapped. The message is still held until you retry.",
          action: "Retry now. The specimen will be written and the message can deliver.",
        };
      }),
    };
  }
  emit();
  publishChanges(before, state);
}
