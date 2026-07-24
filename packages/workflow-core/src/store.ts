/**
 * Multi-tenant workflow definition store with versioning, templates, clone, and rollback.
 */

import { v4 as uuid } from "uuid";
import type {
  WorkflowCloneOptions,
  WorkflowDefinition,
  WorkflowStatus,
} from "./types.js";

function now(): string {
  return new Date().toISOString();
}

export class WorkflowStore {
  /** keyed by definition id */
  private definitions = new Map<string, WorkflowDefinition>();

  save(def: WorkflowDefinition): WorkflowDefinition {
    const updated = { ...def, updatedAt: now() };
    this.definitions.set(updated.id, updated);
    return updated;
  }

  get(id: string, tenantId?: string): WorkflowDefinition | undefined {
    const def = this.definitions.get(id);
    if (!def) return undefined;
    if (tenantId && def.tenantId !== tenantId) return undefined;
    return def;
  }

  delete(id: string, tenantId: string): boolean {
    const def = this.definitions.get(id);
    if (!def || def.tenantId !== tenantId) return false;
    return this.definitions.delete(id);
  }

  list(
    tenantId: string,
    filter?: {
      status?: WorkflowStatus;
      isTemplate?: boolean;
      module?: string;
      entityType?: string;
      lineageId?: string;
      search?: string;
    }
  ): WorkflowDefinition[] {
    return [...this.definitions.values()]
      .filter((d) => {
        if (d.tenantId !== tenantId) return false;
        if (filter?.status && d.status !== filter.status) return false;
        if (filter?.isTemplate !== undefined && d.isTemplate !== filter.isTemplate) return false;
        if (filter?.lineageId && d.lineageId !== filter.lineageId) return false;
        if (filter?.module && !d.modules.includes(filter.module as WorkflowDefinition["modules"][number])) {
          return false;
        }
        if (filter?.entityType && !d.entityTypes.includes(filter.entityType)) return false;
        if (filter?.search) {
          const q = filter.search.toLowerCase();
          if (
            !d.name.toLowerCase().includes(q) &&
            !(d.description ?? "").toLowerCase().includes(q) &&
            !d.tags.some((t) => t.toLowerCase().includes(q))
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Latest version per lineage (optionally only published) */
  listLatest(
    tenantId: string,
    opts?: { publishedOnly?: boolean; includeTemplates?: boolean }
  ): WorkflowDefinition[] {
    const byLineage = new Map<string, WorkflowDefinition>();
    for (const def of this.list(tenantId)) {
      if (opts?.publishedOnly && def.status !== "published") continue;
      if (opts?.includeTemplates === false && def.isTemplate) continue;
      const existing = byLineage.get(def.lineageId);
      if (!existing || def.version > existing.version) {
        byLineage.set(def.lineageId, def);
      }
    }
    return [...byLineage.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listVersions(lineageId: string, tenantId: string): WorkflowDefinition[] {
    return this.list(tenantId, { lineageId }).sort((a, b) => b.version - a.version);
  }

  create(input: {
    tenantId: string;
    name: string;
    description?: string;
    createdBy: string;
    nodes?: WorkflowDefinition["nodes"];
    edges?: WorkflowDefinition["edges"];
    triggers?: WorkflowDefinition["triggers"];
    entityTypes?: string[];
    modules?: WorkflowDefinition["modules"];
    tags?: string[];
    isTemplate?: boolean;
    variables?: WorkflowDefinition["variables"];
  }): WorkflowDefinition {
    const id = uuid();
    const def: WorkflowDefinition = {
      id,
      lineageId: id,
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      version: 1,
      status: "draft",
      nodes: input.nodes ?? [],
      edges: input.edges ?? [],
      triggers: input.triggers ?? [],
      entityTypes: input.entityTypes ?? [],
      modules: input.modules ?? [],
      tags: input.tags ?? [],
      isTemplate: input.isTemplate ?? false,
      createdAt: now(),
      updatedAt: now(),
      createdBy: input.createdBy,
      variables: input.variables ?? [],
    };
    return this.save(def);
  }

  /**
   * Create a new draft version from an existing definition (immutable versioning).
   * Previous versions remain intact for rollback.
   */
  createVersion(
    sourceId: string,
    tenantId: string,
    userId: string,
    patch?: Partial<
      Pick<
        WorkflowDefinition,
        | "name"
        | "description"
        | "nodes"
        | "edges"
        | "triggers"
        | "entityTypes"
        | "modules"
        | "tags"
        | "variables"
        | "viewport"
      >
    >
  ): WorkflowDefinition | undefined {
    const source = this.get(sourceId, tenantId);
    if (!source) return undefined;

    const versions = this.listVersions(source.lineageId, tenantId);
    const nextVersion = Math.max(...versions.map((v) => v.version), 0) + 1;

    const def: WorkflowDefinition = {
      ...source,
      ...patch,
      id: uuid(),
      version: nextVersion,
      status: "draft",
      createdAt: now(),
      updatedAt: now(),
      createdBy: userId,
      publishedAt: undefined,
      publishedBy: undefined,
      nodes: patch?.nodes ?? structuredClone(source.nodes),
      edges: patch?.edges ?? structuredClone(source.edges),
      triggers: patch?.triggers ?? structuredClone(source.triggers),
      variables: patch?.variables ?? structuredClone(source.variables ?? []),
    };
    return this.save(def);
  }

  publish(id: string, tenantId: string, userId: string): WorkflowDefinition | undefined {
    const def = this.get(id, tenantId);
    if (!def) return undefined;
    if (def.status === "archived") return undefined;

    // Archive other published versions in the same lineage (keep history)
    for (const v of this.listVersions(def.lineageId, tenantId)) {
      if (v.id !== def.id && v.status === "published") {
        this.save({ ...v, status: "archived" });
      }
    }

    return this.save({
      ...def,
      status: "published",
      publishedAt: now(),
      publishedBy: userId,
    });
  }

  archive(id: string, tenantId: string): WorkflowDefinition | undefined {
    const def = this.get(id, tenantId);
    if (!def) return undefined;
    return this.save({ ...def, status: "archived" });
  }

  /**
   * Rollback: publish a previous version (creates operational active version).
   * The target version is re-published; current published is archived.
   */
  rollback(
    lineageId: string,
    targetVersion: number,
    tenantId: string,
    userId: string
  ): WorkflowDefinition | undefined {
    const versions = this.listVersions(lineageId, tenantId);
    const target = versions.find((v) => v.version === targetVersion);
    if (!target) return undefined;

    // Create a new version cloned from the rollback target, then publish it
    const rolled = this.createVersion(target.id, tenantId, userId, {
      name: target.name,
      description: `Rollback to v${targetVersion}: ${target.description ?? ""}`.trim(),
      nodes: structuredClone(target.nodes),
      edges: structuredClone(target.edges),
      triggers: structuredClone(target.triggers),
      entityTypes: [...target.entityTypes],
      modules: [...target.modules],
      tags: [...target.tags],
      variables: structuredClone(target.variables ?? []),
      viewport: target.viewport,
    });
    if (!rolled) return undefined;
    return this.publish(rolled.id, tenantId, userId);
  }

  clone(
    id: string,
    tenantId: string,
    userId: string,
    options?: WorkflowCloneOptions
  ): WorkflowDefinition | undefined {
    const source = this.get(id, tenantId);
    if (!source) return undefined;

    const newId = uuid();
    const def: WorkflowDefinition = {
      ...structuredClone(source),
      id: newId,
      lineageId: newId,
      tenantId: options?.tenantId ?? tenantId,
      name: options?.name ?? `${source.name} (Copy)`,
      version: 1,
      status: "draft",
      isTemplate: options?.asTemplate ?? false,
      templateId: source.isTemplate ? source.id : source.templateId,
      createdAt: now(),
      updatedAt: now(),
      createdBy: userId,
      publishedAt: undefined,
      publishedBy: undefined,
    };
    return this.save(def);
  }

  /** Instantiate a new draft workflow from a template */
  createFromTemplate(
    templateId: string,
    tenantId: string,
    userId: string,
    name?: string
  ): WorkflowDefinition | undefined {
    const template = this.get(templateId, tenantId);
    if (!template || !template.isTemplate) return undefined;

    const newId = uuid();
    const def: WorkflowDefinition = {
      ...structuredClone(template),
      id: newId,
      lineageId: newId,
      name: name ?? template.name,
      version: 1,
      status: "draft",
      isTemplate: false,
      templateId: template.id,
      createdAt: now(),
      updatedAt: now(),
      createdBy: userId,
      publishedAt: undefined,
      publishedBy: undefined,
    };
    return this.save(def);
  }

  clear(): void {
    this.definitions.clear();
  }
}
