import type { LabModuleId } from "./intrasite/catalog";
import { readLimsSession } from "./limsSession";

export type { LabModuleId };

export const MODULE_STORAGE_IDS: LabModuleId[] = [
  "lab_operations",
  "instrument_integration",
  "connectivity",
  "quality_compliance",
  "billing_revenue",
  "insights",
];

export type ModuleInstanceRef = {
  moduleId: LabModuleId;
  accountId: string;
  instanceId: string;
  labId: string;
  labName: string;
};

export type LabGrouped = {
  instanceId?: string;
  labId?: string;
};

/** Account environment database, matching Intrasite `${client.databaseName}_{env}`. */
export function currentInstanceId(): string {
  try {
    const session = readLimsSession();
    return session?.databaseName || session?.clientName || "demo";
  } catch {
    return "demo";
  }
}

export function currentAccountId(): string {
  try {
    return readLimsSession()?.clientName || "demo";
  } catch {
    return "demo";
  }
}

export function currentLabId(): string {
  try {
    const session = readLimsSession();
    if (session?.labId) return session.labId;
    return labIdFromSite(session?.labName || "");
  } catch {
    return "";
  }
}

export function currentLabName(): string {
  try {
    return readLimsSession()?.labName || "";
  } catch {
    return "";
  }
}

export function moduleInstance(moduleId: LabModuleId): ModuleInstanceRef {
  return {
    moduleId,
    accountId: currentAccountId(),
    instanceId: currentInstanceId(),
    labId: currentLabId(),
    labName: currentLabName(),
  };
}

/** Stable lab group id used on samples, instruments, and module records. */
export function labIdFromSite(site: string): string {
  const trimmed = site.trim().toLowerCase();
  if (!trimmed) return "";
  const slug = trimmed
    .replace(/\s+lab$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `lab-${slug}` : "";
}

/**
 * One localStorage document per (module, account environment, table).
 * Lab groups live inside the document as `labId` on each row.
 */
export function moduleStorageKey(moduleId: LabModuleId, table: string, instanceId = currentInstanceId()): string {
  return `carescope.${moduleId}.v1:${instanceId}:${table}`;
}

export function readJson<T>(key: string, legacyKeys: string[] = []): T | null {
  try {
    const raw = localStorage.getItem(key) ?? legacyKeys.map((item) => localStorage.getItem(item)).find(Boolean) ?? null;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function inLabGroup(record: LabGrouped, labId?: string | null): boolean {
  if (!labId) return true;
  return (record.labId || "") === labId;
}

export function recordsInLabGroup<T extends LabGrouped>(records: T[], labId?: string | null): T[] {
  if (!labId) return records;
  return records.filter((record) => inLabGroup(record, labId));
}

export function withLabGroup<T extends object>(
  record: T,
  labId = currentLabId(),
  instanceId = currentInstanceId(),
): T & { instanceId: string; labId: string } {
  const existing = record as LabGrouped;
  return {
    ...record,
    instanceId: existing.instanceId || instanceId,
    labId: existing.labId || labId,
  };
}
