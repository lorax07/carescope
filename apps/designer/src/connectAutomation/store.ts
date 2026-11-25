import { blockingIssues, validateWorkflow } from "./validate";
import type { AuditEntry, AutomationDb, DataRecord, Execution, FlowNode, WorkflowDefinition, WorkflowDraft, WorkflowStatus, WorkflowVersion } from "./types";

export type AutomationStorage = {
  load: () => AutomationDb | null;
  save: (db: AutomationDb) => void;
};

const EMPTY = (): AutomationDb => ({
  workflows: [],
  versions: [],
  events: [],
  executions: [],
  exceptions: [],
  records: [],
  files: [],
  notifications: [],
  audit: [],
  references: [
    { table: "analyte", key: "GLU", value: "Glucose" },
    { table: "specimen", key: "SERUM", value: "Serum" },
  ],
});

export function createAutomationStore(storage: AutomationStorage, instanceId: string, actor = "system") {
  function read(): AutomationDb {
    return storage.load() ?? EMPTY();
  }
  function write(db: AutomationDb): void {
    storage.save(db);
  }
  function audit(db: AutomationDb, action: string, target: string, detail: string): void {
    const entry: AuditEntry = { id: crypto.randomUUID(), instanceId, at: new Date().toISOString(), actor, action, target, detail };
    db.audit = [entry, ...db.audit].slice(0, 300);
  }
  function own(db: AutomationDb): WorkflowDefinition[] {
    return db.workflows.filter((item) => item.instanceId === instanceId);
  }

  return {
    instanceId,
    list(): WorkflowDefinition[] {
      return own(read());
    },
    get(id: string): WorkflowDefinition | undefined {
      return own(read()).find((item) => item.id === id);
    },
    versions(id: string): WorkflowVersion[] {
      return read().versions.filter((item) => item.instanceId === instanceId && item.lineageId === id);
    },
    executions(): Execution[] {
      return read().executions.filter((item) => item.instanceId === instanceId);
    },
    exceptions() {
      return read().exceptions.filter((item) => item.instanceId === instanceId);
    },
    records(): DataRecord[] {
      return read().records.filter((item) => item.instanceId === instanceId);
    },
    notifications() {
      return read().notifications.filter((item) => item.instanceId === instanceId);
    },
    files() {
      return read().files.filter((item) => item.instanceId === instanceId);
    },
    events() {
      return read().events.filter((item) => item.instanceId === instanceId);
    },
    auditLog() {
      return read().audit.filter((item) => item.instanceId === instanceId);
    },
    reference(table: string, key: string): string | undefined {
      return read().references.find((item) => item.table === table && item.key === key)?.value;
    },
    create(draft: WorkflowDraft): WorkflowDefinition {
      const db = read();
      const now = new Date().toISOString();
      const workflow: WorkflowDefinition = {
        ...draft,
        tags: [...draft.tags],
        nodes: draft.nodes.map((node) => ({ ...node, config: { ...node.config } })),
        edges: draft.edges.map((edge) => ({ ...edge })),
        id: crypto.randomUUID(),
        instanceId,
        status: "draft",
        publishedVersion: null,
        dirty: false,
        createdAt: now,
        updatedAt: now,
      };
      db.workflows = [workflow, ...db.workflows];
      audit(db, "workflow.create", workflow.id, workflow.name);
      write(db);
      return workflow;
    },
    saveDraft(id: string, patch: Partial<WorkflowDraft>): WorkflowDefinition | undefined {
      const db = read();
      const current = db.workflows.find((item) => item.id === id && item.instanceId === instanceId);
      if (!current || current.status === "archived") return undefined;
      const next: WorkflowDefinition = {
        ...current,
        ...patch,
        tags: patch.tags ? [...patch.tags] : current.tags,
        nodes: patch.nodes ? patch.nodes.map((node) => ({ ...node, position: { ...node.position }, config: { ...node.config } })) : current.nodes,
        edges: patch.edges ? patch.edges.map((edge) => ({ ...edge })) : current.edges,
        id: current.id,
        instanceId,
        status: current.status === "active" || current.status === "paused" ? current.status : "draft",
        dirty: current.publishedVersion !== null,
        updatedAt: new Date().toISOString(),
      };
      db.workflows = db.workflows.map((item) => (item.id === id ? next : item));
      audit(db, "workflow.edit", id, next.name);
      write(db);
      return next;
    },
    duplicate(id: string): WorkflowDefinition | undefined {
      const current = this.get(id);
      if (!current) return undefined;
      const ids = new Map(current.nodes.map((node) => [node.id, crypto.randomUUID()]));
      return this.create({
        name: `Copy of ${current.name}`,
        description: current.description,
        category: current.category,
        connectionId: current.connectionId,
        owner: current.owner,
        tags: [...current.tags],
        nodes: current.nodes.map((node) => ({ ...node, id: ids.get(node.id) || node.id, config: { ...node.config }, position: { ...node.position } })),
        edges: current.edges.map((edge) => ({ ...edge, id: crypto.randomUUID(), source: ids.get(edge.source) || edge.source, target: ids.get(edge.target) || edge.target })),
      });
    },
    setStatus(id: string, status: WorkflowStatus, connectionIds: string[]): { workflow?: WorkflowDefinition; issues: ReturnType<typeof validateWorkflow> } {
      const db = read();
      const current = db.workflows.find((item) => item.id === id && item.instanceId === instanceId);
      if (!current) return { issues: [{ severity: "error", code: "MISSING", message: "Workflow not found." }] };
      if (status === "active" || status === "validated") {
        const issues = validateWorkflow(current, connectionIds);
        if (blockingIssues(issues).length) return { workflow: current, issues };
        if (status === "validated") {
          const next = { ...current, status: "validated" as const, updatedAt: new Date().toISOString() };
          db.workflows = db.workflows.map((item) => (item.id === id ? next : item));
          audit(db, "workflow.validate", id, current.name);
          write(db);
          return { workflow: next, issues };
        }
        const number = (current.publishedVersion ?? 0) + 1;
        const snapshot: WorkflowDraft = {
          name: current.name,
          description: current.description,
          category: current.category,
          connectionId: current.connectionId,
          owner: current.owner,
          tags: [...current.tags],
          nodes: current.nodes.map((node) => ({ ...node, position: { ...node.position }, config: { ...node.config } })),
          edges: current.edges.map((edge) => ({ ...edge })),
        };
        const version: WorkflowVersion = {
          id: crypto.randomUUID(),
          lineageId: id,
          instanceId,
          number,
          snapshot,
          publishedAt: new Date().toISOString(),
          publishedBy: actor,
        };
        db.versions = [version, ...db.versions];
        const next = { ...current, status: "active" as const, publishedVersion: number, dirty: false, updatedAt: version.publishedAt };
        db.workflows = db.workflows.map((item) => (item.id === id ? next : item));
        audit(db, "workflow.activate", id, `version ${number}`);
        write(db);
        return { workflow: next, issues };
      }
      const next = { ...current, status, updatedAt: new Date().toISOString() };
      db.workflows = db.workflows.map((item) => (item.id === id ? next : item));
      audit(db, `workflow.${status}`, id, current.name);
      write(db);
      return { workflow: next, issues: [] };
    },
    rollback(id: string, versionNumber: number, connectionIds: string[]) {
      const db = read();
      const version = db.versions.find((item) => item.instanceId === instanceId && item.lineageId === id && item.number === versionNumber);
      const current = db.workflows.find((item) => item.id === id && item.instanceId === instanceId);
      if (!version || !current) return { issues: [{ severity: "error" as const, code: "MISSING", message: "That version is not in this lab instance." }] };
      db.workflows = db.workflows.map((item) => (item.id === id ? { ...item, ...version.snapshot, nodes: version.snapshot.nodes.map((node) => ({ ...node, config: { ...node.config } })), edges: version.snapshot.edges.map((edge) => ({ ...edge })), status: item.status, updatedAt: new Date().toISOString() } : item));
      audit(db, "workflow.rollback", id, `from version ${versionNumber}`);
      write(db);
      return this.setStatus(id, "active", connectionIds);
    },
    assignException(id: string, assignee: string) {
      const db = read();
      const current = db.exceptions.find((item) => item.id === id && item.instanceId === instanceId);
      if (!current) return undefined;
      const next = { ...current, assignee: assignee.trim(), updatedAt: new Date().toISOString() };
      db.exceptions = db.exceptions.map((item) => (item.id === id ? next : item));
      audit(db, "exception.assign", id, next.assignee || "unassigned");
      write(db);
      return next;
    },
    resolveException(id: string, resolution: string) {
      const db = read();
      const current = db.exceptions.find((item) => item.id === id && item.instanceId === instanceId);
      if (!current) return undefined;
      const next = { ...current, status: "resolved" as const, resolution: resolution.trim(), updatedAt: new Date().toISOString() };
      db.exceptions = db.exceptions.map((item) => (item.id === id ? next : item));
      audit(db, "exception.resolve", id, next.resolution);
      write(db);
      return next;
    },
    published(id: string): WorkflowDraft | undefined {
      const current = this.get(id);
      if (!current?.publishedVersion) return undefined;
      return this.versions(id).find((item) => item.number === current.publishedVersion)?.snapshot;
    },
    replaceDb(mutator: (db: AutomationDb) => void): AutomationDb {
      const db = read();
      mutator(db);
      write(db);
      return db;
    },
  };
}

export type AutomationStore = ReturnType<typeof createAutomationStore>;

export function blankDraft(owner: string): WorkflowDraft {
  const trigger: FlowNode = {
    id: crypto.randomUUID(),
    type: "trigger.manual",
    label: "Manual trigger",
    position: { x: 80, y: 160 },
    config: {},
  };
  return {
    name: "",
    description: "",
    category: "Integration",
    connectionId: "",
    owner,
    tags: [],
    nodes: [trigger],
    edges: [],
  };
}
