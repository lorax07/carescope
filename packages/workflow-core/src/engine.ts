/**
 * Workflow Engine — state machine executor with retry, recovery, simulation,
 * immutable logs, and parallel branch support.
 */

import { v4 as uuid } from "uuid";
import { evaluateBoolean, evaluateExpression as evalExpr } from "./expression.js";
import type { DomainEvent } from "./events.js";
import { matchTriggers, type EventBus } from "./events.js";
import { defaultPluginRegistry, type PluginRegistry } from "./plugin-registry.js";
import { evaluateRule } from "./rules.js";
import type { WorkflowStore } from "./store.js";
import { validateWorkflow } from "./validator.js";
import type {
  BusinessRule,
  EngineServices,
  ExecutionContext,
  ExecutionError,
  ExecutionLogEntry,
  NodeExecution,
  SimulationRequest,
  SimulationResult,
  ValidationResult,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowMetrics,
} from "./types.js";

export interface WorkflowEngineOptions {
  store: WorkflowStore;
  registry?: PluginRegistry;
  eventBus?: EventBus;
  services?: Partial<EngineServices>;
  rules?: BusinessRule[];
}

function now(): string {
  return new Date().toISOString();
}

function createDefaultServices(logs: ExecutionLogEntry[]): EngineServices {
  return {
    notify: async () => undefined,
    callApi: async () => ({ status: 200, body: {} }),
    evaluateExpression: (expr, ctx) => evalExpr(expr, ctx),
    evaluateRule: async (rule, data) => evaluateRule(rule, data).matched,
    log: (entry) => {
      logs.push({
        ...entry,
        id: uuid(),
        timestamp: now(),
      });
    },
    schedule: async (delayMs) => {
      if (delayMs > 0 && delayMs < 60_000) {
        await new Promise((r) => setTimeout(r, Math.min(delayMs, 50))); // cap in-process delays
      }
    },
    getEntity: async () => null,
    updateEntity: async () => undefined,
  };
}

export class WorkflowEngine {
  private store: WorkflowStore;
  private registry: PluginRegistry;
  private eventBus?: EventBus;
  private services: EngineServices;
  private rules: BusinessRule[];
  private executions = new Map<string, WorkflowExecution>();
  private logs = new Map<string, ExecutionLogEntry[]>();
  private metrics = new Map<string, WorkflowMetrics>();
  private unsubscribe?: () => void;

  constructor(options: WorkflowEngineOptions) {
    this.store = options.store;
    this.registry = options.registry ?? defaultPluginRegistry;
    this.eventBus = options.eventBus;
    this.rules = options.rules ?? [];
    const logSink: ExecutionLogEntry[] = [];
    this.services = { ...createDefaultServices(logSink), ...options.services };

    // Re-bind log to per-execution sinks via wrapper — base uses appendLog
    this.services = {
      ...this.services,
      log: (entry) => this.appendLog(entry),
      evaluateExpression: (expr, ctx) => evalExpr(expr, ctx),
    };

    if (this.eventBus) {
      this.unsubscribe = this.eventBus.onAny(async (event) => {
        await this.handleDomainEvent(event);
      });
    }
  }

  dispose(): void {
    this.unsubscribe?.();
  }

  private appendLog(entry: Omit<ExecutionLogEntry, "id" | "timestamp">): void {
    const full: ExecutionLogEntry = {
      ...entry,
      id: uuid(),
      timestamp: now(),
    };
    const list = this.logs.get(entry.executionId) ?? [];
    list.push(full);
    this.logs.set(entry.executionId, list);
  }

  validate(workflow: WorkflowDefinition): ValidationResult {
    return validateWorkflow(workflow, this.registry);
  }

  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  getLogs(executionId: string): ExecutionLogEntry[] {
    return this.logs.get(executionId) ?? [];
  }

  listExecutions(tenantId: string, filter?: {
    workflowId?: string;
    status?: WorkflowExecution["status"];
    entityId?: string;
  }): WorkflowExecution[] {
    return [...this.executions.values()]
      .filter((e) => {
        if (e.tenantId !== tenantId) return false;
        if (filter?.workflowId && e.workflowId !== filter.workflowId) return false;
        if (filter?.status && e.status !== filter.status) return false;
        if (filter?.entityId && e.entityId !== filter.entityId) return false;
        return true;
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  getMetrics(workflowId: string): WorkflowMetrics | undefined {
    return this.metrics.get(workflowId);
  }

  async handleDomainEvent(event: DomainEvent): Promise<WorkflowExecution[]> {
    const published = this.store.list(event.tenantId, { status: "published" });
    // Prefer latest published per lineage
    const latest = new Map<string, WorkflowDefinition>();
    for (const w of published) {
      const cur = latest.get(w.lineageId);
      if (!cur || w.version > cur.version) latest.set(w.lineageId, w);
    }
    const matches = matchTriggers([...latest.values()], event);
    const started: WorkflowExecution[] = [];
    for (const { workflow, trigger } of matches) {
      const exec = await this.start(workflow.id, {
        tenantId: event.tenantId,
        eventPayload: event.payload,
        entityType: event.entityType,
        entityId: event.entityId,
        userId: event.userId,
        correlationId: event.correlationId,
        triggeredBy: {
          type: trigger.type,
          eventType: event.type,
          userId: event.userId,
        },
      });
      started.push(exec);
    }
    return started;
  }

  async start(
    workflowId: string,
    options: {
      tenantId: string;
      eventPayload?: Record<string, unknown>;
      entityData?: Record<string, unknown>;
      entityType?: string;
      entityId?: string;
      userId?: string;
      correlationId?: string;
      variables?: Record<string, unknown>;
      triggeredBy?: WorkflowExecution["triggeredBy"];
      isSimulation?: boolean;
    }
  ): Promise<WorkflowExecution> {
    const workflow = this.store.get(workflowId, options.tenantId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    if (!options.isSimulation && workflow.status !== "published" && workflow.status !== "draft") {
      throw new Error(`Cannot start workflow in status: ${workflow.status}`);
    }

    const startNode = workflow.nodes.find((n) => n.type === "start");
    if (!startNode) {
      throw new Error("Workflow has no start node");
    }

    const context: ExecutionContext = {
      variables: { ...(options.variables ?? {}) },
      eventPayload: options.eventPayload,
      entityData: options.entityData,
      tenantId: options.tenantId,
      userId: options.userId,
      correlationId: options.correlationId ?? uuid(),
    };

    // Apply default variable values
    for (const v of workflow.variables ?? []) {
      if (context.variables[v.name] === undefined && v.defaultValue !== undefined) {
        context.variables[v.name] = v.defaultValue;
      }
    }

    const execution: WorkflowExecution = {
      id: uuid(),
      tenantId: options.tenantId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      lineageId: workflow.lineageId,
      status: options.isSimulation ? "simulated" : "running",
      entityType: options.entityType,
      entityId: options.entityId,
      activeNodeIds: [startNode.id],
      nodeExecutions: {},
      context,
      startedAt: now(),
      isSimulation: options.isSimulation ?? false,
      triggeredBy: options.triggeredBy ?? { type: "manual", userId: options.userId },
      retryCount: 0,
    };

    this.executions.set(execution.id, execution);
    this.logs.set(execution.id, []);
    this.appendLog({
      executionId: execution.id,
      tenantId: execution.tenantId,
      level: "info",
      event: "execution.started",
      message: `Execution started for workflow '${workflow.name}' v${workflow.version}`,
      data: { workflowId: workflow.id, simulation: execution.isSimulation },
    });

    await this.advance(execution.id);
    this.updateMetrics(execution);
    return this.executions.get(execution.id)!;
  }

  async simulate(request: SimulationRequest & { tenantId: string; userId?: string }): Promise<SimulationResult> {
    const workflow = this.store.get(request.workflowId, request.tenantId);
    if (!workflow) throw new Error(`Workflow not found: ${request.workflowId}`);

    // Optionally pin version
    let target = workflow;
    if (request.version != null && request.version !== workflow.version) {
      const versions = this.store.listVersions(workflow.lineageId, request.tenantId);
      const found = versions.find((v) => v.version === request.version);
      if (!found) throw new Error(`Version ${request.version} not found`);
      target = found;
    }

    const execution = await this.start(target.id, {
      tenantId: request.tenantId,
      eventPayload: request.eventPayload,
      entityData: request.entityData,
      variables: request.variables,
      userId: request.userId,
      isSimulation: true,
      triggeredBy: { type: "manual", userId: request.userId },
    });

    const logs = this.getLogs(execution.id);
    const path = Object.values(execution.nodeExecutions)
      .filter((n) => n.status === "completed" || n.status === "waiting")
      .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))
      .map((n) => n.nodeId);

    let outcome: SimulationResult["outcome"] = "completed";
    if (execution.status === "failed") outcome = "failed";
    else if (execution.status === "waiting" || execution.activeNodeIds.length > 0 && execution.status !== "completed") {
      if (execution.status === "waiting" || Object.values(execution.nodeExecutions).some((n) => n.status === "waiting")) {
        outcome = "waiting";
      }
    }

    return { execution, logs, path, outcome };
  }

  /**
   * Resume a waiting execution (human task, approval, timer, scan, etc.)
   */
  async resume(
    executionId: string,
    options: {
      nodeId: string;
      output?: Record<string, unknown>;
      userId?: string;
      branch?: string;
    }
  ): Promise<WorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) throw new Error(`Execution not found: ${executionId}`);
    if (execution.status !== "waiting" && execution.status !== "running") {
      throw new Error(`Cannot resume execution in status: ${execution.status}`);
    }

    const nodeExec = execution.nodeExecutions[options.nodeId];
    if (!nodeExec || nodeExec.status !== "waiting") {
      throw new Error(`Node ${options.nodeId} is not waiting`);
    }

    nodeExec.status = "completed";
    nodeExec.completedAt = now();
    nodeExec.output = { ...nodeExec.output, ...options.output };
    if (options.userId) nodeExec.assigneeId = options.userId;

    this.appendLog({
      executionId,
      tenantId: execution.tenantId,
      level: "info",
      event: "node.resumed",
      nodeId: options.nodeId,
      message: `Node resumed by user ${options.userId ?? "system"}`,
      data: options.output,
    });

    // Determine next nodes
    const workflow = this.store.get(execution.workflowId, execution.tenantId);
    if (!workflow) throw new Error("Workflow definition missing");

    execution.activeNodeIds = execution.activeNodeIds.filter((id) => id !== options.nodeId);
    const nextIds = this.resolveNextNodes(workflow, options.nodeId, options.branch ?? options.output?.["branch"] as string | undefined, execution);
    execution.activeNodeIds.push(...nextIds);
    execution.status = "running";

    await this.advance(executionId);
    return this.executions.get(executionId)!;
  }

  async cancel(executionId: string, reason?: string): Promise<WorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) throw new Error(`Execution not found: ${executionId}`);
    execution.status = "cancelled";
    execution.completedAt = now();
    execution.activeNodeIds = [];
    this.appendLog({
      executionId,
      tenantId: execution.tenantId,
      level: "warn",
      event: "execution.cancelled",
      message: reason ?? "Execution cancelled",
    });
    this.updateMetrics(execution);
    return execution;
  }

  private async advance(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const workflow = this.store.get(execution.workflowId, execution.tenantId);
    if (!workflow) {
      execution.status = "failed";
      execution.error = {
        code: "WORKFLOW_MISSING",
        message: "Workflow definition not found",
        recoverable: false,
        timestamp: now(),
      };
      return;
    }

    const maxSteps = 500;
    let steps = 0;

    while (execution.activeNodeIds.length > 0 && steps < maxSteps) {
      steps++;
      if (execution.status === "cancelled" || execution.status === "failed") break;

      const nodeId = execution.activeNodeIds[0]!;
      execution.activeNodeIds = execution.activeNodeIds.slice(1);

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        this.fail(execution, {
          code: "NODE_MISSING",
          message: `Node ${nodeId} not found in definition`,
          nodeId,
          recoverable: false,
          timestamp: now(),
        });
        break;
      }

      const plugin = this.registry.get(node.type);
      if (!plugin) {
        this.fail(execution, {
          code: "PLUGIN_MISSING",
          message: `No plugin for node type ${node.type}`,
          nodeId,
          recoverable: false,
          timestamp: now(),
        });
        break;
      }

      const attempt = (execution.nodeExecutions[nodeId]?.attempt ?? 0) + 1;
      const nodeExec: NodeExecution = {
        nodeId,
        status: "active",
        startedAt: now(),
        attempt,
        input: {
          variables: execution.context.variables,
        },
      };
      execution.nodeExecutions[nodeId] = nodeExec;

      this.appendLog({
        executionId,
        tenantId: execution.tenantId,
        level: "info",
        event: "node.started",
        nodeId,
        message: `Executing node '${node.label}' (${node.type})`,
      });

      try {
        // Node-level business rules
        if (node.rules?.length) {
          for (const ruleId of node.rules) {
            const rule = this.rules.find((r) => r.id === ruleId);
            if (rule) {
              const matched = evaluateRule(rule, {
                ...execution.context.variables,
                ...execution.context.entityData,
                ...execution.context.eventPayload,
              });
              this.appendLog({
                executionId,
                tenantId: execution.tenantId,
                level: "debug",
                event: "rule.evaluated",
                nodeId,
                message: `Rule ${rule.name}: ${matched.matched ? "matched" : "skipped"}`,
              });
            }
          }
        }

        const result = await plugin.execute({
          node,
          execution,
          context: execution.context,
          services: this.services,
          dryRun: execution.isSimulation,
        });

        if (result.variables) {
          Object.assign(execution.context.variables, result.variables);
        }

        if (result.status === "failed") {
          const canRetry =
            node.retry &&
            attempt < node.retry.maxAttempts &&
            (result.error?.recoverable ?? true);

          if (canRetry && node.retry) {
            const backoff =
              node.retry.backoffMs *
              Math.pow(node.retry.backoffMultiplier ?? 1, attempt - 1);
            const delay = Math.min(backoff, node.retry.maxBackoffMs ?? backoff);
            this.appendLog({
              executionId,
              tenantId: execution.tenantId,
              level: "warn",
              event: "node.retry",
              nodeId,
              message: `Retrying node (attempt ${attempt}/${node.retry.maxAttempts}) after ${delay}ms`,
            });
            await this.services.schedule(delay, async () => undefined);
            execution.activeNodeIds.unshift(nodeId);
            continue;
          }

          nodeExec.status = "failed";
          nodeExec.completedAt = now();
          nodeExec.error = result.error;
          this.fail(
            execution,
            result.error ?? {
              code: "NODE_FAILED",
              message: "Node execution failed",
              nodeId,
              recoverable: false,
              timestamp: now(),
            }
          );
          break;
        }

        if (result.status === "waiting") {
          nodeExec.status = "waiting";
          nodeExec.output = result.output;
          nodeExec.assigneeId = result.assigneeId;
          nodeExec.assigneeRole = result.assigneeRole;
          execution.activeNodeIds.push(nodeId);
          execution.status = execution.isSimulation ? "simulated" : "waiting";

          // In simulation, auto-complete waiting human/async nodes
          if (execution.isSimulation) {
            nodeExec.status = "completed";
            nodeExec.completedAt = now();
            nodeExec.output = { ...result.output, simulatedWait: true };
            execution.activeNodeIds = execution.activeNodeIds.filter((id) => id !== nodeId);
            const nextIds = this.resolveNextNodes(
              workflow,
              nodeId,
              result.branch
                ? Array.isArray(result.branch)
                  ? result.branch[0]
                  : result.branch
                : "approved",
              execution
            );
            execution.activeNodeIds.push(...nextIds);
            execution.status = "simulated";
            this.appendLog({
              executionId,
              tenantId: execution.tenantId,
              level: "info",
              event: "node.simulated_wait",
              nodeId,
              message: `Simulation auto-completed waiting node '${node.label}'`,
            });
            continue;
          }

          this.appendLog({
            executionId,
            tenantId: execution.tenantId,
            level: "info",
            event: "node.waiting",
            nodeId,
            message: `Node '${node.label}' is waiting`,
            data: { assigneeId: result.assigneeId, assigneeRole: result.assigneeRole },
          });
          return;
        }

        // completed
        nodeExec.status = "completed";
        nodeExec.completedAt = now();
        nodeExec.output = result.output;

        this.appendLog({
          executionId,
          tenantId: execution.tenantId,
          level: "info",
          event: "node.completed",
          nodeId,
          message: `Node '${node.label}' completed`,
          data: result.output,
        });

        if (node.type === "end") {
          execution.status = execution.isSimulation ? "simulated" : "completed";
          execution.completedAt = now();
          execution.activeNodeIds = [];
          this.appendLog({
            executionId,
            tenantId: execution.tenantId,
            level: "info",
            event: "execution.completed",
            message: "Workflow execution completed",
            data: result.output,
          });
          this.updateMetrics(execution);
          return;
        }

        const branch = result.branch;
        const nextIds = this.resolveNextNodes(workflow, nodeId, branch, execution);
        if (node.type === "parallel" || branch === "*") {
          // fan-out all default edges
          const allTargets = workflow.edges
            .filter((e) => e.source === nodeId && e.edgeType !== "error")
            .map((e) => e.target);
          execution.activeNodeIds.push(...allTargets);
        } else {
          execution.activeNodeIds.push(...nextIds);
        }
      } catch (err) {
        const error: ExecutionError = {
          code: "UNHANDLED",
          message: err instanceof Error ? err.message : String(err),
          nodeId,
          stack: err instanceof Error ? err.stack : undefined,
          recoverable: true,
          timestamp: now(),
        };
        nodeExec.status = "failed";
        nodeExec.completedAt = now();
        nodeExec.error = error;
        this.fail(execution, error);
        break;
      }
    }

    if (steps >= maxSteps) {
      this.fail(execution, {
        code: "MAX_STEPS",
        message: "Execution exceeded maximum step limit (possible infinite loop)",
        recoverable: false,
        timestamp: now(),
      });
    }

    if (
      execution.activeNodeIds.length === 0 &&
      execution.status === "running"
    ) {
      // No more nodes and never hit End — treat as completed with warning
      execution.status = execution.isSimulation ? "simulated" : "completed";
      execution.completedAt = now();
      this.appendLog({
        executionId,
        tenantId: execution.tenantId,
        level: "warn",
        event: "execution.completed",
        message: "Execution finished with no active nodes (no End node reached)",
      });
    }

    this.updateMetrics(execution);
  }

  private resolveNextNodes(
    workflow: WorkflowDefinition,
    nodeId: string,
    branch: string | string[] | undefined,
    execution: WorkflowExecution
  ): string[] {
    const edges = workflow.edges
      .filter((e) => e.source === nodeId && e.edgeType !== "error" && e.edgeType !== "compensation")
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    if (!edges.length) return [];

    const branches = branch == null ? null : Array.isArray(branch) ? branch : [branch];

    if (branches && branches.length && branches[0] !== "*") {
      const matched = edges.filter(
        (e) => e.label && branches.includes(e.label)
      );
      if (matched.length) return matched.map((e) => e.target);
    }

    // Conditional edges evaluated against context
    const conditional = edges.filter((e) => e.condition || e.edgeType === "conditional");
    if (conditional.length) {
      const ctx = {
        ...execution.context.variables,
        ...execution.context.entityData,
        ...execution.context.eventPayload,
      };
      const taken: string[] = [];
      for (const edge of conditional) {
        if (!edge.condition || evaluateBoolean(edge.condition, ctx)) {
          taken.push(edge.target);
        }
      }
      if (taken.length) return taken;
    }

    // Default edges (no label / no condition) — or all if parallel
    const defaults = edges.filter((e) => !e.condition && e.edgeType !== "conditional");
    if (defaults.length) return defaults.map((e) => e.target);

    return edges.map((e) => e.target);
  }

  private fail(execution: WorkflowExecution, error: ExecutionError): void {
    execution.status = "failed";
    execution.error = error;
    execution.completedAt = now();
    execution.activeNodeIds = [];
    this.appendLog({
      executionId: execution.id,
      tenantId: execution.tenantId,
      level: "error",
      event: "execution.failed",
      nodeId: error.nodeId,
      message: error.message,
      data: { code: error.code },
    });
    this.updateMetrics(execution);
  }

  private updateMetrics(execution: WorkflowExecution): void {
    const key = execution.workflowId;
    const existing = this.metrics.get(key) ?? {
      workflowId: execution.workflowId,
      tenantId: execution.tenantId,
      totalExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      averageDurationMs: 0,
      p95DurationMs: 0,
      activeExecutions: 0,
    };

    const durations = [...this.executions.values()]
      .filter(
        (e) =>
          e.workflowId === execution.workflowId &&
          e.completedAt &&
          (e.status === "completed" || e.status === "failed" || e.status === "simulated")
      )
      .map((e) => new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime())
      .sort((a, b) => a - b);

    const completed = [...this.executions.values()].filter(
      (e) => e.workflowId === key && (e.status === "completed" || e.status === "simulated")
    ).length;
    const failed = [...this.executions.values()].filter(
      (e) => e.workflowId === key && e.status === "failed"
    ).length;
    const active = [...this.executions.values()].filter(
      (e) => e.workflowId === key && (e.status === "running" || e.status === "waiting")
    ).length;

    const avg =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const p95 =
      durations.length > 0
        ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]!
        : 0;

    this.metrics.set(key, {
      ...existing,
      totalExecutions: completed + failed + active,
      completedExecutions: completed,
      failedExecutions: failed,
      averageDurationMs: Math.round(avg),
      p95DurationMs: Math.round(p95),
      activeExecutions: active,
      lastExecutedAt: execution.startedAt,
    });
  }
}
