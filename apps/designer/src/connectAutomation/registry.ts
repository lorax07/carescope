import { coerce, containsSecret, readPath, validateHttpsDestination, writePath } from "./redact";
import type { ExecContext, ExecOutcome, FlowNode, Issue } from "./types";

export type NodeCategory = "trigger" | "action" | "logic" | "data";

export type FieldKind = "text" | "textarea" | "number" | "select" | "connection" | "checkbox" | "mappings" | "condition";

export type ConfigField = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  help?: string;
};

export type NodeServices = {
  deliver: (input: { interfaceId: string; summary: string; payload: string }) => { id: string; delivered: boolean; pending?: string };
  saveRecord: (resource: string, id: string, values: Record<string, string>) => void;
  findRecords: (resource: string) => { id: string; values: Record<string, string> }[];
  saveFile: (name: string, text: string) => { id: string; bytes: number };
  notify: (input: { channel: string; recipients: string; severity: string; body: string }) => { id: string; delivery: "stored" | "pending" };
  lookupReference: (table: string, key: string) => string | undefined;
  enqueueWorkflow: (lineageId: string, input: unknown) => { id: string } | { error: string };
};

export type NodeTypeDef = {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  sideEffect: boolean;
  fields: ConfigField[];
  handles?: string[];
  validate?: (config: Record<string, unknown>, connections: string[]) => Issue[];
  execute: (node: FlowNode, ctx: ExecContext, services: NodeServices) => ExecOutcome;
};

const EVENT_TYPES = ["message.received", "message.failed", "message.delivered", "file.received", "ack.received", "status.changed", "webhook.received"];

function text(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

function trigger(type: string, label: string, description: string, extra: ConfigField[] = []): NodeTypeDef {
  return {
    type,
    category: "trigger",
    label,
    description,
    sideEffect: false,
    fields: extra,
    execute: (_node, ctx) => ({ output: ctx.input }),
  };
}

function mappingRows(config: Record<string, unknown>): { from: string; to: string; type: string; fallback: string }[] {
  const rows = config["mappings"];
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is { from: string; to: string; type: string; fallback: string } => !!row && typeof row === "object");
}

function applyMappings(input: unknown, config: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const row of mappingRows(config)) {
    if (!row.to) continue;
    const when = typeof (row as { when?: string }).when === "string" ? (row as { when?: string }).when : "";
    if (when && !String(readPath(input, when) ?? "").length && readPath(input, when) !== 0) continue;
    writePath(output, row.to, coerce(readPath(input, row.from), row.type || "string", row.fallback || ""));
  }
  return output;
}

type Clause = { path?: string; cmp?: string; value?: string };
type Group = { join?: string; clauses?: Clause[] };

function clauseMatch(input: unknown, clause: Clause): boolean {
  const left = readPath(input, clause.path || "");
  const right = clause.value ?? "";
  const cmp = clause.cmp || "eq";
  if (cmp === "exists") return left !== undefined && left !== null && left !== "";
  if (cmp === "contains") return String(left ?? "").toLowerCase().includes(String(right).toLowerCase());
  if (cmp === "gt") return Number(left) > Number(right);
  if (cmp === "lt") return Number(left) < Number(right);
  if (cmp === "neq") return String(left ?? "") !== String(right);
  return String(left ?? "") === String(right);
}

function groupMatch(input: unknown, group: Group): boolean {
  const clauses = Array.isArray(group.clauses) ? group.clauses : [];
  if (!clauses.length) return false;
  const checks = clauses.map((clause) => clauseMatch(input, clause));
  return group.join === "or" ? checks.some(Boolean) : checks.every(Boolean);
}

export const NODE_TYPES: NodeTypeDef[] = [
  trigger("trigger.connection", "Connection event", "Starts when an existing connection receives an implemented event.", [
    { name: "connectionId", label: "Connection", kind: "connection", required: true },
    { name: "eventType", label: "Event", kind: "select", required: true, options: EVENT_TYPES.filter((item) => item !== "webhook.received") },
    { name: "messageType", label: "Message type", kind: "text", help: "Optional. Leave blank to accept every type." },
    { name: "filter", label: "Payload contains", kind: "text" },
  ]),
  trigger("trigger.webhook", "Webhook received", "Starts from an injected webhook event. Public ingress is not available in this app.", [
    { name: "webhookKey", label: "Webhook key", kind: "text", required: true },
  ]),
  trigger("trigger.schedule", "Schedule", "Starts on an interval while this app is open. There is no server scheduler.", [
    { name: "minutes", label: "Every minutes", kind: "number", required: true },
  ]),
  trigger("trigger.manual", "Manual trigger", "Starts when someone runs the workflow."),
  trigger("trigger.message", "Message received", "Starts when a connection records a message.", [
    { name: "connectionId", label: "Connection", kind: "connection", required: true },
    { name: "messageType", label: "Message type", kind: "text" },
  ]),
  trigger("trigger.file", "File received", "Starts when a file connection records a file.", [
    { name: "connectionId", label: "Connection", kind: "connection", required: true },
  ]),
  trigger("trigger.status", "Connection status changed", "Starts when a connection message changes status.", [
    { name: "connectionId", label: "Connection", kind: "connection", required: true },
  ]),
  trigger("trigger.ack", "Acknowledgment received", "Starts when a connection message is delivered.", [
    { name: "connectionId", label: "Connection", kind: "connection", required: true },
  ]),
  {
    type: "action.transform",
    category: "action",
    label: "Transform data",
    description: "Maps fields from the incoming payload.",
    sideEffect: false,
    fields: [
      { name: "sourceFormat", label: "Source format", kind: "select", options: ["json", "hl7", "text"] },
      { name: "destinationFormat", label: "Destination format", kind: "select", options: ["json", "text"] },
      { name: "mappings", label: "Field mappings", kind: "mappings", required: true },
    ],
    execute: (node, ctx) => ({ output: applyMappings(ctx.input, node.config) }),
  },
  {
    type: "action.send",
    category: "action",
    label: "Send to connection",
    description: "Records a delivery on a Sequence Connect connection.",
    sideEffect: true,
    fields: [
      { name: "connectionId", label: "Destination connection", kind: "connection", required: true },
      { name: "operation", label: "Operation", kind: "text", required: true },
      { name: "timeoutSeconds", label: "Timeout seconds", kind: "number" },
      { name: "retries", label: "Retry attempts", kind: "number" },
      { name: "requireAck", label: "Require acknowledgment", kind: "checkbox" },
    ],
    execute: (node, ctx, services) => {
      const connectionId = text(node.config, "connectionId");
      const summary = `${text(node.config, "operation") || "Deliver"} ${connectionId}`;
      const payload = JSON.stringify(ctx.input ?? {});
      if (ctx.mode === "test" && !ctx.liveAuthorized) {
        return { output: { sent: false, reason: "Test mode did not write to the connection.", connectionId, payload } };
      }
      const result = services.deliver({ interfaceId: connectionId, summary, payload });
      if (!result.delivered) return { error: result.pending || "The connection did not accept the delivery." };
      return { output: { sent: true, messageId: result.id, connectionId, acknowledgment: node.config["requireAck"] === true ? "recorded" : "not required" } };
    },
  },
  {
    type: "action.http",
    category: "action",
    label: "Send HTTP request",
    description: "Validates an outbound request. This app has no server worker to send it.",
    sideEffect: true,
    fields: [
      { name: "method", label: "Method", kind: "select", required: true, options: ["GET", "POST", "PUT", "PATCH"] },
      { name: "url", label: "URL", kind: "text", required: true },
      { name: "credentialRef", label: "Credential reference", kind: "text", help: "A name only. Do not paste a secret." },
      { name: "timeoutSeconds", label: "Timeout seconds", kind: "number" },
      { name: "headers", label: "Headers", kind: "textarea" },
      { name: "bodyPath", label: "Body path", kind: "text" },
    ],
    validate: (config) => {
      const issues: Issue[] = [];
      const url = text(config, "url");
      if (url) {
        const problem = validateHttpsDestination(url);
        if (problem) issues.push({ severity: "error", code: "UNSAFE_URL", message: problem });
      }
      if (containsSecret(config)) issues.push({ severity: "error", code: "SECRET_IN_CONFIG", message: "Store a credential reference, not the secret." });
      return issues;
    },
    execute: (node) => {
      const url = text(node.config, "url");
      const problem = validateHttpsDestination(url);
      if (problem) return { error: problem };
      return {
        pending: "No server-side HTTP worker is configured. The request was validated and not sent.",
        output: {
          delivered: false,
          pending: true,
          method: text(node.config, "method") || "POST",
          url,
          credentialRef: text(node.config, "credentialRef"),
        },
      };
    },
  },
  {
    type: "action.record.create",
    category: "action",
    label: "Create record",
    description: "Creates a workflow record in this lab instance.",
    sideEffect: true,
    fields: [
      { name: "resource", label: "Resource", kind: "text", required: true },
      { name: "mappings", label: "Values", kind: "mappings", required: true },
    ],
    execute: (node, ctx, services) => {
      if (ctx.mode === "test" && !ctx.liveAuthorized) return { output: { created: false, preview: applyMappings(ctx.input, node.config) } };
      const values = Object.fromEntries(Object.entries(applyMappings(ctx.input, node.config)).map(([key, value]) => [key, String(value ?? "")]));
      const id = `rec-${Math.random().toString(36).slice(2, 8)}`;
      services.saveRecord(text(node.config, "resource"), id, values);
      return { output: { created: true, id, resource: text(node.config, "resource") } };
    },
  },
  {
    type: "action.record.update",
    category: "action",
    label: "Update record",
    description: "Updates a workflow record by id.",
    sideEffect: true,
    fields: [
      { name: "resource", label: "Resource", kind: "text", required: true },
      { name: "idPath", label: "Record id path", kind: "text", required: true },
      { name: "mappings", label: "Values", kind: "mappings", required: true },
    ],
    execute: (node, ctx, services) => {
      const id = String(readPath(ctx.input, text(node.config, "idPath")) ?? "");
      if (!id) return { error: "The record id path did not resolve." };
      const resource = text(node.config, "resource");
      const existing = services.findRecords(resource).find((record) => record.id === id);
      if (!existing) return { error: `No ${resource} record ${id}.` };
      if (ctx.mode === "test" && !ctx.liveAuthorized) return { output: { updated: false, id, preview: applyMappings(ctx.input, node.config) } };
      const values = { ...existing.values, ...Object.fromEntries(Object.entries(applyMappings(ctx.input, node.config)).map(([key, value]) => [key, String(value ?? "")])) };
      services.saveRecord(resource, id, values);
      return { output: { updated: true, id } };
    },
  },
  {
    type: "action.record.lookup",
    category: "action",
    label: "Lookup record",
    description: "Finds a workflow record in this lab instance.",
    sideEffect: false,
    fields: [
      { name: "resource", label: "Resource", kind: "text", required: true },
      { name: "field", label: "Field", kind: "text", required: true },
      { name: "valuePath", label: "Value path", kind: "text", required: true },
    ],
    execute: (node, ctx, services) => {
      const expected = String(readPath(ctx.input, text(node.config, "valuePath")) ?? "");
      const found = services.findRecords(text(node.config, "resource")).find((record) => record.values[text(node.config, "field")] === expected);
      if (!found) return { error: "No matching record.", branch: "false" };
      return { output: { id: found.id, ...found.values }, branch: "true" };
    },
  },
  {
    type: "action.notify",
    category: "action",
    label: "Notification",
    description: "Stores a notification. External email and chat delivery is not connected.",
    sideEffect: true,
    fields: [
      { name: "channel", label: "Channel", kind: "select", required: true, options: ["in-app", "email", "slack"] },
      { name: "recipients", label: "Recipients", kind: "text", required: true },
      { name: "severity", label: "Severity", kind: "select", options: ["info", "warning", "high"] },
      { name: "template", label: "Template", kind: "textarea", required: true },
    ],
    execute: (node, ctx, services) => {
      const body = text(node.config, "template").replaceAll("{{summary}}", String(readPath(ctx.input, "summary") ?? ""));
      if (ctx.mode === "test" && !ctx.liveAuthorized) return { output: { delivered: false, preview: body } };
      const saved = services.notify({
        channel: text(node.config, "channel") || "in-app",
        recipients: text(node.config, "recipients"),
        severity: text(node.config, "severity") || "info",
        body,
      });
      return { output: { ...saved, externalDelivery: saved.delivery === "stored" ? "pending" : saved.delivery } };
    },
  },
  {
    type: "action.file",
    category: "action",
    label: "Store file",
    description: "Stores a small text payload for this lab instance.",
    sideEffect: true,
    fields: [
      { name: "name", label: "File name", kind: "text", required: true },
      { name: "bodyPath", label: "Body path", kind: "text" },
    ],
    execute: (node, ctx, services) => {
      const body = String(readPath(ctx.input, text(node.config, "bodyPath")) ?? JSON.stringify(ctx.input ?? {}));
      if (body.length > 32000) return { error: "The payload is larger than 32 KB." };
      if (ctx.mode === "test" && !ctx.liveAuthorized) return { output: { stored: false, bytes: body.length } };
      const saved = services.saveFile(text(node.config, "name"), body);
      return { output: { stored: true, ...saved } };
    },
  },
  {
    type: "action.call",
    category: "action",
    label: "Call workflow",
    description: "Queues another active workflow in this lab instance.",
    sideEffect: true,
    fields: [{ name: "workflowId", label: "Workflow id", kind: "text", required: true }],
    execute: (node, ctx, services) => {
      if (ctx.mode === "test" && !ctx.liveAuthorized) return { output: { queued: false, workflowId: text(node.config, "workflowId") } };
      const result = services.enqueueWorkflow(text(node.config, "workflowId"), ctx.input);
      if ("error" in result) return { error: result.error };
      return { output: { queued: true, executionId: result.id } };
    },
  },
  {
    type: "action.exception",
    category: "action",
    label: "Create exception",
    description: "Opens an exception for a person to resolve.",
    sideEffect: true,
    fields: [
      { name: "severity", label: "Severity", kind: "select", required: true, options: ["low", "high"] },
      { name: "summary", label: "Summary", kind: "text", required: true },
    ],
    execute: (node) => ({ output: { exception: true, severity: text(node.config, "severity") || "low", summary: text(node.config, "summary") } }),
  },
  {
    type: "logic.if",
    category: "logic",
    label: "If / else",
    description: "Routes to the true or false branch.",
    sideEffect: false,
    handles: ["true", "false"],
    fields: [{ name: "condition", label: "Condition", kind: "condition", required: true }],
    execute: (node, ctx) => {
      const group = (node.config["condition"] || {}) as Group;
      const matched = groupMatch(ctx.input, group);
      return { output: { matched }, branch: matched ? "true" : "false" };
    },
  },
  {
    type: "logic.switch",
    category: "logic",
    label: "Switch",
    description: "Routes by an exact value.",
    sideEffect: false,
    fields: [
      { name: "path", label: "Value path", kind: "text", required: true },
      { name: "cases", label: "Cases, comma separated", kind: "text", required: true },
    ],
    execute: (node, ctx) => {
      const value = String(readPath(ctx.input, text(node.config, "path")) ?? "");
      const cases = text(node.config, "cases").split(",").map((item) => item.trim()).filter(Boolean);
      return { output: { value }, branch: cases.includes(value) ? value : "default" };
    },
  },
  {
    type: "logic.filter",
    category: "logic",
    label: "Filter",
    description: "Stops the path when the condition does not match.",
    sideEffect: false,
    fields: [{ name: "condition", label: "Condition", kind: "condition", required: true }],
    execute: (node, ctx) => {
      const matched = groupMatch(ctx.input, (node.config["condition"] || {}) as Group);
      if (!matched) return { output: { passed: false }, branch: "stop" };
      return { output: ctx.input, branch: "default" };
    },
  },
  {
    type: "logic.wait",
    category: "logic",
    label: "Wait",
    description: "Waits for a duration. The wait is saved and resumed by the scheduler.",
    sideEffect: false,
    fields: [
      { name: "seconds", label: "Seconds", kind: "number", required: true },
    ],
    execute: (node) => {
      const seconds = Number(node.config["seconds"]);
      if (!Number.isFinite(seconds) || seconds < 0) return { error: "Wait seconds must be zero or more." };
      if (seconds === 0) return { output: { waited: 0 } };
      return { output: { waiting: true }, waitMs: Math.min(seconds, 86400) * 1000 };
    },
  },
  {
    type: "logic.stop",
    category: "logic",
    label: "Stop",
    description: "Ends the workflow.",
    sideEffect: false,
    fields: [],
    execute: (_node, ctx) => ({ output: ctx.input, branch: "stop" }),
  },
  {
    type: "logic.retry",
    category: "logic",
    label: "Retry",
    description: "Asks the engine to retry the previous safe node.",
    sideEffect: false,
    fields: [{ name: "attempts", label: "Attempts", kind: "number", required: true }],
    execute: (node, ctx) => ({ output: { retry: true, attempts: Number(node.config["attempts"]) || 1, from: ctx.input } }),
  },
  {
    type: "data.map",
    category: "data",
    label: "Map fields",
    description: "Copies selected fields onto the output.",
    sideEffect: false,
    fields: [{ name: "mappings", label: "Field mappings", kind: "mappings", required: true }],
    execute: (node, ctx) => ({ output: applyMappings(ctx.input, node.config) }),
  },
  {
    type: "data.variable",
    category: "data",
    label: "Set variable",
    description: "Sets one value on the payload.",
    sideEffect: false,
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "valuePath", label: "Value path", kind: "text" },
      { name: "literal", label: "Literal", kind: "text" },
    ],
    execute: (node, ctx) => {
      const base: Record<string, unknown> = ctx.input && typeof ctx.input === "object" ? { ...(ctx.input as Record<string, unknown>) } : { value: ctx.input };
      const literal = text(node.config, "literal");
      base[text(node.config, "name")] = literal || readPath(ctx.input, text(node.config, "valuePath"));
      return { output: base };
    },
  },
  {
    type: "data.validate",
    category: "data",
    label: "Validate data",
    description: "Checks required paths and types.",
    sideEffect: false,
    fields: [{ name: "rules", label: "Rules as path:type, comma separated", kind: "text", required: true }],
    execute: (node, ctx) => {
      const rules = text(node.config, "rules").split(",").map((item) => item.trim()).filter(Boolean);
      const problems: string[] = [];
      for (const rule of rules) {
        const [path, type] = rule.split(":");
        const value = readPath(ctx.input, path || "");
        if (value === undefined || value === null || value === "") problems.push(`${path} is required`);
        else if (type === "number" && !Number.isFinite(Number(value))) problems.push(`${path} must be a number`);
      }
      if (problems.length) return { error: problems.join(". "), branch: "false" };
      return { output: ctx.input, branch: "true" };
    },
  },
  {
    type: "data.reference",
    category: "data",
    label: "Lookup reference data",
    description: "Reads a reference table stored for workflows.",
    sideEffect: false,
    fields: [
      { name: "table", label: "Table", kind: "text", required: true },
      { name: "keyPath", label: "Key path", kind: "text", required: true },
    ],
    execute: (node, ctx, services) => {
      const key = String(readPath(ctx.input, text(node.config, "keyPath")) ?? "");
      const value = services.lookupReference(text(node.config, "table"), key);
      if (!value) return { error: `No reference ${text(node.config, "table")}:${key}.` };
      return { output: { key, value } };
    },
  },
];

const BY_TYPE = new Map(NODE_TYPES.map((item) => [item.type, item]));

export function nodeType(type: string): NodeTypeDef | undefined {
  return BY_TYPE.get(type);
}

export function nodeIssues(node: FlowNode, connectionIds: string[]): Issue[] {
  const def = nodeType(node.type);
  if (!def) return [{ severity: "error", code: "UNKNOWN_NODE", message: `Unknown node ${node.type}.`, nodeId: node.id }];
  const issues: Issue[] = [];
  for (const field of def.fields) {
    if (!field.required) continue;
    const value = node.config[field.name];
    const clauses = field.kind === "condition" ? (value as Group | undefined)?.clauses : undefined;
    const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0) || (field.kind === "condition" && (!Array.isArray(clauses) || clauses.length === 0 || clauses.some((clause) => !clause.path)));
    if (empty) issues.push({ severity: "error", code: "REQUIRED", message: `${node.label} needs ${field.label}.`, nodeId: node.id });
    if (field.kind === "mappings" && Array.isArray(value) && value.some((row) => !row || typeof row !== "object" || !String((row as { to?: string }).to || "").trim())) {
      issues.push({ severity: "error", code: "MAPPING", message: `${node.label} has a mapping without a destination field.`, nodeId: node.id });
    }
  }
  if (containsSecret(node.config)) issues.push({ severity: "error", code: "SECRET_IN_CONFIG", message: `${node.label} stores a secret. Use a credential reference.`, nodeId: node.id });
  const connectionId = text(node.config, "connectionId");
  if (connectionId && !connectionIds.includes(connectionId)) {
    issues.push({ severity: "error", code: "UNKNOWN_CONNECTION", message: `${node.label} points at a connection that is not in Sequence Connect.`, nodeId: node.id });
  }
  issues.push(...(def.validate?.(node.config, connectionIds) ?? []).map((issue) => ({ ...issue, nodeId: node.id })));
  return issues;
}

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  trigger: "Triggers",
  action: "Actions",
  logic: "Logic",
  data: "Data",
};
