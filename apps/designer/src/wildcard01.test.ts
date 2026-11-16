import { describe, expect, it } from "vitest";
import { filter01Color, filter01PinKey, rememberFilter01, rememberFilter01Pin, filter01Match } from "./filter01";

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

  it("keeps a pinned filter and replaces the same one", () => {
    const first = rememberFilter01Pin([], { label: "Active", selected: ["status:Active"], query: "" });
    const second = rememberFilter01Pin(first, { label: "Watch", selected: ["health:Watch"], query: "lab" });
    const repeat = rememberFilter01Pin(second, { label: "Active again", selected: ["status:Active"], query: "" });
    expect(second.map((pin) => pin.label)).toEqual(["Watch", "Active"]);
    expect(repeat).toHaveLength(2);
    expect(repeat[0]?.label).toBe("Active again");
    expect(filter01PinKey(repeat[0]!)).toBe(filter01PinKey({ selected: ["status:Active"], query: "" }));
  });
});
