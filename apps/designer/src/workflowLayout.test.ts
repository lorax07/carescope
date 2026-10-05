import { describe, expect, it } from "vitest";
import { SYSTEM_WORKFLOWS } from "./systemWorkflows";
import { autoArrange, boxesOverlap, measureRoutes, rerouteMoved, routeWorkflow, type LayoutEdge, type LayoutNode } from "./workflowLayout";

const size = { width: 180, height: 84 };

function node(id: string, x: number, y: number): LayoutNode {
  return { id, x, y, ...size };
}

describe("workflow edge routing", () => {
  it("routes around a node that sits on the straight path", () => {
    const nodes = [node("a", 0, 80), node("block", 280, 70), node("b", 620, 80)];
    const edges: LayoutEdge[] = [{ id: "a-b", source: "a", target: "b" }];
    const report = routeWorkflow(nodes, edges);
    expect(report.throughNodes).toBe(0);
    expect(report.routes["a-b"]?.length).toBeGreaterThan(2);
  });

  it("prefers a crossing-free orthogonal route when one exists", () => {
    const nodes = [node("a", 0, 40), node("b", 0, 240), node("c", 520, 240), node("d", 520, 40)];
    const edges: LayoutEdge[] = [
      { id: "a-c", source: "a", target: "c" },
      { id: "b-d", source: "b", target: "d" },
    ];
    const report = routeWorkflow(nodes, edges);
    expect(report.throughNodes).toBe(0);
    expect(report.crossings).toBe(0);
  });

  it("keeps reconnecting branches off other nodes", () => {
    const nodes = [
      node("trigger", 0, 160),
      node("action-1", 280, 40),
      node("action-2", 280, 180),
      node("action-3", 280, 320),
      node("decision-1", 560, 40),
      node("decision-2", 560, 280),
      node("action-4", 840, 40),
      node("action-5", 840, 180),
      node("join", 1120, 160),
    ];
    const edges: LayoutEdge[] = [
      { id: "t1", source: "trigger", target: "action-1" },
      { id: "t2", source: "trigger", target: "action-2" },
      { id: "t3", source: "trigger", target: "action-3" },
      { id: "a1", source: "action-1", target: "decision-1" },
      { id: "a2", source: "action-2", target: "decision-2" },
      { id: "a3", source: "action-3", target: "decision-2" },
      { id: "d1", source: "decision-1", target: "action-4" },
      { id: "d2", source: "decision-1", target: "action-5" },
      { id: "d3", source: "decision-2", target: "action-5" },
      { id: "d4", source: "decision-2", target: "join" },
      { id: "j1", source: "action-4", target: "join" },
      { id: "j2", source: "action-5", target: "join" },
      { id: "long", source: "trigger", target: "join" },
    ];
    const report = routeWorkflow(nodes, edges);
    expect(report.throughNodes).toBe(0);
    expect(report.crossings).toBe(0);
    expect(Object.keys(report.routes)).toHaveLength(edges.length);
    for (const edge of edges) {
      expect(report.routes[edge.id]?.length).toBeGreaterThan(1);
    }
  });

  it("routes a return edge around a neighboring forward edge", () => {
    const nodes = [node("testing", 108, 321), node("log", 486, 300), node("receive", 486, 468)];
    const edges: LayoutEdge[] = [
      { id: "back", source: "log", target: "testing" },
      { id: "forward", source: "testing", target: "receive" },
    ];
    const report = routeWorkflow(nodes, edges);
    expect(report.crossings).toBe(0);
    expect(report.throughNodes).toBe(0);
  });

  it("keeps every other route when one node moves", () => {
    const nodes = [node("a", 0, 40), node("b", 0, 240), node("c", 520, 240), node("d", 520, 40)];
    const edges: LayoutEdge[] = [
      { id: "a-c", source: "a", target: "c" },
      { id: "b-d", source: "b", target: "d" },
    ];
    const original = routeWorkflow(nodes, edges);
    const moved = nodes.map((item) => (item.id === "d" ? { ...item, y: item.y + 30 } : item));
    const next = rerouteMoved(moved, edges, original.routes, "d", { thorough: true });
    expect(next.routes["a-c"]).toEqual(original.routes["a-c"]);
    expect(next.throughNodes).toBe(0);
    expect(next.crossings).toBe(0);
    expect(moved.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: "a", x: 0, y: 40 },
      { id: "b", x: 0, y: 240 },
      { id: "c", x: 520, y: 240 },
      { id: "d", x: 520, y: 70 },
    ]);
  });

  it("does not move unrelated nodes when only routes are recalculated", () => {
    const nodes = [node("a", 0, 0), node("b", 300, 120)];
    const before = nodes.map((item) => ({ ...item }));
    routeWorkflow(nodes, [{ id: "a-b", source: "a", target: "b" }]);
    expect(nodes).toEqual(before);
  });
});

describe("workflow auto arrange", () => {
  it("places the trigger before downstream nodes and separates branches", async () => {
    const nodes = [
      node("trigger", 900, 40),
      node("action-1", 20, 400),
      node("action-2", 640, 10),
      node("action-3", 40, 20),
      node("action-4", 300, 300),
      node("action-5", 120, 220),
      node("decision-1", 700, 300),
      node("decision-2", 200, 80),
      node("join", 10, 300),
    ];
    const edges: LayoutEdge[] = [
      { id: "t1", source: "trigger", target: "action-1" },
      { id: "t2", source: "trigger", target: "action-2" },
      { id: "a1", source: "action-1", target: "decision-1" },
      { id: "a2", source: "action-2", target: "decision-2" },
      { id: "a3", source: "action-3", target: "decision-1" },
      { id: "d1", source: "decision-1", target: "action-4" },
      { id: "d2", source: "decision-1", target: "action-5" },
      { id: "d3", source: "decision-2", target: "action-5" },
      { id: "d4", source: "decision-2", target: "join" },
      { id: "j1", source: "action-4", target: "join" },
      { id: "j2", source: "action-5", target: "join" },
      { id: "long", source: "trigger", target: "join" },
    ];
    const arranged = await autoArrange(nodes, edges);
    const positions = arranged.positions;
    const placed = nodes.map((item) => ({ ...item, ...positions[item.id] }));
    expect(boxesOverlap(placed)).toBe(false);
    expect(positions.trigger?.x).toBeLessThan(positions["action-1"]?.x ?? 0);
    expect(positions.trigger?.x).toBeLessThan(positions.join?.x ?? 0);
    expect(positions["decision-1"]?.x).toBeLessThan(positions["action-4"]?.x ?? 0);
    expect(Object.keys(arranged.routes)).toHaveLength(edges.length);
    const report = routeWorkflow(placed, edges);
    expect(report.throughNodes).toBe(0);
    expect(report.crossings).toBe(0);
    expect(edges.every((edge) => edge.source && edge.target)).toBe(true);
  });

  it("arranges each system workflow from its connections", async () => {
    for (const workflow of SYSTEM_WORKFLOWS) {
      const links = workflow.edges ?? [];
      if (links.length < 2) continue;
      const nodes: LayoutNode[] = workflow.stages.map((stage, index) => ({
        id: stage.id,
        x: (index % 3) * 40,
        y: index * 24,
        width: 210,
        height: 96,
        layer: stage.type === "start" ? "FIRST" : stage.type === "end" ? "LAST" : undefined,
      }));
      const edges: LayoutEdge[] = links.map((edge, index) => ({
        id: `${workflow.id}-${index}`,
        source: edge.source,
        target: edge.target,
      }));
      const arranged = await autoArrange(nodes, edges);
      const placed = nodes.map((item) => ({ ...item, ...(arranged.positions[item.id] ?? {}) }));
      const start = nodes.find((item) => item.layer === "FIRST");
      if (start) {
        const startX = arranged.positions[start.id]?.x ?? 0;
        const others = placed.filter((item) => item.id !== start.id).map((item) => item.x);
        expect(startX).toBeLessThanOrEqual(Math.min(...others));
      }
      expect(boxesOverlap(placed)).toBe(false);
      const elkReport = measureRoutes(placed, edges, arranged.routes);
      expect(elkReport.throughNodes, workflow.name).toBe(0);
      expect(elkReport.crossings, workflow.name).toBe(0);
      expect(Object.keys(arranged.routes)).toHaveLength(edges.length);
      const cleaned = routeWorkflow(placed, edges);
      expect(cleaned.throughNodes, workflow.name).toBe(0);
      expect(cleaned.crossings, workflow.name).toBe(0);
    }
  });
});
