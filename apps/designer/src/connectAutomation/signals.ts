import type { ConnectEventType } from "./types";

export type ConnectSignal = {
  instanceId: string;
  interfaceId: string;
  interfaceKind: string;
  messageId: string;
  eventType: ConnectEventType;
  messageType: string;
  summary: string;
  payload: string;
};

const listeners = new Set<(signal: ConnectSignal) => void>();

export function onConnectSignal(listener: (signal: ConnectSignal) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitConnectSignal(signal: ConnectSignal): void {
  for (const listener of listeners) listener(signal);
}
