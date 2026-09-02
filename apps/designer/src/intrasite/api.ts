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
  status: "active" | "suspended" | "provisioning";
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

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as T;
}

export function loginRequest(email: string, password: string) {
  return api<{ token: string; user: IntrasiteUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutRequest() {
  return api<void>("/auth/logout", { method: "POST" });
}

export function meRequest() {
  return api<{ user: IntrasiteUser }>("/auth/me");
}

export function listClients() {
  return api<{ clients: Client[] }>("/clients");
}

export function createClient(input: { name: string; slug?: string }) {
  return api<{ client: Client; routing: ClientRouting }>("/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getClient(id: string) {
  return api<{ client: Client; labs: Lab[]; routing: ClientRouting }>(`/clients/${id}`);
}

export function createLab(clientId: string, input: { name: string; slug?: string; siteCode?: string }) {
  return api<{ lab: Lab }>(`/clients/${clientId}/labs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
