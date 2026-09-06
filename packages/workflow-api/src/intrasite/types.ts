export type IntrasiteRole = "platform_admin" | "client_admin";

export type ClientStatus = "active" | "suspended" | "provisioning" | "closed";

export type LabStatus = "active" | "suspended";

export type IntrasiteUser = {
  id: string;
  email: string;
  name: string;
  role: IntrasiteRole;
  createdAt: string;
};

export type IntrasiteUserRecord = IntrasiteUser & {
  passwordHash: string;
};

export type Client = {
  id: string;
  name: string;
  slug: string;
  status: ClientStatus;
  databaseName: string;
  isolation: "dedicated_database";
  labCount: number;
  createdAt: string;
};

export type Lab = {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  siteCode: string;
  status: LabStatus;
  modules: string[];
  createdAt: string;
};

export type ApprovalStep = "requested" | "secondary" | "business" | "provisioned";

export type ModuleChangeRequest = {
  id: string;
  clientId: string;
  labId: string;
  labName: string;
  moduleId: string;
  moduleLabel: string;
  action: "add" | "remove";
  step: ApprovalStep;
  requestedBy: string;
  createdAt: string;
};

export type BusinessContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type SupportTicket = {
  id: string;
  title: string;
  labId: string | null;
  labName: string | null;
  staff: string;
  openedAt: string;
  status: "open" | "resolved";
  summary: string;
};

export type InstallationNode = {
  id: string;
  label: string;
  kind: "hq" | "network" | "lab" | "instrument" | "environment";
  x: number;
  y: number;
  connectsTo: string[];
};

export type QueryEnvironmentId = "dev1" | "dev2" | "qa";

export type QueryEnvironment = {
  id: QueryEnvironmentId;
  label: string;
  databaseName: string;
  host: string;
  region: string;
  purpose: string;
};

export type BackendInfra = {
  databaseName: string;
  engine: string;
  host: string;
  region: string;
  isolation: string;
  tables: Array<{ name: string; rows: number }>;
  environments: QueryEnvironment[];
};

export type ClientDossier = {
  infrastructure: BackendInfra;
  architecture: InstallationNode[];
  contacts: BusinessContact[];
  support: SupportTicket[];
};

export type AccountCloseRequest = {
  id: string;
  clientId: string;
  step: ApprovalStep;
  requestedBy: string;
  createdAt: string;
};

export type QueryResult = {
  columns: string[];
  rows: Array<Record<string, string | number>>;
};

export type SessionUser = Pick<IntrasiteUser, "id" | "email" | "name" | "role">;

export type CreateClientInput = {
  name: string;
  slug?: string;
};

export type CreateLabInput = {
  name: string;
  slug?: string;
  siteCode?: string;
};

export type IntrasiteMeta = {
  product: "CareScope Intrasite";
  store: "memory" | "postgres";
  tenantHeader: string;
  labHeader: string;
  instanceHostPattern: string;
};

export interface IntrasiteStore {
  readonly kind: "memory" | "postgres";
  getUserByEmail(email: string): Promise<IntrasiteUserRecord | null>;
  getUserById(id: string): Promise<IntrasiteUserRecord | null>;
  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  createClient(input: CreateClientInput): Promise<Client>;
  updateClient(
    id: string,
    patch: Partial<Pick<Client, "name" | "status">>
  ): Promise<Client | null>;
  listLabs(clientId: string): Promise<Lab[]>;
  createLab(clientId: string, input: CreateLabInput): Promise<Lab>;
  getDossier(clientId: string): Promise<ClientDossier>;
  listModuleRequests(clientId: string, labId?: string): Promise<ModuleChangeRequest[]>;
  createModuleRequest(
    clientId: string,
    labId: string,
    input: { moduleId: string; action: "add" | "remove"; requestedBy: string }
  ): Promise<ModuleChangeRequest>;
  approveModuleRequest(
    clientId: string,
    requestId: string,
    step: "secondary" | "business"
  ): Promise<ModuleChangeRequest>;
  removeLabModule(clientId: string, labId: string, moduleId: string): Promise<Lab>;
  getCloseRequest(clientId: string): Promise<AccountCloseRequest | null>;
  createCloseRequest(clientId: string, requestedBy: string): Promise<AccountCloseRequest>;
  approveCloseRequest(
    clientId: string,
    requestId: string,
    step: "secondary" | "business"
  ): Promise<AccountCloseRequest>;
}
