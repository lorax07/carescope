import { accountById } from "./crmAccounts";
import { findInstrument } from "./instruments";
import { labResourceById } from "./labResourceAccess";
import { DEFAULT_LAB_OPERATIONS } from "./labOperations";
import { CLIENT_CHAPTERS, COMPLIANCE_CHAPTERS, REVENUE_CHAPTERS, chapterForPath, toolForPath } from "./pages/moduleChapters";
import { INSTRUMENT_CHAPTERS } from "./pages/instruments/InstrumentChrome";
import { getQuality } from "./qualitySystem";
import { buildClaims } from "./rcm/claims";
import { getCycle } from "./revenueCycle";
import { findSample } from "./samples";
import { currentInstanceId } from "./storageScope";
import { findRunSequence } from "./testingRuns";

export const BOOKMARK_LIMIT = 10;

export type BookmarkRecord = {
  id: string;
  userId: string;
  kind: string;
  objectId: string;
  title: string;
  detail: string;
  path: string;
  createdAt: string;
};

export type BookmarkTarget = {
  kind: string;
  objectId: string;
  title: string;
  detail: string;
  path: string;
};

type Named = { id: string; title?: string; name?: string };

function named(records: Named[] | undefined, id: string): string {
  const record = records?.find((item) => item.id === id);
  return record?.title || record?.name || "";
}

function screenTarget(pathname: string): BookmarkTarget {
  const ops = DEFAULT_LAB_OPERATIONS.menu.find((item) => pathname === `/app/ops/${item.view}` || (item.view === "overview" && (pathname === "/app" || pathname === "/app/")));
  if (ops) {
    const path = ops.view === "overview" ? "/app" : `/app/ops/${ops.view}`;
    return { kind: "screen", objectId: path, title: ops.label, detail: "Operations", path };
  }
  const chapters = [
    ...CLIENT_CHAPTERS.map((chapter) => ({ chapters: CLIENT_CHAPTERS, chapter, module: "Client" })),
    ...INSTRUMENT_CHAPTERS.map((chapter) => ({ chapters: INSTRUMENT_CHAPTERS, chapter, module: "Instruments" })),
    ...COMPLIANCE_CHAPTERS.map((chapter) => ({ chapters: COMPLIANCE_CHAPTERS, chapter, module: "Compliance" })),
    ...REVENUE_CHAPTERS.map((chapter) => ({ chapters: REVENUE_CHAPTERS, chapter, module: "Revenue" })),
  ];
  for (const entry of chapters) {
    const tool = toolForPath(chapterForPath(entry.chapters, pathname), pathname);
    if (tool && (pathname === tool.to || pathname.startsWith(`${tool.match}/`) || pathname === tool.match)) {
      return { kind: "screen", objectId: tool.match, title: tool.label, detail: entry.module, path: pathname };
    }
  }
  const pages: Record<string, string> = {
    "/app/connectivity": "Client",
    "/app/instruments": "Instruments",
    "/app/quality": "Compliance",
    "/app/billing": "Revenue",
    "/app/design": "Workflow design",
    "/app/workflows": "Workflows",
    "/app/insights": "Insights",
    "/app/resources": "Lab resources",
    "/app/catalog": "Catalog",
    "/app/tests": "Tests",
    "/app/results": "Results",
    "/app/inventory": "Inventory",
  };
  const title = pages[pathname] ?? "Workspace";
  return { kind: "screen", objectId: pathname, title, detail: "Sequence", path: pathname };
}

function qualityTarget(section: string, id: string, pathname: string): BookmarkTarget {
  const system = getQuality();
  const title =
    named(system.deviations, id) ||
    named(system.capas, id) ||
    named(system.changes, id) ||
    named(system.documents, id) ||
    named(system.training, id) ||
    named(system.audits, id) ||
    named(system.findings, id) ||
    named(system.risks, id) ||
    named(system.equipment, id) ||
    named(system.suppliers, id) ||
    named(system.complaints, id) ||
    named(system.reviews, id) ||
    id;
  return { kind: "quality", objectId: id, title, detail: section, path: pathname };
}

export function bookmarkTarget(pathname: string): BookmarkTarget | null {
  if (!pathname.startsWith("/app")) return null;
  const sampleId = pathname.match(/^\/app\/samples\/([^/]+)$/)?.[1];
  if (sampleId) {
    const id = decodeURIComponent(sampleId);
    const sample = findSample(id);
    return {
      kind: "sample",
      objectId: sample?.accessionId ?? id,
      title: sample?.accessionId ?? id,
      detail: sample ? `${sample.client} · ${sample.tests}` : "Sample",
      path: `/app/samples/${encodeURIComponent(sample?.accessionId ?? id)}`,
    };
  }
  const runId = pathname.match(/^\/app\/instruments\/review\/([^/]+)$/)?.[1];
  if (runId) {
    const id = decodeURIComponent(runId);
    const run = findRunSequence(id);
    return {
      kind: "run",
      objectId: id,
      title: run?.id ?? id,
      detail: run?.method ?? "Run",
      path: `/app/instruments/review/${encodeURIComponent(id)}`,
    };
  }
  const instrumentId = pathname.match(/^\/app\/instruments\/([^/]+)$/)?.[1];
  if (instrumentId && !["queue", "acquire", "review"].includes(instrumentId)) {
    const id = decodeURIComponent(instrumentId);
    const instrument = findInstrument(id);
    return {
      kind: "instrument",
      objectId: id,
      title: instrument?.name ?? id,
      detail: instrument?.model ?? "Instrument",
      path: `/app/instruments/${encodeURIComponent(id)}`,
    };
  }
  const accountId = pathname.match(/^\/app\/connectivity\/clients\/([^/]+)$/)?.[1];
  if (accountId) {
    const id = decodeURIComponent(accountId);
    const account = accountById(id);
    return {
      kind: "client",
      objectId: id,
      title: account?.name ?? id,
      detail: account?.number ? `Client ${account.number}` : "Client",
      path: `/app/connectivity/clients/${encodeURIComponent(id)}`,
    };
  }
  const claimId = pathname.match(/^\/app\/billing\/claims\/([^/]+)$/)?.[1];
  if (claimId) {
    const id = decodeURIComponent(claimId);
    const claim = buildClaims(getCycle(), currentInstanceId()).find((item) => item.id === id);
    return {
      kind: "claim",
      objectId: id,
      title: id,
      detail: claim?.accountName ?? "Claim",
      path: `/app/billing/claims/${encodeURIComponent(id)}`,
    };
  }
  const workflowId = pathname.match(/^\/app\/workflows\/([^/]+)$/)?.[1];
  if (workflowId) {
    const id = decodeURIComponent(workflowId);
    return { kind: "workflow", objectId: id, title: "Workflow", detail: id, path: `/app/workflows/${encodeURIComponent(id)}` };
  }
  const quality = pathname.match(/^\/app\/quality\/([^/]+)\/([^/]+)$/);
  if (quality) return qualityTarget(quality[1], decodeURIComponent(quality[2]), pathname);
  const resourceId = pathname.match(/^\/app\/resources\/([^/]+)$/)?.[1];
  if (resourceId) {
    const id = decodeURIComponent(resourceId);
    const resource = labResourceById(id);
    return {
      kind: "resource",
      objectId: id,
      title: resource?.label ?? id,
      detail: "Lab resources",
      path: `/app/resources/${encodeURIComponent(id)}`,
    };
  }
  return screenTarget(pathname);
}

export class BookmarkRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function send(userId: string, path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("x-user-id", userId);
  if (init?.body) headers.set("content-type", "application/json");
  const response = await fetch(`/api/v1/bookmarks${path}`, { ...init, headers });
  return response;
}

export async function loadBookmarks(userId: string): Promise<{ bookmarks: BookmarkRecord[]; limit: number }> {
  const response = await send(userId, "");
  if (!response.ok) throw new BookmarkRequestError(response.status, "Bookmarks are unavailable.");
  return response.json() as Promise<{ bookmarks: BookmarkRecord[]; limit: number }>;
}

export async function saveBookmark(userId: string, target: BookmarkTarget): Promise<BookmarkRecord> {
  const response = await send(userId, "", { method: "POST", body: JSON.stringify(target) });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.status === 409) throw new BookmarkRequestError(409, body.error || `A user can keep ${BOOKMARK_LIMIT} bookmarks.`);
  if (!response.ok) throw new BookmarkRequestError(response.status, body.error || "The bookmark could not be saved.");
  return body as BookmarkRecord;
}

export async function deleteBookmark(userId: string, id: string): Promise<void> {
  const response = await send(userId, `/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new BookmarkRequestError(response.status, "The bookmark could not be removed.");
  }
}
