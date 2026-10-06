import { useEffect, useMemo, useState } from "react";
import { readLimsSession } from "../limsSession";
import {
  getCycle,
  money,
  postPayment,
  type Cycle,
} from "../revenueCycle";
import { useRevenue } from "../revenueCycle";
import { useSamples, type SampleRecord } from "../samples";
import { buildClaims, exceptionsFor } from "./claims";
import { evaluateBillingRules, DEFAULT_RULES } from "./rules";
import { agingBuckets, queueRows } from "./queues";
import type { AuditEvent, Claim, Denial, Payment, Remittance, RcmNote, RcmOverlay } from "./types";

const EVENT = "carescope-rcm";

export function rcmTenantId(): string {
  try {
    const session = readLimsSession();
    return session?.databaseName || session?.clientName || "demo";
  } catch {
    return "demo";
  }
}

export function rcmActor(): string {
  try {
    return readLimsSession()?.username || "M. Chen";
  } catch {
    return "M. Chen";
  }
}

export function rcmCanWrite(): boolean {
  const user = rcmActor();
  return user === "admin" || user === "M. Chen" || user === "AD";
}

function storageKey(tenantId: string): string {
  return `carescope.rcm.v1:${tenantId}`;
}

function seedOverlay(tenantId: string, cycle: Cycle): RcmOverlay {
  const denied = cycle.charges.find((charge) => charge.status === "denied");
  const paid = cycle.charges.find((charge) => charge.status === "paid");
  const denials: Denial[] = denied
    ? [
        {
          id: "DNY-1001",
          tenantId,
          claimId: denied.documentId || `DRAFT-${denied.accessionId}`,
          chargeId: denied.id,
          carc: denied.denialCode,
          rarc: "N16",
          reason: denied.denialReason,
          rootCause: "Missing diagnosis on self-pay statement",
          payerName: denied.payerName,
          cpt: denied.cpt,
          impactCents: denied.amountCents - denied.paidCents,
          owner: "RCM",
          receivedAt: "2026-07-21 14:45",
          appealDeadline: "2026-08-20",
          appealStatus: "none",
          recoveryCents: 0,
          resolution: "",
        },
      ]
    : [];
  const remittances: Remittance[] = paid
    ? [
        {
          id: "ERA-2201",
          tenantId,
          payerName: paid.payerName,
          payerId: paid.payerId,
          checkNumber: "ERA-2201",
          receivedAt: "2026-07-26 09:12",
          totalCents: paid.paidCents,
          postedCents: paid.paidCents,
          status: "posted",
        },
        {
          id: "ERA-2208",
          tenantId,
          payerName: "UnitedHealthcare",
          payerId: "87726",
          checkNumber: "ERA-2208",
          receivedAt: "2026-07-27 08:40",
          totalCents: 27500,
          postedCents: 0,
          status: "unposted",
        },
      ]
    : [];
  const payments: Payment[] = paid
    ? [
        {
          id: "PMT-5001",
          tenantId,
          claimId: paid.documentId,
          chargeId: paid.id,
          remittanceId: "ERA-2201",
          cents: paid.paidCents,
          method: paid.route === "837P" ? "era" : "client",
          postedBy: "M. Chen",
          at: "2026-07-26 09:12",
        },
      ]
    : [];
  return {
    version: 1,
    tenantId,
    payments,
    remittances,
    denials,
    appeals: [],
    eligibility: [
      {
        id: "ELG-1",
        tenantId,
        accountId: "acc-helix",
        claimId: denied?.documentId || "",
        status: "unknown",
        checkedAt: "2026-07-21 13:50",
        detail: "Self-pay account has no payer eligibility file.",
      },
    ],
    authorizations: [],
    rules: DEFAULT_RULES(tenantId),
    notes: [],
    audit: [
      {
        id: "AUD-1",
        tenantId,
        at: "2026-07-21 14:45",
        actor: "Payer",
        entity: "claim",
        entityId: denied?.documentId || "",
        action: "denied",
        before: "submitted",
        after: "denied",
      },
    ],
    nextPayment: 5002,
    nextRemit: 2209,
    nextDenial: 1002,
    nextAppeal: 301,
    nextNote: 1,
    nextAudit: 2,
  };
}

function readOverlay(tenantId: string, cycle: Cycle): RcmOverlay {
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return seedOverlay(tenantId, cycle);
    const parsed = JSON.parse(raw) as RcmOverlay;
    if (!parsed || parsed.version !== 1 || parsed.tenantId !== tenantId) return seedOverlay(tenantId, cycle);
    return parsed;
  } catch {
    return seedOverlay(tenantId, cycle);
  }
}

const overlays = new Map<string, RcmOverlay>();
const listeners = new Set<() => void>();

function overlayFor(tenantId: string, cycle: Cycle): RcmOverlay {
  const cached = overlays.get(tenantId);
  if (cached) return cached;
  const loaded = readOverlay(tenantId, cycle);
  overlays.set(tenantId, loaded);
  return loaded;
}

function stamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function commit(overlay: RcmOverlay) {
  overlays.set(overlay.tenantId, overlay);
  try {
    localStorage.setItem(storageKey(overlay.tenantId), JSON.stringify(overlay));
  } catch {
    /* Keep the overlay in memory if storage is full. */
  }
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new Event(EVENT));
}

function currentOverlay(): RcmOverlay {
  return overlayFor(rcmTenantId(), getCycle());
}

function audit(overlay: RcmOverlay, entity: string, entityId: string, action: string, before: string, after: string) {
  const event: AuditEvent = {
    id: `AUD-${overlay.nextAudit}`,
    tenantId: overlay.tenantId,
    at: stamp(),
    actor: rcmActor(),
    entity,
    entityId,
    action,
    before,
    after,
  };
  overlay.nextAudit += 1;
  overlay.audit = [event, ...overlay.audit].slice(0, 500);
}

export function recordNote(claimId: string, text: string) {
  const body = text.trim();
  if (!body || !rcmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const note: RcmNote = {
    id: `NOTE-${overlay.nextNote}`,
    tenantId: overlay.tenantId,
    claimId,
    at: stamp(),
    actor: rcmActor(),
    text: body,
  };
  overlay.nextNote += 1;
  overlay.notes.unshift(note);
  audit(overlay, "claim", claimId, "note", "", body);
  commit(overlay);
}

export function setDenialRootCause(denialId: string, rootCause: string, owner: string) {
  if (!rcmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const denial = overlay.denials.find((item) => item.id === denialId);
  if (!denial) return;
  const before = `${denial.rootCause}|${denial.owner}`;
  denial.rootCause = rootCause;
  denial.owner = owner;
  audit(overlay, "denial", denialId, "root_cause", before, `${rootCause}|${owner}`);
  commit(overlay);
}

export function fileAppeal(denialId: string, note: string) {
  if (!rcmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const denial = overlay.denials.find((item) => item.id === denialId);
  if (!denial || denial.appealStatus === "submitted" || denial.appealStatus === "won") return;
  const appeal = {
    id: `APL-${overlay.nextAppeal}`,
    tenantId: overlay.tenantId,
    denialId,
    claimId: denial.claimId,
    status: "submitted" as const,
    submittedAt: stamp(),
    note: note.trim() || "Appeal submitted from the denial queue.",
    owner: rcmActor(),
  };
  overlay.nextAppeal += 1;
  overlay.appeals.unshift(appeal);
  denial.appealStatus = "submitted";
  audit(overlay, "denial", denialId, "appeal", "none", "submitted");
  commit(overlay);
}

export function postRemittance(remittanceId: string) {
  if (!rcmCanWrite()) return 0;
  const overlay = structuredClone(currentOverlay());
  const remit = overlay.remittances.find((item) => item.id === remittanceId);
  if (!remit || remit.status === "posted") return 0;
  const remaining = remit.totalCents - remit.postedCents;
  const cycle = getCycle();
  const target = cycle.charges.find((charge) => charge.payerId === remit.payerId && (charge.status === "submitted" || charge.status === "partial"));
  if (!target) return 0;
  const applied = postPayment(target.id, remaining);
  if (!applied) return 0;
  remit.postedCents += applied;
  remit.status = remit.postedCents >= remit.totalCents ? "posted" : "partial";
  overlay.payments.unshift({
    id: `PMT-${overlay.nextPayment}`,
    tenantId: overlay.tenantId,
    claimId: target.documentId || `DRAFT-${target.accessionId}`,
    chargeId: target.id,
    remittanceId: remit.id,
    cents: applied,
    method: "era",
    postedBy: rcmActor(),
    at: stamp(),
  });
  overlay.nextPayment += 1;
  audit(overlay, "payment", remit.id, "post", String(remaining), String(applied));
  commit(overlay);
  return applied;
}

export function recordManualPayment(chargeId: string, cents: number) {
  if (!rcmCanWrite()) return 0;
  const applied = postPayment(chargeId, cents);
  if (!applied) return 0;
  const overlay = structuredClone(currentOverlay());
  const charge = getCycle().charges.find((item) => item.id === chargeId);
  overlay.payments.unshift({
    id: `PMT-${overlay.nextPayment}`,
    tenantId: overlay.tenantId,
    claimId: charge?.documentId || chargeId,
    chargeId,
    remittanceId: "",
    cents: applied,
    method: "client",
    postedBy: rcmActor(),
    at: stamp(),
  });
  overlay.nextPayment += 1;
  audit(overlay, "payment", chargeId, "post", "0", String(applied));
  commit(overlay);
  return applied;
}

export function toggleRule(ruleId: string, enabled: boolean) {
  if (!rcmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const rule = overlay.rules.find((item) => item.id === ruleId);
  if (!rule) return;
  rule.enabled = enabled;
  audit(overlay, "rule", ruleId, "toggle", String(!enabled), String(enabled));
  commit(overlay);
}

function decorate(claim: Claim, overlay: RcmOverlay): Claim {
  const extra = claim.lines.flatMap((line) => evaluateBillingRules(line, overlay.rules));
  const eligibility = overlay.eligibility.filter((item) => item.claimId === claim.id && item.status !== "active");
  const auth = overlay.authorizations.filter((item) => item.claimId === claim.id && item.status !== "approved");
  const exceptions = [
    ...claim.exceptions,
    ...extra,
    ...eligibility.map((item) => ({
      code: "ELIG",
      message: item.detail,
      impact: "Payer may reject the claim if coverage is inactive.",
      action: "Run eligibility and update the account coverage.",
      owner: "Eligibility",
    })),
    ...auth.map((item) => ({
      code: "AUTH",
      message: item.detail || "Authorization is missing.",
      impact: "The claim will deny for no authorization.",
      action: "Record an authorization number or move the work to the auth queue.",
      owner: "Authorization",
    })),
  ];
  const denial = overlay.denials.find((item) => item.claimId === claim.id && item.appealStatus === "submitted");
  return {
    ...claim,
    exceptions,
    workflow: denial ? "appealed" : claim.workflow,
    nextAction: denial ? "Track the appeal" : claim.nextAction,
  };
}

export type RcmSnapshot = {
  tenantId: string;
  actor: string;
  canWrite: boolean;
  cycle: Cycle;
  samples: SampleRecord[];
  overlay: RcmOverlay;
  claims: Claim[];
};

export function snapshot(cycle: Cycle, samples: SampleRecord[]): RcmSnapshot {
  const tenantId = rcmTenantId();
  const overlay = overlayFor(tenantId, cycle);
  const claims = buildClaims(cycle, tenantId, "RCM").map((claim) => decorate(claim, overlay));
  return {
    tenantId,
    actor: rcmActor(),
    canWrite: rcmCanWrite(),
    cycle,
    samples,
    overlay,
    claims,
  };
}

export function useRcm(): RcmSnapshot & {
  queues: ReturnType<typeof queueRows>;
  aging: ReturnType<typeof agingBuckets>;
  metrics: ReturnType<typeof metricsFrom>;
} {
  const cycle = useRevenue();
  const samples = useSamples();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sync = () => setTick((value) => value + 1);
    listeners.add(sync);
    window.addEventListener(EVENT, sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  const state = useMemo(() => snapshot(cycle, samples), [cycle, samples, tick]);
  const queues = useMemo(
    () => queueRows(state.claims, cycle, samples, state.overlay),
    [state.claims, cycle, samples, state.overlay],
  );
  const aging = useMemo(() => agingBuckets(cycle), [cycle]);
  const metrics = useMemo(() => metricsFrom(state, queues, aging), [state, queues, aging]);
  return { ...state, queues, aging, metrics };
}

export function metricsFrom(
  state: RcmSnapshot,
  queues: ReturnType<typeof queueRows>,
  aging: ReturnType<typeof agingBuckets>,
) {
  const claims = state.claims;
  const submitted = claims.filter((claim) =>
    ["submitted", "accepted", "adjudicated", "paid", "denied", "appealed", "resolved"].includes(claim.workflow),
  );
  const denied = claims.filter((claim) => claim.workflow === "denied" || claim.workflow === "appealed");
  const collected = claims.reduce((sum, claim) => sum + claim.paidCents, 0);
  const billed = claims.reduce((sum, claim) => sum + claim.billedCents, 0);
  const ar = claims.reduce((sum, claim) => sum + (claim.financial === "unbilled" ? 0 : claim.balanceCents), 0);
  const patient = claims.filter((claim) => claim.route === "Statement").reduce((sum, claim) => sum + claim.balanceCents, 0);
  const atRisk = (aging.d91 ?? 0) + (aging.d120 ?? 0) + denied.reduce((sum, claim) => sum + claim.balanceCents, 0);
  const agedDays = claims.filter((claim) => claim.balanceCents > 0 && claim.ageDays > 0);
  const daysInAr = agedDays.length ? Math.round(agedDays.reduce((sum, claim) => sum + claim.ageDays, 0) / agedDays.length) : 0;
  const clean = submitted.filter((claim) => !claim.exceptions.some((item) => item.code === "SCRUB")).length;
  return {
    ar,
    awaiting: queues.ready.length + queues.review.length,
    submitted: submitted.length,
    rejected: queues.rejected.length,
    denied: denied.length,
    payments: collected,
    net: collected,
    daysInAr,
    cleanRate: submitted.length ? Math.round((clean / submitted.length) * 100) : 100,
    denialRate: submitted.length ? Math.round((denied.length / submitted.length) * 100) : 0,
    collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
    patient,
    atRisk,
    aging,
    openQueues: QUEUE_COUNTS(queues),
  };
}

function QUEUE_COUNTS(queues: ReturnType<typeof queueRows>) {
  return (Object.keys(queues) as (keyof typeof queues)[]).reduce(
    (sum, key) => sum + queues[key].length,
    0,
  );
}

export function formatMoney(cents: number): string {
  return money(cents);
}

export function pageRows<T>(rows: T[], page: number, size = 25): { rows: T[]; pages: number; page: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((safe - 1) * size, safe * size), pages, page: safe };
}

export { exceptionsFor };
