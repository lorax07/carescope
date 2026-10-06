import { accountByName } from "../crmAccounts";
import { balance, labReady, quote, splitTests, type Cycle } from "../revenueCycle";
import { type SampleRecord } from "../samples";
import type { AgingBucket, Claim, QueueId, RcmOverlay } from "./types";
import { QUEUE_META } from "./types";

export type QueueRow = {
  queueId: QueueId;
  kind: "claim" | "accession" | "remittance";
  id: string;
  title: string;
  detail: string;
  amountCents: number;
  nextAction: string;
  owner: string;
};

export function bucketFor(days: number): AgingBucket {
  if (days <= 0) return "current";
  if (days <= 30) return "d1";
  if (days <= 60) return "d31";
  if (days <= 90) return "d61";
  if (days <= 120) return "d91";
  return "d120";
}

export function queueRows(
  claims: Claim[],
  cycle: Cycle,
  samples: SampleRecord[],
  overlay: Pick<RcmOverlay, "remittances" | "eligibility" | "authorizations">,
): Record<QueueId, QueueRow[]> {
  const buckets = Object.fromEntries(QUEUE_META.map((item) => [item.id, [] as QueueRow[]])) as Record<QueueId, QueueRow[]>;

  for (const claim of claims) {
    const row = (queueId: QueueId): QueueRow => ({
      queueId,
      kind: "claim",
      id: claim.id,
      title: claim.id,
      detail: `${claim.accountName} · ${claim.accessionId}`,
      amountCents: claim.balanceCents,
      nextAction: claim.nextAction,
      owner: claim.owner,
    });
    if (claim.workflow === "review") buckets.review.push(row("review"));
    if (claim.exceptions.some((item) => item.code === "SCRUB" || item.code.startsWith("RULE-"))) {
      buckets.missing.push(row("missing"));
    }
    if (claim.workflow === "ready") buckets.ready.push(row("ready"));
    if (claim.workflow === "rejected") buckets.rejected.push(row("rejected"));
    if (claim.workflow === "denied") buckets.denials.push(row("denials"));
    if (claim.workflow === "appealed") buckets.appeals.push(row("appeals"));
    if (claim.ageDays >= 90 && claim.balanceCents > 0) buckets.aging.push(row("aging"));
    if (claim.exceptions.some((item) => item.code === "ELIG")) buckets.eligibility.push(row("eligibility"));
    if (claim.exceptions.some((item) => item.code === "AUTH" || item.code.includes("medicare-auth"))) {
      buckets.authorization.push(row("authorization"));
    }
  }

  for (const sample of samples) {
    if (!labReady(sample)) continue;
    const account = accountByName(sample.client);
    if (!account) continue;
    const pending = splitTests(sample.tests).filter((test) => {
      if (!quote(cycle, account.id, test)) return false;
      return !cycle.charges.some((charge) => charge.accessionId === sample.accessionId && charge.test === test && charge.status !== "rebilled");
    });
    if (!pending.length) continue;
    buckets.capture.push({
      queueId: "capture",
      kind: "accession",
      id: sample.accessionId,
      title: sample.accessionId,
      detail: `${sample.client} · ${pending.join(", ")}`,
      amountCents: pending.reduce((sum, test) => sum + (quote(cycle, account.id, test)?.amountCents ?? 0), 0),
      nextAction: "Capture charges",
      owner: "Charge capture",
    });
  }

  for (const item of overlay.eligibility) {
    if (item.status === "active") continue;
    if (claims.some((claim) => claim.id === item.claimId && claim.exceptions.some((exception) => exception.code === "ELIG"))) continue;
    const claim = claims.find((row) => row.id === item.claimId);
    buckets.eligibility.push({
      queueId: "eligibility",
      kind: "claim",
      id: item.claimId || item.id,
      title: item.claimId || item.id,
      detail: item.detail,
      amountCents: claim?.balanceCents ?? 0,
      nextAction: "Run eligibility",
      owner: "Eligibility",
    });
  }

  for (const item of overlay.authorizations) {
    if (item.status === "approved") continue;
    const claim = claims.find((row) => row.id === item.claimId);
    buckets.authorization.push({
      queueId: "authorization",
      kind: "claim",
      id: item.claimId || item.id,
      title: item.claimId || item.number || item.id,
      detail: item.detail || item.status,
      amountCents: claim?.balanceCents ?? 0,
      nextAction: "Record authorization",
      owner: "Authorization",
    });
  }

  for (const remit of overlay.remittances) {
    if (remit.status === "posted") continue;
    buckets.unposted.push({
      queueId: "unposted",
      kind: "remittance",
      id: remit.id,
      title: remit.checkNumber,
      detail: `${remit.payerName} · unposted ${((remit.totalCents - remit.postedCents) / 100).toFixed(2)}`,
      amountCents: remit.totalCents - remit.postedCents,
      nextAction: "Post remittance",
      owner: "Payments",
    });
  }

  return buckets;
}

export function receivableCharges(cycle: Cycle) {
  return cycle.charges.filter((charge) => ["submitted", "partial", "denied"].includes(charge.status));
}

export function agingBuckets(cycle: Cycle, today = new Date()) {
  const buckets = { current: 0, d1: 0, d31: 0, d61: 0, d91: 0, d120: 0 };
  for (const charge of receivableCharges(cycle)) {
    if (!charge.submittedAt) continue;
    const [year, month, day] = charge.submittedAt.slice(0, 10).split("-").map(Number);
    const days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(year, month - 1, day)) / 86400000);
    const due = balance(charge);
    if (days <= 0) buckets.current += due;
    else if (days <= 30) buckets.d1 += due;
    else if (days <= 60) buckets.d31 += due;
    else if (days <= 90) buckets.d61 += due;
    else if (days <= 120) buckets.d91 += due;
    else buckets.d120 += due;
  }
  return buckets;
}
