import { describe, expect, it } from "vitest";
import { filter01Color, rememberFilter01, filter01Match } from "./filter01";

describe("Filter01", () => {
  it("treats a star as any text", () => {
    expect(filter01Match("Vertex Materials", "*tex*")).toBe(true);
    expect(filter01Match("Vertex Materials", "north")).toBe(false);
    expect(filter01Match("Vertex Materials", "")).toBe(true);
  });

  it("keeps ten searches and drops the oldest", () => {
    let saved: string[] = [];
    for (let index = 1; index <= 11; index += 1) saved = rememberFilter01(saved, `query ${index}`);
    expect(saved).toHaveLength(10);
    expect(saved[0]).toBe("query 11");
    expect(saved).not.toContain("query 1");
    expect(rememberFilter01(saved, "query 5")[0]).toBe("query 5");
    expect(rememberFilter01(saved, "query 5").filter((item) => item === "query 5")).toHaveLength(1);
  });

  it("gives the same item a stable color", () => {
    expect(filter01Color("status:Active")).toBe(filter01Color("status:Active"));
  });
});
