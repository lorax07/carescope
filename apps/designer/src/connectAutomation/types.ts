export const WORKFLOW_STATUSES = ["draft", "validated", "active", "paused", "archived"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export type FlowNode = {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type WorkflowDraft = {
  name: string;
  description: string;
  category: string;
  connectionId: string;
  owner: string;
  tags: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type WorkflowDefinition = WorkflowDraft & {
  id: string;
  instanceId: string;
  status: WorkflowStatus;
  publishedVersion: number | null;
  dirty: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowVersion = {
  id: string;
  lineageId: string;
  instanceId: string;
  number: number;
  snapshot: WorkflowDraft;
  publishedAt: string;
  publishedBy: string;
};

export type ConnectEventType =
  | "message.received"
  | "message.failed"
  | "message.delivered"
  | "file.received"
  | "ack.received"
  | "status.changed"
  | "webhook.received";

export type ConnectionEvent = {
  id: string;
  instanceId: string;
  interfaceId: string;
  interfaceKind: string;
  messageId: string;
  eventType: ConnectEventType;
  messageType: string;
  summary: string;
  payload: string;
  status: "received" | "processing" | "processed" | "failed" | "duplicate" | "quarantined";
  correlationId: string;
  idempotencyKey: string;
  executionId: string;
  receivedAt: string;
};

export type NodeRunStatus = "pending" | "running" | "completed" | "failed" | "waiting" | "skipped";

export type NodeRun = {
  nodeId: string;
  type: string;
  status: NodeRunStatus;
  attempts: number;
  input: unknown;
  output: unknown;
  error: string;
  startedAt: string;
  finishedAt: string;
};

export type ExecutionStatus = "pending" | "running" | "waiting" | "completed" | "failed" | "cancelled";

export type Execution = {
  id: string;
  instanceId: string;
  lineageId: string;
  version: number;
  mode: "test" | "live";
  liveAuthorized: boolean;
  status: ExecutionStatus;
  correlationId: string;
  eventId: string;
  currentNodeId: string;
  nodes: NodeRun[];
  waitUntil: string;
  error: string;
  startedAt: string;
  finishedAt: string;
};

export type WorkflowException = {
  id: string;
  instanceId: string;
  executionId: string;
  lineageId: string;
  nodeId: string;
  severity: "low" | "high";
  summary: string;
  assignee: string;
  status: "open" | "resolved";
  resolution: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditEntry = {
  id: string;
  instanceId: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
};

export type DataRecord = {
  id: string;
  instanceId: string;
  resource: string;
  values: Record<string, string>;
  updatedAt: string;
};

export type StoredFile = {
  id: string;
  instanceId: string;
  name: string;
  bytes: number;
  text: string;
  createdAt: string;
};

export type AutomationNotification = {
  id: string;
  instanceId: string;
  channel: string;
  recipients: string;
  severity: string;
  body: string;
  createdAt: string;
  delivery: "stored" | "pending";
};

export type AutomationDb = {
  workflows: WorkflowDefinition[];
  versions: WorkflowVersion[];
  events: ConnectionEvent[];
  executions: Execution[];
  exceptions: WorkflowException[];
  records: DataRecord[];
  files: StoredFile[];
  notifications: AutomationNotification[];
  audit: AuditEntry[];
  references: { table: string; key: string; value: string }[];
};

export type Issue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  nodeId?: string;
};

export type ExecContext = {
  mode: "test" | "live";
  liveAuthorized: boolean;
  instanceId: string;
  now: string;
  input: unknown;
  attempt: number;
};

export type ExecOutcome = {
  output?: unknown;
  branch?: string;
  waitMs?: number;
  error?: string;
  pending?: string;
};
