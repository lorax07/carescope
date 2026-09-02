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

type TenantDatabase = {
  labs: Map<string, Lab>;
};

export class MemoryIntrasiteStore implements IntrasiteStore {
  readonly kind = "memory" as const;
  private users = new Map<string, IntrasiteUserRecord>();
  private clients = new Map<string, Omit<Client, "labCount">>();
  private databases = new Map<string, TenantDatabase>();

  async seed(admin: { email: string; password: string; name: string }): Promise<void> {
    if (this.users.size === 0) {
      const user: IntrasiteUserRecord = {
        id: newId(),
        email: normalizeEmail(admin.email),
        passwordHash: await hashPassword(admin.password),
        name: admin.name,
        role: "platform_admin",
        createdAt: nowIso(),
      };
      this.users.set(user.id, user);
    }
    if (this.clients.size === 0 && process.env["INTRASITE_SEED_DEMO"] !== "false") {
      await this.seedDemo();
    }
  }

  private async seedDemo(): Promise<void> {
    const apex = await this.createClient({ name: "Apex Diagnostics", slug: "apex-diagnostics" });
    await this.createLab(apex.id, { name: "North Lab", slug: "north-lab", siteCode: "NL-01" });
    await this.createLab(apex.id, { name: "Harbor Lab", slug: "harbor-lab", siteCode: "HL-02" });
    const harbor = await this.createClient({ name: "Harbor Clinical", slug: "harbor-clinical" });
    await this.createLab(harbor.id, { name: "Main Campus", slug: "main-campus", siteCode: "MC-01" });
  }

  async getUserByEmail(email: string): Promise<IntrasiteUserRecord | null> {
    const normalized = normalizeEmail(email);
    return [...this.users.values()].find((u) => u.email === normalized) ?? null;
  }

  async getUserById(id: string): Promise<IntrasiteUserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async listClients(): Promise<Client[]> {
    return [...this.clients.values()]
      .map((c) => this.withCount(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getClient(id: string): Promise<Client | null> {
    const client = this.clients.get(id);
    return client ? this.withCount(client) : null;
  }

  async createClient(input: CreateClientInput): Promise<Client> {
    const name = input.name.trim();
    if (!name) {
      throw Object.assign(new Error("Client name is required"), { status: 400 });
    }
    const id = newId();
    const slug = slugify(input.slug ?? name, `client-${id.slice(0, 8)}`);
    assertSlug(slug);
    if ([...this.clients.values()].some((c) => c.slug === slug)) {
      throw Object.assign(new Error("A client with that slug already exists"), { status: 409 });
    }
    const record: Omit<Client, "labCount"> = {
      id,
      name,
      slug,
      status: "active",
      databaseName: databaseNameForSlug(slug),
      isolation: "dedicated_database",
      createdAt: nowIso(),
    };
    this.clients.set(id, record);
    this.databases.set(id, { labs: new Map() });
    return this.withCount(record);
  }

  async updateClient(
    id: string,
    patch: Partial<Pick<Client, "name" | "status">>
  ): Promise<Client | null> {
    const existing = this.clients.get(id);
    if (!existing) return null;
    const next = {
      ...existing,
      name: patch.name?.trim() || existing.name,
      status: patch.status ?? existing.status,
    };
    this.clients.set(id, next);
    return this.withCount(next);
  }

  async listLabs(clientId: string): Promise<Lab[]> {
    const db = this.isolated(clientId);
    return [...db.labs.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createLab(clientId: string, input: CreateLabInput): Promise<Lab> {
    if (!this.clients.has(clientId)) {
      throw Object.assign(new Error("Client not found"), { status: 404 });
    }
    const name = input.name.trim();
    if (!name) {
      throw Object.assign(new Error("Lab name is required"), { status: 400 });
    }
    const db = this.isolated(clientId);
    const id = newId();
    const slug = slugify(input.slug ?? name, `lab-${id.slice(0, 8)}`);
    assertSlug(slug);
    if ([...db.labs.values()].some((lab) => lab.slug === slug)) {
      throw Object.assign(new Error("A lab with that slug already exists for this client"), {
        status: 409,
      });
    }
    const lab: Lab = {
      id,
      clientId,
      name,
      slug,
      siteCode: input.siteCode?.trim() || siteCodeForName(name, db.labs.size),
      status: "active",
      createdAt: nowIso(),
    };
    db.labs.set(id, lab);
    return lab;
  }

  private isolated(clientId: string): TenantDatabase {
    const db = this.databases.get(clientId);
    if (!db) {
      throw Object.assign(new Error("Isolated client database is not provisioned"), { status: 404 });
    }
    return db;
  }

  private withCount(client: Omit<Client, "labCount">): Client {
    return {
      ...client,
      labCount: this.databases.get(client.id)?.labs.size ?? 0,
    };
  }
}
