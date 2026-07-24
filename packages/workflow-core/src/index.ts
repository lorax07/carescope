/**
 * @carescope/workflow-core
 * Foundational workflow engine for the CareScope LIMS platform.
 */

export * from "./types.js";
export * from "./expression.js";
export * from "./rules.js";
export * from "./plugin-registry.js";
export * from "./plugins/builtin.js";
export * from "./validator.js";
export * from "./events.js";
export * from "./store.js";
export * from "./engine.js";
export * from "./templates.js";
export * from "./modules.js";

import { defaultPluginRegistry } from "./plugin-registry.js";
import { registerBuiltinPlugins } from "./plugins/builtin.js";
import { EventBus } from "./events.js";
import { WorkflowStore } from "./store.js";
import { WorkflowEngine } from "./engine.js";
import { RuleStore } from "./rules.js";
import { allBuiltinTemplates } from "./templates.js";

export interface CreatePlatformOptions {
  /** Seed built-in laboratory templates for a tenant */
  seedTemplates?: { tenantId: string; createdBy: string };
}

/**
 * Bootstrap a fully wired workflow platform instance:
 * plugin registry (builtins), store, event bus, rule store, and engine.
 */
export function createWorkflowPlatform(options?: CreatePlatformOptions) {
  registerBuiltinPlugins(defaultPluginRegistry);
  const store = new WorkflowStore();
  const eventBus = new EventBus();
  const ruleStore = new RuleStore();
  const engine = new WorkflowEngine({
    store,
    registry: defaultPluginRegistry,
    eventBus,
  });

  if (options?.seedTemplates) {
    for (const tmpl of allBuiltinTemplates(
      options.seedTemplates.tenantId,
      options.seedTemplates.createdBy
    )) {
      store.save(tmpl);
    }
  }

  return {
    registry: defaultPluginRegistry,
    store,
    eventBus,
    ruleStore,
    engine,
  };
}

export type WorkflowPlatform = ReturnType<typeof createWorkflowPlatform>;
