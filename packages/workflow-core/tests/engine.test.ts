import { describe, it, expect, beforeEach } from "vitest";
import {
  createWorkflowPlatform,
  evaluateExpression,
  evaluateBoolean,
  evaluateCondition,
  evaluateRules,
  validateWorkflow,
  sampleLifecycleTemplate,
  matchTriggers,
  type BusinessRule,
  type WorkflowDefinition,
} from "../src/index.js";

describe("expression evaluator", () => {
  it("evaluates comparisons and logic", () => {
    expect(evaluateBoolean("priority == 'STAT'", { priority: "STAT" })).toBe(true);
    expect(evaluateBoolean("priority == 'STAT'", { priority: "RUSH" })).toBe(false);
    expect(evaluateBoolean("a > 5 && b < 10", { a: 6, b: 3 })).toBe(true);
    expect(evaluateBoolean("a > 5 || b < 1", { a: 1, b: 3 })).toBe(false);
  });

  it("resolves nested paths and builtins", () => {
    expect(evaluateExpression("sample.priority", { sample: { priority: "STAT" } })).toBe("STAT");
    expect(evaluateExpression("len('abc')", {})).toBe(3);
    expect(evaluateExpression("upper(status)", { status: "pass" })).toBe("PASS");
    expect(evaluateExpression("1 + 2 * 3", {})).toBe(7);
    expect(evaluateBoolean("includes(tags, 'critical')", { tags: ["critical", "qa"] })).toBe(true);
  });

  it("supports ${} wrapping", () => {
    expect(evaluateBoolean("${ quantity <= reorderLevel }", { quantity: 2, reorderLevel: 5 })).toBe(true);
  });
});

describe("business rules", () => {
  it("evaluates nested conditions and applies actions", () => {
    const rule: BusinessRule = {
      id: "r1",
      tenantId: "t1",
      name: "STAT escalate",
      enabled: true,
      priority: 1,
      condition: {
        logic: "and",
        conditions: [
          { logic: "and", field: "priority", operator: "eq", value: "STAT" },
          { logic: "and", field: "site", operator: "in", value: ["NY", "NJ"] },
        ],
      },
      actions: [
        { type: "set_field", config: { field: "escalated", value: true } },
        { type: "calculate", config: { field: "slaHours", expression: "4" } },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateRules([rule], { priority: "STAT", site: "NY" });
    expect(result.results[0]!.matched).toBe(true);
    expect(result.data["escalated"]).toBe(true);
    expect(result.data["slaHours"]).toBe(4);
  });

  it("supports expression conditions", () => {
    expect(
      evaluateCondition(
        { logic: "and", expression: "result.value > 10" },
        { result: { value: 12 } }
      )
    ).toBe(true);
  });
});

describe("workflow platform", () => {
  const tenantId = "lab-demo";
  let platform: ReturnType<typeof createWorkflowPlatform>;

  beforeEach(() => {
    platform = createWorkflowPlatform({
      seedTemplates: { tenantId, createdBy: "system" },
    });
  });

  it("registers all builtin node plugins", () => {
    const types = platform.registry.list().map((p) => p.type);
    expect(types).toContain("start");
    expect(types).toContain("approval");
    expect(types).toContain("electronic_signature");
    expect(types).toContain("ai_decision");
    expect(types).toContain("parallel");
    expect(types.length).toBeGreaterThanOrEqual(35);
  });

  it("seeds laboratory templates", () => {
    const templates = platform.store.list(tenantId, { isTemplate: true });
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.some((t) => t.name.includes("Sample Lifecycle"))).toBe(true);
  });

  it("validates workflows before publish", () => {
    const tmpl = sampleLifecycleTemplate(tenantId, "system");
    const result = validateWorkflow(tmpl, platform.registry);
    expect(result.valid).toBe(true);
  });

  it("detects missing start node", () => {
    const bad: WorkflowDefinition = {
      ...sampleLifecycleTemplate(tenantId, "system"),
      nodes: [],
      edges: [],
    };
    const result = platform.engine.validate(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "NO_START")).toBe(true);
  });

  it("versions, publishes, and rolls back", () => {
    const created = platform.store.create({
      tenantId,
      name: "Test Flow",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        { id: "e", type: "end", label: "End", position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [{ id: "se", source: "s", target: "e" }],
    });

    const published = platform.store.publish(created.id, tenantId, "admin");
    expect(published?.status).toBe("published");

    const v2 = platform.store.createVersion(created.id, tenantId, "admin", {
      name: "Test Flow v2",
    });
    expect(v2?.version).toBe(2);
    expect(v2?.status).toBe("draft");

    platform.store.publish(v2!.id, tenantId, "admin");
    const afterPublish = platform.store.get(created.id, tenantId);
    expect(afterPublish?.status).toBe("archived");

    const rolled = platform.store.rollback(created.lineageId, 1, tenantId, "admin");
    expect(rolled?.status).toBe("published");
    expect(rolled!.version).toBeGreaterThan(2);
  });

  it("clones and creates from template", () => {
    const templates = platform.store.list(tenantId, { isTemplate: true });
    const tmpl = templates[0]!;
    const cloned = platform.store.clone(tmpl.id, tenantId, "admin", { name: "My Clone" });
    expect(cloned?.name).toBe("My Clone");
    expect(cloned?.isTemplate).toBe(false);

    const fromTemplate = platform.store.createFromTemplate(tmpl.id, tenantId, "admin", "From Template");
    expect(fromTemplate?.templateId).toBe(tmpl.id);
    expect(fromTemplate?.status).toBe("draft");
  });

  it("executes a simple workflow end-to-end", async () => {
    const wf = platform.store.create({
      tenantId,
      name: "Simple",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "c",
          type: "calculation",
          label: "Calc",
          position: { x: 100, y: 0 },
          config: { expression: "a + b", outputVariable: "sum" },
        },
        { id: "e", type: "end", label: "End", position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: "1", source: "s", target: "c" },
        { id: "2", source: "c", target: "e" },
      ],
    });
    platform.store.publish(wf.id, tenantId, "admin");

    const exec = await platform.engine.start(wf.id, {
      tenantId,
      variables: { a: 2, b: 3 },
      userId: "admin",
    });

    expect(exec.status).toBe("completed");
    expect(exec.context.variables["sum"]).toBe(5);
    expect(platform.engine.getLogs(exec.id).length).toBeGreaterThan(0);
  });

  it("branches on decisions", async () => {
    const wf = platform.store.create({
      tenantId,
      name: "Decision Flow",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "d",
          type: "decision",
          label: "Check",
          position: { x: 100, y: 0 },
          config: { expression: "priority == 'STAT'", trueLabel: "yes", falseLabel: "no" },
        },
        { id: "y", type: "end", label: "STAT End", position: { x: 200, y: -50 }, config: { outcome: "stat" } },
        { id: "n", type: "end", label: "Normal End", position: { x: 200, y: 50 }, config: { outcome: "normal" } },
      ],
      edges: [
        { id: "1", source: "s", target: "d" },
        { id: "2", source: "d", target: "y", label: "yes" },
        { id: "3", source: "d", target: "n", label: "no" },
      ],
    });
    platform.store.publish(wf.id, tenantId, "admin");

    const exec = await platform.engine.start(wf.id, {
      tenantId,
      variables: { priority: "STAT" },
    });
    expect(exec.status).toBe("completed");
    expect(exec.nodeExecutions["y"]?.status).toBe("completed");
    expect(exec.nodeExecutions["n"]).toBeUndefined();
  });

  it("simulates workflows including waiting nodes", async () => {
    const templates = platform.store.list(tenantId, { isTemplate: true });
    const sample = templates.find((t) => t.name.includes("Sample Lifecycle"))!;
    const instance = platform.store.createFromTemplate(sample.id, tenantId, "admin")!;
    platform.store.publish(instance.id, tenantId, "admin");

    const sim = await platform.engine.simulate({
      workflowId: instance.id,
      tenantId,
      eventPayload: { priority: "STAT" },
      entityData: { priority: "STAT" },
      variables: { priority: "STAT", result: 1 },
    });

    expect(["completed", "waiting"]).toContain(sim.outcome);
    expect(sim.path.length).toBeGreaterThan(3);
    expect(sim.execution.isSimulation).toBe(true);
  });

  it("triggers workflows from domain events", async () => {
    const wf = platform.store.create({
      tenantId,
      name: "On Sample Created",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "n",
          type: "notification",
          label: "Notify",
          position: { x: 100, y: 0 },
          config: { recipients: "lab", message: "New sample" },
        },
        { id: "e", type: "end", label: "End", position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: "1", source: "s", target: "n" },
        { id: "2", source: "n", target: "e" },
      ],
      triggers: [
        {
          id: "t1",
          type: "event",
          eventType: "sample.created",
          enabled: true,
        },
      ],
    });
    platform.store.publish(wf.id, tenantId, "admin");

    await platform.eventBus.emit({
      type: "sample.created",
      tenantId,
      payload: { sampleId: "S-1" },
      entityType: "sample",
      entityId: "S-1",
    });

    await new Promise((r) => setTimeout(r, 20));

    const execs = platform.engine.listExecutions(tenantId, { workflowId: wf.id });
    expect(execs.length).toBeGreaterThanOrEqual(1);
    expect(execs[0]!.status).toBe("completed");
  });

  it("matches triggers with filters", () => {
    const wf = platform.store.create({
      tenantId,
      name: "Filtered",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        { id: "e", type: "end", label: "End", position: { x: 100, y: 0 }, config: {} },
      ],
      edges: [{ id: "1", source: "s", target: "e" }],
      triggers: [
        {
          id: "t1",
          type: "event",
          eventType: "inventory.threshold_reached",
          filter: "quantity <= 5",
          enabled: true,
        },
      ],
    });
    platform.store.publish(wf.id, tenantId, "admin");
    const published = platform.store.list(tenantId, { status: "published" });

    const matches = matchTriggers(published, {
      id: "1",
      type: "inventory.threshold_reached",
      tenantId,
      timestamp: new Date().toISOString(),
      payload: { quantity: 3 },
    });
    expect(matches.some((m) => m.workflow.id === wf.id)).toBe(true);

    const noMatch = matchTriggers(published, {
      id: "2",
      type: "inventory.threshold_reached",
      tenantId,
      timestamp: new Date().toISOString(),
      payload: { quantity: 20 },
    });
    expect(noMatch.some((m) => m.workflow.id === wf.id)).toBe(false);
  });

  it("resumes waiting human tasks", async () => {
    const wf = platform.store.create({
      tenantId,
      name: "Approval Flow",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "a",
          type: "approval",
          label: "Approve",
          position: { x: 100, y: 0 },
          config: { approverRole: "qa_officer" },
        },
        { id: "e", type: "end", label: "End", position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: "1", source: "s", target: "a" },
        { id: "2", source: "a", target: "e", label: "approved" },
      ],
    });
    platform.store.publish(wf.id, tenantId, "admin");

    const exec = await platform.engine.start(wf.id, { tenantId });
    expect(exec.status).toBe("waiting");

    const resumed = await platform.engine.resume(exec.id, {
      nodeId: "a",
      output: { decision: "approved", branch: "approved" },
      userId: "qa1",
      branch: "approved",
    });
    expect(resumed.status).toBe("completed");
  });

  it("allows custom plugins without modifying core", async () => {
    platform.registry.register({
      type: "lab.custom_hold",
      label: "Custom Hold",
      description: "Tenant-specific hold step",
      category: "laboratory",
      configSchema: { fields: [{ name: "reason", label: "Reason", type: "string", required: true }] },
      execute: async (ctx) => ({
        status: "completed",
        output: { held: true, reason: ctx.node.config["reason"] },
      }),
    });

    const wf = platform.store.create({
      tenantId,
      name: "Custom Plugin Flow",
      createdBy: "admin",
      nodes: [
        { id: "s", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "h",
          type: "lab.custom_hold",
          label: "Hold",
          position: { x: 100, y: 0 },
          config: { reason: "stability" },
        },
        { id: "e", type: "end", label: "End", position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: "1", source: "s", target: "h" },
        { id: "2", source: "h", target: "e" },
      ],
    });
    platform.store.publish(wf.id, tenantId, "admin");
    const exec = await platform.engine.start(wf.id, { tenantId });
    expect(exec.status).toBe("completed");
    expect(exec.nodeExecutions["h"]?.output?.["reason"]).toBe("stability");
  });
});
