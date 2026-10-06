import { accountById } from "../crmAccounts";
import { ageDays, editsFor, type Charge, type Cycle } from "../revenueCycle";
import { findSample } from "../samples";
import type { Claim, ClaimFinancial, ClaimRecordStatus, ClaimWorkflow, Exception } from "./types";
import { chargeActive } from "./types";

function groupKey(charge: Charge): string {
  if (charge.documentId) return charge.documentId;
  return `DRAFT-${charge.accessionId}`;
}

function workflowFor(lines: Charge[]): ClaimWorkflow {
  const active = lines.filter((line) => chargeActive(line.status));
  if (active.some((line) => line.status === "denied")) return "denied";
  if (active.every((line) => line.status === "paid" || line.status === "written_off") && active.length) {
    return active.every((line) => line.status === "paid") ? "paid" : "resolved";
  }
  if (active.some((line) => line.status === "partial")) return "adjudicated";
  if (active.some((line) => line.status === "submitted")) return "submitted";
  if (active.some((line) => line.status === "held")) return "review";
  if (active.some((line) => line.status === "ready")) return "ready";
  if (lines.some((line) => line.status === "rebilled") && !active.length) return "resolved";
  return "draft";
}

function financialFor(lines: Charge[]): ClaimFinancial {
  const active = lines.filter((line) => chargeActive(line.status));
  const billed = active.reduce((sum, line) => sum + line.amountCents, 0);
  const paid = lines.reduce((sum, line) => sum + line.paidCents, 0);
  const writeOff = active.reduce((sum, line) => sum + line.writeOffCents, 0);
  const due = Math.max(0, billed - paid - writeOff);
  if (paid > billed) return "credit";
  if (active.every((line) => line.status === "written_off") && active.length) return "written_off";
  if (due === 0 && paid > 0) return "collected";
  if (active.some((line) => line.status === "denied") && due > 0) return "denied_balance";
  if (paid > 0 && due > 0) return "partial";
  if (active.some((line) => line.status === "submitted" || line.status === "partial" || line.status === "denied")) {
    return "receivable";
  }
  return "unbilled";
}

function recordStatusFor(workflow: ClaimWorkflow): ClaimRecordStatus {
  return workflow === "paid" || workflow === "resolved" ? "closed" : "open";
}

export function exceptionsFor(charge: Charge, owner: string): Exception[] {
  const sample = findSample(charge.accessionId);
  const account = accountById(charge.accountId);
  const edits = editsFor(charge, account, sample);
  const items: Exception[] = edits.map((message) => ({
    code: "SCRUB",
    message,
    impact: "This line cannot be submitted until the edit is cleared.",
    action: message.includes("ICD-10")
      ? "Assign a diagnosis on the claim."
      : message.includes("hold")
        ? "Clear the hold or record a documented override."
        : "Fix the missing field, then rescrub.",
    owner,
  }));
  if (charge.status === "denied") {
    items.push({
      code: charge.denialCode || "DENIAL",
      message: charge.denialReason || "Payer denied the charge.",
      impact: "The balance stays in A/R until it is appealed, rebilled, or written off.",
      action: "Open denials, assign a root cause, and appeal or rebill before the deadline.",
      owner,
    });
  }
  return items;
}

export function nextActionFor(claim: Pick<Claim, "workflow" | "exceptions" | "financial">): string {
  if (claim.workflow === "denied") return "Work the denial";
  if (claim.workflow === "appealed") return "Track the appeal";
  if (claim.exceptions.some((item) => item.code === "SCRUB" || item.code.startsWith("RULE-"))) return "Clear scrubbing exceptions";
  if (claim.workflow === "ready") return "Submit the claim";
  if (claim.workflow === "submitted" || claim.financial === "receivable") return "Watch payer response or post payment";
  if (claim.workflow === "draft") return "Capture remaining charges";
  if (claim.workflow === "review") return "Review and scrub";
  return "No action required";
}

export function buildClaims(cycle: Cycle, tenantId: string, owner = "RCM"): Claim[] {
  const groups = new Map<string, Charge[]>();
  for (const charge of cycle.charges) {
    const key = groupKey(charge);
    const list = groups.get(key) ?? [];
    list.push(charge);
    groups.set(key, list);
  }
  const claims: Claim[] = [];
  for (const [id, lines] of groups) {
    const primary = lines.find((line) => chargeActive(line.status)) ?? lines[0];
    const workflow = workflowFor(lines);
    const financial = financialFor(lines);
    const exceptions = lines.flatMap((line) => exceptionsFor(line, owner));
    const billedCents = lines.filter((line) => chargeActive(line.status)).reduce((sum, line) => sum + line.amountCents, 0);
    const paidCents = lines.reduce((sum, line) => sum + line.paidCents, 0);
    const adjustmentCents = lines.filter((line) => chargeActive(line.status)).reduce((sum, line) => sum + line.writeOffCents, 0);
    const claim: Claim = {
      id,
      tenantId,
      accountId: primary.accountId,
      accountName: primary.accountName,
      accessionId: primary.accessionId,
      orderId: primary.orderId,
      route: primary.route,
      payerName: primary.payerName,
      payerId: primary.payerId,
      plan: primary.plan,
      workflow,
      financial,
      recordStatus: recordStatusFor(workflow),
      billedCents,
      paidCents,
      adjustmentCents,
      balanceCents: Math.max(0, billedCents - paidCents - adjustmentCents),
      submittedAt: primary.submittedAt,
      ageDays: ageDays(primary.submittedAt),
      lineIds: lines.map((line) => line.id),
      lines,
      exceptions,
      nextAction: "",
      owner,
    };
    claim.nextAction = nextActionFor(claim);
    claims.push(claim);
  }
  return claims.sort((a, b) => a.id.localeCompare(b.id));
}

export function claimById(claims: Claim[], id: string): Claim | undefined {
  return claims.find((claim) => claim.id === id);
}
