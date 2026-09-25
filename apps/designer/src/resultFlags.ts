import { useEffect, useState } from "react";

export const FLAG_REASONS = ["Out of limit", "Recheck", "Unexpected"] as const;

export type ResultFlag = { reason: (typeof FLAG_REASONS)[number]; by: string };

const flags = new Map<string, ResultFlag>();
const listeners = new Set<() => void>();

export function resultFlagKey(accessionId: string, analyte: string): string {
  return `${accessionId}:${analyte}`;
}

export function useResultFlags(): Map<string, ResultFlag> {
  const [current, setCurrent] = useState(() => new Map(flags));
  useEffect(() => {
    const sync = () => setCurrent(new Map(flags));
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return current;
}

export function setResultFlag(key: string, flag: ResultFlag | null): void {
  if (flag) flags.set(key, flag);
  else flags.delete(key);
  listeners.forEach((listener) => listener());
}

export function reasonsForSample(accessionId: string, planted: Map<string, ResultFlag>): string[] {
  const prefix = `${accessionId}:`;
  return [...planted.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([, flag]) => flag.reason);
}

export function isSampleFlagged(accessionId: string, planted: Map<string, ResultFlag>): boolean {
  return reasonsForSample(accessionId, planted).length > 0;
}
