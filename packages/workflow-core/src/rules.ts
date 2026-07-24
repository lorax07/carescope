/**
 * Business Rules Engine
 * Rules are stored separately from application code and evaluated visually / programmatically.
 */

import { evaluateBoolean, evaluateExpression } from "./expression.js";
import type {
  BusinessRule,
  RuleAction,
  RuleCondition,
  RuleOperator,
} from "./types.js";

function getFieldValue(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = data;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function applyOperator(op: RuleOperator, left: unknown, right: unknown): boolean {
  switch (op) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "in":
      return Array.isArray(right) && right.includes(left);
    case "not_in":
      return Array.isArray(right) && !right.includes(left);
    case "contains":
      return String(left ?? "").includes(String(right ?? ""));
    case "starts_with":
      return String(left ?? "").startsWith(String(right ?? ""));
    case "ends_with":
      return String(left ?? "").endsWith(String(right ?? ""));
    case "is_null":
      return left == null;
    case "is_not_null":
      return left != null;
    case "matches":
      return new RegExp(String(right)).test(String(left ?? ""));
    case "between": {
      if (!Array.isArray(right) || right.length < 2) return false;
      const n = Number(left);
      return n >= Number(right[0]) && n <= Number(right[1]);
    }
    case "exists":
      return left !== undefined;
    default:
      return false;
  }
}

/** Recursively evaluate a nested If/Then condition tree */
export function evaluateCondition(
  condition: RuleCondition,
  data: Record<string, unknown>
): boolean {
  if (condition.expression) {
    return evaluateBoolean(condition.expression, data);
  }

  if (condition.logic === "not") {
    const child = condition.conditions?.[0];
    if (!child) return true;
    return !evaluateCondition(child, data);
  }

  if (condition.conditions && condition.conditions.length > 0) {
    if (condition.logic === "and") {
      return condition.conditions.every((c) => evaluateCondition(c, data));
    }
    if (condition.logic === "or") {
      return condition.conditions.some((c) => evaluateCondition(c, data));
    }
  }

  if (condition.field && condition.operator) {
    const left = getFieldValue(data, condition.field);
    return applyOperator(condition.operator, left, condition.value);
  }

  return true;
}

export interface RuleEvaluationResult {
  matched: boolean;
  ruleId: string;
  actions: RuleAction[];
  appliedActions: AppliedAction[];
}

export interface AppliedAction {
  type: RuleAction["type"];
  success: boolean;
  result?: unknown;
  error?: string;
}

/** Evaluate a single business rule against data */
export function evaluateRule(
  rule: BusinessRule,
  data: Record<string, unknown>
): RuleEvaluationResult {
  if (!rule.enabled) {
    return { matched: false, ruleId: rule.id, actions: [], appliedActions: [] };
  }
  const matched = evaluateCondition(rule.condition, data);
  return {
    matched,
    ruleId: rule.id,
    actions: matched ? rule.actions : [],
    appliedActions: [],
  };
}

/** Apply rule actions to a mutable data bag; returns updated data copy */
export function applyRuleActions(
  actions: RuleAction[],
  data: Record<string, unknown>
): { data: Record<string, unknown>; applied: AppliedAction[] } {
  const next = structuredClone(data);
  const applied: AppliedAction[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "set_field": {
          const field = String(action.config["field"] ?? "");
          const value = action.config["value"];
          setNested(next, field, value);
          applied.push({ type: action.type, success: true, result: value });
          break;
        }
        case "calculate": {
          const field = String(action.config["field"] ?? "");
          const expr = String(action.config["expression"] ?? "");
          const result = evaluateExpression(expr, next);
          setNested(next, field, result);
          applied.push({ type: action.type, success: true, result });
          break;
        }
        case "validate": {
          const expr = String(action.config["expression"] ?? "true");
          const ok = evaluateBoolean(expr, next);
          if (!ok) {
            applied.push({
              type: action.type,
              success: false,
              error: String(action.config["message"] ?? "Validation failed"),
            });
          } else {
            applied.push({ type: action.type, success: true });
          }
          break;
        }
        case "reject":
          applied.push({
            type: action.type,
            success: true,
            result: action.config["reason"] ?? "Rejected by business rule",
          });
          break;
        case "notify":
        case "assign":
        case "trigger_workflow":
        case "custom":
          applied.push({ type: action.type, success: true, result: action.config });
          break;
        default:
          applied.push({ type: action.type, success: false, error: "Unknown action type" });
      }
    } catch (err) {
      applied.push({
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { data: next, applied };
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (cur[key] == null || typeof cur[key] !== "object") {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

/**
 * Evaluate multiple rules in priority order (lower priority number first).
 * Stops early if a reject action succeeds.
 */
export function evaluateRules(
  rules: BusinessRule[],
  data: Record<string, unknown>
): {
  data: Record<string, unknown>;
  results: RuleEvaluationResult[];
  rejected: boolean;
  rejectReason?: string;
} {
  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  let current = structuredClone(data);
  const results: RuleEvaluationResult[] = [];
  let rejected = false;
  let rejectReason: string | undefined;

  for (const rule of sorted) {
    const result = evaluateRule(rule, current);
    if (result.matched) {
      const { data: updated, applied } = applyRuleActions(result.actions, current);
      current = updated;
      result.appliedActions = applied;
      const reject = applied.find((a) => a.type === "reject" && a.success);
      if (reject) {
        rejected = true;
        rejectReason = String(reject.result ?? "Rejected");
        results.push(result);
        break;
      }
    }
    results.push(result);
  }

  return { data: current, results, rejected, rejectReason };
}

/** In-memory rule store (multi-tenant) — production would use a database */
export class RuleStore {
  private rules = new Map<string, BusinessRule>();

  save(rule: BusinessRule): BusinessRule {
    this.rules.set(rule.id, rule);
    return rule;
  }

  get(id: string): BusinessRule | undefined {
    return this.rules.get(id);
  }

  delete(id: string): boolean {
    return this.rules.delete(id);
  }

  list(tenantId: string, filter?: { module?: string; entityType?: string }): BusinessRule[] {
    return [...this.rules.values()].filter((r) => {
      if (r.tenantId !== tenantId) return false;
      if (filter?.module && r.module !== filter.module) return false;
      if (filter?.entityType && r.entityTypes && !r.entityTypes.includes(filter.entityType)) {
        return false;
      }
      return true;
    });
  }

  clear(): void {
    this.rules.clear();
  }
}
