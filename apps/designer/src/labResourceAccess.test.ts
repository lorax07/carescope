import { describe, expect, it } from "vitest";
import { hasLabResourceAccess } from "./labResourceAccess";

describe("lab resource access", () => {
  const grants = { "lab-north": ["bc-hale"] };

  it("hides Lab resources until that person is granted access on the lab", () => {
    expect(hasLabResourceAccess(grants, "lab-north", "bc-hale")).toBe(true);
    expect(hasLabResourceAccess(grants, "lab-north", "ir-chen")).toBe(false);
    expect(hasLabResourceAccess(grants, "lab-harbor", "bc-hale")).toBe(false);
    expect(hasLabResourceAccess(grants, undefined, "bc-hale")).toBe(false);
    expect(hasLabResourceAccess(grants, "lab-north", undefined)).toBe(false);
  });
});
