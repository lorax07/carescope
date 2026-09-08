import { Pool } from "pg";
import { hashPassword } from "./auth.js";
import { DEFAULT_LAB_MODULES, LAB_MODULE_CATALOG, buildDossier, moduleLabel } from "./catalog.js";
import type {
  AccountCloseRequest,
  Client,
  ClientDossier,
  CreateClientInput,
  CreateLabInput,
  IntrasiteStore,
  IntrasiteUserRecord,
  Lab,
  ModuleChangeRequest,
} from "./types.js";
import {
  assertSlug,
  databaseNameForSlug,
  newId,
  normalizeEmail,
  nowIso,
  siteCodeForName,
  slugify,
} from "./util.js";

const CONTROL_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  database_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const TENANT_SCHEMA = `
CREATE TABLE IF NOT EXISTS labs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  site_code TEXT NOT NULL,
  status TEXT NOT NULL,
  modules TEXT NOT NULL DEFAULT '["sample_lifecycle"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE labs ADD COLUMN IF NOT EXISTS modules TEXT NOT NULL DEFAULT '["sample_lifecycle"]';
`;

function adminUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

function tenantUrl(databaseUrl: string, databaseName: string): string {
  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function parseModules(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      /* use default */
    }
  }
  return [...DEFAULT_LAB_MODULES];
}

export class PostgresIntrasiteStore implements IntrasiteStore {
  readonly kind = "postgres" as const;
  private control: Pool;
  private tenantPools = new Map<string, Pool>();
  private databaseUrl: string;
  private requests = new Map<string, ModuleChangeRequest>();
  private closeRequests = new Map<string, AccountCloseRequest>();

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
    this.control = new Pool({ connectionString: databaseUrl, max: 8 });
  }

  async init(admin: { email: string; password: string; name: string }): Promise<void> {
    await this.control.query(CONTROL_SCHEMA);
    const existing = await this.control.query("SELECT id FROM users LIMIT 1");
    if (existing.rowCount === 0) {
      await this.control.query(
        `INSERT INTO users (id, email, password_hash, name, role, created_at)
         VALUES ($1, $2, $3, $4, 'platform_admin', $5)`,
        [newId(), normalizeEmail(admin.email), await hashPassword(admin.password), admin.name, nowIso()]
      );
    }
    if (process.env["INTRASITE_SEED_DEMO"] === "true") {
      const clients = await this.control.query("SELECT id FROM clients LIMIT 1");
      if (clients.rowCount === 0) {
        const apex = await this.createClient({ name: "Apex Diagnostics", slug: "apex-diagnostics" });
        const north = await this.createLab(apex.id, {
          name: "North Lab",
          slug: "north-lab",
          siteCode: "NL-01",
        });
        const harborLab = await this.createLab(apex.id, {
          name: "Harbor Lab",
          slug: "harbor-lab",
          siteCode: "HL-02",
        });
        await this.writeModules(apex.id, north.id, [
          "sample_lifecycle",
          "instrument_integration",
          "results_entry",
          "coa_generation",
        ]);
        await this.writeModules(apex.id, harborLab.id, [
          "sample_lifecycle",
          "quality_events",
          "capa",
        ]);
        const harbor = await this.createClient({ name: "Harbor Clinical", slug: "harbor-clinical" });
        const main = await this.createLab(harbor.id, {
          name: "Main Campus",
          slug: "main-campus",
          siteCode: "MC-01",
        });
        await this.writeModules(harbor.id, main.id, [
          "sample_lifecycle",
          "billing",
          "customer_portal",
        ]);
      }
    }
  }

  async getUserByEmail(email: string): Promise<IntrasiteUserRecord | null> {
    const result = await this.control.query(
      `SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1`,
      [normalizeEmail(email)]
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserById(id: string): Promise<IntrasiteUserRecord | null> {
    const result = await this.control.query(
      `SELECT id, email, password_hash, name, role, created_at FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async listClients(): Promise<Client[]> {
    const result = await this.control.query(
      `SELECT id, name, slug, status, database_name, created_at FROM clients ORDER BY name`
    );
    const clients = [];
    for (const row of result.rows) {
      clients.push(await this.mapClient(row));
    }
    return clients;
  }

  async getClient(id: string): Promise<Client | null> {
    const result = await this.control.query(
      `SELECT id, name, slug, status, database_name, created_at FROM clients WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.mapClient(result.rows[0]) : null;
  }

  async createClient(input: CreateClientInput): Promise<Client> {
    const name = input.name.trim();
    if (!name) {
      throw Object.assign(new Error("Client name is required"), { status: 400 });
    }
    const id = newId();
    const slug = slugify(input.slug ?? name, `client-${id.slice(0, 8)}`);
    assertSlug(slug);
    const databaseName = databaseNameForSlug(slug);
    const createdAt = nowIso();
    await this.provisionDatabase(databaseName);
    try {
      await this.control.query(
        `INSERT INTO clients (id, name, slug, status, database_name, created_at)
         VALUES ($1, $2, $3, 'active', $4, $5)`,
        [id, name, slug, databaseName, createdAt]
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        throw Object.assign(new Error("A client with that slug already exists"), { status: 409 });
      }
      throw error;
    }
    return (await this.getClient(id))!;
  }

  async updateClient(
    id: string,
    patch: Partial<Pick<Client, "name" | "status">>
  ): Promise<Client | null> {
    const existing = await this.getClient(id);
    if (!existing) return null;
    await this.control.query(`UPDATE clients SET name = $2, status = $3 WHERE id = $1`, [
      id,
      patch.name?.trim() || existing.name,
      patch.status ?? existing.status,
    ]);
    return this.getClient(id);
  }

  async listLabs(clientId: string): Promise<Lab[]> {
    const client = await this.requireClient(clientId);
    const pool = await this.tenantPool(client.databaseName);
    const result = await pool.query(
      `SELECT id, client_id, name, slug, site_code, status, modules, created_at FROM labs ORDER BY name`
    );
    return result.rows.map((row) => this.mapLab(row));
  }

  async createLab(clientId: string, input: CreateLabInput): Promise<Lab> {
    const client = await this.requireClient(clientId);
    const name = input.name.trim();
    if (!name) {
      throw Object.assign(new Error("Lab name is required"), { status: 400 });
    }
    const pool = await this.tenantPool(client.databaseName);
    const count = await pool.query("SELECT COUNT(*)::int AS n FROM labs");
    const id = newId();
    const slug = slugify(input.slug ?? name, `lab-${id.slice(0, 8)}`);
    assertSlug(slug);
    const lab: Lab = {
      id,
      clientId,
      name,
      slug,
      siteCode: input.siteCode?.trim() || siteCodeForName(name, Number(count.rows[0]?.n ?? 0)),
      status: "active",
      modules: [...DEFAULT_LAB_MODULES],
      createdAt: nowIso(),
    };
    try {
      await pool.query(
        `INSERT INTO labs (id, client_id, name, slug, site_code, status, modules, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          lab.id,
          lab.clientId,
          lab.name,
          lab.slug,
          lab.siteCode,
          lab.status,
          JSON.stringify(lab.modules),
          lab.createdAt,
        ]
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        throw Object.assign(new Error("A lab with that slug already exists for this client"), {
          status: 409,
        });
      }
      throw error;
    }
    return lab;
  }

  async close(): Promise<void> {
    await Promise.all([...this.tenantPools.values()].map((pool) => pool.end()));
    await this.control.end();
  }

  private async requireClient(id: string): Promise<Client> {
    const client = await this.getClient(id);
    if (!client) {
      throw Object.assign(new Error("Client not found"), { status: 404 });
    }
    return client;
  }

  private async provisionDatabase(databaseName: string): Promise<void> {
    if (!/^[a-z][a-z0-9_]*$/.test(databaseName)) {
      throw Object.assign(new Error("Invalid isolated database name"), { status: 400 });
    }
    const admin = new Pool({ connectionString: adminUrl(this.databaseUrl), max: 1 });
    try {
      await admin.query(`CREATE DATABASE ${databaseName}`);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "42P04") throw error;
    } finally {
      await admin.end();
    }
    const tenant = await this.tenantPool(databaseName);
    await tenant.query(TENANT_SCHEMA);
  }

  private async tenantPool(databaseName: string): Promise<Pool> {
    const existing = this.tenantPools.get(databaseName);
    if (existing) return existing;
    const pool = new Pool({
      connectionString: tenantUrl(this.databaseUrl, databaseName),
      max: 4,
    });
    this.tenantPools.set(databaseName, pool);
    return pool;
  }

  private mapUser(row: Record<string, unknown>): IntrasiteUserRecord {
    return {
      id: String(row["id"]),
      email: String(row["email"]),
      passwordHash: String(row["password_hash"]),
      name: String(row["name"]),
      role: row["role"] as IntrasiteUserRecord["role"],
      createdAt: new Date(String(row["created_at"])).toISOString(),
    };
  }

  private async mapClient(row: Record<string, unknown>): Promise<Client> {
    const databaseName = String(row["database_name"]);
    let labCount = 0;
    try {
      const pool = await this.tenantPool(databaseName);
      const count = await pool.query("SELECT COUNT(*)::int AS n FROM labs");
      labCount = Number(count.rows[0]?.n ?? 0);
    } catch {
      labCount = 0;
    }
    return {
      id: String(row["id"]),
      name: String(row["name"]),
      slug: String(row["slug"]),
      status: row["status"] as Client["status"],
      databaseName,
      isolation: "dedicated_database",
      labCount,
      createdAt: new Date(String(row["created_at"])).toISOString(),
    };
  }

  private mapLab(row: Record<string, unknown>): Lab {
    return {
      id: String(row["id"]),
      clientId: String(row["client_id"]),
      name: String(row["name"]),
      slug: String(row["slug"]),
      siteCode: String(row["site_code"]),
      status: row["status"] as Lab["status"],
      modules: parseModules(row["modules"]),
      createdAt: new Date(String(row["created_at"])).toISOString(),
    };
  }

  async getDossier(clientId: string): Promise<ClientDossier> {
    const client = await this.requireClient(clientId);
    return buildDossier(client, await this.listLabs(clientId));
  }

  async listModuleRequests(clientId: string, labId?: string): Promise<ModuleChangeRequest[]> {
    await this.requireClient(clientId);
    return [...this.requests.values()]
      .filter((item) => item.clientId === clientId && (!labId || item.labId === labId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createModuleRequest(
    clientId: string,
    labId: string,
    input: { moduleId: string; action: "add" | "remove"; requestedBy: string }
  ): Promise<ModuleChangeRequest> {
    const lab = await this.requireLab(clientId, labId);
    if (!LAB_MODULE_CATALOG.some((item) => item.id === input.moduleId)) {
      throw Object.assign(new Error("Unknown module"), { status: 400 });
    }
    if (input.action === "add" && lab.modules.includes(input.moduleId)) {
      throw Object.assign(new Error("That module is already installed"), { status: 409 });
    }
    if (input.action === "remove" && !lab.modules.includes(input.moduleId)) {
      throw Object.assign(new Error("That module is not installed"), { status: 404 });
    }
    const pending = [...this.requests.values()].find(
      (item) =>
        item.labId === labId &&
        item.moduleId === input.moduleId &&
        item.action === input.action &&
        item.step !== "provisioned"
    );
    if (pending) {
      throw Object.assign(new Error("A matching module change is already in review"), {
        status: 409,
      });
    }
    const request: ModuleChangeRequest = {
      id: newId(),
      clientId,
      labId,
      labName: lab.name,
      moduleId: input.moduleId,
      moduleLabel: moduleLabel(input.moduleId),
      action: input.action,
      step: "requested",
      requestedBy: input.requestedBy,
      createdAt: nowIso(),
    };
    this.requests.set(request.id, request);
    return request;
  }

  async approveModuleRequest(
    clientId: string,
    requestId: string,
    step: "secondary" | "business"
  ): Promise<ModuleChangeRequest> {
    const request = this.requests.get(requestId);
    if (!request || request.clientId !== clientId) {
      throw Object.assign(new Error("Module request not found"), { status: 404 });
    }
    if (step === "secondary" && request.step !== "requested") {
      throw Object.assign(new Error("Secondary approval is not pending"), { status: 409 });
    }
    if (step === "business" && request.step !== "secondary") {
      throw Object.assign(new Error("Business contact approval is not pending"), { status: 409 });
    }
    request.step = step === "secondary" ? "secondary" : "business";
    if (request.step === "business") {
      const lab = await this.requireLab(clientId, request.labId);
      if (request.action === "add" && !lab.modules.includes(request.moduleId)) {
        await this.writeModules(clientId, lab.id, [...lab.modules, request.moduleId]);
      }
      if (request.action === "remove") {
        await this.writeModules(
          clientId,
          lab.id,
          lab.modules.filter((id) => id !== request.moduleId)
        );
      }
      request.step = "provisioned";
    }
    this.requests.set(request.id, request);
    return request;
  }

  async removeLabModule(clientId: string, labId: string, moduleId: string): Promise<Lab> {
    const lab = await this.requireLab(clientId, labId);
    if (!lab.modules.includes(moduleId)) {
      throw Object.assign(new Error("That module is not installed"), { status: 404 });
    }
    return this.writeModules(
      clientId,
      labId,
      lab.modules.filter((id) => id !== moduleId)
    );
  }

  private async requireLab(clientId: string, labId: string): Promise<Lab> {
    const lab = (await this.listLabs(clientId)).find((item) => item.id === labId);
    if (!lab) {
      throw Object.assign(new Error("Lab not found"), { status: 404 });
    }
    return lab;
  }

  private async writeModules(clientId: string, labId: string, modules: string[]): Promise<Lab> {
    const client = await this.requireClient(clientId);
    const pool = await this.tenantPool(client.databaseName);
    await pool.query(`UPDATE labs SET modules = $1 WHERE id = $2`, [JSON.stringify(modules), labId]);
    return this.requireLab(clientId, labId);
  }

  async getCloseRequest(clientId: string): Promise<AccountCloseRequest | null> {
    return (
      [...this.closeRequests.values()]
        .filter((item) => item.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async createCloseRequest(clientId: string, requestedBy: string): Promise<AccountCloseRequest> {
    const client = await this.requireClient(clientId);
    if (client.status === "closed") {
      throw Object.assign(new Error("This account is already closed"), { status: 409 });
    }
    const pending = [...this.closeRequests.values()].find(
      (item) => item.clientId === clientId && item.step !== "provisioned"
    );
    if (pending) {
      throw Object.assign(new Error("An account close request is already in review"), { status: 409 });
    }
    const request: AccountCloseRequest = {
      id: newId(),
      clientId,
      step: "requested",
      requestedBy,
      createdAt: nowIso(),
    };
    this.closeRequests.set(request.id, request);
    return request;
  }

  async approveCloseRequest(
    clientId: string,
    requestId: string,
    step: "secondary" | "business"
  ): Promise<AccountCloseRequest> {
    const request = this.closeRequests.get(requestId);
    if (!request || request.clientId !== clientId) {
      throw Object.assign(new Error("Close request not found"), { status: 404 });
    }
    if (step === "secondary" && request.step !== "requested") {
      throw Object.assign(new Error("Secondary approval is not pending"), { status: 409 });
    }
    if (step === "business" && request.step !== "secondary") {
      throw Object.assign(new Error("Business contact approval is not pending"), { status: 409 });
    }
    request.step = step === "secondary" ? "secondary" : "provisioned";
    if (request.step === "provisioned") {
      await this.updateClient(clientId, { status: "closed" });
    }
    this.closeRequests.set(request.id, request);
    return request;
  }
}
