export const CONNECTION_TYPES = ["Trigger", "Decision tree", "Start/End"] as const;

export type NodeConnectionType = (typeof CONNECTION_TYPES)[number];

export type StartEndChoice = "Start" | "End";

export type ConnectionIconKind = "trigger" | "decision" | "start-end" | "start" | "end";

export type ConnectionVisual = {
  connectionType: NodeConnectionType;
  startEndChoice?: StartEndChoice;
};

type ConnectionInput = {
  edgeType?: string;
  label?: string;
  connectionType?: string;
  startEndChoice?: string;
};

function choiceFrom(input: ConnectionInput): StartEndChoice | undefined {
  if (input.startEndChoice === "Start" || input.startEndChoice === "End") return input.startEndChoice;
  if (input.connectionType === "Start" || input.label === "Start") return "Start";
  if (input.connectionType === "End" || input.label === "End") return "End";
  return undefined;
}

export function connectionVisual(input: ConnectionInput): ConnectionVisual {
  if (input.connectionType === "Decision tree" || input.edgeType === "conditional") {
    return { connectionType: "Decision tree" };
  }
  if (input.connectionType === "Trigger") return { connectionType: "Trigger" };
  const choice = choiceFrom(input);
  if (
    input.connectionType === "Start/End" ||
    input.connectionType === "Start" ||
    input.connectionType === "End" ||
    choice
  ) {
    return { connectionType: "Start/End", startEndChoice: choice ?? "End" };
  }
  return { connectionType: "Trigger" };
}

export function dropdownIcon(type: NodeConnectionType): ConnectionIconKind {
  if (type === "Trigger") return "trigger";
  if (type === "Decision tree") return "decision";
  return "start-end";
}

export function endpointIcon(visual: ConnectionVisual): ConnectionIconKind {
  if (visual.connectionType === "Trigger") return "trigger";
  if (visual.connectionType === "Decision tree") return "decision";
  return visual.startEndChoice === "Start" ? "start" : "end";
}

export function connectionMarkPoint(points: { x: number; y: number }[], offset = 36): { x: number; y: number } {
  const target = points[points.length - 1];
  if (!target) return { x: 0, y: 0 };
  let remaining = offset;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const end = points[index];
    const start = points[index - 1];
    if (!end || !start) continue;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.5) continue;
    if (remaining <= length) {
      const ratio = remaining / length;
      return { x: end.x - dx * ratio, y: end.y - dy * ratio };
    }
    remaining -= length;
  }
  return points[0] ?? target;
}
