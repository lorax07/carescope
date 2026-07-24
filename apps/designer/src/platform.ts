/**
 * In-browser workflow platform with localStorage persistence.
 * Powers the designer without requiring the API for core UX.
 */
import {
  createWorkflowPlatform,
  type WorkflowDefinition,
  type WorkflowPlatform,
  type BusinessRule,
  type ExecutionLogEntry,
  type SimulationResult,
  type ValidationResult,
  type WorkflowExecution,
} from "@carescope/workflow-core";

const TENANT = "demo-lab";
const USER = "designer";
const STORAGE_KEY = "carescope.workflows.v1";

let platform: WorkflowPlatform | null = null;

function persist(): void {
  if (!platform) return;
  const all = platform.store.list(TENANT);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      workflows: all,
      rules: platform.ruleStore.list(TENANT),
    })
  );
}

function hydrate(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || !platform) return;
  try {
    const data = JSON.parse(raw) as {
      workflows?: WorkflowDefinition[];
      rules?: BusinessRule[];
    };
    for (const wf of data.workflows ?? []) {
      platform.store.save(wf);
    }
    for (const rule of data.rules ?? []) {
      platform.ruleStore.save(rule);
    }
  } catch {
    // ignore corrupt storage
  }
}

export function getBrowserPlatform(): WorkflowPlatform {
  if (!platform) {
    const existing = localStorage.getItem(STORAGE_KEY);
    platform = createWorkflowPlatform(
      existing
        ? undefined
        : { seedTemplates: { tenantId: TENANT, createdBy: USER } }
    );
    if (existing) {
      hydrate();
      // If still empty after hydrate, seed templates
      if (platform.store.list(TENANT).length === 0) {
        platform = createWorkflowPlatform({
          seedTemplates: { tenantId: TENANT, createdBy: USER },
        });
        persist();
      }
    } else {
      persist();
    }
  }
  return platform;
}

export function getTenant(): string {
  return TENANT;
}

export function getUser(): string {
  return USER;
}

export const workflowService = {
  list(filter?: Parameters<WorkflowPlatform["store"]["list"]>[1]) {
    return getBrowserPlatform().store.list(TENANT, filter);
  },
  get(id: string) {
    return getBrowserPlatform().store.get(id, TENANT);
  },
  save(def: WorkflowDefinition) {
    const saved = getBrowserPlatform().store.save(def);
    persist();
    return saved;
  },
  create(input: {
    name: string;
    description?: string;
    isTemplate?: boolean;
  }) {
    const created = getBrowserPlatform().store.create({
      tenantId: TENANT,
      createdBy: USER,
      name: input.name,
      description: input.description,
      isTemplate: input.isTemplate,
      nodes: [
        {
          id: crypto.randomUUID(),
          type: "start",
          label: "Start",
          position: { x: 80, y: 200 },
          config: {},
        },
        {
          id: crypto.randomUUID(),
          type: "end",
          label: "End",
          position: { x: 420, y: 200 },
          config: { outcome: "success" },
        },
      ],
      edges: [],
    });
    // connect start→end by default
    const start = created.nodes[0]!;
    const end = created.nodes[1]!;
    created.edges = [
      { id: crypto.randomUUID(), source: start.id, target: end.id },
    ];
    const saved = getBrowserPlatform().store.save(created);
    persist();
    return saved;
  },
  updateDraft(id: string, patch: Partial<WorkflowDefinition>) {
    const existing = getBrowserPlatform().store.get(id, TENANT);
    if (!existing) return undefined;
    if (existing.status === "published") {
      const next = getBrowserPlatform().store.createVersion(id, TENANT, USER, patch);
      persist();
      return next;
    }
    const saved = getBrowserPlatform().store.save({
      ...existing,
      ...patch,
      id: existing.id,
      tenantId: existing.tenantId,
      lineageId: existing.lineageId,
      version: existing.version,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      status: existing.status,
    });
    persist();
    return saved;
  },
  validate(id: string): ValidationResult | undefined {
    const def = getBrowserPlatform().store.get(id, TENANT);
    if (!def) return undefined;
    return getBrowserPlatform().engine.validate(def);
  },
  publish(id: string) {
    const def = getBrowserPlatform().store.get(id, TENANT);
    if (!def) throw new Error("Not found");
    const validation = getBrowserPlatform().engine.validate(def);
    if (!validation.valid) {
      return { ok: false as const, validation };
    }
    const published = getBrowserPlatform().store.publish(id, TENANT, USER);
    persist();
    return { ok: true as const, workflow: published, validation };
  },
  archive(id: string) {
    const archived = getBrowserPlatform().store.archive(id, TENANT);
    persist();
    return archived;
  },
  clone(id: string, name?: string) {
    const cloned = getBrowserPlatform().store.clone(id, TENANT, USER, { name });
    persist();
    return cloned;
  },
  createFromTemplate(templateId: string, name?: string) {
    const instance = getBrowserPlatform().store.createFromTemplate(
      templateId,
      TENANT,
      USER,
      name
    );
    persist();
    return instance;
  },
  versions(id: string) {
    const def = getBrowserPlatform().store.get(id, TENANT);
    if (!def) return [];
    return getBrowserPlatform().store.listVersions(def.lineageId, TENANT);
  },
  rollback(id: string, version: number) {
    const def = getBrowserPlatform().store.get(id, TENANT);
    if (!def) return undefined;
    const rolled = getBrowserPlatform().store.rollback(
      def.lineageId,
      version,
      TENANT,
      USER
    );
    persist();
    return rolled;
  },
  async simulate(
    id: string,
    opts?: {
      variables?: Record<string, unknown>;
      eventPayload?: Record<string, unknown>;
      entityData?: Record<string, unknown>;
    }
  ): Promise<SimulationResult> {
    return getBrowserPlatform().engine.simulate({
      workflowId: id,
      tenantId: TENANT,
      userId: USER,
      ...opts,
    });
  },
  async start(
    id: string,
    opts?: {
      variables?: Record<string, unknown>;
      entityData?: Record<string, unknown>;
    }
  ): Promise<WorkflowExecution> {
    return getBrowserPlatform().engine.start(id, {
      tenantId: TENANT,
      userId: USER,
      variables: opts?.variables,
      entityData: opts?.entityData,
      triggeredBy: { type: "manual", userId: USER },
    });
  },
  listExecutions(workflowId?: string) {
    return getBrowserPlatform().engine.listExecutions(TENANT, { workflowId });
  },
  getLogs(executionId: string): ExecutionLogEntry[] {
    return getBrowserPlatform().engine.getLogs(executionId);
  },
  nodePlugins() {
    return getBrowserPlatform().registry.list();
  },
};
