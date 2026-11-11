import { describe, expect, it } from "vitest";
import { rememberWildcard01, wildcard01Match } from "./wildcard01";

describe("Wildcard01", () => {
  it("treats a star as any text", () => {
    expect(wildcard01Match("Vertex Materials", "*tex*")).toBe(true);
    expect(wildcard01Match("Vertex Materials", "north")).toBe(false);
    expect(wildcard01Match("Vertex Materials", "")).toBe(true);
  });

  it("keeps ten searches and drops the oldest", () => {
    let saved: string[] = [];
    for (let index = 1; index <= 11; index += 1) saved = rememberWildcard01(saved, `query ${index}`);
    expect(saved).toHaveLength(10);
    expect(saved[0]).toBe("query 11");
    expect(saved).not.toContain("query 1");
    expect(rememberWildcard01(saved, "query 5")[0]).toBe("query 5");
    expect(rememberWildcard01(saved, "query 5").filter((item) => item === "query 5")).toHaveLength(1);
  });
});
