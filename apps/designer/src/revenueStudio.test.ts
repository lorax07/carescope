import { describe, expect, it } from "vitest";
import { claimMatches, claimTone } from "./pages/rcm/revenueStudio";

const claim = {
  workflow: "denied",
  financial: "denied_balance",
  balanceCents: 39000,
  ageDays: 40,
  recordStatus: "open",
};

describe("revenue studio", () => {
  it("groups claims the way the overview pills show them", () => {
    expect(claimMatches(claim, "denied")).toBe(true);
    expect(claimMatches(claim, "risk")).toBe(true);
    expect(claimMatches(claim, "paid")).toBe(false);
    expect(claimMatches({ ...claim, workflow: "paid", financial: "collected", balanceCents: 0 }, "open")).toBe(false);
    expect(claimMatches({ ...claim, workflow: "submitted", financial: "receivable", ageDays: 12 }, "open")).toBe(true);
    expect(claimTone("denied").tone).toBe("stop");
    expect(claimTone("paid").label).toBe("Paid");
    expect(claimTone("submitted").tone).toBe("go");
  });
});
