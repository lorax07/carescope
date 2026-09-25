import { useEffect, useState } from "react";

export type LabMenuView = "home" | "accession" | "testing" | "review" | "release";

export type LabMenuItem = {
  id: string;
  label: string;
  view: LabMenuView;
  enabled: boolean;
};

export type SampleColumnId =
  | "accessionId"
  | "orderId"
  | "received"
  | "client"
  | "matrix"
  | "tests"
  | "priority"
  | "status"
  | "custody"
  | "site";

export type SampleColumn = {
  id: SampleColumnId;
  label: string;
  enabled: boolean;
};

export type LabOperationsConfig = {
  priorities: string[];
  menu: LabMenuItem[];
  columns: SampleColumn[];
};

const KEY = "carescope.labOperations";
const EVENT = "carescope-lab-ops";

export const DEFAULT_LAB_OPERATIONS: LabOperationsConfig = {
  priorities: ["STAT", "Rush", "Routine"],
  menu: [
    { id: "home", label: "Home", view: "home", enabled: true },
    { id: "accession", label: "Accession", view: "accession", enabled: true },
    { id: "testing", label: "Testing", view: "testing", enabled: true },
    { id: "review", label: "Review", view: "review", enabled: true },
    { id: "release", label: "Release", view: "release", enabled: true },
  ],
  columns: [
    { id: "accessionId", label: "Accession ID", enabled: true },
    { id: "orderId", label: "Order ID", enabled: true },
    { id: "received", label: "Received", enabled: true },
    { id: "client", label: "Client", enabled: true },
    { id: "tests", label: "Tests", enabled: true },
    { id: "priority", label: "Priority", enabled: true },
    { id: "status", label: "Status", enabled: true },
    { id: "custody", label: "Custody", enabled: true },
    { id: "site", label: "Site", enabled: true },
    { id: "matrix", label: "Matrix", enabled: false },
  ],
};

const COLUMN_IDS = new Set(DEFAULT_LAB_OPERATIONS.columns.map((column) => column.id));

function mergeColumns(saved: SampleColumn[] | undefined): SampleColumn[] {
  const known = (saved ?? []).filter((column) => COLUMN_IDS.has(column.id));
  const seen = new Set(known.map((column) => column.id));
  const missing = DEFAULT_LAB_OPERATIONS.columns.filter((column) => !seen.has(column.id));
  return [...known, ...missing].map((column) => ({
    id: column.id,
    label: column.label?.trim() ? column.label : DEFAULT_LAB_OPERATIONS.columns.find((item) => item.id === column.id)!.label,
    enabled: Boolean(column.enabled),
  }));
}

export function labMenuPath(view: LabMenuView): string {
  return view === "home" ? "/app" : `/app/ops/${view}`;
}

export function readLabOperations(): LabOperationsConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LAB_OPERATIONS;
    const parsed = JSON.parse(raw) as LabOperationsConfig;
    if (!Array.isArray(parsed.priorities) || !Array.isArray(parsed.menu)) {
      return DEFAULT_LAB_OPERATIONS;
    }
    return {
      priorities: parsed.priorities,
      menu: parsed.menu,
      columns: mergeColumns(parsed.columns),
    };
  } catch {
    return DEFAULT_LAB_OPERATIONS;
  }
}

export function saveLabOperations(config: LabOperationsConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(EVENT));
}

export function useLabOperations(): LabOperationsConfig {
  const [config, setConfig] = useState(readLabOperations);
  useEffect(() => {
    const sync = () => setConfig(readLabOperations());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return config;
}

export function priorityRank(priority: string, order: string[]): number {
  const index = order.indexOf(priority);
  return index === -1 ? order.length : index;
}
