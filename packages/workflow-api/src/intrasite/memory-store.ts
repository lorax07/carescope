import { hashPassword } from "./auth.js";
import {
  DEFAULT_LAB_MODULES,
  LAB_MODULE_CATALOG,
  accountPeopleCatalog,
  buildDossier,
  moduleLabel,
  resolveAccountPeople,
} from "./catalog.js";
import type {
  AccountCloseRequest,
  AccountPersonKind,
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
  administratorForLab,
  siteCodeForName,
  slugify,
} from "./util.js";

type TenantDatabase = {
  labs: Map<string, Lab>;
};

export class MemoryIntrasiteStore implements IntrasiteStore {
  readonly kind = "memory" as const;
  private users = new Map<string, IntrasiteUserRecord>();
  private clients = new Map<string, Omit<Client, "labCount" | "internalResources" | "businessContacts">>();
  private databases = new Map<string, TenantDatabase>();
  private requests = new Map<string, ModuleChangeRequest>();
  private closeRequests = new Map<string, AccountCloseRequest>();
  private internalResourceIds = new Map<string, string[]>();
  private businessContactIds = new Map<string, string[]>();

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
    const north = await this.createLab(apex.id, {
      name: "North Lab",
      slug: "north-lab",
      siteCode: "NL-01",
      administrator: "Marcus Hale",
    });
    const harborLab = await this.createLab(apex.id, {
      name: "Harbor Lab",
      slug: "harbor-lab",
      siteCode: "HL-02",
      administrator: "Priya Shah",
    });
    this.patchLab(apex.id, north.id, {
      modules: ["sample_lifecycle", "instrument_integration", "results_entry", "coa_generation"],
    });
    this.patchLab(apex.id, harborLab.id, {
      modules: ["sample_lifecycle", "quality_events", "capa"],
    });
    const harbor = await this.createClient({ name: "Harbor Clinical", slug: "harbor-clinical" });
    const main = await this.createLab(harbor.id, {
      name: "Main Campus",
      slug: "main-campus",
      siteCode: "MC-01",
      administrator: "Elena Voss",
    });
    this.patchLab(harbor.id, main.id, {
      modules: ["sample_lifecycle", "billing", "customer_portal"],
    });
    await this.assignAccountPerson(apex.id, "internal_resource", "ir-ruiz");
    await this.assignAccountPerson(apex.id, "internal_resource", "ir-chen");
    await this.assignAccountPerson(apex.id, "business_contact", "bc-shah");
    await this.assignAccountPerson(apex.id, "business_contact", "bc-hale");
    await this.assignAccountPerson(harbor.id, "internal_resource", "ir-patel");
    await this.assignAccountPerson(harbor.id, "internal_resource", "ir-okonkwo");
    await this.assignAccountPerson(harbor.id, "business_contact", "bc-voss");
    await this.assignAccountPerson(harbor.id, "business_contact", "bc-park");
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
    const record: Omit<Client, "labCount" | "internalResources" | "businessContacts"> = {
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
    this.internalResourceIds.set(id, []);
    this.businessContactIds.set(id, []);
    return this.withCount(record);
  }

  async assignAccountPerson(
    clientId: string,
    kind: AccountPersonKind,
    personId: string
  ): Promise<Client> {
    const existing = this.clients.get(clientId);
    if (!existing) {
      throw Object.assign(new Error("Client not found"), { status: 404 });
    }
    if (!accountPeopleCatalog(kind).some((person) => person.id === personId)) {
      throw Object.assign(new Error("Unknown person"), { status: 400 });
    }
    const ids = this.personIds(clientId, kind);
    if (ids.includes(personId)) {
      throw Object.assign(new Error("That person is already assigned"), { status: 409 });
    }
    ids.push(personId);
    return this.withCount(existing);
  }

  async removeAccountPerson(
    clientId: string,
    kind: AccountPersonKind,
    personId: string
  ): Promise<Client> {
    const existing = this.clients.get(clientId);
    if (!existing) {
      throw Object.assign(new Error("Client not found"), { status: 404 });
    }
    const ids = this.personIds(clientId, kind);
    const next = ids.filter((id) => id !== personId);
    if (next.length === ids.length) {
      throw Object.assign(new Error("That person is not assigned"), { status: 404 });
    }
    this.setPersonIds(clientId, kind, next);
    return this.withCount(existing);
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
    const contacts = resolveAccountPeople(this.businessContactIds.get(clientId) ?? [], "business_contact");
    const lab: Lab = {
      id,
      clientId,
      name,
      slug,
      siteCode: input.siteCode?.trim() || siteCodeForName(name, db.labs.size),
      status: "active",
      modules: [...DEFAULT_LAB_MODULES],
      administrator: administratorForLab(input.administrator, contacts, [...db.labs.values()]),
      createdAt: nowIso(),
    };
    db.labs.set(id, lab);
    return lab;
  }

  async getDossier(clientId: string): Promise<ClientDossier> {
    const client = await this.getClient(clientId);
    if (!client) {
      throw Object.assign(new Error("Client not found"), { status: 404 });
    }
    return buildDossier(client, await this.listLabs(clientId));
  }

  async listModuleRequests(clientId: string, labId?: string): Promise<ModuleChangeRequest[]> {
    return [...this.requests.values()]
      .filter((item) => item.clientId === clientId && (!labId || item.labId === labId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createModuleRequest(
    clientId: string,
    labId: string,
    input: { moduleId: string; action: "add" | "remove"; requestedBy: string }
  ): Promise<ModuleChangeRequest> {
    const lab = this.requireLab(clientId, labId);
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
      const lab = this.requireLab(clientId, request.labId);
      if (request.action === "add" && !lab.modules.includes(request.moduleId)) {
        lab.modules = [...lab.modules, request.moduleId];
      }
      if (request.action === "remove") {
        lab.modules = lab.modules.filter((id) => id !== request.moduleId);
      }
      request.step = "provisioned";
    }
    this.requests.set(request.id, request);
    return request;
  }

  async removeLabModule(clientId: string, labId: string, moduleId: string): Promise<Lab> {
    const lab = this.requireLab(clientId, labId);
    if (!lab.modules.includes(moduleId)) {
      throw Object.assign(new Error("That module is not installed"), { status: 404 });
    }
    lab.modules = lab.modules.filter((id) => id !== moduleId);
    return lab;
  }

  async getCloseRequest(clientId: string): Promise<AccountCloseRequest | null> {
    return (
      [...this.closeRequests.values()]
        .filter((item) => item.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async createCloseRequest(clientId: string, requestedBy: string): Promise<AccountCloseRequest> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw Object.assign(new Error("Client not found"), { status: 404 });
    }
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
      const client = this.clients.get(clientId);
      if (client) client.status = "closed";
    }
    this.closeRequests.set(request.id, request);
    return request;
  }

  private patchLab(clientId: string, labId: string, patch: Partial<Pick<Lab, "modules">>): Lab {
    const lab = this.requireLab(clientId, labId);
    if (patch.modules) lab.modules = patch.modules;
    return lab;
  }

  private requireLab(clientId: string, labId: string): Lab {
    const lab = this.isolated(clientId).labs.get(labId);
    if (!lab) {
      throw Object.assign(new Error("Lab not found"), { status: 404 });
    }
    return lab;
  }

  private isolated(clientId: string): TenantDatabase {
    const db = this.databases.get(clientId);
    if (!db) {
      throw Object.assign(new Error("Isolated client database is not provisioned"), { status: 404 });
    }
    return db;
  }

  private withCount(client: Omit<Client, "labCount" | "internalResources" | "businessContacts">): Client {
    return {
      ...client,
      labCount: this.databases.get(client.id)?.labs.size ?? 0,
      internalResources: resolveAccountPeople(this.personIds(client.id, "internal_resource"), "internal_resource"),
      businessContacts: resolveAccountPeople(this.personIds(client.id, "business_contact"), "business_contact"),
    };
  }

  private personIds(clientId: string, kind: AccountPersonKind): string[] {
    const map = kind === "internal_resource" ? this.internalResourceIds : this.businessContactIds;
    const ids = map.get(clientId);
    if (ids) return ids;
    const created: string[] = [];
    map.set(clientId, created);
    return created;
  }

  private setPersonIds(clientId: string, kind: AccountPersonKind, ids: string[]): void {
    const map = kind === "internal_resource" ? this.internalResourceIds : this.businessContactIds;
    map.set(clientId, ids);
  }
}
