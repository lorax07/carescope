/**
 * Workflow definition validator — run before publish.
 */

import type { PluginRegistry } from "./plugin-registry.js";
import type {
  ValidationIssue,
  ValidationResult,
  WorkflowDefinition,
} from "./types.js";

export function validateWorkflow(
  workflow: WorkflowDefinition,
  registry: PluginRegistry
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!workflow.name?.trim()) {
    errors.push({
      code: "MISSING_NAME",
      message: "Workflow name is required",
      severity: "error",
    });
  }

  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  const starts = workflow.nodes.filter((n) => n.type === "start");
  const ends = workflow.nodes.filter((n) => n.type === "end");

  if (starts.length === 0) {
    errors.push({
      code: "NO_START",
      message: "Workflow must have a Start node",
      severity: "error",
    });
  } else if (starts.length > 1) {
    errors.push({
      code: "MULTIPLE_START",
      message: "Workflow must have exactly one Start node",
      severity: "error",
    });
  }

  if (ends.length === 0) {
    errors.push({
      code: "NO_END",
      message: "Workflow must have at least one End node",
      severity: "error",
    });
  }

  // Duplicate node ids
  const seen = new Set<string>();
  for (const node of workflow.nodes) {
    if (seen.has(node.id)) {
      errors.push({
        code: "DUPLICATE_NODE_ID",
        message: `Duplicate node id: ${node.id}`,
        nodeId: node.id,
        severity: "error",
      });
    }
    seen.add(node.id);

    if (!registry.has(node.type)) {
      errors.push({
        code: "UNKNOWN_NODE_TYPE",
        message: `Unknown node type '${node.type}'`,
        nodeId: node.id,
        severity: "error",
      });
    } else {
      const configIssues = registry.validateConfig(node.type, node.config);
      for (const issue of configIssues) {
        (issue.severity === "error" ? errors : warnings).push({
          ...issue,
          nodeId: node.id,
        });
      }
    }

    if (!node.label?.trim()) {
      warnings.push({
        code: "MISSING_LABEL",
        message: "Node is missing a label",
        nodeId: node.id,
        severity: "warning",
      });
    }
  }

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const id of nodeIds) {
    incoming.set(id, 0);
    outgoing.set(id, 0);
  }

  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        code: "INVALID_EDGE_SOURCE",
        message: `Edge source '${edge.source}' does not exist`,
        edgeId: edge.id,
        severity: "error",
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        code: "INVALID_EDGE_TARGET",
        message: `Edge target '${edge.target}' does not exist`,
        edgeId: edge.id,
        severity: "error",
      });
    }
    if (edge.source === edge.target) {
      warnings.push({
        code: "SELF_LOOP",
        message: "Edge connects a node to itself",
        edgeId: edge.id,
        severity: "warning",
      });
    }
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  // Reachability from start
  if (starts.length === 1) {
    const startId = starts[0]!.id;
    const reachable = new Set<string>();
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const edge of workflow.edges) {
        if (edge.source === id && !reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
    for (const node of workflow.nodes) {
      if (!reachable.has(node.id)) {
        warnings.push({
          code: "UNREACHABLE_NODE",
          message: `Node '${node.label || node.id}' is unreachable from Start`,
          nodeId: node.id,
          severity: "warning",
        });
      }
    }
  }

  for (const node of workflow.nodes) {
    if (node.type === "start" && (incoming.get(node.id) ?? 0) > 0) {
      warnings.push({
        code: "START_HAS_INCOMING",
        message: "Start node should not have incoming edges",
        nodeId: node.id,
        severity: "warning",
      });
    }
    if (node.type === "end" && (outgoing.get(node.id) ?? 0) > 0) {
      warnings.push({
        code: "END_HAS_OUTGOING",
        message: "End node should not have outgoing edges",
        nodeId: node.id,
        severity: "warning",
      });
    }
    if (
      node.type !== "end" &&
      node.type !== "exception_handling" &&
      (outgoing.get(node.id) ?? 0) === 0
    ) {
      warnings.push({
        code: "DEAD_END",
        message: `Node '${node.label || node.id}' has no outgoing edges`,
        nodeId: node.id,
        severity: "warning",
      });
    }
    if (node.type === "decision" || node.type === "condition") {
      const outs = workflow.edges.filter((e) => e.source === node.id);
      if (outs.length < 2) {
        warnings.push({
          code: "DECISION_BRANCHES",
          message: "Decision/condition nodes should have at least two branches",
          nodeId: node.id,
          severity: "warning",
        });
      }
    }
  }

  if (workflow.status === "published" && workflow.triggers.length === 0) {
    warnings.push({
      code: "NO_TRIGGERS",
      message: "Published workflow has no triggers — it can only be started manually",
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
