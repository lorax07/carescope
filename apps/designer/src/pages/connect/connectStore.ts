import { useSyncExternalStore } from "react";
import {
  initialConnectState,
  targetLabel,
  withAttempt,
  withQuarantine,
  withTokenReplaced,
  type ConnectState,
} from "./connectModel";

let state: ConnectState = initialConnectState();
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((listener) => listener());
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
  state = {
    ...state,
    selectedId: id,
    messages: state.messages.map((message) => (message.id === id ? next(message) : message)),
  };
  emit();
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

export function setTransformTarget(id: string, target: string) {
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
}
