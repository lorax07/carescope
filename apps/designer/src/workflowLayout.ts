import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";

export type Point = { x: number; y: number };

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer?: "FIRST" | "LAST";
};

export type LayoutEdge = {
  id: string;
  source: string;
  target: string;
};

export type RouteReport = {
  routes: Record<string, Point[]>;
  crossings: number;
  throughNodes: number;
};

const PADDING = 18;
const OUTER = 72;
const LANE_GAP = 22;

const elk = new ELK();

export type ArrangeResult = {
  positions: Record<string, Point>;
  routes: Record<string, Point[]>;
};

export async function autoArrange(nodes: LayoutNode[], edges: LayoutEdge[]): Promise<ArrangeResult> {
  if (nodes.length === 0) return { positions: {}, routes: {} };
  const graph: ElkNode = {
    id: "workflow",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.separateConnectedComponents": "true",
      "elk.spacing.componentComponent": "90",
      "elk.spacing.nodeNode": "72",
      "elk.layered.spacing.nodeNodeBetweenLayers": "168",
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.spacing.edgeNode": "32",
      "elk.spacing.edgeEdge": "26",
      "elk.spacing.portPort": "14",
      "elk.layered.unnecessaryBendpoints": "true",
      "elk.layered.feedbackEdges": "true",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "NONE",
      "elk.layered.thoroughness": "40",
      "elk.padding": "[top=48,left=48,bottom=48,right=48]",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: Math.max(160, node.width),
      height: Math.max(72, node.height),
      layoutOptions: {
        "elk.portConstraints": "FIXED_SIDE",
        ...(node.layer ? { "elk.layered.layering.layerConstraint": node.layer } : {}),
      },
      ports: [
        ...edges.filter((edge) => edge.target === node.id).map((edge) => ({
          id: `${edge.id}:in`,
          layoutOptions: { "elk.port.side": "WEST" },
        })),
        ...edges.filter((edge) => edge.source === node.id).map((edge) => ({
          id: `${edge.id}:out`,
          layoutOptions: { "elk.port.side": "EAST" },
        })),
      ],
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [`${edge.id}:out`],
      targets: [`${edge.id}:in`],
    })),
  };
  const laid = await elk.layout(graph);
  const positions: Record<string, Point> = {};
  for (const child of laid.children ?? []) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
  }
  const placed = nodes.map((node) => ({ ...node, ...(positions[node.id] ?? {}) }));
  const elkRoutes = routesFromElk(laid);
  const routed = routeWorkflow(placed, edges);
  const elkCrossings = countCrossings(elkRoutes);
  const elkThrough = countThroughNodes(elkRoutes, edges, new Map(placed.map((node) => [node.id, node])));
  const useRouter = routed.crossings < elkCrossings || (routed.crossings === elkCrossings && routed.throughNodes <= elkThrough);
  return { positions, routes: useRouter ? routed.routes : elkRoutes };
}

function routesFromElk(laid: ElkNode): Record<string, Point[]> {
  const routes: Record<string, Point[]> = {};
  for (const edge of laid.edges ?? []) {
    const sections = edge.sections ?? [];
    const points = sections.flatMap((section, index) => {
      const piece = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].filter(
        (point): point is Point => Boolean(point),
      );
      return index === 0 ? piece : piece.slice(1);
    });
    if (points.length > 1) routes[edge.id] = simplify(points);
  }
  return routes;
}

export function routeWorkflow(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: { avoidCrossings?: boolean; preset?: Record<string, Point[]> },
): RouteReport {
  const routes = routeEdges(nodes, edges, options?.avoidCrossings !== false, options?.preset ?? {});
  return reportFor(nodes, edges, routes);
}

export function rerouteMoved(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  previous: Record<string, Point[]>,
  movedId: string,
  options?: { thorough?: boolean },
): RouteReport {
  const moved = nodes.find((node) => node.id === movedId);
  const refresh = new Set<string>();
  for (const edge of edges) {
    const prior = previous[edge.id];
    const blockedByMove = Boolean(moved && prior && prior.length > 1 && pathHits(prior, [moved], edge));
    if (!prior || prior.length < 2 || edge.source === movedId || edge.target === movedId || blockedByMove) {
      refresh.add(edge.id);
    }
  }
  const preset: Record<string, Point[]> = {};
  for (const edge of edges) {
    if (!refresh.has(edge.id) && previous[edge.id]) preset[edge.id] = previous[edge.id]!;
  }
  const routes = routeEdges(nodes, edges, options?.thorough !== false, preset);
  return reportFor(nodes, edges, routes);
}

function reportFor(nodes: LayoutNode[], edges: LayoutEdge[], routes: Record<string, Point[]>): RouteReport {
  return {
    routes,
    crossings: countCrossings(routes),
    throughNodes: countThroughNodes(routes, edges, new Map(nodes.map((node) => [node.id, node]))),
  };
}

function routeEdges(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  avoidCrossings: boolean,
  preset: Record<string, Point[]>,
): Record<string, Point[]> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const routes: Record<string, Point[]> = { ...preset };
  const pending = edges.filter((edge) => !preset[edge.id]);
  if (!avoidCrossings) {
    for (const edge of pending) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      routes[edge.id] = source && target
        ? fastRoute(handle(source, "source"), handle(target, "target"), nodes, edge)
        : [];
    }
    return routes;
  }

  const ordered = [...pending].sort((a, b) => edgeRank(byId, a) - edgeRank(byId, b));
  const committed: Segment[] = edges.flatMap((edge) => (preset[edge.id] ? segmentsOf(preset[edge.id]!) : []));
  for (const edge of ordered) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) {
      routes[edge.id] = [];
      continue;
    }
    const path = findPath(handle(source, "source"), handle(target, "target"), nodes, edge, committed);
    routes[edge.id] = path;
    committed.push(...segmentsOf(path));
  }

  for (let pass = 0; pass < 4; pass += 1) {
    let improved = false;
    for (const edge of ordered) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      const others = committedExcept(routes, edge.id);
      const next = findPath(handle(source, "source"), handle(target, "target"), nodes, edge, others);
      const previous = routes[edge.id] ?? [];
      const before = countCrossings(routes);
      routes[edge.id] = next;
      const after = countCrossings(routes);
      const shorter = pathCost(next, others) + 1 < pathCost(previous, others);
      if (after < before || (after === before && shorter)) {
        improved = true;
      } else {
        routes[edge.id] = previous;
      }
    }
    if (!improved) break;
  }
  return routes;
}

function edgeRank(byId: Map<string, LayoutNode>, edge: LayoutEdge): number {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  const forward = source && target && target.x >= source.x ? 0 : 100000;
  return forward + span(byId, edge);
}

export function measureRoutes(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  routes: Record<string, Point[]>,
): { crossings: number; throughNodes: number } {
  return {
    crossings: countCrossings(routes),
    throughNodes: countThroughNodes(routes, edges, new Map(nodes.map((node) => [node.id, node]))),
  };
}

export function boxesOverlap(nodes: LayoutNode[]): boolean {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a || !b) continue;
      const separated =
        a.x + a.width + 12 <= b.x ||
        b.x + b.width + 12 <= a.x ||
        a.y + a.height + 12 <= b.y ||
        b.y + b.height + 12 <= a.y;
      if (!separated) return true;
    }
  }
  return false;
}

export function pointsToPath(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`).join(" ");
}

export function labelAnchor(points: Point[]): Point {
  let best = points[0] ?? { x: 0, y: 0 };
  let bestLength = -1;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (length > bestLength) {
      bestLength = length;
      best = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10 };
    }
  }
  return best;
}

type Segment = { x1: number; y1: number; x2: number; y2: number };

function handle(node: LayoutNode, side: "source" | "target"): Point {
  return {
    x: side === "source" ? node.x + node.width : node.x,
    y: node.y + node.height / 2,
  };
}

function span(byId: Map<string, LayoutNode>, edge: LayoutEdge): number {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  if (!source || !target) return 0;
  return Math.abs(target.x - source.x) + Math.abs(target.y - source.y);
}

function fastRoute(start: Point, goal: Point, nodes: LayoutNode[], edge: LayoutEdge): Point[] {
  const foreign = nodes.filter((node) => node.id !== edge.source && node.id !== edge.target);
  const lanes = [
    start.x + 36,
    goal.x - 36,
    (start.x + goal.x) / 2,
    ...foreign.flatMap((node) => [node.x - PADDING - 10, node.x + node.width + PADDING + 10]),
  ];
  let best: Point[] | null = null;
  let bestCost = Infinity;
  for (const lane of lanes) {
    const path = simplify([start, { x: lane, y: start.y }, { x: lane, y: goal.y }, goal]);
    if (pathHits(path, nodes, edge)) continue;
    const cost = pathCost(path, []);
    if (cost < bestCost) {
      best = path;
      bestCost = cost;
    }
  }
  return best ?? fallback(start, goal, nodes);
}

function pathHits(points: Point[], nodes: LayoutNode[], edge: LayoutEdge): boolean {
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    if (from && to && hitsObstacle(from, to, nodes, edge)) return true;
  }
  return false;
}

function findPath(start: Point, goal: Point, nodes: LayoutNode[], edge: LayoutEdge, blocked: Segment[]): Point[] {
  const xs = axisLines(
    [
      start.x,
      goal.x,
      ...nodes.flatMap((node) => [node.x - PADDING, node.x + node.width + PADDING]),
      Math.min(start.x, goal.x, ...nodes.map((node) => node.x)) - OUTER,
      Math.max(start.x, goal.x, ...nodes.map((node) => node.x + node.width)) + OUTER,
    ],
    [start.x, goal.x],
  );
  const ys = axisLines(
    [
      start.y,
      goal.y,
      ...nodes.flatMap((node) => [node.y - PADDING, node.y + node.height + PADDING]),
      Math.min(start.y, goal.y, ...nodes.map((node) => node.y)) - OUTER,
      Math.max(start.y, goal.y, ...nodes.map((node) => node.y + node.height)) + OUTER,
    ],
    [start.y, goal.y],
  );
  const startIndex = locate(xs, ys, start);
  const goalIndex = locate(xs, ys, goal);
  if (!startIndex || !goalIndex) return fallback(start, goal, nodes);

  const key = (i: number, j: number, dir: number) => i + j * xs.length + dir * xs.length * ys.length;
  const startKey = key(startIndex.i, startIndex.j, 0);
  const goalKeys = new Set([1, 2, 3, 4].map((dir) => key(goalIndex.i, goalIndex.j, dir)));
  goalKeys.add(key(goalIndex.i, goalIndex.j, 0));

  const g = new Map<number, number>([[startKey, 0]]);
  const parent = new Map<number, number>();
  const open = new Heap();
  open.push(pixelHeuristic(xs, ys, startIndex, goalIndex), startKey);

  const decode = (state: number) => {
    const dir = Math.floor(state / (xs.length * ys.length));
    const rest = state % (xs.length * ys.length);
    const j = Math.floor(rest / xs.length);
    const i = rest % xs.length;
    return { i, j, dir };
  };

  let found: number | null = null;
  let guard = 0;
  while (!open.empty && guard < 80000) {
    guard += 1;
    const current = open.pop();
    if (!current) break;
    if ((g.get(current.state) ?? Infinity) < current.g) continue;
    if (goalKeys.has(current.state)) {
      found = current.state;
      break;
    }
    const here = decode(current.state);
    const steps = [
      [1, 0, 1],
      [-1, 0, 2],
      [0, 1, 3],
      [0, -1, 4],
    ] as const;
    for (const [di, dj, dir] of steps) {
      const ni = here.i + di;
      const nj = here.j + dj;
      if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) continue;
      const from = { x: xs[here.i] ?? 0, y: ys[here.j] ?? 0 };
      const to = { x: xs[ni] ?? 0, y: ys[nj] ?? 0 };
      if (hitsObstacle(from, to, nodes, edge)) continue;
      const bend = here.dir !== 0 && here.dir !== dir ? 28 : 0;
      const cross = crossingsWith(from, to, blocked) * 900;
      const overlap = overlapWith(from, to, blocked) * 0.85;
      const step = Math.abs(to.x - from.x) + Math.abs(to.y - from.y) + bend + cross + overlap;
      const nextState = key(ni, nj, dir);
      const nextG = (g.get(current.state) ?? Infinity) + step;
      if (nextG >= (g.get(nextState) ?? Infinity)) continue;
      g.set(nextState, nextG);
      parent.set(nextState, current.state);
      const f = nextG + pixelHeuristic(xs, ys, { i: ni, j: nj }, goalIndex);
      open.push(f, nextState, nextG);
    }
  }

  if (found === null) return fallback(start, goal, nodes);
  const points: Point[] = [];
  let cursor: number | undefined = found;
  const seen = new Set<number>();
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor);
    const cell = decode(cursor);
    points.push({ x: xs[cell.i] ?? start.x, y: ys[cell.j] ?? start.y });
    cursor = parent.get(cursor);
  }
  points.reverse();
  if (!points.length || points[0]?.x !== start.x || points[0]?.y !== start.y) points.unshift(start);
  const last = points[points.length - 1];
  if (!last || last.x !== goal.x || last.y !== goal.y) points.push(goal);
  return simplify(points);
}

function axisLines(values: number[], pins: number[]): number[] {
  const sorted = [...new Set(values.map((value) => round(value)))].sort((a, b) => a - b);
  const withLanes: number[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index] ?? 0;
    const right = sorted[index + 1] ?? left;
    withLanes.push(left);
    const width = right - left;
    const lanes = Math.min(4, Math.max(0, Math.floor(width / LANE_GAP) - 1));
    for (let lane = 1; lane <= lanes; lane += 1) withLanes.push(left + (width * lane) / (lanes + 1));
  }
  const last = sorted[sorted.length - 1];
  if (last !== undefined) withLanes.push(last);
  for (const pin of pins) withLanes.push(round(pin));
  return [...new Set(withLanes.map((value) => round(value)))].sort((a, b) => a - b);
}

function locate(xs: number[], ys: number[], point: Point): { i: number; j: number } | null {
  const i = xs.findIndex((value) => value === round(point.x));
  const j = ys.findIndex((value) => value === round(point.y));
  if (i < 0 || j < 0) return null;
  return { i, j };
}

function pixelHeuristic(
  xs: number[],
  ys: number[],
  from: { i: number; j: number },
  goal: { i: number; j: number },
): number {
  return Math.abs((xs[from.i] ?? 0) - (xs[goal.i] ?? 0)) + Math.abs((ys[from.j] ?? 0) - (ys[goal.j] ?? 0));
}

function hitsObstacle(a: Point, b: Point, nodes: LayoutNode[], edge: LayoutEdge): boolean {
  return nodes.some((node) => {
    const own = node.id === edge.source || node.id === edge.target;
    const pad = own ? 0 : PADDING;
    return segmentHitsBox(a, b, {
      x: node.x - pad,
      y: node.y - pad,
      width: node.width + pad * 2,
      height: node.height + pad * 2,
    });
  });
}

function segmentHitsBox(a: Point, b: Point, box: { x: number; y: number; width: number; height: number }): boolean {
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const bottom = box.y + box.height;
  if (Math.abs(a.y - b.y) < 0.1) {
    const y = a.y;
    if (y <= top || y >= bottom) return false;
    return Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right;
  }
  if (Math.abs(a.x - b.x) < 0.1) {
    const x = a.x;
    if (x <= left || x >= right) return false;
    return Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom;
  }
  return false;
}

function crossingsWith(a: Point, b: Point, blocked: Segment[]): number {
  let count = 0;
  for (const segment of blocked) {
    const perpendicular = Math.abs(a.y - b.y) < 0.1 !== Math.abs(segment.y1 - segment.y2) < 0.1;
    if (segmentsCross(a, b, segment) || (perpendicular && pointSplitsSegment(b, segment))) count += 1;
  }
  return count;
}

function pointSplitsSegment(point: Point, segment: Segment): boolean {
  if (Math.abs(segment.y1 - segment.y2) < 0.1 && Math.abs(point.y - segment.y1) < 0.1) {
    return point.x > Math.min(segment.x1, segment.x2) + 0.5 && point.x < Math.max(segment.x1, segment.x2) - 0.5;
  }
  if (Math.abs(segment.x1 - segment.x2) < 0.1 && Math.abs(point.x - segment.x1) < 0.1) {
    return point.y > Math.min(segment.y1, segment.y2) + 0.5 && point.y < Math.max(segment.y1, segment.y2) - 0.5;
  }
  return false;
}

function overlapWith(a: Point, b: Point, blocked: Segment[]): number {
  let amount = 0;
  for (const segment of blocked) {
    amount += overlapLength(a, b, segment);
  }
  return amount;
}

function segmentsCross(a: Point, b: Point, segment: Segment): boolean {
  const horizontal = Math.abs(a.y - b.y) < 0.1;
  const otherHorizontal = Math.abs(segment.y1 - segment.y2) < 0.1;
  if (horizontal === otherHorizontal) return false;
  const h1 = horizontal ? a : { x: segment.x1, y: segment.y1 };
  const h2 = horizontal ? b : { x: segment.x2, y: segment.y2 };
  const v1 = horizontal ? { x: segment.x1, y: segment.y1 } : a;
  const v2 = horizontal ? { x: segment.x2, y: segment.y2 } : b;
  const vx = v1.x;
  const hy = h1.y;
  return vx > Math.min(h1.x, h2.x) + 0.5 && vx < Math.max(h1.x, h2.x) - 0.5 && hy > Math.min(v1.y, v2.y) + 0.5 && hy < Math.max(v1.y, v2.y) - 0.5;
}

function overlapLength(a: Point, b: Point, segment: Segment): number {
  if (Math.abs(a.y - b.y) < 0.1 && Math.abs(segment.y1 - segment.y2) < 0.1 && Math.abs(a.y - segment.y1) < 0.1) {
    const start = Math.max(Math.min(a.x, b.x), Math.min(segment.x1, segment.x2));
    const end = Math.min(Math.max(a.x, b.x), Math.max(segment.x1, segment.x2));
    return Math.max(0, end - start);
  }
  if (Math.abs(a.x - b.x) < 0.1 && Math.abs(segment.x1 - segment.x2) < 0.1 && Math.abs(a.x - segment.x1) < 0.1) {
    const start = Math.max(Math.min(a.y, b.y), Math.min(segment.y1, segment.y2));
    const end = Math.min(Math.max(a.y, b.y), Math.max(segment.y1, segment.y2));
    return Math.max(0, end - start);
  }
  return 0;
}

function segmentsOf(points: Point[]): Segment[] {
  const segments: Segment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (!a || !b) continue;
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return segments;
}

function committedExcept(routes: Record<string, Point[]>, edgeId: string): Segment[] {
  return Object.entries(routes).flatMap(([id, points]) => (id === edgeId ? [] : segmentsOf(points)));
}

function pathCost(points: Point[], blocked: Segment[]): number {
  let cost = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (!a || !b) continue;
    cost += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    cost += crossingsWith(a, b, blocked) * 900;
  }
  for (let index = 1; index < points.length - 1; index += 1) cost += 28;
  return cost;
}

function countCrossings(routes: Record<string, Point[]>): number {
  const entries = Object.values(routes).map(segmentsOf);
  let count = 0;
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      for (const a of entries[i] ?? []) {
        for (const b of entries[j] ?? []) {
          if (segmentsCross({ x: a.x1, y: a.y1 }, { x: a.x2, y: a.y2 }, b)) count += 1;
        }
      }
    }
  }
  return count;
}

function countThroughNodes(routes: Record<string, Point[]>, edges: LayoutEdge[], byId: Map<string, LayoutNode>): number {
  let count = 0;
  for (const edge of edges) {
    const points = routes[edge.id] ?? [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      if (!a || !b) continue;
      for (const node of byId.values()) {
        if (node.id === edge.source || node.id === edge.target) continue;
        if (segmentHitsBox(a, b, node)) count += 1;
      }
    }
  }
  return count;
}

function fallback(start: Point, goal: Point, nodes: LayoutNode[]): Point[] {
  const top = Math.min(start.y, goal.y, ...nodes.map((node) => node.y)) - OUTER;
  return simplify([
    start,
    { x: start.x + 28, y: start.y },
    { x: start.x + 28, y: top },
    { x: goal.x - 28, y: top },
    { x: goal.x - 28, y: goal.y },
    goal,
  ]);
}

function simplify(points: Point[]): Point[] {
  const cleaned: Point[] = [];
  for (const point of points) {
    const previous = cleaned[cleaned.length - 1];
    if (previous && Math.abs(previous.x - point.x) < 0.5 && Math.abs(previous.y - point.y) < 0.5) continue;
    const before = cleaned[cleaned.length - 2];
    if (
      previous &&
      before &&
      ((Math.abs(before.x - previous.x) < 0.5 && Math.abs(previous.x - point.x) < 0.5) ||
        (Math.abs(before.y - previous.y) < 0.5 && Math.abs(previous.y - point.y) < 0.5))
    ) {
      cleaned[cleaned.length - 1] = point;
      continue;
    }
    cleaned.push(point);
  }
  return cleaned;
}

function round(value: number): number {
  return Math.round(value * 2) / 2;
}

class Heap {
  private items: { f: number; state: number; g: number }[] = [];

  get empty(): boolean {
    return this.items.length === 0;
  }

  push(f: number, state: number, g = 0): void {
    this.items.push({ f, state, g });
    this.bubble(this.items.length - 1);
  }

  pop(): { f: number; state: number; g: number } | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (!top) return undefined;
    if (this.items.length && last) {
      this.items[0] = last;
      this.sink(0);
    }
    return top;
  }

  private bubble(index: number): void {
    let cursor = index;
    while (cursor > 0) {
      const parent = Math.floor((cursor - 1) / 2);
      const current = this.items[cursor];
      const above = this.items[parent];
      if (!current || !above || above.f <= current.f) break;
      this.items[parent] = current;
      this.items[cursor] = above;
      cursor = parent;
    }
  }

  private sink(index: number): void {
    let cursor = index;
    for (;;) {
      const left = cursor * 2 + 1;
      const right = left + 1;
      let best = cursor;
      const leftItem = this.items[left];
      const rightItem = this.items[right];
      const bestItem = this.items[best];
      if (leftItem && bestItem && leftItem.f < bestItem.f) best = left;
      if (rightItem && this.items[best] && rightItem.f < (this.items[best]?.f ?? Infinity)) best = right;
      if (best === cursor) break;
      const next = this.items[best];
      const current = this.items[cursor];
      if (!next || !current) break;
      this.items[best] = current;
      this.items[cursor] = next;
      cursor = best;
    }
  }
}
