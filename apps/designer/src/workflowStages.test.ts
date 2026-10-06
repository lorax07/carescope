import { describe, expect, it } from "vitest";
import { normalizeStages } from "./workflowStages";

describe("workflow stages", () => {
  it("keeps the default laboratory stages when nothing is saved", () => {
    const stages = normalizeStages(undefined);
    expect(stages.map((stage) => stage.label)).toEqual([
      "Received",
      "Accessioning",
      "Processing",
      "Testing",
      "Review",
      "Released",
    ]);
    expect(stages[0].color).toBe("#6b7280");
    expect(stages[1].color).toBe("#111111");
    expect(stages[2].color).toBe("#7c3aed");
    expect(stages[3].color).toBe("#1b6ef3");
    expect(stages[4].color).toBe("#eab308");
    expect(stages[5].color).toBe("#16a34a");
  });

  it("keeps a stage the laboratory added", () => {
    const stages = normalizeStages([
      { id: "received", label: "Received", color: "#6b7280", icon: "inbox" },
      { id: "custom-1", label: "Aliquot", color: "#0f766e", icon: "beaker" },
    ]);
    expect(stages).toHaveLength(2);
    expect(stages[1].label).toBe("Aliquot");
  });
});
