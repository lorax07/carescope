/**
 * Plugin Registry — developers add new node types without modifying the core engine.
 */

import type { NodePlugin, ValidationIssue } from "./types.js";

export class PluginRegistry {
  private plugins = new Map<string, NodePlugin>();

  register(plugin: NodePlugin): void {
    if (this.plugins.has(plugin.type)) {
      throw new Error(`Node plugin already registered: ${plugin.type}`);
    }
    this.plugins.set(plugin.type, plugin);
  }

  /** Register or replace (for hot-reload / upgrades) */
  upsert(plugin: NodePlugin): void {
    this.plugins.set(plugin.type, plugin);
  }

  unregister(type: string): boolean {
    return this.plugins.delete(type);
  }

  get(type: string): NodePlugin | undefined {
    return this.plugins.get(type);
  }

  has(type: string): boolean {
    return this.plugins.has(type);
  }

  list(): NodePlugin[] {
    return [...this.plugins.values()];
  }

  listByCategory(category: NodePlugin["category"]): NodePlugin[] {
    return this.list().filter((p) => p.category === category);
  }

  validateConfig(type: string, config: Record<string, unknown>): ValidationIssue[] {
    const plugin = this.plugins.get(type);
    if (!plugin) {
      return [
        {
          code: "UNKNOWN_NODE_TYPE",
          message: `Unknown node type: ${type}`,
          severity: "error",
        },
      ];
    }

    const issues: ValidationIssue[] = [];
    for (const field of plugin.configSchema.fields) {
      if (field.required && (config[field.name] === undefined || config[field.name] === "")) {
        issues.push({
          code: "REQUIRED_CONFIG",
          message: `Missing required config '${field.label}' for node type ${type}`,
          severity: "error",
        });
      }
    }
    if (plugin.validate) {
      issues.push(...plugin.validate(config));
    }
    return issues;
  }

  clear(): void {
    this.plugins.clear();
  }
}

/** Singleton default registry used by the engine unless overridden */
export const defaultPluginRegistry = new PluginRegistry();
