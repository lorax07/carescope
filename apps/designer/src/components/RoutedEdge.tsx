import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { createContext, useContext } from "react";
import { connectionMarkPoint, connectionVisual, endpointIcon } from "../connectionTypes";
import { labelAnchor, pointsToPath, type Point } from "../workflowLayout";
import { ConnectionTypeIcon } from "./ConnectionTypeIcon";

export const WorkflowRoutesContext = createContext<Record<string, Point[]>>({});

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.8 && Math.abs(a.y - b.y) < 0.8;
}

function aligned(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1 || Math.abs(a.y - b.y) < 1;
}

function attachHandles(points: Point[], source: Point, target: Point): Point[] {
  if (points.length < 2) return [source, target];
  const next = points.map((point) => ({ ...point }));
  const first = next[0];
  if (first && !samePoint(first, source)) {
    const gap = Math.abs(first.x - source.x) + Math.abs(first.y - source.y);
    if (gap <= 16) next[0] = { ...source };
    else next.unshift(...(aligned(first, source) ? [source] : [source, { x: source.x, y: first.y }]));
  }
  const last = next[next.length - 1];
  if (last && !samePoint(last, target)) {
    const gap = Math.abs(last.x - target.x) + Math.abs(last.y - target.y);
    if (gap <= 16) next[next.length - 1] = { ...target };
    else if (aligned(last, target)) next.push(target);
    else next.push({ x: target.x, y: last.y }, target);
  }
  return next;
}

export function RoutedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  data,
  markerEnd,
  style,
  interactionWidth,
}: EdgeProps) {
  const routes = useContext(WorkflowRoutesContext);
  const routed = routes[id];
  const points = attachHandles(
    routed && routed.length > 1
      ? routed
      : [
          { x: sourceX, y: sourceY },
          { x: sourceX + Math.max(24, (targetX - sourceX) / 2), y: sourceY },
          { x: sourceX + Math.max(24, (targetX - sourceX) / 2), y: targetY },
          { x: targetX, y: targetY },
        ],
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
  );
  const anchor = labelAnchor(points);
  const mark = connectionMarkPoint(points);
  const record = data as { connectionType?: string; startEndChoice?: string } | undefined;
  const visual = connectionVisual({
    connectionType: record?.connectionType,
    startEndChoice: record?.startEndChoice,
    label: typeof label === "string" ? label : undefined,
  });
  const icon = endpointIcon(visual);
  return (
    <>
      <BaseEdge id={id} path={pointsToPath(points)} markerEnd={markerEnd} style={style} interactionWidth={interactionWidth} />
      <EdgeLabelRenderer>
        <div
          className="wf-connection-mark"
          data-connection-icon={icon}
          style={{ transform: `translate(-50%, -50%) translate(${mark.x}px, ${mark.y}px)` }}
        >
          <ConnectionTypeIcon kind={icon} />
        </div>
        {label ? (
          <div
            className="wf-routed-label"
            style={{ transform: `translate(-50%, -50%) translate(${anchor.x}px, ${anchor.y}px)` }}
          >
            {label}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}
