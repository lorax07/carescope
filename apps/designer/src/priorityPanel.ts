import { useSyncExternalStore } from "react";

const KEY = "carescope.crm.priorities-pinned";

type Panel = {
  pinned: boolean;
  open: boolean;
  closing: boolean;
  pulse: number;
  arrive: number;
};

function readPinned(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function rememberPinned(pinned: boolean) {
  try {
    sessionStorage.setItem(KEY, pinned ? "1" : "0");
  } catch {
    /* The choice still applies until the page reloads. */
  }
}

let panel: Panel = { pinned: readPinned(), open: false, closing: false, pulse: 0, arrive: 0 };
const listeners = new Set<() => void>();
let closeTimer = 0;

function emit(next: Panel) {
  panel = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePriorityPanel(): Panel {
  return useSyncExternalStore(subscribe, () => panel, () => panel);
}

export function togglePriorityFlyout() {
  if (panel.open) {
    closePriorityFlyout();
    return;
  }
  window.clearTimeout(closeTimer);
  emit({ ...panel, open: true, closing: false });
}

export function closePriorityFlyout() {
  if (!panel.open || panel.closing) return;
  emit({ ...panel, closing: true });
  window.clearTimeout(closeTimer);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  closeTimer = window.setTimeout(() => {
    emit({ ...panel, open: false, closing: false });
  }, reduced ? 0 : 240);
}

export function pinPriorities() {
  window.clearTimeout(closeTimer);
  rememberPinned(true);
  emit({ pinned: true, open: false, closing: false, pulse: panel.pulse, arrive: panel.arrive + 1 });
}

export function unpinPriorities() {
  rememberPinned(false);
  emit({ pinned: false, open: false, closing: false, pulse: panel.pulse, arrive: 0 });
}

export function consumeArrival(): boolean {
  if (panel.arrive === 0) return false;
  panel = { ...panel, arrive: 0 };
  return true;
}

export function pulsePriorities() {
  emit({ ...panel, pulse: panel.pulse + 1 });
}
