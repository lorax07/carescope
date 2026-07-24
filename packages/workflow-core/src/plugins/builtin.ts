/**
 * Built-in node plugins for laboratory workflow automation.
 * Custom node types can be registered via PluginRegistry without modifying this file.
 */

import type {
  NodeExecutorResult,
  NodePlugin,
  PluginConfigField,
} from "../types.js";
import { evaluateBoolean, evaluateExpression } from "../expression.js";

function fields(...defs: PluginConfigField[]): { fields: PluginConfigField[] } {
  return { fields: defs };
}

const completed = (output?: Record<string, unknown>): NodeExecutorResult => ({
  status: "completed",
  output: output ?? {},
});

const waiting = (
  extra?: Partial<NodeExecutorResult>
): NodeExecutorResult => ({
  status: "waiting",
  output: {},
  ...extra,
});

export function createBuiltinPlugins(): NodePlugin[] {
  return [
    {
      type: "start",
      label: "Start",
      description: "Entry point of the workflow",
      category: "flow",
      icon: "play",
      color: "#16a34a",
      configSchema: fields(),
      execute: async () => completed({ started: true }),
    },
    {
      type: "end",
      label: "End",
      description: "Terminal node — workflow completes",
      category: "flow",
      icon: "stop",
      color: "#dc2626",
      configSchema: fields({
        name: "outcome",
        label: "Outcome",
        type: "select",
        options: [
          { label: "Success", value: "success" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Failed", value: "failed" },
        ],
        default: "success",
      }),
      execute: async (ctx) =>
        completed({ outcome: ctx.node.config["outcome"] ?? "success" }),
    },
    {
      type: "task",
      label: "Task",
      description: "Generic automated or tracked task step",
      category: "flow",
      icon: "checkbox",
      color: "#2563eb",
      configSchema: fields(
        { name: "instructions", label: "Instructions", type: "textarea" },
        { name: "autoComplete", label: "Auto Complete", type: "boolean", default: true }
      ),
      execute: async (ctx) => {
        if (ctx.node.config["autoComplete"] === false && !ctx.dryRun) {
          return waiting();
        }
        return completed({ task: "done", instructions: ctx.node.config["instructions"] });
      },
    },
    {
      type: "user_assignment",
      label: "User Assignment",
      description: "Assign work to a specific user",
      category: "human",
      icon: "user",
      color: "#7c3aed",
      configSchema: fields(
        { name: "userId", label: "User ID", type: "entity_ref", required: true },
        { name: "instructions", label: "Instructions", type: "textarea" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ assigned: true, simulated: true });
        return waiting({
          assigneeId: String(ctx.node.config["userId"] ?? ""),
          output: { instructions: ctx.node.config["instructions"] },
        });
      },
    },
    {
      type: "role_assignment",
      label: "Role Assignment",
      description: "Assign work to any user with a given role",
      category: "human",
      icon: "users",
      color: "#7c3aed",
      configSchema: fields(
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          options: [
            { label: "Analyst", value: "analyst" },
            { label: "Reviewer", value: "reviewer" },
            { label: "Lab Manager", value: "lab_manager" },
            { label: "QA Officer", value: "qa_officer" },
            { label: "System Admin", value: "admin" },
          ],
        },
        { name: "instructions", label: "Instructions", type: "textarea" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ assigned: true, simulated: true });
        return waiting({
          assigneeRole: String(ctx.node.config["role"] ?? ""),
          output: { instructions: ctx.node.config["instructions"] },
        });
      },
    },
    {
      type: "decision",
      label: "Decision",
      description: "Branch based on a condition expression",
      category: "logic",
      icon: "git-branch",
      color: "#ea580c",
      configSchema: fields(
        {
          name: "expression",
          label: "Condition Expression",
          type: "expression",
          required: true,
          placeholder: "sample.priority == 'STAT'",
        },
        { name: "trueLabel", label: "True Branch Label", type: "string", default: "yes" },
        { name: "falseLabel", label: "False Branch Label", type: "string", default: "no" }
      ),
      execute: async (ctx) => {
        const expr = String(ctx.node.config["expression"] ?? "true");
        const result = evaluateBoolean(expr, {
          ...ctx.context.variables,
          ...ctx.context.entityData,
          ...ctx.context.eventPayload,
        });
        const branch = result
          ? String(ctx.node.config["trueLabel"] ?? "yes")
          : String(ctx.node.config["falseLabel"] ?? "no");
        return { status: "completed", output: { result, branch }, branch };
      },
    },
    {
      type: "condition",
      label: "Condition",
      description: "Evaluate a condition and continue or skip",
      category: "logic",
      icon: "filter",
      color: "#ea580c",
      configSchema: fields({
        name: "expression",
        label: "Expression",
        type: "expression",
        required: true,
      }),
      execute: async (ctx) => {
        const expr = String(ctx.node.config["expression"] ?? "true");
        const result = evaluateBoolean(expr, {
          ...ctx.context.variables,
          ...ctx.context.entityData,
          ...ctx.context.eventPayload,
        });
        return completed({ result, branch: result ? "true" : "false" });
      },
    },
    {
      type: "approval",
      label: "Approval",
      description: "Require approval from a user or role chain",
      category: "human",
      icon: "check-circle",
      color: "#0891b2",
      configSchema: fields(
        { name: "approverRole", label: "Approver Role", type: "string", required: true },
        { name: "minApprovals", label: "Minimum Approvals", type: "number", default: 1 },
        { name: "allowReject", label: "Allow Reject", type: "boolean", default: true },
        { name: "escalationHours", label: "Escalation Hours", type: "number" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) {
          return completed({ approved: true, simulated: true, branch: "approved" });
        }
        return waiting({
          assigneeRole: String(ctx.node.config["approverRole"] ?? ""),
          output: { type: "approval" },
        });
      },
    },
    {
      type: "review",
      label: "Review",
      description: "Peer or supervisor review step",
      category: "human",
      icon: "eye",
      color: "#0891b2",
      configSchema: fields(
        { name: "reviewerRole", label: "Reviewer Role", type: "string", required: true },
        { name: "checklist", label: "Checklist Items", type: "json" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ reviewed: true, simulated: true });
        return waiting({
          assigneeRole: String(ctx.node.config["reviewerRole"] ?? ""),
        });
      },
    },
    {
      type: "electronic_signature",
      label: "Electronic Signature",
      description: "Capture 21 CFR Part 11 compliant e-signature",
      category: "compliance",
      icon: "pen",
      color: "#be185d",
      modules: ["electronic_signatures", "compliance_reviews"],
      configSchema: fields(
        { name: "meaning", label: "Signature Meaning", type: "string", required: true },
        { name: "requireReason", label: "Require Reason", type: "boolean", default: true },
        { name: "requirePassword", label: "Require Re-authentication", type: "boolean", default: true }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) {
          return completed({ signed: true, simulated: true, meaning: ctx.node.config["meaning"] });
        }
        return waiting({ output: { type: "esignature", meaning: ctx.node.config["meaning"] } });
      },
    },
    {
      type: "data_validation",
      label: "Data Validation",
      description: "Validate entity or result data against rules",
      category: "data",
      icon: "shield-check",
      color: "#059669",
      configSchema: fields(
        { name: "expression", label: "Validation Expression", type: "expression", required: true },
        { name: "errorMessage", label: "Error Message", type: "string" }
      ),
      execute: async (ctx) => {
        const expr = String(ctx.node.config["expression"] ?? "true");
        const ok = evaluateBoolean(expr, {
          ...ctx.context.variables,
          ...ctx.context.entityData,
          ...ctx.context.eventPayload,
        });
        if (!ok) {
          return {
            status: "failed",
            error: {
              code: "VALIDATION_FAILED",
              message: String(ctx.node.config["errorMessage"] ?? "Data validation failed"),
              nodeId: ctx.node.id,
              recoverable: true,
              timestamp: new Date().toISOString(),
            },
          };
        }
        return completed({ valid: true });
      },
    },
    {
      type: "instrument_action",
      label: "Instrument Action",
      description: "Send a command or request data from an instrument",
      category: "laboratory",
      icon: "cpu",
      color: "#4f46e5",
      modules: ["instrument_integration"],
      configSchema: fields(
        { name: "instrumentId", label: "Instrument", type: "entity_ref", required: true },
        { name: "action", label: "Action", type: "string", required: true },
        { name: "parameters", label: "Parameters", type: "json" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) {
          return completed({
            instrumentId: ctx.node.config["instrumentId"],
            action: ctx.node.config["action"],
            simulated: true,
          });
        }
        ctx.services.log({
          executionId: ctx.execution.id,
          tenantId: ctx.context.tenantId,
          level: "info",
          event: "instrument.action",
          nodeId: ctx.node.id,
          message: `Instrument action: ${ctx.node.config["action"]}`,
          data: ctx.node.config,
        });
        return completed({
          instrumentId: ctx.node.config["instrumentId"],
          action: ctx.node.config["action"],
          status: "queued",
        });
      },
    },
    {
      type: "api_call",
      label: "API Call",
      description: "Invoke an external or internal REST API",
      category: "integration",
      icon: "globe",
      color: "#0284c7",
      configSchema: fields(
        { name: "method", label: "Method", type: "select", required: true, options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
        ], default: "GET" },
        { name: "url", label: "URL", type: "string", required: true },
        { name: "body", label: "Body", type: "json" },
        { name: "headers", label: "Headers", type: "json" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) {
          return completed({ simulated: true, status: 200 });
        }
        const result = await ctx.services.callApi({
          method: String(ctx.node.config["method"] ?? "GET"),
          url: String(ctx.node.config["url"] ?? ""),
          body: ctx.node.config["body"],
          headers: ctx.node.config["headers"] as Record<string, string> | undefined,
        });
        return completed({ response: result });
      },
    },
    {
      type: "ai_decision",
      label: "AI Decision",
      description: "AI-assisted data review or decision",
      category: "ai",
      icon: "sparkles",
      color: "#9333ea",
      modules: ["ai_data_review"],
      configSchema: fields(
        { name: "prompt", label: "Prompt Template", type: "textarea", required: true },
        { name: "confidenceThreshold", label: "Confidence Threshold", type: "number", default: 0.8 },
        { name: "fallbackBranch", label: "Low Confidence Branch", type: "string", default: "manual" }
      ),
      execute: async (ctx) => {
        // Placeholder AI decision — production integrates with AI service
        const confidence = ctx.dryRun ? 0.95 : 0.85;
        const threshold = Number(ctx.node.config["confidenceThreshold"] ?? 0.8);
        const branch = confidence >= threshold ? "auto" : String(ctx.node.config["fallbackBranch"] ?? "manual");
        return {
          status: "completed",
          output: { confidence, decision: branch, prompt: ctx.node.config["prompt"] },
          branch,
        };
      },
    },
    {
      type: "notification",
      label: "Notification",
      description: "Send an in-app notification",
      category: "communication",
      icon: "bell",
      color: "#ca8a04",
      modules: ["notifications"],
      configSchema: fields(
        { name: "recipients", label: "Recipients", type: "string", required: true },
        { name: "message", label: "Message", type: "textarea", required: true },
        { name: "subject", label: "Subject", type: "string" }
      ),
      execute: async (ctx) => {
        const recipients = String(ctx.node.config["recipients"] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!ctx.dryRun) {
          await ctx.services.notify({
            channel: "in_app",
            recipients,
            subject: String(ctx.node.config["subject"] ?? ""),
            body: String(ctx.node.config["message"] ?? ""),
          });
        }
        return completed({ notified: recipients.length, channel: "in_app" });
      },
    },
    {
      type: "email",
      label: "Email",
      description: "Send an email notification",
      category: "communication",
      icon: "mail",
      color: "#ca8a04",
      configSchema: fields(
        { name: "to", label: "To", type: "string", required: true },
        { name: "subject", label: "Subject", type: "string", required: true },
        { name: "body", label: "Body", type: "textarea", required: true }
      ),
      execute: async (ctx) => {
        const to = String(ctx.node.config["to"] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!ctx.dryRun) {
          await ctx.services.notify({
            channel: "email",
            recipients: to,
            subject: String(ctx.node.config["subject"] ?? ""),
            body: String(ctx.node.config["body"] ?? ""),
          });
        }
        return completed({ emailed: to.length });
      },
    },
    {
      type: "sms",
      label: "SMS",
      description: "Send an SMS alert",
      category: "communication",
      icon: "message",
      color: "#ca8a04",
      configSchema: fields(
        { name: "to", label: "Phone Numbers", type: "string", required: true },
        { name: "message", label: "Message", type: "textarea", required: true }
      ),
      execute: async (ctx) => {
        const to = String(ctx.node.config["to"] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!ctx.dryRun) {
          await ctx.services.notify({
            channel: "sms",
            recipients: to,
            body: String(ctx.node.config["message"] ?? ""),
          });
        }
        return completed({ smsSent: to.length });
      },
    },
    {
      type: "webhook",
      label: "Webhook",
      description: "POST payload to an external webhook URL",
      category: "integration",
      icon: "webhook",
      color: "#0284c7",
      configSchema: fields(
        { name: "url", label: "Webhook URL", type: "string", required: true },
        { name: "payload", label: "Payload", type: "json" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ simulated: true });
        await ctx.services.callApi({
          method: "POST",
          url: String(ctx.node.config["url"] ?? ""),
          body: ctx.node.config["payload"] ?? ctx.context,
        });
        return completed({ delivered: true });
      },
    },
    {
      type: "delay",
      label: "Delay",
      description: "Wait for a fixed duration before continuing",
      category: "timing",
      icon: "clock",
      color: "#64748b",
      configSchema: fields(
        { name: "durationMs", label: "Duration (ms)", type: "number", required: true, default: 1000 },
        { name: "durationHours", label: "Duration (hours)", type: "number" }
      ),
      execute: async (ctx) => {
        const hours = Number(ctx.node.config["durationHours"] ?? 0);
        const ms =
          hours > 0
            ? hours * 3_600_000
            : Number(ctx.node.config["durationMs"] ?? 1000);
        if (ctx.dryRun) return completed({ delayedMs: ms, simulated: true });
        await ctx.services.schedule(ms, async () => undefined);
        return completed({ delayedMs: ms });
      },
    },
    {
      type: "timer",
      label: "Timer",
      description: "Fire after an absolute or relative deadline",
      category: "timing",
      icon: "timer",
      color: "#64748b",
      configSchema: fields(
        { name: "deadlineExpression", label: "Deadline Expression", type: "expression" },
        { name: "absoluteDeadline", label: "Absolute Deadline (ISO)", type: "string" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ timer: "elapsed", simulated: true });
        return waiting({ output: { type: "timer" } });
      },
    },
    {
      type: "scheduled_trigger",
      label: "Scheduled Trigger",
      description: "Cron-based schedule gate within a workflow",
      category: "timing",
      icon: "calendar",
      color: "#64748b",
      configSchema: fields({
        name: "cron",
        label: "Cron Expression",
        type: "string",
        required: true,
        placeholder: "0 8 * * 1-5",
      }),
      execute: async (ctx) =>
        completed({ cron: ctx.node.config["cron"], acknowledged: true }),
    },
    {
      type: "document_generation",
      label: "Document Generation",
      description: "Generate a controlled document from a template",
      category: "data",
      icon: "file-text",
      color: "#0d9488",
      modules: ["document_control", "coa_generation"],
      configSchema: fields(
        { name: "templateId", label: "Template", type: "entity_ref", required: true },
        { name: "outputFormat", label: "Format", type: "select", options: [
          { label: "PDF", value: "pdf" },
          { label: "DOCX", value: "docx" },
          { label: "HTML", value: "html" },
        ], default: "pdf" }
      ),
      execute: async (ctx) =>
        completed({
          documentId: `doc_${Date.now()}`,
          templateId: ctx.node.config["templateId"],
          format: ctx.node.config["outputFormat"] ?? "pdf",
          simulated: ctx.dryRun,
        }),
    },
    {
      type: "report_generation",
      label: "Report Generation",
      description: "Generate a laboratory report or CoA",
      category: "laboratory",
      icon: "bar-chart",
      color: "#0d9488",
      modules: ["reporting", "coa_generation"],
      configSchema: fields(
        { name: "reportType", label: "Report Type", type: "select", required: true, options: [
          { label: "Certificate of Analysis", value: "coa" },
          { label: "Sample Report", value: "sample" },
          { label: "Batch Summary", value: "batch" },
          { label: "Stability Report", value: "stability" },
        ] },
        { name: "includeSignature", label: "Include E-Signature Block", type: "boolean", default: true }
      ),
      execute: async (ctx) =>
        completed({
          reportId: `rpt_${Date.now()}`,
          reportType: ctx.node.config["reportType"],
          simulated: ctx.dryRun,
        }),
    },
    {
      type: "barcode_scan",
      label: "Barcode Scan",
      description: "Wait for or validate a barcode scan event",
      category: "laboratory",
      icon: "scan",
      color: "#4f46e5",
      modules: ["barcode_qr"],
      configSchema: fields(
        { name: "expectedPattern", label: "Expected Pattern", type: "string" },
        { name: "matchEntityField", label: "Match Entity Field", type: "string" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ scanned: true, simulated: true });
        return waiting({ output: { type: "barcode_scan" } });
      },
    },
    {
      type: "qr_scan",
      label: "QR Scan",
      description: "Wait for or validate a QR code scan",
      category: "laboratory",
      icon: "qr-code",
      color: "#4f46e5",
      modules: ["barcode_qr"],
      configSchema: fields({
        name: "expectedPattern",
        label: "Expected Pattern",
        type: "string",
      }),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ scanned: true, simulated: true });
        return waiting({ output: { type: "qr_scan" } });
      },
    },
    {
      type: "file_upload",
      label: "File Upload",
      description: "Require a file upload before continuing",
      category: "data",
      icon: "upload",
      color: "#059669",
      configSchema: fields(
        { name: "allowedTypes", label: "Allowed MIME Types", type: "string" },
        { name: "required", label: "Required", type: "boolean", default: true }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ uploaded: true, simulated: true });
        return waiting({ output: { type: "file_upload" } });
      },
    },
    {
      type: "calculation",
      label: "Calculation",
      description: "Compute a scientific or business calculation",
      category: "data",
      icon: "calculator",
      color: "#059669",
      modules: ["scientific_calculations"],
      configSchema: fields(
        { name: "expression", label: "Expression", type: "expression", required: true },
        { name: "outputVariable", label: "Output Variable", type: "string", required: true }
      ),
      execute: async (ctx) => {
        const expr = String(ctx.node.config["expression"] ?? "0");
        const result = evaluateExpression(expr, {
          ...ctx.context.variables,
          ...ctx.context.entityData,
          ...ctx.context.eventPayload,
        });
        const varName = String(ctx.node.config["outputVariable"] ?? "result");
        return {
          status: "completed",
          output: { [varName]: result },
          variables: { [varName]: result },
        };
      },
    },
    {
      type: "script_execution",
      label: "Script Execution",
      description: "Run a sandboxed expression script (no arbitrary eval)",
      category: "advanced",
      icon: "code",
      color: "#475569",
      configSchema: fields(
        { name: "script", label: "Script Expression", type: "expression", required: true },
        { name: "outputVariable", label: "Output Variable", type: "string", default: "scriptResult" }
      ),
      execute: async (ctx) => {
        const script = String(ctx.node.config["script"] ?? "null");
        const result = evaluateExpression(script, {
          ...ctx.context.variables,
          ...ctx.context.entityData,
          ...ctx.context.eventPayload,
        });
        const varName = String(ctx.node.config["outputVariable"] ?? "scriptResult");
        return {
          status: "completed",
          output: { result },
          variables: { [varName]: result },
        };
      },
    },
    {
      type: "loop",
      label: "Loop",
      description: "Iterate over a collection or until a condition fails",
      category: "advanced",
      icon: "repeat",
      color: "#475569",
      configSchema: fields(
        { name: "collection", label: "Collection Expression", type: "expression" },
        { name: "itemVariable", label: "Item Variable", type: "string", default: "item" },
        { name: "maxIterations", label: "Max Iterations", type: "number", default: 100 }
      ),
      execute: async (ctx) => {
        const collection = evaluateExpression(
          String(ctx.node.config["collection"] ?? "[]"),
          { ...ctx.context.variables, ...ctx.context.entityData }
        );
        const items = Array.isArray(collection) ? collection : [];
        const max = Number(ctx.node.config["maxIterations"] ?? 100);
        return completed({
          items: items.slice(0, max),
          count: Math.min(items.length, max),
          itemVariable: ctx.node.config["itemVariable"] ?? "item",
        });
      },
    },
    {
      type: "merge",
      label: "Merge",
      description: "Synchronize parallel branches before continuing",
      category: "flow",
      icon: "git-merge",
      color: "#16a34a",
      configSchema: fields({
        name: "strategy",
        label: "Merge Strategy",
        type: "select",
        options: [
          { label: "Wait for All", value: "all" },
          { label: "Wait for Any", value: "any" },
          { label: "Wait for N", value: "n" },
        ],
        default: "all",
      }),
      execute: async () => completed({ merged: true }),
    },
    {
      type: "split",
      label: "Split",
      description: "Split into multiple sequential paths",
      category: "flow",
      icon: "git-fork",
      color: "#16a34a",
      configSchema: fields(),
      execute: async () => completed({ split: true }),
    },
    {
      type: "parallel",
      label: "Parallel Processing",
      description: "Fan-out to execute multiple branches concurrently",
      category: "flow",
      icon: "layers",
      color: "#16a34a",
      configSchema: fields({
        name: "waitForAll",
        label: "Wait for All Branches",
        type: "boolean",
        default: true,
      }),
      execute: async () =>
        completed({ parallel: true, branch: "*" }),
    },
    {
      type: "manual_intervention",
      label: "Manual Intervention",
      description: "Pause for operator intervention",
      category: "human",
      icon: "hand",
      color: "#b45309",
      configSchema: fields(
        { name: "message", label: "Message", type: "textarea", required: true },
        { name: "role", label: "Operator Role", type: "string" }
      ),
      execute: async (ctx) => {
        if (ctx.dryRun) return completed({ intervened: true, simulated: true });
        return waiting({
          assigneeRole: String(ctx.node.config["role"] ?? "lab_manager"),
          output: { message: ctx.node.config["message"] },
        });
      },
    },
    {
      type: "exception_handling",
      label: "Exception Handling",
      description: "Catch and route exceptions from upstream nodes",
      category: "advanced",
      icon: "alert-triangle",
      color: "#dc2626",
      configSchema: fields(
        { name: "errorCodes", label: "Error Codes (comma-separated)", type: "string" },
        { name: "rethrow", label: "Rethrow Unmatched", type: "boolean", default: true }
      ),
      execute: async (ctx) =>
        completed({
          handled: true,
          error: ctx.execution.error,
          branch: ctx.execution.error ? "error" : "ok",
        }),
    },
    {
      type: "error_recovery",
      label: "Error Recovery",
      description: "Attempt recovery / compensation after failure",
      category: "advanced",
      icon: "refresh",
      color: "#dc2626",
      configSchema: fields(
        { name: "strategy", label: "Strategy", type: "select", options: [
          { label: "Retry", value: "retry" },
          { label: "Compensate", value: "compensate" },
          { label: "Skip", value: "skip" },
          { label: "Escalate", value: "escalate" },
        ], default: "retry" },
        { name: "maxRetries", label: "Max Retries", type: "number", default: 3 }
      ),
      execute: async (ctx) =>
        completed({
          strategy: ctx.node.config["strategy"] ?? "retry",
          recovered: true,
        }),
    },
  ];
}

export function registerBuiltinPlugins(registry: {
  register: (p: NodePlugin) => void;
  upsert: (p: NodePlugin) => void;
}): void {
  for (const plugin of createBuiltinPlugins()) {
    registry.upsert(plugin);
  }
}
