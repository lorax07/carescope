/**
 * GraphQL schema and resolvers for the workflow platform.
 */
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLFloat,
  printSchema,
} from "graphql";
import { getDefaultTenant, getPlatform } from "./platform.js";

const JSONScalar = GraphQLString; // simplified — payloads as JSON strings for demo; REST carries full JSON

const NodePluginType = new GraphQLObjectType({
  name: "NodePlugin",
  fields: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    label: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    icon: { type: GraphQLString },
    color: { type: GraphQLString },
  },
});

const WorkflowType = new GraphQLObjectType({
  name: "Workflow",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    version: { type: new GraphQLNonNull(GraphQLInt) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    lineageId: { type: new GraphQLNonNull(GraphQLString) },
    isTemplate: { type: new GraphQLNonNull(GraphQLBoolean) },
    tags: { type: new GraphQLList(GraphQLString) },
    modules: { type: new GraphQLList(GraphQLString) },
    entityTypes: { type: new GraphQLList(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    publishedAt: { type: GraphQLString },
    nodeCount: {
      type: GraphQLInt,
      resolve: (source: unknown) => {
        const w = source as { nodes?: unknown[] };
        return w.nodes?.length ?? 0;
      },
    },
    definitionJson: {
      type: GraphQLString,
      resolve: (source: unknown) => JSON.stringify(source),
    },
  },
});

const ExecutionType = new GraphQLObjectType({
  name: "WorkflowExecution",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    workflowId: { type: new GraphQLNonNull(GraphQLString) },
    workflowVersion: { type: new GraphQLNonNull(GraphQLInt) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    entityType: { type: GraphQLString },
    entityId: { type: GraphQLString },
    startedAt: { type: new GraphQLNonNull(GraphQLString) },
    completedAt: { type: GraphQLString },
    isSimulation: { type: new GraphQLNonNull(GraphQLBoolean) },
    executionJson: {
      type: GraphQLString,
      resolve: (e: unknown) => JSON.stringify(e),
    },
  },
});

const MetricsType = new GraphQLObjectType({
  name: "WorkflowMetrics",
  fields: {
    workflowId: { type: new GraphQLNonNull(GraphQLString) },
    totalExecutions: { type: new GraphQLNonNull(GraphQLInt) },
    completedExecutions: { type: new GraphQLNonNull(GraphQLInt) },
    failedExecutions: { type: new GraphQLNonNull(GraphQLInt) },
    averageDurationMs: { type: new GraphQLNonNull(GraphQLFloat) },
    p95DurationMs: { type: new GraphQLNonNull(GraphQLFloat) },
    activeExecutions: { type: new GraphQLNonNull(GraphQLInt) },
    lastExecutedAt: { type: GraphQLString },
  },
});

const ModuleType = new GraphQLObjectType({
  name: "ModuleIntegration",
  fields: {
    module: { type: new GraphQLNonNull(GraphQLString) },
    label: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    entityTypes: { type: new GraphQLList(GraphQLString) },
    events: { type: new GraphQLList(GraphQLString) },
    actions: { type: new GraphQLList(GraphQLString) },
  },
});

const ValidationIssueType = new GraphQLObjectType({
  name: "ValidationIssue",
  fields: {
    code: { type: new GraphQLNonNull(GraphQLString) },
    message: { type: new GraphQLNonNull(GraphQLString) },
    severity: { type: new GraphQLNonNull(GraphQLString) },
    nodeId: { type: GraphQLString },
  },
});

const ValidationResultType = new GraphQLObjectType({
  name: "ValidationResult",
  fields: {
    valid: { type: new GraphQLNonNull(GraphQLBoolean) },
    errors: { type: new GraphQLList(ValidationIssueType) },
    warnings: { type: new GraphQLList(ValidationIssueType) },
  },
});

function resolveTenant(args: { tenantId?: string }): string {
  return args.tenantId ?? getDefaultTenant();
}

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    health: {
      type: GraphQLString,
      resolve: () => "ok",
    },
    nodePlugins: {
      type: new GraphQLList(NodePluginType),
      resolve: () => getPlatform().registry.list(),
    },
    modules: {
      type: new GraphQLList(ModuleType),
      resolve: async () => {
        const { MODULE_INTEGRATIONS } = await import("@carescope/workflow-core");
        return MODULE_INTEGRATIONS;
      },
    },
    workflows: {
      type: new GraphQLList(WorkflowType),
      args: {
        tenantId: { type: GraphQLString },
        status: { type: GraphQLString },
        isTemplate: { type: GraphQLBoolean },
        search: { type: GraphQLString },
      },
      resolve: (_src, args) =>
        getPlatform().store.list(resolveTenant(args), {
          status: args.status as never,
          isTemplate: args.isTemplate ?? undefined,
          search: args.search ?? undefined,
        }),
    },
    workflow: {
      type: WorkflowType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
      },
      resolve: (_src, args) => getPlatform().store.get(args.id, resolveTenant(args)),
    },
    workflowVersions: {
      type: new GraphQLList(WorkflowType),
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
      },
      resolve: (_src, args) => {
        const def = getPlatform().store.get(args.id, resolveTenant(args));
        if (!def) return [];
        return getPlatform().store.listVersions(def.lineageId, resolveTenant(args));
      },
    },
    executions: {
      type: new GraphQLList(ExecutionType),
      args: {
        tenantId: { type: GraphQLString },
        workflowId: { type: GraphQLString },
        status: { type: GraphQLString },
      },
      resolve: (_src, args) =>
        getPlatform().engine.listExecutions(resolveTenant(args), {
          workflowId: args.workflowId ?? undefined,
          status: args.status as never,
        }),
    },
    execution: {
      type: ExecutionType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_src, args) => getPlatform().engine.getExecution(args.id),
    },
    workflowMetrics: {
      type: MetricsType,
      args: { workflowId: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_src, args) => getPlatform().engine.getMetrics(args.workflowId),
    },
    validateWorkflow: {
      type: ValidationResultType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
      },
      resolve: (_src, args) => {
        const def = getPlatform().store.get(args.id, resolveTenant(args));
        if (!def) return { valid: false, errors: [{ code: "NOT_FOUND", message: "Not found", severity: "error" }], warnings: [] };
        return getPlatform().engine.validate(def);
      },
    },
  },
});

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    createWorkflow: {
      type: WorkflowType,
      args: {
        tenantId: { type: GraphQLString },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        definitionJson: { type: GraphQLString },
        userId: { type: GraphQLString },
      },
      resolve: (_src, args) => {
        const partial = args.definitionJson ? JSON.parse(args.definitionJson) : {};
        return getPlatform().store.create({
          tenantId: resolveTenant(args),
          name: args.name,
          description: args.description,
          createdBy: args.userId ?? "admin",
          nodes: partial.nodes,
          edges: partial.edges,
          triggers: partial.triggers,
          entityTypes: partial.entityTypes,
          modules: partial.modules,
          tags: partial.tags,
          isTemplate: partial.isTemplate,
        });
      },
    },
    publishWorkflow: {
      type: WorkflowType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
        userId: { type: GraphQLString },
      },
      resolve: (_src, args) => {
        const def = getPlatform().store.get(args.id, resolveTenant(args));
        if (!def) throw new Error("Workflow not found");
        const validation = getPlatform().engine.validate(def);
        if (!validation.valid) throw new Error("Validation failed: " + validation.errors.map((e) => e.message).join("; "));
        return getPlatform().store.publish(args.id, resolveTenant(args), args.userId ?? "admin");
      },
    },
    cloneWorkflow: {
      type: WorkflowType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
        name: { type: GraphQLString },
        userId: { type: GraphQLString },
      },
      resolve: (_src, args) => {
        const cloned = getPlatform().store.clone(args.id, resolveTenant(args), args.userId ?? "admin", {
          name: args.name,
        });
        if (!cloned) throw new Error("Workflow not found");
        return cloned;
      },
    },
    startWorkflow: {
      type: ExecutionType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
        userId: { type: GraphQLString },
        variablesJson: { type: GraphQLString },
      },
      resolve: async (_src, args) =>
        getPlatform().engine.start(args.id, {
          tenantId: resolveTenant(args),
          userId: args.userId ?? "admin",
          variables: args.variablesJson ? JSON.parse(args.variablesJson) : {},
          triggeredBy: { type: "manual", userId: args.userId ?? "admin" },
        }),
    },
    simulateWorkflow: {
      type: ExecutionType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLString },
        variablesJson: { type: GraphQLString },
      },
      resolve: async (_src, args) => {
        const result = await getPlatform().engine.simulate({
          workflowId: args.id,
          tenantId: resolveTenant(args),
          variables: args.variablesJson ? JSON.parse(args.variablesJson) : {},
        });
        return result.execution;
      },
    },
    emitEvent: {
      type: GraphQLString,
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        tenantId: { type: GraphQLString },
        payloadJson: { type: GraphQLString },
        entityType: { type: GraphQLString },
        entityId: { type: GraphQLString },
      },
      resolve: async (_src, args) => {
        const event = await getPlatform().eventBus.emit({
          type: args.type,
          tenantId: resolveTenant(args),
          payload: args.payloadJson ? JSON.parse(args.payloadJson) : {},
          entityType: args.entityType,
          entityId: args.entityId,
        });
        return JSON.stringify(event);
      },
    },
  },
});

export const workflowGraphQLSchema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
});

export function getGraphQLSchemaSDL(): string {
  return printSchema(workflowGraphQLSchema);
}

// silence unused import warning for JSONScalar if tree-shaken oddly
void JSONScalar;
