import { describe, expect, it } from "vitest";
import { connectionMarkPoint, connectionVisual, endpointIcon } from "./connectionTypes";

describe("connectionVisual", () => {
  it("keeps trigger, decision tree, and start/end choices", () => {
    expect(connectionVisual({ connectionType: "Trigger", label: "Update Status" })).toEqual({ connectionType: "Trigger" });
    expect(connectionVisual({ edgeType: "conditional", label: "Decision tree · 2" })).toEqual({ connectionType: "Decision tree" });
    expect(connectionVisual({ label: "Start" })).toEqual({ connectionType: "Start/End", startEndChoice: "Start" });
    expect(connectionVisual({ connectionType: "End" })).toEqual({ connectionType: "Start/End", startEndChoice: "End" });
    expect(connectionVisual({ connectionType: "Start/End", startEndChoice: "Start", label: "Start" })).toEqual({
      connectionType: "Start/End",
      startEndChoice: "Start",
    });
  });

  it("maps each stored choice to a distinct endpoint icon", () => {
    expect(endpointIcon(connectionVisual({ label: "Release Result" }))).toBe("trigger");
    expect(endpointIcon(connectionVisual({ edgeType: "conditional" }))).toBe("decision");
    expect(endpointIcon(connectionVisual({ label: "Start" }))).toBe("start");
    expect(endpointIcon(connectionVisual({ label: "End" }))).toBe("end");
  });
});

describe("connectionMarkPoint", () => {
  it("sits on the line just before the arrow", () => {
    expect(connectionMarkPoint([{ x: 0, y: 40 }, { x: 180, y: 40 }])).toEqual({ x: 144, y: 40 });
  });

  it("follows a vertical approach", () => {
    expect(connectionMarkPoint([{ x: 20, y: 0 }, { x: 20, y: 100 }], 20)).toEqual({ x: 20, y: 80 });
  });

  it("continues onto the previous segment when the last one is short", () => {
    expect(connectionMarkPoint([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }], 36)).toEqual({ x: 74, y: 0 });
  });
});
