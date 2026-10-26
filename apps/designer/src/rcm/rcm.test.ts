import { describe, expect, it } from "vitest";
import { accountByName } from "../crmAccounts";
import { applyCapture, applyDiagnosis, applySubmit, seedCycle } from "../revenueCycle";
import { buildClaims } from "./claims";
import { evaluateBillingRules, DEFAULT_RULES } from "./rules";
import { agingBuckets, bucketFor, queueRows } from "./queues";
import { metricsFrom, pageRows, snapshot } from "./store";
import type { SampleRecord } from "../samples";

function sample(): SampleRecord {
  return {
    sampleId: 9,
    accountId: "client-apex",
    accountName: "Apex Diagnostics",
    accessionId: "SCP-20999",
    orderId: "ORD-44999",
    received: "2026-07-25 09:05",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Uniformity",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "Review bench",
    site: "North Lab",
    labId: "lab-north",
    instanceId: "demo",
    batchId: null,
  };
}

describe("RCM domain", () => {
  it("keeps workflow, financial, and record status separate on a claim", () => {
    const cycle = seedCycle();
    const claims = buildClaims(cycle, "demo");
    const paid = claims.find((claim) => claim.id === "CLM-88302");
    expect(paid?.workflow).toBe("paid");
    expect(paid?.financial).toBe("collected");
    expect(paid?.recordStatus).toBe("closed");
    const denied = claims.find((claim) => claim.id === "ST-220");
    expect(denied?.workflow).toBe("denied");
    expect(denied?.financial).toBe("denied_balance");
    expect(denied?.recordStatus).toBe("open");
    expect(denied?.exceptions.some((item) => item.code === "CO-16")).toBe(true);
  });

  it("groups unsubmitted charges by accession as a draft claim", () => {
    const cycle = seedCycle();
    const held = buildClaims(cycle, "demo").find((claim) => claim.id === "DRAFT-SCP-20458");
    expect(held?.workflow).toBe("review");
    expect(held?.financial).toBe("unbilled");
    expect(held?.lineIds).toContain("CHG-1001");
  });

  it("evaluates configurable billing rules without UI hard-coding", () => {
    const cycle = seedCycle();
    const charge = cycle.charges.find((item) => item.id === "CHG-1003");
    if (!charge) throw new Error("charge");
    const hits = evaluateBillingRules(charge, DEFAULT_RULES("demo"));
    expect(hits.some((item) => item.message.includes("diagnosis"))).toBe(true);
  });

  it("builds work queues from claims, uncaptured accessions, and unposted remittances", () => {
    const cycle = seedCycle();
    const overlay = snapshot(cycle, [sample()]).overlay;
    const claims = buildClaims(cycle, "demo");
    const queues = queueRows(claims, cycle, [sample()], overlay);
    expect(queues.denials.length).toBeGreaterThan(0);
    expect(queues.capture.some((row) => row.id === "SCP-20999")).toBe(true);
    expect(queues.unposted.some((row) => row.id === "ERA-2208")).toBe(true);
  });

  it("ages receivable into 1-30 through 120+ buckets", () => {
    const cycle = seedCycle();
    const buckets = agingBuckets(cycle, new Date("2026-11-01T00:00:00Z"));
    expect(buckets.d120 + buckets.d91 + buckets.d61 + buckets.d31 + buckets.d1).toBeGreaterThan(0);
  });

  it("exposes dashboard metrics that drill into queues", () => {
    const cycle = seedCycle();
    const state = snapshot(cycle, []);
    const queues = queueRows(state.claims, cycle, [], state.overlay);
    const metrics = metricsFrom(state, queues, agingBuckets(cycle));
    expect(metrics.denied).toBeGreaterThan(0);
    expect(metrics.openQueues).toBeGreaterThan(0);
    expect(metrics.ar).toBeGreaterThan(0);
  });

  it("keeps RCM overlay and claims inside the tenant boundary", () => {
    const cycle = seedCycle();
    const state = snapshot(cycle, []);
    expect(state.overlay.tenantId).toBe(state.tenantId);
    expect(state.claims.every((claim) => claim.tenantId === state.tenantId)).toBe(true);
    expect(state.overlay.payments.every((item) => item.tenantId === state.tenantId)).toBe(true);
  });

  it("pages claim lists instead of sending the full ledger to the table", () => {
    const paged = pageRows(Array.from({ length: 60 }, (_, index) => index), 2, 25);
    expect(paged.rows).toHaveLength(25);
    expect(paged.pages).toBe(3);
    expect(paged.page).toBe(2);
    expect(bucketFor(0)).toBe("current");
    expect(bucketFor(45)).toBe("d31");
    expect(bucketFor(140)).toBe("d120");
  });

  it("submits a captured insurance claim onto a document id used as the claim key", () => {
    const cycle = seedCycle();
    const account = accountByName("Summit Generics");
    if (!account) throw new Error("account");
    const created = applyCapture(cycle, sample(), account);
    applyDiagnosis(cycle, created.ids[0], "Z01.89", sample());
    const documentId = applySubmit(cycle, created.ids[0]);
    const claim = buildClaims(cycle, "demo").find((item) => item.id === documentId);
    expect(claim?.workflow).toBe("submitted");
    expect(claim?.financial).toBe("receivable");
    expect(claim?.lineIds).toEqual(created.ids);
  });
});
