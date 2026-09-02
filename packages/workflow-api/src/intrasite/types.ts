export type IntrasiteRole = "platform_admin" | "client_admin";

export type ClientStatus = "active" | "suspended" | "provisioning";

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
  createdAt: string;
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
}
