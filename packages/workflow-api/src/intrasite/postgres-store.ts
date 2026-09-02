import { Pool } from "pg";
import { hashPassword } from "./auth.js";
import type {
  Client,
  CreateClientInput,
  CreateLabInput,
  IntrasiteStore,
  IntrasiteUserRecord,
  Lab,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
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

export class PostgresIntrasiteStore implements IntrasiteStore {
  readonly kind = "postgres" as const;
  private control: Pool;
  private tenantPools = new Map<string, Pool>();
  private databaseUrl: string;

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
        await this.createLab(apex.id, { name: "North Lab", slug: "north-lab", siteCode: "NL-01" });
        await this.createLab(apex.id, { name: "Harbor Lab", slug: "harbor-lab", siteCode: "HL-02" });
        const harbor = await this.createClient({ name: "Harbor Clinical", slug: "harbor-clinical" });
        await this.createLab(harbor.id, {
          name: "Main Campus",
          slug: "main-campus",
          siteCode: "MC-01",
        });
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
      `SELECT id, client_id, name, slug, site_code, status, created_at FROM labs ORDER BY name`
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
      createdAt: nowIso(),
    };
    try {
      await pool.query(
        `INSERT INTO labs (id, client_id, name, slug, site_code, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [lab.id, lab.clientId, lab.name, lab.slug, lab.siteCode, lab.status, lab.createdAt]
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
      createdAt: new Date(String(row["created_at"])).toISOString(),
    };
  }
}
