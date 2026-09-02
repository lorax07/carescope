import {
  DEMO_TOKEN,
  demoCreateClient,
  demoCreateLab,
  demoGetClient,
  demoListClients,
  demoLogin,
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
  return api<{ client: Client; labs: Lab[]; routing: ClientRouting }>(`/clients/${id}`);
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
