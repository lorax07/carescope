/**
 * REST routes for workflow definitions, execution, rules, events, and catalog.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { v4 as uuid } from "uuid";
import type { WorkflowDefinition, BusinessRule } from "@carescope/workflow-core";
import {
  MODULE_INTEGRATIONS,
  SYSTEM_EVENT_CATALOG,
  evaluateRules,
} from "@carescope/workflow-core";
import { getDefaultTenant, getPlatform } from "./platform.js";

function tenantId(req: Request): string {
  return String(req.header("x-tenant-id") ?? getDefaultTenant());
}

function userId(req: Request): string {
  return String(req.header("x-user-id") ?? "admin");
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createRestRouter(): Router {
  const router = Router();

  // --- Health / meta ---
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "carescope-workflow-api", time: new Date().toISOString() });
  });

  router.get("/catalog/nodes", (_req, res) => {
    const { registry } = getPlatform();
    res.json(
      registry.list().map((p) => ({
        type: p.type,
        label: p.label,
        description: p.description,
        category: p.category,
        icon: p.icon,
        color: p.color,
        configSchema: p.configSchema,
        modules: p.modules,
      }))
    );
  });

  router.get("/catalog/events", (_req, res) => {
    res.json(SYSTEM_EVENT_CATALOG);
  });

  router.get("/catalog/modules", (_req, res) => {
    res.json(MODULE_INTEGRATIONS);
  });

  // --- Workflows ---
  router.get(
    "/workflows",
    asyncHandler(async (req, res) => {
      const { store } = getPlatform();
      const list = store.list(tenantId(req), {
        status: req.query["status"] as WorkflowDefinition["status"] | undefined,
        isTemplate:
          req.query["isTemplate"] === undefined
            ? undefined
            : req.query["isTemplate"] === "true",
        search: req.query["search"] as string | undefined,
        module: req.query["module"] as string | undefined,
        entityType: req.query["entityType"] as string | undefined,
      });
      res.json(list);
    })
  );

  router.get(
    "/workflows/latest",
    asyncHandler(async (req, res) => {
      const { store } = getPlatform();
      res.json(
        store.listLatest(tenantId(req), {
          publishedOnly: req.query["publishedOnly"] === "true",
          includeTemplates: req.query["includeTemplates"] !== "false",
        })
      );
    })
  );

  router.post(
    "/workflows",
    asyncHandler(async (req, res) => {
      const { store } = getPlatform();
      const body = req.body as Partial<WorkflowDefinition>;
      const created = store.create({
        tenantId: tenantId(req),
        name: body.name ?? "Untitled Workflow",
        description: body.description,
        createdBy: userId(req),
        nodes: body.nodes,
        edges: body.edges,
        triggers: body.triggers,
        entityTypes: body.entityTypes,
        modules: body.modules,
        tags: body.tags,
        isTemplate: body.isTemplate,
        variables: body.variables,
      });
      res.status(201).json(created);
    })
  );

  router.get(
    "/workflows/:id",
    asyncHandler(async (req, res) => {
      const def = getPlatform().store.get(req.params["id"]!, tenantId(req));
      if (!def) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      res.json(def);
    })
  );

  router.put(
    "/workflows/:id",
    asyncHandler(async (req, res) => {
      const { store } = getPlatform();
      const existing = store.get(req.params["id"]!, tenantId(req));
      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      if (existing.status === "published") {
        // Immutable published versions — create a new draft version
        const next = store.createVersion(existing.id, tenantId(req), userId(req), req.body);
        res.json(next);
        return;
      }
      const updated = store.save({
        ...existing,
        ...req.body,
        id: existing.id,
        tenantId: existing.tenantId,
        lineageId: existing.lineageId,
        version: existing.version,
        createdAt: existing.createdAt,
        createdBy: existing.createdBy,
      });
      res.json(updated);
    })
  );

  router.post(
    "/workflows/:id/validate",
    asyncHandler(async (req, res) => {
      const { store, engine } = getPlatform();
      const def = store.get(req.params["id"]!, tenantId(req));
      if (!def) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      res.json(engine.validate(def));
    })
  );

  router.post(
    "/workflows/:id/publish",
    asyncHandler(async (req, res) => {
      const { store, engine } = getPlatform();
      const def = store.get(req.params["id"]!, tenantId(req));
      if (!def) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      const validation = engine.validate(def);
      if (!validation.valid) {
        res.status(400).json({ error: "Validation failed", validation });
        return;
      }
      const published = store.publish(def.id, tenantId(req), userId(req));
      res.json({ workflow: published, validation });
    })
  );

  router.post(
    "/workflows/:id/archive",
    asyncHandler(async (req, res) => {
      const archived = getPlatform().store.archive(req.params["id"]!, tenantId(req));
      if (!archived) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      res.json(archived);
    })
  );

  router.post(
    "/workflows/:id/clone",
    asyncHandler(async (req, res) => {
      const cloned = getPlatform().store.clone(
        req.params["id"]!,
        tenantId(req),
        userId(req),
        req.body
      );
      if (!cloned) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      res.status(201).json(cloned);
    })
  );

  router.post(
    "/workflows/:id/version",
    asyncHandler(async (req, res) => {
      const next = getPlatform().store.createVersion(
        req.params["id"]!,
        tenantId(req),
        userId(req),
        req.body
      );
      if (!next) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      res.status(201).json(next);
    })
  );

  router.get(
    "/workflows/:id/versions",
    asyncHandler(async (req, res) => {
      const def = getPlatform().store.get(req.params["id"]!, tenantId(req));
      if (!def) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      res.json(getPlatform().store.listVersions(def.lineageId, tenantId(req)));
    })
  );

  router.post(
    "/workflows/:id/rollback",
    asyncHandler(async (req, res) => {
      const def = getPlatform().store.get(req.params["id"]!, tenantId(req));
      if (!def) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      const version = Number(req.body?.version);
      if (!version) {
        res.status(400).json({ error: "version is required" });
        return;
      }
      const rolled = getPlatform().store.rollback(
        def.lineageId,
        version,
        tenantId(req),
        userId(req)
      );
      if (!rolled) {
        res.status(404).json({ error: "Target version not found" });
        return;
      }
      res.json(rolled);
    })
  );

  router.post(
    "/templates/:id/instantiate",
    asyncHandler(async (req, res) => {
      const instance = getPlatform().store.createFromTemplate(
        req.params["id"]!,
        tenantId(req),
        userId(req),
        req.body?.name
      );
      if (!instance) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.status(201).json(instance);
    })
  );

  // --- Execution ---
  router.post(
    "/workflows/:id/start",
    asyncHandler(async (req, res) => {
      const exec = await getPlatform().engine.start(req.params["id"]!, {
        tenantId: tenantId(req),
        userId: userId(req),
        eventPayload: req.body?.eventPayload,
        entityData: req.body?.entityData,
        entityType: req.body?.entityType,
        entityId: req.body?.entityId,
        variables: req.body?.variables,
        triggeredBy: { type: "manual", userId: userId(req) },
      });
      res.status(201).json(exec);
    })
  );

  router.post(
    "/workflows/:id/simulate",
    asyncHandler(async (req, res) => {
      const result = await getPlatform().engine.simulate({
        workflowId: req.params["id"]!,
        tenantId: tenantId(req),
        userId: userId(req),
        version: req.body?.version,
        eventPayload: req.body?.eventPayload,
        entityData: req.body?.entityData,
        variables: req.body?.variables,
      });
      res.json(result);
    })
  );

  router.get(
    "/executions",
    asyncHandler(async (req, res) => {
      res.json(
        getPlatform().engine.listExecutions(tenantId(req), {
          workflowId: req.query["workflowId"] as string | undefined,
          status: req.query["status"] as never,
          entityId: req.query["entityId"] as string | undefined,
        })
      );
    })
  );

  router.get(
    "/executions/:id",
    asyncHandler(async (req, res) => {
      const exec = getPlatform().engine.getExecution(req.params["id"]!);
      if (!exec || exec.tenantId !== tenantId(req)) {
        res.status(404).json({ error: "Execution not found" });
        return;
      }
      res.json(exec);
    })
  );

  router.get(
    "/executions/:id/logs",
    asyncHandler(async (req, res) => {
      const exec = getPlatform().engine.getExecution(req.params["id"]!);
      if (!exec || exec.tenantId !== tenantId(req)) {
        res.status(404).json({ error: "Execution not found" });
        return;
      }
      res.json(getPlatform().engine.getLogs(exec.id));
    })
  );

  router.post(
    "/executions/:id/resume",
    asyncHandler(async (req, res) => {
      const exec = await getPlatform().engine.resume(req.params["id"]!, {
        nodeId: req.body.nodeId,
        output: req.body.output,
        userId: userId(req),
        branch: req.body.branch,
      });
      res.json(exec);
    })
  );

  router.post(
    "/executions/:id/cancel",
    asyncHandler(async (req, res) => {
      const exec = await getPlatform().engine.cancel(req.params["id"]!, req.body?.reason);
      res.json(exec);
    })
  );

  router.get(
    "/workflows/:id/metrics",
    asyncHandler(async (req, res) => {
      const metrics = getPlatform().engine.getMetrics(req.params["id"]!);
      res.json(metrics ?? {
        workflowId: req.params["id"],
        tenantId: tenantId(req),
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        averageDurationMs: 0,
        p95DurationMs: 0,
        activeExecutions: 0,
      });
    })
  );

  // --- Events ---
  router.post(
    "/events",
    asyncHandler(async (req, res) => {
      const event = await getPlatform().eventBus.emit({
        type: req.body.type,
        tenantId: tenantId(req),
        payload: req.body.payload ?? {},
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        userId: userId(req),
        module: req.body.module,
      });
      // Give handlers a tick
      await new Promise((r) => setTimeout(r, 10));
      const executions = getPlatform().engine.listExecutions(tenantId(req));
      res.status(202).json({
        event,
        triggeredExecutions: executions.filter(
          (e) => e.context.correlationId === event.correlationId || e.startedAt >= event.timestamp
        ).slice(0, 20),
      });
    })
  );

  router.get(
    "/events",
    asyncHandler(async (req, res) => {
      res.json(getPlatform().eventBus.getHistory(tenantId(req), Number(req.query["limit"] ?? 100)));
    })
  );

  // --- Business rules ---
  router.get(
    "/rules",
    asyncHandler(async (req, res) => {
      res.json(
        getPlatform().ruleStore.list(tenantId(req), {
          module: req.query["module"] as string | undefined,
          entityType: req.query["entityType"] as string | undefined,
        })
      );
    })
  );

  router.post(
    "/rules",
    asyncHandler(async (req, res) => {
      const now = new Date().toISOString();
      const rule: BusinessRule = {
        id: uuid(),
        tenantId: tenantId(req),
        name: req.body.name ?? "Untitled Rule",
        description: req.body.description,
        condition: req.body.condition ?? { logic: "and", conditions: [] },
        actions: req.body.actions ?? [],
        enabled: req.body.enabled ?? true,
        priority: req.body.priority ?? 100,
        module: req.body.module,
        entityTypes: req.body.entityTypes,
        createdAt: now,
        updatedAt: now,
      };
      res.status(201).json(getPlatform().ruleStore.save(rule));
    })
  );

  router.put(
    "/rules/:id",
    asyncHandler(async (req, res) => {
      const existing = getPlatform().ruleStore.get(req.params["id"]!);
      if (!existing || existing.tenantId !== tenantId(req)) {
        res.status(404).json({ error: "Rule not found" });
        return;
      }
      const updated = getPlatform().ruleStore.save({
        ...existing,
        ...req.body,
        id: existing.id,
        tenantId: existing.tenantId,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      });
      res.json(updated);
    })
  );

  router.post(
    "/rules/evaluate",
    asyncHandler(async (req, res) => {
      const rules = getPlatform().ruleStore.list(tenantId(req));
      const result = evaluateRules(rules, req.body?.data ?? {});
      res.json(result);
    })
  );

  router.delete(
    "/rules/:id",
    asyncHandler(async (req, res) => {
      const existing = getPlatform().ruleStore.get(req.params["id"]!);
      if (!existing || existing.tenantId !== tenantId(req)) {
        res.status(404).json({ error: "Rule not found" });
        return;
      }
      getPlatform().ruleStore.delete(req.params["id"]!);
      res.status(204).end();
    })
  );

  return router;
}
