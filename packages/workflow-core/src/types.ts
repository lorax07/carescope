/**
 * CareScope Workflow Engine — Core Type System
 *
 * Every entity in the LIMS can attach configurable workflows.
 * Node types are plugin-extensible without modifying the engine core.
 */

/** Lifecycle status of a workflow definition */
export type WorkflowStatus = "draft" | "published" | "archived";

/** Execution status of a workflow instance */
export type ExecutionStatus =
  | "pending"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled"
  | "compensating"
  | "simulated";

/** Node execution status */
export type NodeExecutionStatus =
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting"
  | "cancelled";

/**
 * Built-in node type identifiers.
 * Custom nodes register via the plugin system with unique type strings.
 */
export type BuiltinNodeType =
  | "start"
  | "end"
  | "task"
  | "user_assignment"
  | "role_assignment"
  | "decision"
  | "condition"
  | "approval"
  | "review"
  | "electronic_signature"
  | "data_validation"
  | "instrument_action"
  | "api_call"
  | "ai_decision"
  | "notification"
  | "email"
  | "sms"
  | "webhook"
  | "delay"
  | "timer"
  | "scheduled_trigger"
  | "document_generation"
  | "report_generation"
  | "barcode_scan"
  | "qr_scan"
  | "file_upload"
  | "calculation"
  | "script_execution"
  | "loop"
  | "merge"
  | "split"
  | "parallel"
  | "manual_intervention"
  | "exception_handling"
  | "error_recovery";

export type NodeType = BuiltinNodeType | (string & {});

/** LIMS modules that emit events and expose workflow-compatible actions */
export type LimsModule =
  | "sample_lifecycle"
  | "chain_of_custody"
  | "barcode_qr"
  | "instrument_integration"
  | "test_scheduling"
  | "results_entry"
  | "scientific_calculations"
  | "electronic_signatures"
  | "coa_generation"
  | "reporting"
  | "dashboards"
  | "inventory"
  | "reagents"
  | "standards"
  | "equipment"
  | "calibration_maintenance"
  | "stability_studies"
  | "workflow_automation"
  | "customer_portal"
  | "client_approvals"
  | "billing"
  | "notifications"
  | "api_integrations"
  | "ai_data_review"
  | "user_onboarding"
  | "role_approvals"
  | "laboratory_onboarding"
  | "multi_site"
  | "quality_events"
  | "capa"
  | "non_conformance"
  | "document_control"
  | "training_records"
  | "change_control"
  | "method_validation"
  | "audit_preparation"
  | "compliance_reviews";

/** System events that can trigger workflows */
export type SystemEventType =
  | "sample.created"
  | "sample.received"
  | "sample.assigned"
  | "sample.completed"
  | "test.started"
  | "test.completed"
  | "result.entered"
  | "result.approved"
  | "instrument.data_imported"
  | "inventory.threshold_reached"
  | "equipment.calibration_due"
  | "customer.request_submitted"
  | "invoice.generated"
  | "user.created"
  | "document.uploaded"
  | "api.event_received"
  | "schedule.date_reached"
  | "workflow.manual_trigger"
  | "quality_event.opened"
  | "capa.initiated"
  | "non_conformance.reported"
  | "training.due"
  | "change_control.submitted";

/** Position on the designer canvas */
export interface CanvasPosition {
  x: number;
  y: number;
}

/** Visual styling hints for the designer */
export interface NodeStyle {
  color?: string;
  icon?: string;
  width?: number;
  height?: number;
}

/** A single node on the workflow canvas */
export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: CanvasPosition;
  config: Record<string, unknown>;
  style?: NodeStyle;
  /** Optional business rules attached to this node */
  rules?: string[];
  /** Retry policy for fail-able nodes */
  retry?: RetryPolicy;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

/** Edge / connector between nodes */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  /** Label for decision/condition branches */
  label?: string;
  /** Condition expression for conditional edges */
  condition?: string;
  /** Priority when multiple edges leave a node (lower = higher priority) */
  priority?: number;
  /** Edge type: default, conditional, error, compensation */
  edgeType?: "default" | "conditional" | "error" | "compensation" | "parallel";
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

/** Trigger configuration for starting a workflow */
export interface WorkflowTrigger {
  id: string;
  type: "event" | "schedule" | "manual" | "api" | "webhook";
  eventType?: SystemEventType | string;
  /** Cron expression for scheduled triggers */
  schedule?: string;
  /** Filter expression evaluated against event payload */
  filter?: string;
  enabled: boolean;
  module?: LimsModule;
}

/** A versioned workflow definition */
export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  /** Semantic version within the definition lineage */
  version: number;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: WorkflowTrigger[];
  /** Entity types this workflow can attach to */
  entityTypes: string[];
  /** Module associations */
  modules: LimsModule[];
  /** Tags for discovery / templates */
  tags: string[];
  /** Whether this is a reusable template */
  isTemplate: boolean;
  templateId?: string;
  /** Parent definition id for version lineage */
  lineageId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedAt?: string;
  publishedBy?: string;
  /** Metadata for designer viewport */
  viewport?: { x: number; y: number; zoom: number };
  variables?: WorkflowVariable[];
}

export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "object" | "array";
  defaultValue?: unknown;
  description?: string;
  required?: boolean;
}

/** Runtime instance of a workflow */
export interface WorkflowExecution {
  id: string;
  tenantId: string;
  workflowId: string;
  workflowVersion: number;
  lineageId: string;
  status: ExecutionStatus;
  /** Entity this execution is attached to */
  entityType?: string;
  entityId?: string;
  /** Current active node ids (supports parallel) */
  activeNodeIds: string[];
  /** Per-node execution records */
  nodeExecutions: Record<string, NodeExecution>;
  context: ExecutionContext;
  startedAt: string;
  completedAt?: string;
  error?: ExecutionError;
  /** Simulation flag — no side effects */
  isSimulation: boolean;
  triggeredBy: {
    type: WorkflowTrigger["type"];
    eventType?: string;
    userId?: string;
  };
  parentExecutionId?: string;
  retryCount: number;
}

export interface NodeExecution {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: ExecutionError;
  attempt: number;
  assigneeId?: string;
  assigneeRole?: string;
}

export interface ExecutionContext {
  variables: Record<string, unknown>;
  eventPayload?: Record<string, unknown>;
  entityData?: Record<string, unknown>;
  tenantId: string;
  userId?: string;
  correlationId: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  nodeId?: string;
  stack?: string;
  recoverable: boolean;
  timestamp: string;
}

/** Immutable audit / execution log entry */
export interface ExecutionLogEntry {
  id: string;
  executionId: string;
  tenantId: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  event: string;
  nodeId?: string;
  message: string;
  data?: Record<string, unknown>;
}

/** Validation result before publish */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  severity: "error" | "warning";
}

/** Business rule definition (stored separately from app code) */
export interface BusinessRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  /** If/Then expression tree */
  condition: RuleCondition;
  actions: RuleAction[];
  enabled: boolean;
  priority: number;
  module?: LimsModule;
  entityTypes?: string[];
  createdAt: string;
  updatedAt: string;
}

export type RuleOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "is_not_null"
  | "matches"
  | "between"
  | "exists";

export interface RuleCondition {
  logic: "and" | "or" | "not";
  conditions?: RuleCondition[];
  field?: string;
  operator?: RuleOperator;
  value?: unknown;
  /** Dynamic expression string (e.g. "${sample.priority} == 'STAT'") */
  expression?: string;
}

export interface RuleAction {
  type:
    | "set_field"
    | "calculate"
    | "validate"
    | "notify"
    | "reject"
    | "assign"
    | "trigger_workflow"
    | "custom";
  config: Record<string, unknown>;
}

/** Plugin descriptor for extending node types */
export interface NodePlugin {
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  icon?: string;
  color?: string;
  /** JSON Schema-like config schema for the designer */
  configSchema: PluginConfigSchema;
  /** Modules this node is relevant to */
  modules?: LimsModule[];
  /** Execute the node — return output data */
  execute: NodeExecutor;
  /** Optional validation of node config */
  validate?: (config: Record<string, unknown>) => ValidationIssue[];
}

export type NodeCategory =
  | "flow"
  | "human"
  | "logic"
  | "integration"
  | "communication"
  | "data"
  | "timing"
  | "ai"
  | "laboratory"
  | "compliance"
  | "advanced";

export interface PluginConfigSchema {
  fields: PluginConfigField[];
}

export interface PluginConfigField {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "multiselect" | "json" | "expression" | "entity_ref" | "textarea";
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
  description?: string;
  placeholder?: string;
}

export type NodeExecutor = (
  ctx: NodeExecutionContext
) => Promise<NodeExecutorResult>;

export interface NodeExecutionContext {
  node: WorkflowNode;
  execution: WorkflowExecution;
  context: ExecutionContext;
  services: EngineServices;
  /** For simulation — no real side effects */
  dryRun: boolean;
}

export interface NodeExecutorResult {
  status: "completed" | "waiting" | "failed";
  output?: Record<string, unknown>;
  error?: ExecutionError;
  /** Which outgoing edge labels to follow (for decisions) */
  branch?: string | string[];
  /** Updated context variables */
  variables?: Record<string, unknown>;
  /** Assignee for waiting human tasks */
  assigneeId?: string;
  assigneeRole?: string;
}

/** Injectable services for node executors */
export interface EngineServices {
  notify: (payload: NotificationPayload) => Promise<void>;
  callApi: (request: ApiCallRequest) => Promise<unknown>;
  evaluateExpression: (expr: string, context: Record<string, unknown>) => unknown;
  evaluateRule: (rule: BusinessRule, data: Record<string, unknown>) => Promise<boolean>;
  log: (entry: Omit<ExecutionLogEntry, "id" | "timestamp">) => void;
  schedule: (delayMs: number, callback: () => Promise<void>) => Promise<void>;
  getEntity: (entityType: string, entityId: string) => Promise<Record<string, unknown> | null>;
  updateEntity: (entityType: string, entityId: string, data: Record<string, unknown>) => Promise<void>;
}

export interface NotificationPayload {
  channel: "email" | "sms" | "in_app" | "webhook";
  recipients: string[];
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ApiCallRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

/** Clone / publish / archive operations */
export interface WorkflowCloneOptions {
  name?: string;
  asTemplate?: boolean;
  tenantId?: string;
}

export interface SimulationRequest {
  workflowId: string;
  version?: number;
  eventPayload?: Record<string, unknown>;
  entityData?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

export interface SimulationResult {
  execution: WorkflowExecution;
  logs: ExecutionLogEntry[];
  path: string[];
  outcome: "completed" | "failed" | "waiting";
}

/** Metrics for observability */
export interface WorkflowMetrics {
  workflowId: string;
  tenantId: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageDurationMs: number;
  p95DurationMs: number;
  activeExecutions: number;
  lastExecutedAt?: string;
}
