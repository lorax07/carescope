import { describe, expect, it } from "vitest";
import { accountByName } from "./crmAccounts";
import {
  aging,
  applyAccountOverride,
  applyCapture,
  applyContractPrice,
  applyDenial,
  applyDiagnosis,
  applyLabOverride,
  applyListPrice,
  applyManualHold,
  applyPayment,
  applyRebill,
  applyReleaseHold,
  applySubmit,
  applyWriteOff,
  editsFor,
  ledgerSnapshot,
  rollup,
  seedCycle,
  syncCycle,
  type Charge,
} from "./revenueCycle";
import type { SampleRecord } from "./samples";

function sample(overrides: Partial<SampleRecord> = {}): SampleRecord {
  return {
    sampleId: 1,
    accountId: "client-apex",
    accountName: "Apex Diagnostics",
    accessionId: "SCP-20496",
    orderId: "ORD-44115",
    received: "2026-07-25 09:05",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Uniformity",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "Review bench",
    site: "North Lab",
    batchId: null,
    ...overrides,
  };
}

function charge(cycle: ReturnType<typeof seedCycle>, id: string): Charge {
  const found = cycle.charges.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

describe("laboratory revenue cycle", () => {
  it("holds an insurance charge until an ICD-10 is assigned, then bills and posts the payment", () => {
    const cycle = seedCycle();
    const account = accountByName("Summit Generics");
    if (!account) throw new Error("account");
    const created = applyCapture(cycle, sample(), account);
    expect(created.ids).toEqual(["CHG-1005"]);
    const line = charge(cycle, "CHG-1005");
    expect(line.amountCents).toBe(27500);
    expect(line.listCents).toBe(31000);
    expect(line.cpt).toBe("80375");
    expect(line.route).toBe("837P");
    expect(line.payerId).toBe("87726");
    expect(line.status).toBe("held");
    expect(editsFor(line, account, sample())).toContain("ICD-10 required before billing");

    applyDiagnosis(cycle, line.id, "Z01.89", sample());
    expect(line.status).toBe("ready");
    expect(applySubmit(cycle, line.id)).toBe("CLM-88421");
    expect(line.status).toBe("submitted");
    expect(applyPayment(cycle, line.id, 999999)).toBe(27500);
    expect(line.status).toBe("paid");
    expect(line.paidCents).toBe(27500);
  });

  it("refuses a second charge for the same test and skips tests that are not on the fee schedule", () => {
    const cycle = seedCycle();
    const account = accountByName("Aether Pharma");
    if (!account) throw new Error("account");
    const row = sample({
      accessionId: "SCP-20999",
      orderId: "ORD-44999",
      client: "Aether Pharma",
      tests: "Assay, Appearance",
    status: "review",
    condition: "normal",
    });
    const created = applyCapture(cycle, row, account);
    expect(created.skipped).toEqual(["Appearance"]);
    expect(created.ids).toHaveLength(1);
    expect(applyCapture(cycle, row, account).ids).toEqual([]);
    expect(cycle.charges.filter((item) => item.accessionId === "SCP-20999")).toHaveLength(1);
  });

  it("keeps in-process accessions off the charge queue", () => {
    const cycle = seedCycle();
    const before = cycle.charges.length;
    const account = accountByName("Cascade Nutraceuticals");
    if (!account) throw new Error("account");
    const created = applyCapture(
      cycle,
      sample({
        accessionId: "SCP-20471",
        client: "Cascade Nutraceuticals",
        tests: "Heavy Metals ICP-MS",
        status: "testing",
      }),
      account,
    );
    expect(created.ids).toEqual([]);
    expect(cycle.charges).toHaveLength(before);
  });

  it("clears a laboratory hold only after an override, then issues the next invoice", () => {
    const cycle = seedCycle();
    const held = sample({
      accessionId: "SCP-20458",
      orderId: "ORD-44071",
      client: "Vertex Materials",
      tests: "Identity FTIR",
      status: "processing",
      condition: "on_hold",
      custody: "Deviation DEV-118",
    });
    syncCycle(cycle, [held]);
    expect(charge(cycle, "CHG-1001").status).toBe("held");
    expect(charge(cycle, "CHG-1001").events).toHaveLength(2);
    applyLabOverride(cycle, "CHG-1001", held);
    expect(charge(cycle, "CHG-1001").status).toBe("ready");
    expect(applySubmit(cycle, "CHG-1001")).toBe("INV-4421");
  });

  it("keeps an account hold until billing records an override", () => {
    const cycle = seedCycle();
    const account = accountByName("Northwind Foods");
    if (!account) throw new Error("account");
    const row = sample({
      accessionId: "SCP-20494",
      orderId: "ORD-44108",
      client: "Northwind Foods",
      tests: "Salmonella",
      status: "review",
    });
    const created = applyCapture(cycle, row, account);
    const line = charge(cycle, created.ids[0]);
    expect(line.amountCents).toBe(15000);
    expect(line.status).toBe("held");
    expect(line.holdReason).toBe("Account is on hold");
    applyAccountOverride(cycle, line.id, row);
    expect(line.status).toBe("ready");
  });

  it("places and releases a manual hold", () => {
    const cycle = seedCycle();
    const held = sample({
      accessionId: "SCP-20458",
      client: "Vertex Materials",
      tests: "Identity FTIR",
      status: "processing",
      condition: "on_hold",
      custody: "Deviation DEV-118",
    });
    applyLabOverride(cycle, "CHG-1001", held);
    applyManualHold(cycle, "CHG-1001", "Waiting on the requisition", held);
    expect(charge(cycle, "CHG-1001").status).toBe("held");
    applyReleaseHold(cycle, "CHG-1001", held);
    expect(charge(cycle, "CHG-1001").status).toBe("ready");
  });

  it("rebills a denial after the missing diagnosis is added", () => {
    const cycle = seedCycle();
    const helix = sample({
      accessionId: "SCP-20485",
      orderId: "ORD-44088",
      client: "Helix Biologics",
      tests: "Potency ELISA",
      status: "received",
    });
    expect(editsFor(charge(cycle, "CHG-1003"), accountByName("Helix Biologics"), helix)).toContain("ICD-10 required before billing");
    const blocked = applyRebill(cycle, "CHG-1003", helix);
    expect(charge(cycle, blocked).status).toBe("held");
    expect(charge(cycle, "CHG-1003").status).toBe("rebilled");
    applyDiagnosis(cycle, blocked, "Z13.89", helix);
    expect(charge(cycle, blocked).status).toBe("ready");
    expect(applySubmit(cycle, blocked)).toBe("ST-221");
    const books = ledgerSnapshot(cycle.charges);
    expect(books.openDenials).toBe(0);
    expect(books.ar).toBe(39000);
  });

  it("posts a partial payment, denies the rest, and writes it off", () => {
    const cycle = seedCycle();
    const held = sample({
      accessionId: "SCP-20458",
      client: "Vertex Materials",
      status: "processing",
      condition: "on_hold",
      custody: "Deviation DEV-118",
      tests: "Identity FTIR",
    });
    applyLabOverride(cycle, "CHG-1001", held);
    applySubmit(cycle, "CHG-1001");
    expect(applyPayment(cycle, "CHG-1001", 6000)).toBe(6000);
    expect(charge(cycle, "CHG-1001").status).toBe("partial");
    applyDenial(cycle, "CHG-1001", "CO-45");
    expect(charge(cycle, "CHG-1001").denialReason).toBe("Charge exceeds fee schedule");
    applyWriteOff(cycle, "CHG-1001");
    expect(charge(cycle, "CHG-1001").status).toBe("written_off");
    expect(charge(cycle, "CHG-1001").writeOffCents).toBe(10000);
    const books = ledgerSnapshot(cycle.charges);
    expect(books.ar).toBe(39000);
    expect(books.collected).toBe(19800 + 42000 + 6000);
  });

  it("reprices open charges and leaves paid claims on the billed amount", () => {
    const cycle = seedCycle();
    applyContractPrice(cycle, "acc-vertex", "Identity FTIR", 15000);
    expect(charge(cycle, "CHG-1001").amountCents).toBe(15000);
    applyListPrice(cycle, "Assay", 26000);
    expect(charge(cycle, "CHG-1002").amountCents).toBe(19800);
    expect(charge(cycle, "CHG-1002").listCents).toBe(24000);
    applyListPrice(cycle, "Identity FTIR", 19000);
    expect(charge(cycle, "CHG-1001").listCents).toBe(19000);
    expect(charge(cycle, "CHG-1001").amountCents).toBe(15000);
  });

  it("keeps the ledger in balance and ages the open denial", () => {
    const cycle = seedCycle();
    for (const row of rollup(cycle.charges)) {
      expect(row.net).toBe(row.collected + row.writeOff + row.unbilled + row.ar);
    }
    const books = ledgerSnapshot(cycle.charges);
    expect(books.unbilled).toBe(16000);
    expect(books.collected).toBe(61800);
    expect(books.ar).toBe(39000);
    expect(books.openDenials).toBe(1);
    const buckets = aging(cycle.charges, new Date("2026-09-28T15:00:00Z"));
    expect(buckets.d61).toBe(39000);
    expect(buckets.current).toBe(0);
  });
});
