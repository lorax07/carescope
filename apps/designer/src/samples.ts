import { useEffect, useState } from "react";
import { currentInstanceId, labIdFromSite, moduleStorageKey, readJson, writeJson } from "./storageScope";

export type SampleStage = "received" | "accessioning" | "processing" | "testing" | "review" | "released";
export type SampleStatus = SampleStage;
export type SampleCondition = "normal" | "on_hold" | "problem" | "cancelled" | "rejected";

export type SampleRecord = {
  /** Primary sample key. Increments on the account each time a sample is logged. */
  sampleId: number;
  accountId: string;
  accountName: string;
  accessionId: string;
  orderId: string;
  received: string;
  client: string;
  matrix: string;
  tests: string;
  status: SampleStatus;
  condition: SampleCondition;
  priority: "STAT" | "Rush" | "Routine";
  custody: string;
  site: string;
  labId: string;
  instanceId: string;
  /** Set when the sample was logged into a batch. Null means it is reviewed alone. */
  batchId: string | null;
};

const STAGES = new Set<SampleStatus>(["received", "accessioning", "processing", "testing", "review", "released"]);
const CONDITIONS = new Set<SampleCondition>(["normal", "on_hold", "problem", "cancelled", "rejected"]);

const ACCOUNT = {
  id: "client-apex",
  name: "Apex Diagnostics",
};

/**
 * Logged samples for one account. Sample ID is assigned by log order across
 * every lab on the account, so East Lab and North Lab share one sequence.
 */
const LOGGED: Omit<SampleRecord, "sampleId" | "labId" | "instanceId">[] = [
  {
    ...ACCOUNT_FIELDS("SCP-20458", "ORD-44071"),
    received: "2026-07-24 09:44",
    client: "Vertex Materials",
    matrix: "Polymer",
    tests: "Identity FTIR",
    status: "processing",
    condition: "on_hold",
    priority: "Rush",
    custody: "Deviation DEV-118",
    site: "East Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20460", "ORD-44041"),
    received: "2026-07-24 11:02",
    client: "Aether Pharma",
    matrix: "Stability pull",
    tests: "Assay, Appearance",
    status: "released",
    condition: "normal",
    priority: "Routine",
    custody: "Archive",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20471", "ORD-44055"),
    received: "2026-07-24 15:10",
    client: "Cascade Nutraceuticals",
    matrix: "Powder",
    tests: "Heavy Metals ICP-MS",
    status: "testing",
    condition: "normal",
    priority: "Routine",
    custody: "Metals lab",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20479", "ORD-44064"),
    received: "2026-07-24 16:55",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Dissolution",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "QA hold",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20485", "ORD-44088"),
    received: "2026-07-25 07:18",
    client: "Helix Biologics",
    matrix: "Drug substance",
    tests: "Potency ELISA",
    status: "received",
    condition: "normal",
    priority: "Rush",
    custody: "Intake rack A",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20488", "ORD-44096", "B-1184"),
    received: "2026-07-25 07:40",
    client: "Northwind Foods",
    matrix: "Raw material",
    tests: "Microbial Limits",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "Micro suite",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20491", "ORD-44102"),
    received: "2026-07-25 08:12",
    client: "Aether Pharma",
    matrix: "Finished product",
    tests: "HPLC Assay, Impurities",
    status: "testing",
    condition: "normal",
    priority: "STAT",
    custody: "Bench 3 · QR verified",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20494", "ORD-44108", "B-1184"),
    received: "2026-07-25 08:40",
    client: "Northwind Foods",
    matrix: "Raw material",
    tests: "Salmonella",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "Micro suite",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20496", "ORD-44115"),
    received: "2026-07-25 09:05",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Uniformity",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "Review bench",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20499", "ORD-44122"),
    received: "2026-07-25 09:22",
    client: "Helix Biologics",
    matrix: "Plasma",
    tests: "Identity FTIR",
    status: "accessioning",
    condition: "normal",
    priority: "Routine",
    custody: "Accession bench",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20501", "ORD-44128"),
    received: "2026-07-25 09:40",
    client: "Cascade Nutraceuticals",
    matrix: "Capsule",
    tests: "Assay",
    status: "testing",
    condition: "problem",
    priority: "Rush",
    custody: "Deviation DEV-221",
    site: "East Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20504", "ORD-44133"),
    received: "2026-07-25 10:05",
    client: "Vertex Materials",
    matrix: "Polymer",
    tests: "Appearance",
    status: "review",
    condition: "cancelled",
    priority: "Routine",
    custody: "Cancelled by client",
    site: "East Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20507", "ORD-44140"),
    received: "2026-07-25 10:18",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Dissolution",
    status: "received",
    condition: "rejected",
    priority: "Routine",
    custody: "Intake reject",
    site: "North Lab",
  },
];

function ACCOUNT_FIELDS(accessionId: string, orderId: string, batchId: string | null = null) {
  return {
    accountId: ACCOUNT.id,
    accountName: ACCOUNT.name,
    accessionId,
    orderId,
    batchId,
  };
}

function withScope(row: Omit<SampleRecord, "sampleId" | "labId" | "instanceId"> & Partial<Pick<SampleRecord, "labId" | "instanceId">>, instanceId: string): Omit<SampleRecord, "sampleId"> {
  return {
    ...row,
    labId: row.labId || labIdFromSite(row.site),
    instanceId: row.instanceId || instanceId,
  };
}

const approvedIds = new Set<string>(["SCP-20479"]);
const approvalListeners = new Set<() => void>();

export function useReviewApprovals(): Set<string> {
  const [ids, setIds] = useState(() => new Set(approvedIds));
  useEffect(() => {
    const sync = () => setIds(new Set(approvedIds));
    approvalListeners.add(sync);
    return () => {
      approvalListeners.delete(sync);
    };
  }, []);
  return ids;
}

export function approveSamples(accessionIds: string[]): void {
  for (const id of accessionIds) approvedIds.add(id);
  approvalListeners.forEach((listener) => listener());
}

export function reviewStatus(sample: SampleRecord, _approved: Set<string>): SampleStatus {
  return sample.status;
}

export function isOnHold(sample: SampleRecord): boolean {
  return sample.condition === "on_hold";
}

export function isStopped(sample: SampleRecord): boolean {
  return sample.condition === "cancelled" || sample.condition === "rejected";
}

export function withAccountSampleIds(
  rows: Array<Omit<SampleRecord, "sampleId" | "labId" | "instanceId"> & Partial<Pick<SampleRecord, "labId" | "instanceId">>>,
): SampleRecord[] {
  const counters = new Map<string, number>();
  return [...rows]
    .sort((a, b) => a.received.localeCompare(b.received) || a.accessionId.localeCompare(b.accessionId))
    .map((row) => {
      const next = (counters.get(row.accountId) ?? 0) + 1;
      counters.set(row.accountId, next);
      return {
        ...row,
        sampleId: next,
        labId: row.labId || labIdFromSite(row.site),
        instanceId: row.instanceId || "demo",
      };
    });
}

const LOGGED_KEY = "carescope.samples.logged";
const sampleListeners = new Set<() => void>();

function migrateStatus(status: string | undefined, condition: string | undefined): { status: SampleStatus; condition: SampleCondition } {
  let nextStatus = status ?? "received";
  let nextCondition = condition ?? "normal";
  if (nextStatus === "hold") {
    nextStatus = "processing";
    if (nextCondition === "normal") nextCondition = "on_hold";
  }
  if (nextStatus === "approval") nextStatus = "review";
  return {
    status: STAGES.has(nextStatus as SampleStatus) ? (nextStatus as SampleStatus) : "received",
    condition: CONDITIONS.has(nextCondition as SampleCondition) ? (nextCondition as SampleCondition) : "normal",
  };
}

function normalizeSample(row: SampleRecord, instanceId = currentInstanceId()): SampleRecord | null {
  if (!row || typeof row.sampleId !== "number" || typeof row.accountId !== "string") return null;
  const migrated = migrateStatus(row.status, row.condition);
  return {
    ...row,
    status: migrated.status,
    condition: migrated.condition,
    labId: row.labId || labIdFromSite(row.site),
    instanceId: row.instanceId || instanceId,
  };
}

const LOGGED_EVENT = "carescope-samples";

function samplesKey(instanceId = currentInstanceId()): string {
  return moduleStorageKey("lab_operations", "samples", instanceId);
}

function readLogged(instanceId = currentInstanceId()): SampleRecord[] {
  const parsed = readJson<SampleRecord[]>(samplesKey(instanceId), [LOGGED_KEY]);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => normalizeSample(row, instanceId)).filter((row): row is SampleRecord => Boolean(row));
}

function seedFor(instanceId: string): SampleRecord[] {
  return withAccountSampleIds(LOGGED.map((row) => withScope(row, instanceId)));
}

const sampleCache = new Map<string, SampleRecord[]>();

function samplesFor(instanceId = currentInstanceId()): SampleRecord[] {
  const cached = sampleCache.get(instanceId);
  if (cached) return cached;
  const loaded = [...seedFor(instanceId), ...readLogged(instanceId)];
  sampleCache.set(instanceId, loaded);
  return loaded;
}

function persistLogged(instanceId: string, rows: SampleRecord[]): void {
  const seeded = new Set(LOGGED.map((row) => row.accessionId));
  writeJson(
    samplesKey(instanceId),
    rows.filter((row) => row.instanceId === instanceId && !seeded.has(row.accessionId)),
  );
}

let samples: SampleRecord[] = samplesFor();

function notifySamples(): void {
  sampleListeners.forEach((listener) => listener());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOGGED_EVENT));
}

function refreshSamples(): SampleRecord[] {
  samples = samplesFor(currentInstanceId());
  return samples;
}

export function useSamples(): SampleRecord[] {
  const [rows, setRows] = useState(() => refreshSamples());
  useEffect(() => {
    const sync = () => setRows(refreshSamples());
    sampleListeners.add(sync);
    window.addEventListener(LOGGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      sampleListeners.delete(sync);
      window.removeEventListener(LOGGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return rows;
}

export function getSamples(): SampleRecord[] {
  return refreshSamples();
}

export const SAMPLE_ACCOUNT = ACCOUNT;

export function nextSampleId(accountId: string): number {
  return refreshSamples().reduce((max, sample) => (sample.accountId === accountId ? Math.max(max, sample.sampleId) : max), 0) + 1;
}

export function nextAccessionId(): string {
  const highest = refreshSamples().reduce((max, sample) => {
    const value = Number(sample.accessionId.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `SCP-${highest + 1}`;
}

function loggedAt(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export type SampleLog = {
  accountId: string;
  accountName: string;
  orderId: string;
  client: string;
  matrix: string;
  tests: string;
  priority: SampleRecord["priority"];
  site: string;
  labId?: string;
};

/** Logs a sample and assigns the next Sample ID for that account. */
export function logSample(input: SampleLog): SampleRecord {
  const instanceId = currentInstanceId();
  const sample: SampleRecord = {
    ...input,
    sampleId: nextSampleId(input.accountId),
    accessionId: nextAccessionId(),
    received: loggedAt(),
    status: "received",
    condition: "normal",
    custody: "Intake",
    batchId: null,
    labId: input.labId || labIdFromSite(input.site),
    instanceId,
  };
  const next = [...samplesFor(instanceId), sample];
  sampleCache.set(instanceId, next);
  samples = next;
  persistLogged(instanceId, next);
  notifySamples();
  return sample;
}

export type TestResult = {
  analyte: string;
  result: string;
  unit: string;
  limit: string;
};

const RESULTS: Record<string, TestResult[]> = {
  "SCP-20460": [
    { analyte: "Assay", result: "99.2", unit: "%", limit: "98.0–102.0" },
    { analyte: "Appearance", result: "Pass", unit: "—", limit: "Conforms" },
  ],
  "SCP-20479": [{ analyte: "Dissolution", result: "92", unit: "%", limit: "Q ≥ 80" }],
  "SCP-20488": [{ analyte: "TAMC", result: "40", unit: "CFU/g", limit: "≤ 1000" }],
  "SCP-20494": [{ analyte: "Salmonella", result: "Absent", unit: "/25 g", limit: "Absent" }],
  "SCP-20496": [{ analyte: "Uniformity", result: "98.4", unit: "%", limit: "85.0–115.0" }],
};

export function sampleResults(accessionId: string): TestResult[] | null {
  return RESULTS[accessionId] ?? null;
}

export function isResulted(sample: SampleRecord): boolean {
  return sample.accessionId in RESULTS;
}

export function testNames(sample: SampleRecord): string[] {
  return sample.tests.split(",").map((name) => name.trim()).filter(Boolean);
}

const assignedBatches = new Map<string, string>();
const batchListeners = new Set<() => void>();
let nextBatch = 1201;

export function useAssignedBatches(): Map<string, string> {
  const [batches, setBatches] = useState(() => new Map(assignedBatches));
  useEffect(() => {
    const sync = () => setBatches(new Map(assignedBatches));
    batchListeners.add(sync);
    return () => {
      batchListeners.delete(sync);
    };
  }, []);
  return batches;
}

export function assignBatch(accessionIds: string[]): string {
  const batchId = `B-${nextBatch}`;
  nextBatch += 1;
  for (const id of accessionIds) assignedBatches.set(id, batchId);
  batchListeners.forEach((listener) => listener());
  return batchId;
}

export function sampleBatchId(sample: SampleRecord, assigned: Map<string, string>): string | null {
  return assigned.get(sample.accessionId) ?? sample.batchId;
}

export function findSample(id: string): SampleRecord | undefined {
  const rows = refreshSamples();
  const sampleId = Number(id);
  if (Number.isInteger(sampleId) && sampleId > 0) {
    const match = rows.find((sample) => sample.sampleId === sampleId);
    if (match) return match;
  }
  return rows.find((sample) => sample.accessionId === id);
}

export const STATUS_LABEL: Record<SampleStatus, string> = {
  received: "Received",
  accessioning: "Accessioning",
  processing: "Processing",
  testing: "Testing",
  review: "Review",
  released: "Released",
};

export const CONDITION_LABEL: Record<SampleCondition, string> = {
  normal: "Normal",
  on_hold: "On Hold",
  problem: "Problem",
  cancelled: "Cancelled",
  rejected: "Rejected",
};
