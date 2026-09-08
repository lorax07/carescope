import {
  DEMO_TOKEN,
  demoApproveCloseRequest,
  demoApproveModuleRequest,
  demoCreateClient,
  demoCreateCloseRequest,
  demoCreateLab,
  demoCreateModuleRequest,
  demoGetClient,
  demoListClients,
  demoLogin,
  demoQuery,
  demoRemoveLabModule,
  isDemoCredentials,
} from "./demo";

export type IntrasiteRole = "platform_admin" | "client_admin";

export type IntrasiteUser = {
  id: string;
  email: string;
  name: string;
  role: IntrasiteRole;
};

export type Client = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "provisioning" | "closed";
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
  status: "active" | "suspended";
  modules: string[];
  createdAt: string;
};

export type ClientRouting = {
  tenantHeader: string;
  tenantValue: string;
  labHeader: string;
  host: string;
  databaseName: string;
  isolation: string;
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

export type QueryEnvironment = {
  id: "dev1" | "dev2" | "qa";
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

export type AccountCloseRequest = {
  id: string;
  clientId: string;
  step: ApprovalStep;
  requestedBy: string;
  createdAt: string;
};

export type ClientDossier = {
  infrastructure: BackendInfra;
  architecture: InstallationNode[];
  contacts: BusinessContact[];
  support: SupportTicket[];
};

export type QueryResult = {
  columns: string[];
  rows: Array<Record<string, string | number>>;
};

export type ModuleCatalogItem = {
  id: string;
  label: string;
};

export type ClientDetail = {
  client: Client;
  labs: Lab[];
  routing: ClientRouting;
  dossier: ClientDossier;
  requests: ModuleChangeRequest[];
  closeRequest: AccountCloseRequest | null;
  moduleCatalog: ModuleCatalogItem[];
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = "carescope.intrasite.token";
const API = "/api/v1/intrasite";

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function isDemoSession(): boolean {
  return getStoredToken() === DEMO_TOKEN;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("Intrasite API is unavailable", 503);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token && token !== DEMO_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await readJson<{ error?: string }>(res).catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? res.statusText, res.status);
  }
  return readJson<T>(res);
}

export async function loginRequest(email: string, password: string) {
  try {
    return await api<{ token: string; user: IntrasiteUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    if (isDemoCredentials(email, password)) {
      return demoLogin();
    }
    throw error;
  }
}

export async function logoutRequest() {
  if (isDemoSession()) return;
  try {
    await api<void>("/auth/logout", { method: "POST" });
  } catch {
    /* local session is cleared by the caller */
  }
}

export async function meRequest() {
  if (isDemoSession()) {
    return { user: demoLogin().user };
  }
  if (!getStoredToken()) {
    throw new ApiError("Authentication required", 401);
  }
  return api<{ user: IntrasiteUser }>("/auth/me");
}

export async function listClients() {
  if (isDemoSession()) return demoListClients();
  return api<{ clients: Client[] }>("/clients");
}

export async function createClient(input: { name: string; slug?: string }) {
  if (isDemoSession()) return demoCreateClient(input);
  return api<{ client: Client; routing: ClientRouting }>("/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getClient(id: string) {
  if (isDemoSession()) {
    try {
      return demoGetClient(id);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Client not found", 404);
    }
  }
  return api<ClientDetail>(`/clients/${id}`);
}

export async function createLab(
  clientId: string,
  input: { name: string; slug?: string; siteCode?: string }
) {
  if (isDemoSession()) return demoCreateLab(clientId, input);
  return api<{ lab: Lab }>(`/clients/${clientId}/labs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function queryClientDatabase(
  clientId: string,
  sql: string,
  environment?: QueryEnvironment["id"]
) {
  if (isDemoSession()) {
    try {
      return demoQuery(clientId, sql, environment);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Query failed", 400);
    }
  }
  return api<QueryResult>(`/clients/${clientId}/query`, {
    method: "POST",
    body: JSON.stringify({ sql, environment }),
  });
}

export async function createCloseRequest(clientId: string) {
  if (isDemoSession()) {
    try {
      return demoCreateCloseRequest(clientId);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Unable to close account", 409);
    }
  }
  return api<{ request: AccountCloseRequest }>(`/clients/${clientId}/close-requests`, {
    method: "POST",
  });
}

export async function approveCloseRequest(
  clientId: string,
  requestId: string,
  step: "secondary" | "business"
) {
  if (isDemoSession()) {
    try {
      return demoApproveCloseRequest(clientId, requestId, step);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Unable to approve close", 409);
    }
  }
  return api<{ request: AccountCloseRequest }>(
    `/clients/${clientId}/close-requests/${requestId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ step }),
    }
  );
}

export async function createModuleRequest(
  clientId: string,
  labId: string,
  input: { moduleId: string; action: "add" | "remove" }
) {
  if (isDemoSession()) {
    try {
      return demoCreateModuleRequest(clientId, labId, input);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Unable to create request", 409);
    }
  }
  return api<{ request: ModuleChangeRequest }>(
    `/clients/${clientId}/labs/${labId}/module-requests`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function approveModuleRequest(
  clientId: string,
  requestId: string,
  step: "secondary" | "business"
) {
  if (isDemoSession()) {
    try {
      return demoApproveModuleRequest(clientId, requestId, step);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Unable to approve request", 409);
    }
  }
  return api<{ request: ModuleChangeRequest }>(
    `/clients/${clientId}/module-requests/${requestId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ step }),
    }
  );
}

export async function removeLabModule(clientId: string, labId: string, moduleId: string) {
  if (isDemoSession()) {
    try {
      return demoRemoveLabModule(clientId, labId, moduleId);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Unable to remove module", 404);
    }
  }
  return api<{ lab: Lab }>(`/clients/${clientId}/labs/${labId}/modules/${moduleId}`, {
    method: "DELETE",
  });
}
