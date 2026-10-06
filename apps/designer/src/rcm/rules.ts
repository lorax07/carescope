import { evaluateCondition, type RuleCondition } from "@carescope/workflow-core";
import type { Charge } from "../revenueCycle";
import type { BillingRuleDef, Exception } from "./types";

function factSheet(charge: Charge): Record<string, unknown> {
  return {
    payer: charge.payerName,
    payerId: charge.payerId,
    route: charge.route,
    test: charge.test,
    cpt: charge.cpt,
    icd10: charge.icd10 || null,
    plan: charge.plan,
    amountCents: charge.amountCents,
    status: charge.status,
  };
}

function conditionFor(rule: BillingRuleDef): RuleCondition {
  return {
    logic: "and",
    field: rule.field,
    operator: rule.operator,
    value: rule.operator === "eq" || rule.operator === "neq" ? rule.value : undefined,
  };
}

export function evaluateBillingRules(charge: Charge, rules: BillingRuleDef[]): Exception[] {
  const facts = factSheet(charge);
  return rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority)
    .filter((rule) => evaluateCondition(conditionFor(rule), facts))
    .map((rule) => ({
      code: `RULE-${rule.id}`,
      message: rule.message,
      impact: rule.action === "prevent_submit" ? "Submission is blocked until this rule is satisfied." : "The claim is routed to a work queue.",
      action: rule.action === "require_field" ? "Complete the required field." : "Open the matching work queue and resolve the exception.",
      owner: "Billing rules",
    }));
}

export function blocksSubmit(exceptions: Exception[]): boolean {
  return exceptions.some((item) => item.code.startsWith("RULE-") || item.code === "SCRUB");
}

export const DEFAULT_RULES = (tenantId: string): BillingRuleDef[] => [
  {
    id: "icd10-professional",
    tenantId,
    name: "ICD-10 required on professional claims",
    enabled: true,
    priority: 10,
    field: "icd10",
    operator: "is_null",
    value: "",
    action: "prevent_submit",
    message: "Professional and self-pay claims need a diagnosis before submission.",
    queueId: "missing",
  },
  {
    id: "medicare-auth",
    tenantId,
    name: "Medicare authorization check",
    enabled: true,
    priority: 20,
    field: "payer",
    operator: "eq",
    value: "Medicare",
    action: "route_queue",
    message: "Medicare work is routed to the authorization queue until an auth number is on file.",
    queueId: "authorization",
  },
];
