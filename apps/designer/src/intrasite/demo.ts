import type { Client, ClientRouting, IntrasiteUser, Lab } from "./api";

export const DEMO_EMAIL = "admin@carescope.local";
export const DEMO_PASSWORD = "password";
export const DEMO_TOKEN = "demo";

export const DEMO_USER: IntrasiteUser = {
  id: "intrasite-admin",
  email: DEMO_EMAIL,
  name: "Intrasite Admin",
  role: "platform_admin",
};

const createdAt = "2026-01-15T12:00:00.000Z";

const clients: Client[] = [
  {
    id: "client-apex",
    name: "Apex Diagnostics",
    slug: "apex-diagnostics",
    status: "active",
    databaseName: "cs_apex_diagnostics",
    isolation: "dedicated_database",
    labCount: 2,
    createdAt,
  },
  {
    id: "client-harbor",
    name: "Harbor Clinical",
    slug: "harbor-clinical",
    status: "active",
    databaseName: "cs_harbor_clinical",
    isolation: "dedicated_database",
    labCount: 1,
    createdAt,
  },
];

const labsByClient = new Map<string, Lab[]>([
  [
    "client-apex",
    [
      {
        id: "lab-north",
        clientId: "client-apex",
        name: "North Lab",
        slug: "north-lab",
        siteCode: "NL-01",
        status: "active",
        createdAt,
      },
      {
        id: "lab-harbor",
        clientId: "client-apex",
        name: "Harbor Lab",
        slug: "harbor-lab",
        siteCode: "HL-02",
        status: "active",
        createdAt,
      },
    ],
  ],
  [
    "client-harbor",
    [
      {
        id: "lab-main",
        clientId: "client-harbor",
        name: "Main Campus",
        slug: "main-campus",
        siteCode: "MC-01",
        status: "active",
        createdAt,
      },
    ],
  ],
]);

export function isDemoCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

function slugify(value: string, fallback: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || fallback
  );
}

function routingFor(client: Client): ClientRouting {
  return {
    tenantHeader: "x-tenant-id",
    tenantValue: client.slug,
    labHeader: "x-lab-id",
    host: `${client.slug}.intrasite.local`,
    databaseName: client.databaseName,
    isolation: client.isolation,
  };
}

function syncLabCount(client: Client): void {
  client.labCount = labsByClient.get(client.id)?.length ?? 0;
}

export function demoLogin(): { token: string; user: IntrasiteUser } {
  return { token: DEMO_TOKEN, user: DEMO_USER };
}

export function demoListClients(): { clients: Client[] } {
  for (const client of clients) syncLabCount(client);
  return { clients: [...clients].sort((a, b) => a.name.localeCompare(b.name)) };
}

export function demoGetClient(id: string): { client: Client; labs: Lab[]; routing: ClientRouting } {
  const client = clients.find((item) => item.id === id);
  if (!client) {
    const error = new Error("Client not found") as Error & { status: number };
    error.status = 404;
    throw error;
  }
  syncLabCount(client);
  return {
    client,
    labs: [...(labsByClient.get(id) ?? [])],
    routing: routingFor(client),
  };
}

export function demoCreateClient(input: { name: string; slug?: string }): {
  client: Client;
  routing: ClientRouting;
} {
  const name = input.name.trim();
  const id = crypto.randomUUID();
  const slug = slugify(input.slug ?? name, `client-${id.slice(0, 8)}`);
  const client: Client = {
    id,
    name,
    slug,
    status: "active",
    databaseName: `cs_${slug.replace(/-/g, "_")}`.slice(0, 63),
    isolation: "dedicated_database",
    labCount: 0,
    createdAt: new Date().toISOString(),
  };
  clients.push(client);
  labsByClient.set(id, []);
  return { client, routing: routingFor(client) };
}

export function demoCreateLab(
  clientId: string,
  input: { name: string; slug?: string; siteCode?: string }
): { lab: Lab } {
  const client = clients.find((item) => item.id === clientId);
  if (!client) {
    const error = new Error("Client not found") as Error & { status: number };
    error.status = 404;
    throw error;
  }
  const id = crypto.randomUUID();
  const name = input.name.trim();
  const existing = labsByClient.get(clientId) ?? [];
  const lab: Lab = {
    id,
    clientId,
    name,
    slug: slugify(input.slug ?? name, `lab-${id.slice(0, 8)}`),
    siteCode: input.siteCode?.trim() || `LB-${String(existing.length + 1).padStart(2, "0")}`,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  existing.push(lab);
  labsByClient.set(clientId, existing);
  syncLabCount(client);
  return { lab };
}
