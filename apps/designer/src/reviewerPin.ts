import { useEffect, useState } from "react";

const KEY = "carescope.reviewer.pin";
const EVENT = "carescope-reviewer-pin";
const PIN_LIFE_MS = 90 * 24 * 60 * 60 * 1000;

type PinRecord = {
  hash: string;
  setAt: string;
};

export type PinState = "missing" | "expired" | "active";

function hashPin(pin: string): string {
  let hash = 0;
  for (const char of pin) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}

function readRecord(): PinRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinRecord;
    if (!parsed.hash || !parsed.setAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function pinState(): PinState {
  const record = readRecord();
  if (!record) return "missing";
  if (Date.now() - new Date(record.setAt).getTime() > PIN_LIFE_MS) return "expired";
  return "active";
}

export function pinExpiresOn(): Date | null {
  const record = readRecord();
  if (!record) return null;
  return new Date(new Date(record.setAt).getTime() + PIN_LIFE_MS);
}

export function saveReviewerPin(pin: string): void {
  const record: PinRecord = { hash: hashPin(pin), setAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(record));
  window.dispatchEvent(new Event(EVENT));
}

export function resetReviewerPin(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function verifyReviewerPin(pin: string): boolean {
  const record = readRecord();
  if (!record || pinState() !== "active") return false;
  return hashPin(pin) === record.hash;
}

export function useReviewerPin(): PinState {
  const [state, setState] = useState(pinState);
  useEffect(() => {
    const sync = () => setState(pinState());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
