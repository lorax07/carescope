import { nodeType, type NodeServices } from "./registry";
import { redactValue } from "./redact";
import type { AutomationStore } from "./store";
import type { ConnectionEvent, ConnectEventType, Execution, ExecContext, FlowNode, NodeRun } from "./types";

export type EngineFailure = { ok: false; error: string };

function isFailure(value: Execution | EngineFailure): value is EngineFailure {
  return "ok" in value && value.ok === false;
}

export function isExecution(value: Execution | EngineFailure): value is Execution {
  return !isFailure(value);
}

const MAX_STEPS = 40;
const MAX_VISITS = 8;
const MAX_RUNNING = 2;
const RATE_LIMIT = 20;

export type EngineClock = {
  now: () => number;
  schedule: (ms: number, run: () => void) => void;
};

export function systemClock(): EngineClock {
  return { now: () => Date.now(), schedule: (ms, run) => { setTimeout(run, ms); } };
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function servicesFor(store: AutomationStore, depth: number, clock: EngineClock, enqueue: (lineageId: string, input: unknown, mode: "test" | "live", live: boolean) => Execution | EngineFailure): NodeServices {
  return {
    deliver: (input) => ({ id: "", delivered: false, pending: "Delivery is not registered.", ...input }),
    saveRecord: (resource, id, values) => {
      store.replaceDb((db) => {
        const existing = db.records.find((record) => record.instanceId === store.instanceId && record.id === id);
        const next = { id, instanceId: store.instanceId, resource, values, updatedAt: iso(clock.now()) };
        db.records = existing ? db.records.map((record) => (record.id === id && record.instanceId === store.instanceId ? next : record)) : [next, ...db.records];
      });
    },
    findRecords: (resource) => store.records().filter((record) => record.resource === resource),
    saveFile: (name, text) => {
      const id = crypto.randomUUID();
      store.replaceDb((db) => {
        db.files = [{ id, instanceId: store.instanceId, name, bytes: text.length, text, createdAt: iso(clock.now()) }, ...db.files];
      });
      return { id, bytes: text.length };
    },
    notify: (input) => {
      const id = crypto.randomUUID();
      const delivery = input.channel === "in-app" ? "stored" : "pending";
      store.replaceDb((db) => {
        db.notifications = [{ id, instanceId: store.instanceId, ...input, createdAt: iso(clock.now()), delivery }, ...db.notifications];
      });
      return { id, delivery };
    },
    lookupReference: (table, key) => store.reference(table, key),
    enqueueWorkflow: (lineageId, input) => {
      const nested = input && typeof input === "object" && "__workflowDepth" in input ? Number((input as { __workflowDepth?: number }).__workflowDepth) : depth;
      if (nested >= 3) return { ok: false, error: "Workflow calls are nested too deeply." };
      const payload = { ...(input && typeof input === "object" ? input as Record<string, unknown> : { value: input }), __workflowDepth: nested + 1 };
      const result = enqueue(lineageId, payload, "live", true);
      return isFailure(result) ? result : { id: result.id };
    },
  };
}

function openException(store: AutomationStore, execution: Execution, node: FlowNode, summary: string, clock: EngineClock): void {
  store.replaceDb((db) => {
    db.exceptions = [{
      id: crypto.randomUUID(),
      instanceId: store.instanceId,
      executionId: execution.id,
      lineageId: execution.lineageId,
      nodeId: node.id,
      severity: node.type === "action.exception" && node.config["severity"] === "low" ? "low" : "high",
      summary,
      assignee: "",
      status: "open",
      resolution: "",
      createdAt: iso(clock.now()),
      updatedAt: iso(clock.now()),
    }, ...db.exceptions];
  });
}

function nextEdge(edges: Execution extends never ? never : { source: string; target: string; sourceHandle?: string }[], nodeId: string, branch?: string) {
  return edges.find((edge) => edge.source === nodeId && (branch ? edge.sourceHandle === branch : !edge.sourceHandle || edge.sourceHandle === "default"))
    ?? edges.find((edge) => edge.source === nodeId && !edge.sourceHandle);
}

export function createEngine(store: AutomationStore, clock: EngineClock, options?: { deliver?: NodeServices["deliver"] }) {
  let pumping = false;

  function updateExecution(id: string, next: (execution: Execution) => Execution): Execution | undefined {
    let updated: Execution | undefined;
    store.replaceDb((db) => {
      db.executions = db.executions.map((execution) => {
        if (execution.id !== id || execution.instanceId !== store.instanceId) return execution;
        updated = next(execution);
        return updated;
      });
    });
    return updated;
  }

  function enqueue(lineageId: string, input: unknown, mode: "test" | "live", liveAuthorized: boolean, eventId = ""): Execution | EngineFailure {
    const workflow = store.get(lineageId);
    if (!workflow) return { ok: false, error: "Workflow not found in this lab instance." };
    if (mode === "live" && workflow.status !== "active") return { ok: false, error: "Only an active workflow can run live." };
    const recent = store.executions().filter((item) => item.lineageId === lineageId && clock.now() - Date.parse(item.startedAt) < 60_000);
    if (mode === "live" && recent.length >= RATE_LIMIT) return { ok: false, error: "This workflow hit its execution limit for the minute." };
    const snapshot = mode === "live" ? store.published(lineageId) : workflow;
    if (!snapshot) return { ok: false, error: "Activate the workflow before a live run." };
    const trigger = snapshot.nodes.find((node) => nodeType(node.type)?.category === "trigger");
    if (!trigger) return { ok: false, error: "The workflow has no trigger." };
    const execution: Execution = {
      id: crypto.randomUUID(),
      instanceId: store.instanceId,
      lineageId,
      version: mode === "live" ? workflow.publishedVersion || 0 : 0,
      mode,
      liveAuthorized: mode === "live" || liveAuthorized,
      status: "pending",
      correlationId: crypto.randomUUID(),
      eventId,
      currentNodeId: trigger.id,
      nodes: [],
      waitUntil: "",
      error: "",
      startedAt: iso(clock.now()),
      finishedAt: "",
    };
    const safeInput = redactValue(input);
    execution.nodes.push({
      nodeId: trigger.id,
      type: trigger.type,
      status: "pending",
      attempts: 0,
      input: safeInput,
      output: null,
      error: "",
      startedAt: "",
      finishedAt: "",
    });
    store.replaceDb((db) => {
      db.executions = [execution, ...db.executions].slice(0, 400);
    });
    schedulePump(0);
    return execution;
  }

  function stepNode(execution: Execution, nodeId: string, input: unknown, depth: number): Execution {
    const workflow = execution.mode === "live" ? store.published(execution.lineageId) : store.get(execution.lineageId);
    const node = workflow?.nodes.find((item) => item.id === nodeId);
    if (!workflow || !node) {
      return { ...execution, status: "failed", error: "The node is no longer in this version.", finishedAt: iso(clock.now()) };
    }
    const visits = execution.nodes.filter((item) => item.nodeId === nodeId && item.status !== "pending").length;
    if (visits >= MAX_VISITS || execution.nodes.length >= MAX_STEPS) {
      return { ...execution, status: "failed", error: "The run exceeded its step limit.", finishedAt: iso(clock.now()) };
    }
    const def = nodeType(node.type);
    if (!def) return { ...execution, status: "failed", error: `Unknown node ${node.type}.`, finishedAt: iso(clock.now()) };
    const prior = execution.nodes.find((item) => item.nodeId === nodeId && (item.status === "pending" || item.status === "waiting")) ?? {
      nodeId,
      type: node.type,
      status: "pending" as const,
      attempts: 0,
      input: redactValue(input),
      output: null,
      error: "",
      startedAt: "",
      finishedAt: "",
    };
    const attempt = prior.attempts + 1;
    const ctx: ExecContext = {
      mode: execution.mode,
      liveAuthorized: execution.liveAuthorized,
      instanceId: store.instanceId,
      now: iso(clock.now()),
      input,
      attempt,
    };
    const baseServices = servicesFor(store, depth, clock, enqueue);
    const outcome = def.execute(node, ctx, { ...baseServices, deliver: options?.deliver ?? baseServices.deliver });
    const run: NodeRun = {
      ...prior,
      status: outcome.error ? "failed" : outcome.waitMs ? "waiting" : "completed",
      attempts: attempt,
      input: redactValue(input),
      output: redactValue(outcome.output),
      error: outcome.error || outcome.pending || "",
      startedAt: prior.startedAt || iso(clock.now()),
      finishedAt: outcome.waitMs ? "" : iso(clock.now()),
    };
    const nodes = execution.nodes.some((item) => item.nodeId === nodeId && (item.status === "pending" || item.status === "waiting"))
      ? execution.nodes.map((item) => (item.nodeId === nodeId && (item.status === "pending" || item.status === "waiting") ? run : item))
      : [...execution.nodes, run];
    let next: Execution = { ...execution, status: "running", currentNodeId: nodeId, nodes };
    if (outcome.waitMs) {
      return { ...next, status: "waiting", waitUntil: iso(clock.now() + outcome.waitMs) };
    }
    if (outcome.error) {
      openException(store, next, node, outcome.error, clock);
      return { ...next, status: "failed", error: outcome.error, finishedAt: iso(clock.now()) };
    }
    if (outcome.branch === "stop" || node.type === "logic.stop") {
      return { ...next, status: "completed", finishedAt: iso(clock.now()) };
    }
    const edge = nextEdge(workflow.edges, node.id, outcome.branch);
    if (!edge) return { ...next, status: "completed", finishedAt: iso(clock.now()) };
    next = {
      ...next,
      currentNodeId: edge.target,
      nodes: [...next.nodes, { nodeId: edge.target, type: workflow.nodes.find((item) => item.id === edge.target)?.type || "", status: "pending", attempts: 0, input: redactValue(outcome.output), output: null, error: "", startedAt: "", finishedAt: "" }],
    };
    return next;
  }

  function stepOnce(depth = 0): boolean {
    const running = store.executions().filter((item) => item.status === "running").length;
    const waiting = store.executions().find((item) => item.status === "waiting" && item.waitUntil && Date.parse(item.waitUntil) <= clock.now());
    if (waiting) {
      const workflow = waiting.mode === "live" ? store.published(waiting.lineageId) : store.get(waiting.lineageId);
      const edge = workflow ? nextEdge(workflow.edges, waiting.currentNodeId) : undefined;
      updateExecution(waiting.id, (execution) => {
        if (!edge) return { ...execution, status: "completed", waitUntil: "", finishedAt: iso(clock.now()) };
        return {
          ...execution,
          status: "pending",
          waitUntil: "",
          currentNodeId: edge.target,
          nodes: execution.nodes.map((node) => node.nodeId === execution.currentNodeId && node.status === "waiting" ? { ...node, status: "completed" as const, finishedAt: iso(clock.now()) } : node).concat({
            nodeId: edge.target,
            type: workflow?.nodes.find((node) => node.id === edge.target)?.type || "",
            status: "pending" as const,
            attempts: 0,
            input: execution.nodes.find((node) => node.nodeId === execution.currentNodeId)?.output ?? null,
            output: null,
            error: "",
            startedAt: "",
            finishedAt: "",
          }),
        };
      });
      return true;
    }
    if (running >= MAX_RUNNING) return false;
    const pending = store.executions().find((item) => item.status === "pending" || (item.status === "running" && item.nodes.some((node) => node.status === "pending")));
    if (!pending) return false;
    const current = pending.nodes.find((node) => node.status === "pending");
    if (!current) {
      updateExecution(pending.id, (execution) => ({ ...execution, status: "completed", finishedAt: iso(clock.now()) }));
      return true;
    }
    const stepped = stepNode({ ...pending, status: "running" }, current.nodeId, current.input, depth);
    updateExecution(pending.id, () => stepped);
    if (stepped.status === "waiting" && stepped.waitUntil) {
      const delay = Math.max(0, Date.parse(stepped.waitUntil) - clock.now());
      clock.schedule(delay, () => {
        if (!pumping) schedulePump(0);
      });
    }
    return true;
  }

  function schedulePump(ms: number): void {
    if (pumping) return;
    pumping = true;
    const run = () => {
      const more = stepOnce();
      if (more) clock.schedule(0, run);
      else pumping = false;
    };
    clock.schedule(ms, run);
  }

  return {
    enqueue,
    pump() {
      let guard = 0;
      while (stepOnce() && guard < MAX_STEPS) guard += 1;
    },
    test(lineageId: string, input: unknown, liveAuthorized = false): Execution | EngineFailure {
      const execution = enqueue(lineageId, input, "test", liveAuthorized);
      if (isFailure(execution)) return execution;
      this.pump();
      return store.executions().find((item) => item.id === execution.id) || execution;
    },
    testNode(lineageId: string, nodeId: string, input: unknown): Execution | EngineFailure {
      const workflow = store.get(lineageId);
      const node = workflow?.nodes.find((item) => item.id === nodeId);
      if (!workflow || !node) return { ok: false, error: "Node not found." };
      const execution: Execution = {
        id: crypto.randomUUID(),
        instanceId: store.instanceId,
        lineageId,
        version: 0,
        mode: "test",
        liveAuthorized: false,
        status: "pending",
        correlationId: crypto.randomUUID(),
        eventId: "",
        currentNodeId: nodeId,
        nodes: [{ nodeId, type: node.type, status: "pending", attempts: 0, input: redactValue(input), output: null, error: "", startedAt: "", finishedAt: "" }],
        waitUntil: "",
        error: "",
        startedAt: iso(clock.now()),
        finishedAt: "",
      };
      store.replaceDb((db) => { db.executions = [execution, ...db.executions]; });
      const stepped = stepNode(execution, nodeId, input, 0);
      const single = stepped.status === "running" ? { ...stepped, status: "completed" as const, finishedAt: iso(clock.now()) } : stepped;
      updateExecution(execution.id, () => single);
      return single;
    },
    ingest(event: Omit<ConnectionEvent, "id" | "status" | "correlationId" | "executionId" | "receivedAt"> & { eventType: ConnectEventType }): ConnectionEvent {
      const key = event.idempotencyKey;
      const existing = store.events().find((item) => item.idempotencyKey === key);
      if (existing) {
        const duplicate: ConnectionEvent = { ...existing, id: crypto.randomUUID(), status: "duplicate", receivedAt: iso(clock.now()), executionId: existing.executionId };
        store.replaceDb((db) => { db.events = [duplicate, ...db.events].slice(0, 400); });
        return duplicate;
      }
      const record: ConnectionEvent = {
        ...event,
        id: crypto.randomUUID(),
        status: "received",
        correlationId: crypto.randomUUID(),
        executionId: "",
        receivedAt: iso(clock.now()),
      };
      store.replaceDb((db) => { db.events = [record, ...db.events].slice(0, 400); });
      const matches = store.list().filter((workflow) => {
        if (workflow.status !== "active" || !workflow.publishedVersion) return false;
        const snapshot = store.published(workflow.id);
        const trigger = snapshot?.nodes.find((node) => nodeType(node.type)?.category === "trigger");
        if (!trigger) return false;
        return triggerMatches(trigger, event);
      });
      if (!matches.length) {
        store.replaceDb((db) => { db.events = db.events.map((item) => item.id === record.id ? { ...item, status: "processed" } : item); });
        return { ...record, status: "processed" };
      }
      const first = matches[0];
      const execution = enqueue(first.id, { summary: event.summary, payload: event.payload, messageType: event.messageType, eventType: event.eventType }, "live", false, record.id);
      if (isFailure(execution)) {
        store.replaceDb((db) => { db.events = db.events.map((item) => item.id === record.id ? { ...item, status: "quarantined" } : item); });
        return { ...record, status: "quarantined" };
      }
      store.replaceDb((db) => { db.events = db.events.map((item) => item.id === record.id ? { ...item, status: "processing", executionId: execution.id } : item); });
      this.pump();
      const done = store.executions().find((item) => item.id === execution.id);
      const status = done?.status === "failed" ? "failed" : "processed";
      store.replaceDb((db) => { db.events = db.events.map((item) => item.id === record.id ? { ...item, status, executionId: execution.id } : item); });
      return { ...record, status, executionId: execution.id };
    },
    retry(executionId: string, acknowledgeSideEffect: boolean): Execution | EngineFailure {
      const execution = store.executions().find((item) => item.id === executionId);
      if (!execution || execution.status !== "failed") return { ok: false, error: "Only a failed run can be retried." };
      const failed = [...execution.nodes].reverse().find((node) => node.status === "failed");
      if (!failed) return { ok: false, error: "The run has no failed node." };
      const def = nodeType(failed.type);
      if (def?.sideEffect && !acknowledgeSideEffect) return { ok: false, error: "This node may already have written data. Confirm before retrying it." };
      const retried = stepNode({ ...execution, status: "running", error: "", finishedAt: "" }, failed.nodeId, failed.input, 0);
      updateExecution(execution.id, () => retried);
      this.pump();
      return store.executions().find((item) => item.id === execution.id) || retried;
    },
    recover() {
      for (const execution of store.executions()) {
        if (execution.status !== "running") continue;
        const active = [...execution.nodes].reverse().find((node) => node.status === "running" || node.status === "pending");
        const def = active ? nodeType(active.type) : undefined;
        if (active && def?.sideEffect && active.status === "running") {
          updateExecution(execution.id, (current) => ({ ...current, status: "failed", error: "The worker restarted during a side effect. Retry only after confirming it did not write.", finishedAt: iso(clock.now()) }));
        } else {
          updateExecution(execution.id, (current) => ({ ...current, status: "pending" }));
        }
      }
      this.pump();
    },
    cancel(executionId: string): Execution | EngineFailure {
      const execution = store.executions().find((item) => item.id === executionId);
      if (!execution) return { ok: false, error: "Run not found." };
      if (execution.status === "completed" || execution.status === "failed" || execution.status === "cancelled") {
        return { ok: false, error: "This run has already finished." };
      }
      const wrote = execution.nodes.some((node) => (node.status === "completed" || node.status === "running") && nodeType(node.type)?.sideEffect);
      if (wrote) return { ok: false, error: "A side effect already ran, so this run cannot be cancelled safely." };
      updateExecution(execution.id, (current) => ({ ...current, status: "cancelled", finishedAt: iso(clock.now()), error: "Cancelled before a side effect." }));
      return store.executions().find((item) => item.id === execution.id) || { ok: false as const, error: "Could not update the run." };
    },
    resume(executionId: string): Execution | EngineFailure {
      const execution = store.executions().find((item) => item.id === executionId);
      if (!execution || execution.status !== "waiting") return { ok: false, error: "Only a waiting run can be resumed." };
      updateExecution(execution.id, (current) => ({ ...current, waitUntil: iso(clock.now()) }));
      this.pump();
      return store.executions().find((item) => item.id === execution.id) || { ok: false as const, error: "Could not update the run." };
    },
    runDueSchedules() {
      for (const workflow of store.list()) {
        if (workflow.status !== "active") continue;
        const snapshot = store.published(workflow.id);
        const trigger = snapshot?.nodes.find((node) => node.type === "trigger.schedule");
        if (!trigger) continue;
        const minutes = Number(trigger.config["minutes"]);
        if (!Number.isFinite(minutes) || minutes <= 0) continue;
        const last = store.executions().find((item) => item.lineageId === workflow.id && item.mode === "live");
        const due = !last || clock.now() - Date.parse(last.startedAt) >= minutes * 60_000;
        if (due) enqueue(workflow.id, { scheduled: true }, "live", false);
      }
      this.pump();
    },
  };
}

function triggerMatches(trigger: FlowNode, event: { interfaceId: string; eventType: string; messageType: string; payload: string; interfaceKind: string }): boolean {
  const connectionId = String(trigger.config["connectionId"] || "");
  if (connectionId && connectionId !== event.interfaceId) return false;
  const messageType = String(trigger.config["messageType"] || "");
  if (messageType && messageType !== event.messageType) return false;
  const filter = String(trigger.config["filter"] || "");
  if (filter && !event.payload.toLowerCase().includes(filter.toLowerCase())) return false;
  if (trigger.type === "trigger.connection") return trigger.config["eventType"] === event.eventType;
  if (trigger.type === "trigger.message") return event.eventType === "message.received";
  if (trigger.type === "trigger.file") return event.eventType === "file.received" && event.interfaceKind === "File";
  if (trigger.type === "trigger.status") return event.eventType === "status.changed";
  if (trigger.type === "trigger.ack") return event.eventType === "ack.received";
  if (trigger.type === "trigger.webhook") return event.eventType === "webhook.received" && String(trigger.config["webhookKey"] || "") === event.interfaceId;
  return false;
}

export type AutomationEngine = ReturnType<typeof createEngine>;
