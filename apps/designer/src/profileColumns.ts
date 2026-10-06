import { useEffect, useState } from "react";
import { readLimsSession } from "./limsSession";
import type { SampleColumn, SampleColumnId } from "./labOperations";

const EVENT = "carescope-profile-columns";

function keyFor(username: string): string {
  return `carescope.profile.columns.${username}`;
}

function profileName(): string {
  return readLimsSession()?.username || "admin";
}

export function readProfileColumnOrder(username = profileName()): SampleColumnId[] | null {
  try {
    const raw = localStorage.getItem(keyFor(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SampleColumnId[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProfileColumnOrder(order: SampleColumnId[], username = profileName()): void {
  localStorage.setItem(keyFor(username), JSON.stringify(order));
  window.dispatchEvent(new Event(EVENT));
}

export function orderColumns(columns: SampleColumn[], order: SampleColumnId[] | null): SampleColumn[] {
  if (!order?.length) return columns;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...columns].sort((a, b) => {
    const left = rank.get(a.id);
    const right = rank.get(b.id);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left - right;
  });
}

export function useProfileColumns(columns: SampleColumn[]): {
  columns: SampleColumn[];
  visible: SampleColumn[];
  moveColumn: (fromId: SampleColumnId, toId: SampleColumnId) => void;
} {
  const [order, setOrder] = useState<SampleColumnId[] | null>(() => readProfileColumnOrder());
  useEffect(() => {
    const sync = () => setOrder(readProfileColumnOrder());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const arranged = orderColumns(columns, order);
  return {
    columns: arranged,
    visible: arranged.filter((column) => column.enabled && column.label.trim()),
    moveColumn(fromId, toId) {
      if (fromId === toId) return;
      const ids = arranged.map((column) => column.id);
      const from = ids.indexOf(fromId);
      const to = ids.indexOf(toId);
      if (from < 0 || to < 0) return;
      const next = ids.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      saveProfileColumnOrder(next);
      setOrder(next);
    },
  };
}
