import { useEffect, useState } from "react";

export type LabMenuView = "home" | "accession" | "testing" | "review" | "release";

export type LabMenuItem = {
  id: string;
  label: string;
  view: LabMenuView;
  enabled: boolean;
};

export type LabOperationsConfig = {
  priorities: string[];
  menu: LabMenuItem[];
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
};

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
    return parsed;
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
