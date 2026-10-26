import { describe, expect, it } from "vitest";
import { matchesConditionFilter, matchesQuickFilter } from "./sampleFilters";
import type { SampleRecord } from "./samples";

function sample(overrides: Partial<SampleRecord>): SampleRecord {
  return {
    sampleId: 1,
    accountId: "client-apex",
    accountName: "Apex Diagnostics",
    accessionId: "SCP-1",
    orderId: "ORD-1",
    received: "2026-07-25 09:00",
    client: "Aether Pharma",
    matrix: "Tablet",
    tests: "Assay",
    status: "testing",
    condition: "normal",
    priority: "Routine",
    custody: "Bench",
    site: "North Lab",
    labId: "lab-north",
    instanceId: "demo",
    batchId: null,
    ...overrides,
  };
}

describe("home stage and condition filters", () => {
  const rows = [
    sample({ accessionId: "A", status: "received", condition: "normal" }),
    sample({ accessionId: "B", status: "testing", condition: "normal" }),
    sample({ accessionId: "C", status: "testing", condition: "on_hold" }),
    sample({ accessionId: "D", status: "review", condition: "problem" }),
    sample({ accessionId: "E", status: "processing", condition: "cancelled" }),
    sample({ accessionId: "F", status: "received", condition: "rejected" }),
    sample({ accessionId: "G", status: "released", condition: "normal", priority: "STAT" }),
  ];

  function apply(stage: Parameters<typeof matchesQuickFilter>[1], conditions: Parameters<typeof matchesConditionFilter>[1]) {
    return rows
      .filter((row) => matchesQuickFilter(row, stage))
      .filter((row) => matchesConditionFilter(row, conditions))
      .map((row) => row.accessionId);
  }

  it("keeps every sample when no stage or condition is selected", () => {
    expect(apply("all", [])).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("filters each workflow stage on its own", () => {
    expect(apply("stage:received", [])).toEqual(["A", "F"]);
    expect(apply("stage:accessioning", [])).toEqual([]);
    expect(apply("stage:processing", [])).toEqual(["E"]);
    expect(apply("stage:testing", [])).toEqual(["B", "C"]);
    expect(apply("stage:review", [])).toEqual(["D"]);
    expect(apply("stage:released", [])).toEqual(["G"]);
  });

  it("filters each condition on its own", () => {
    expect(apply("all", ["normal"])).toEqual(["A", "B", "G"]);
    expect(apply("all", ["on_hold"])).toEqual(["C"]);
    expect(apply("all", ["problem"])).toEqual(["D"]);
    expect(apply("all", ["cancelled"])).toEqual(["E"]);
    expect(apply("all", ["rejected"])).toEqual(["F"]);
  });

  it("requires both stage and condition when they are combined", () => {
    expect(apply("stage:testing", ["normal"])).toEqual(["B"]);
    expect(apply("stage:testing", ["on_hold"])).toEqual(["C"]);
    expect(apply("stage:testing", ["problem"])).toEqual([]);
    expect(apply("stage:received", ["rejected"])).toEqual(["F"]);
    expect(apply("stage:review", ["normal"])).toEqual([]);
  });

  it("still matches release priority pills", () => {
    expect(apply("priority:STAT", [])).toEqual(["G"]);
    expect(apply("priority:STAT", ["normal"])).toEqual(["G"]);
    expect(apply("priority:STAT", ["on_hold"])).toEqual([]);
  });
});
