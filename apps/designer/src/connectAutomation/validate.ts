import { nodeIssues, nodeType } from "./registry";
import type { FlowEdge, FlowNode, Issue, WorkflowDraft } from "./types";

function triggers(nodes: FlowNode[]): FlowNode[] {
  return nodes.filter((node) => nodeType(node.type)?.category === "trigger");
}

function reachable(nodes: FlowNode[], edges: FlowEdge[]): Set<string> {
  const starts = triggers(nodes).map((node) => node.id);
  const seen = new Set<string>();
  const stack = [...starts];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const edge of edges) if (edge.source === id) stack.push(edge.target);
  }
  return seen;
}

export function validateWorkflow(draft: WorkflowDraft, connectionIds: string[]): Issue[] {
  const issues: Issue[] = [];
  if (!draft.name.trim()) issues.push({ severity: "error", code: "NAME", message: "Workflow name is required." });
  const starts = triggers(draft.nodes);
  if (starts.length === 0) issues.push({ severity: "error", code: "TRIGGER", message: "Add one trigger." });
  if (starts.length > 1) issues.push({ severity: "error", code: "TRIGGER", message: "Use one trigger. Extra triggers will not run." });
  const ids = new Set(draft.nodes.map((node) => node.id));
  for (const node of draft.nodes) issues.push(...nodeIssues(node, connectionIds));
  for (const edge of draft.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      issues.push({ severity: "error", code: "EDGE", message: "A connection points at a missing node." });
    }
    if (edge.source === edge.target) issues.push({ severity: "error", code: "CYCLE", message: "A node cannot connect to itself.", nodeId: edge.source });
  }
  const seen = reachable(draft.nodes, draft.edges);
  for (const node of draft.nodes) {
    if (!seen.has(node.id)) issues.push({ severity: "warning", code: "UNREACHABLE", message: `${node.label} is not reachable from the trigger.`, nodeId: node.id });
    const def = nodeType(node.type);
    const outgoing = draft.edges.filter((edge) => edge.source === node.id);
    if (def && def.category !== "trigger" && def.type !== "logic.stop" && outgoing.length === 0) {
      issues.push({ severity: "warning", code: "DEAD_END", message: `${node.label} has no next node.`, nodeId: node.id });
    }
    if (def?.type === "logic.if") {
      if (!outgoing.some((edge) => edge.sourceHandle === "true") || !outgoing.some((edge) => edge.sourceHandle === "false")) {
        issues.push({ severity: "error", code: "BRANCH", message: `${node.label} needs a true branch and a false branch.`, nodeId: node.id });
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let cycle = false;
  function walk(id: string) {
    if (visiting.has(id)) {
      cycle = true;
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of draft.edges) if (edge.source === id) walk(edge.target);
    visiting.delete(id);
    visited.add(id);
  }
  for (const start of starts) walk(start.id);
  if (cycle) issues.push({ severity: "error", code: "CYCLE", message: "The workflow contains a cycle. Add a stop instead of a loop." });
  return issues;
}

export function blockingIssues(issues: Issue[]): Issue[] {
  return issues.filter((issue) => issue.severity === "error");
}
