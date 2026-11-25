import { describe, expect, it } from "vitest";
import { createEngine, isExecution } from "./engine";
import { validateHttpsDestination } from "./redact";
import { createAutomationStore, type AutomationStorage } from "./store";
import type { AutomationDb, FlowNode, WorkflowDraft } from "./types";

function harness(instanceId = "lab-a") {
  let db: AutomationDb | null = null;
  const storage: AutomationStorage = { load: () => db, save: (next) => { db = next; } };
  const store = createAutomationStore(storage, instanceId, "M. Chen");
  let now = Date.parse("2026-11-17T22:00:00.000Z");
  const deliveries: { interfaceId: string; summary: string; payload: string }[] = [];
  const engine = createEngine(store, { now: () => now, schedule: (_ms, run) => run() }, {
    deliver: (input) => {
      deliveries.push(input);
      return input.summary.includes("reject") ? { id: "", delivered: false, pending: "Connection rejected the delivery." } : { id: `MSG-${deliveries.length}`, delivered: true };
    },
  });
  return {
    store,
    engine,
    deliveries,
    setNow(ms: number) { now = ms; },
    now: () => now,
  };
}

function node(type: string, id: string, config: Record<string, unknown> = {}, label = type): FlowNode {
  return { id, type, label, position: { x: 0, y: 0 }, config };
}

function draft(nodes: FlowNode[], edges: WorkflowDraft["edges"] = [], name = "Route CBC"): WorkflowDraft {
  return { name, description: "Route a result", category: "Integration", connectionId: "results-hook", owner: "M. Chen", tags: ["cbc"], nodes, edges };
}

describe("connect workflow automation", () => {
  it("saves a draft, validates, and refuses activation with blocking errors", () => {
    const { store } = harness();
    const created = store.create(draft([node("action.send", "send", { connectionId: "missing", operation: "release" })], [], ""));
    expect(created.status).toBe("draft");
    const saved = store.saveDraft(created.id, { name: "Route CBC" });
    expect(saved?.name).toBe("Route CBC");
    const blocked = store.setStatus(created.id, "active", ["results-hook"]);
    expect(blocked.workflow?.status).toBe("draft");
    expect(blocked.issues.some((issue) => issue.code === "TRIGGER" || issue.code === "UNKNOWN_CONNECTION")).toBe(true);
  });

  it("transforms, branches, and does not deliver during a test", () => {
    const { store, engine, deliveries } = harness();
    const created = store.create(draft([
      node("trigger.manual", "start"),
      node("action.transform", "map", { sourceFormat: "json", destinationFormat: "json", mappings: [{ from: "code", to: "order", type: "string", fallback: "" }] }),
      node("logic.if", "check", { condition: { join: "and", clauses: [{ path: "order", cmp: "eq", value: "CBC" }] } }),
      node("action.send", "send", { connectionId: "results-hook", operation: "release" }),
      node("logic.stop", "stop"),
    ], [
      { id: "e1", source: "start", target: "map" },
      { id: "e2", source: "map", target: "check" },
      { id: "e3", source: "check", target: "send", sourceHandle: "true" },
      { id: "e4", source: "check", target: "stop", sourceHandle: "false" },
    ]));
    const result = engine.test(created.id, { code: "CBC", mrn: "V-104428" });
    expect("status" in result && result.status).toBe("completed");
    expect(deliveries).toHaveLength(0);
    const runs = isExecution(result) ? result.nodes : [];
    expect(runs.find((item) => item.nodeId === "map")?.output).toEqual({ order: "CBC" });
    expect(JSON.stringify(runs)).toContain("[redacted]");
    expect(JSON.stringify(runs)).not.toContain("V-104428");
  });

  it("delivers to a connection only for a live run and deduplicates the event", () => {
    const { store, engine, deliveries } = harness();
    const created = store.create(draft([
      node("trigger.connection", "start", { connectionId: "results-hook", eventType: "message.received" }),
      node("action.send", "send", { connectionId: "results-hook", operation: "release" }),
    ], [{ id: "e1", source: "start", target: "send" }]));
    expect(store.setStatus(created.id, "active", ["results-hook"]).workflow?.status).toBe("active");
    const event = {
      instanceId: "lab-a",
      interfaceId: "results-hook",
      interfaceKind: "Webhook",
      messageId: "MSG-1",
      eventType: "message.received" as const,
      messageType: "ORU",
      summary: "CBC",
      payload: "{\"code\":\"CBC\"}",
      idempotencyKey: "results-hook:MSG-1:message.received",
    };
    const first = engine.ingest(event);
    const second = engine.ingest(event);
    expect(first.status).toBe("processed");
    expect(second.status).toBe("duplicate");
    expect(deliveries).toHaveLength(1);
    expect(store.executions().filter((item) => item.mode === "live")).toHaveLength(1);
  });

  it("keeps a published version immutable and rolls back by publishing a new version", () => {
    const { store } = harness();
    const created = store.create(draft([node("trigger.manual", "start")]));
    store.setStatus(created.id, "active", []);
    store.saveDraft(created.id, { name: "Changed draft" });
    expect(store.published(created.id)?.name).toBe("Route CBC");
    expect(store.get(created.id)?.dirty).toBe(true);
    const rolled = store.rollback(created.id, 1, []);
    expect(rolled.workflow?.status).toBe("active");
    expect(rolled.workflow?.publishedVersion).toBe(2);
    expect(store.published(created.id)?.name).toBe("Route CBC");
  });

  it("waits, resumes, and isolates another lab instance", () => {
    const lab = harness();
    const created = lab.store.create(draft([
      node("trigger.manual", "start"),
      node("logic.wait", "wait", { seconds: 30 }),
      node("logic.stop", "stop"),
    ], [
      { id: "e1", source: "start", target: "wait" },
      { id: "e2", source: "wait", target: "stop" },
    ]));
    const running = lab.engine.test(created.id, { ok: true });
    expect("status" in running && running.status).toBe("waiting");
    lab.setNow(lab.now() + 31_000);
    lab.engine.pump();
    expect(lab.store.executions()[0]?.status).toBe("completed");
    const other = createAutomationStore({ load: () => null, save: () => undefined }, "lab-b");
    expect(other.get(created.id)).toBeUndefined();
  });

  it("does not retry a side effect until it is confirmed, and rejects private HTTP destinations", () => {
    const { store, engine } = harness();
    const created = store.create(draft([
      node("trigger.manual", "start"),
      node("action.send", "send", { connectionId: "results-hook", operation: "reject" }),
    ], [{ id: "e1", source: "start", target: "send" }]));
    const failed = engine.test(created.id, { code: "CBC" }, true);
    expect("status" in failed && failed.status).toBe("failed");
    expect(engine.retry(isExecution(failed) ? failed.id : "", false)).toMatchObject({ error: "This node may already have written data. Confirm before retrying it." });
    expect(validateHttpsDestination("http://10.1.1.1/hook")).toMatch(/https|Private/);
    expect(validateHttpsDestination("https://169.254.169.254/latest")).toMatch(/not allowed|Private/);
    expect(validateHttpsDestination("https://hooks.partner.example/results")).toBeNull();
  });

  it("fails a side effect that was running when the worker restarts", () => {
    const { store, engine } = harness();
    const created = store.create(draft([node("trigger.manual", "start")]));
    store.replaceDb((db) => {
      db.executions = [{
        id: "run-1",
        instanceId: "lab-a",
        lineageId: created.id,
        version: 0,
        mode: "live",
        liveAuthorized: true,
        status: "running",
        correlationId: "corr",
        eventId: "",
        currentNodeId: "send",
        nodes: [{ nodeId: "send", type: "action.send", status: "running", attempts: 1, input: {}, output: null, error: "", startedAt: "2026-11-17T22:00:00.000Z", finishedAt: "" }],
        waitUntil: "",
        error: "",
        startedAt: "2026-11-17T22:00:00.000Z",
        finishedAt: "",
      }];
    });
    engine.recover();
    expect(store.executions()[0]?.status).toBe("failed");
    expect(store.executions()[0]?.error).toMatch(/worker restarted/);
  });

  it("cancels a run before a side effect and keeps exception assignment in the lab", () => {
    const { store, engine } = harness();
    const created = store.create(draft([
      node("trigger.manual", "start"),
      node("logic.wait", "wait", { seconds: 30 }),
    ], [{ id: "e1", source: "start", target: "wait" }]));
    const waiting = engine.test(created.id, { ok: true });
    expect(isExecution(waiting) && waiting.status).toBe("waiting");
    const cancelled = engine.cancel(isExecution(waiting) ? waiting.id : "");
    expect(isExecution(cancelled) && cancelled.status).toBe("cancelled");
    store.replaceDb((db) => {
      db.exceptions = [{
        id: "ex-1",
        instanceId: "lab-a",
        executionId: "run",
        lineageId: created.id,
        nodeId: "wait",
        severity: "high",
        summary: "Held",
        assignee: "",
        status: "open",
        resolution: "",
        createdAt: "2026-11-17T22:00:00.000Z",
        updatedAt: "2026-11-17T22:00:00.000Z",
      }];
    });
    expect(store.assignException("ex-1", "M. Chen")?.assignee).toBe("M. Chen");
    expect(store.resolveException("ex-1", "Checked the connection")?.status).toBe("resolved");
    expect(store.auditLog().some((entry) => entry.action === "exception.resolve")).toBe(true);
    const other = createAutomationStore({ load: () => store.list() && null, save: () => undefined }, "lab-b");
    expect(other.exceptions()).toHaveLength(0);
  });

  it("pauses matching and archives the workflow", () => {
    const { store, engine, deliveries } = harness();
    const created = store.create(draft([
      node("trigger.ack", "start", { connectionId: "results-hook" }),
      node("logic.stop", "stop"),
    ], [{ id: "e1", source: "start", target: "stop" }]));
    store.setStatus(created.id, "active", ["results-hook"]);
    store.setStatus(created.id, "paused", ["results-hook"]);
    engine.ingest({
      instanceId: "lab-a",
      interfaceId: "results-hook",
      interfaceKind: "Webhook",
      messageId: "MSG-9",
      eventType: "ack.received",
      messageType: "ACK",
      summary: "ack",
      payload: "ok",
      idempotencyKey: "ack-9",
    });
    expect(store.executions()).toHaveLength(0);
    expect(deliveries).toHaveLength(0);
    expect(store.setStatus(created.id, "archived", []).workflow?.status).toBe("archived");
  });
});
