import { useEffect, useState } from "react";

export type LabMenuView = "overview" | "home" | "testing" | "review" | "release";

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

export type LabButtonId = "scan" | "receive" | "createBatch" | "completeReview" | "viewResults";

export type LabButton = {
  id: LabButtonId;
  label: string;
  enabled: boolean;
  color: string;
  views: LabMenuView[];
};

export type LabOperationsConfig = {
  priorities: string[];
  menu: LabMenuItem[];
  columns: SampleColumn[];
  buttons: LabButton[];
};

const KEY = "carescope.labOperations";
const EVENT = "carescope-lab-ops";

export const DEFAULT_LAB_OPERATIONS: LabOperationsConfig = {
  priorities: ["STAT", "Rush", "Routine"],
  menu: [
    { id: "overview", label: "Overview", view: "overview", enabled: true },
    { id: "home", label: "Home", view: "home", enabled: true },
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
  buttons: [
    { id: "scan", label: "Scan barcode", enabled: true, color: "#ffffff", views: ["home", "testing", "release"] },
    { id: "receive", label: "Receive sample", enabled: true, color: "#1b6ef3", views: ["home", "testing", "release"] },
    { id: "createBatch", label: "Create a batch", enabled: true, color: "#0b1f44", views: ["testing"] },
    { id: "completeReview", label: "Complete Review", enabled: true, color: "#1b6ef3", views: ["review"] },
    { id: "viewResults", label: "View Results", enabled: true, color: "#ffffff", views: ["home", "testing", "review", "release"] },
  ],
};

const BUTTON_IDS = new Set(DEFAULT_LAB_OPERATIONS.buttons.map((button) => button.id));

function mergeButtons(saved: LabButton[] | undefined): LabButton[] {
  const known = (saved ?? []).filter((button) => BUTTON_IDS.has(button.id));
  const seen = new Set(known.map((button) => button.id));
  const missing = DEFAULT_LAB_OPERATIONS.buttons.filter((button) => !seen.has(button.id));
  return [...known, ...missing].map((button) => {
    const fallback = DEFAULT_LAB_OPERATIONS.buttons.find((item) => item.id === button.id)!;
    const color = /^#[0-9a-fA-F]{6}$/.test(button.color) ? button.color : fallback.color;
    return {
      id: button.id,
      label: button.label?.trim() ? button.label : fallback.label,
      enabled: Boolean(button.enabled),
      color,
      views: fallback.views,
    };
  });
}

export function buttonStyle(color: string): { background: string; borderColor: string; color: string } {
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const light = (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  return {
    background: color,
    borderColor: light ? "#c5cfdd" : color,
    color: light ? "#16325c" : "#ffffff",
  };
}

const MENU_VIEWS = new Set(DEFAULT_LAB_OPERATIONS.menu.map((item) => item.view));

function mergeMenu(saved: LabMenuItem[] | undefined): LabMenuItem[] {
  const known = (saved ?? []).filter((item) => MENU_VIEWS.has(item.view));
  const seen = new Set(known.map((item) => item.view));
  const missing = DEFAULT_LAB_OPERATIONS.menu.filter((item) => !seen.has(item.view));
  const overview = missing.filter((item) => item.view === "overview");
  const rest = missing.filter((item) => item.view !== "overview");
  return [...overview, ...known, ...rest];
}

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
  if (view === "overview") return "/app";
  if (view === "home") return "/app/ops/home";
  return `/app/ops/${view}`;
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
      menu: mergeMenu(parsed.menu),
      columns: mergeColumns(parsed.columns),
      buttons: mergeButtons(parsed.buttons),
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
