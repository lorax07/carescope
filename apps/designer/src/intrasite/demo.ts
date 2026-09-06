import type {
  Client,
  ClientDetail,
  ClientRouting,
  IntrasiteUser,
  Lab,
  ModuleChangeRequest,
  QueryResult,
} from "./api";
import {
  DEFAULT_LAB_MODULES,
  LAB_MODULE_CATALOG,
  buildDossier,
  moduleLabel,
  runInfraQuery,
} from "./catalog";

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
        modules: ["sample_lifecycle", "instrument_integration", "results_entry", "coa_generation"],
        createdAt,
      },
      {
        id: "lab-harbor",
        clientId: "client-apex",
        name: "Harbor Lab",
        slug: "harbor-lab",
        siteCode: "HL-02",
        status: "active",
        modules: ["sample_lifecycle", "quality_events", "capa"],
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
        modules: ["sample_lifecycle", "billing", "customer_portal"],
        createdAt,
      },
    ],
  ],
]);

const requests: ModuleChangeRequest[] = [];

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

function requireClient(id: string): Client {
  const client = clients.find((item) => item.id === id);
  if (!client) {
    const error = new Error("Client not found") as Error & { status: number };
    error.status = 404;
    throw error;
  }
  return client;
}

function requireLab(clientId: string, labId: string): Lab {
  const lab = (labsByClient.get(clientId) ?? []).find((item) => item.id === labId);
  if (!lab) {
    const error = new Error("Lab not found") as Error & { status: number };
    error.status = 404;
    throw error;
  }
  return lab;
}

export function demoLogin(): { token: string; user: IntrasiteUser } {
  return { token: DEMO_TOKEN, user: DEMO_USER };
}

export function demoListClients(): { clients: Client[] } {
  for (const client of clients) syncLabCount(client);
  return { clients: [...clients].sort((a, b) => a.name.localeCompare(b.name)) };
}

export function demoGetClient(id: string): ClientDetail {
  const client = requireClient(id);
  syncLabCount(client);
  const labs = [...(labsByClient.get(id) ?? [])];
  return {
    client,
    labs,
    routing: routingFor(client),
    dossier: buildDossier(client, labs),
    requests: requests
      .filter((item) => item.clientId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    moduleCatalog: LAB_MODULE_CATALOG,
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
  const client = requireClient(clientId);
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
    modules: [...DEFAULT_LAB_MODULES],
    createdAt: new Date().toISOString(),
  };
  existing.push(lab);
  labsByClient.set(clientId, existing);
  syncLabCount(client);
  return { lab };
}

export function demoQuery(clientId: string, sql: string): QueryResult {
  const detail = demoGetClient(clientId);
  return runInfraQuery(sql, detail.labs, detail.dossier);
}

export function demoCreateModuleRequest(
  clientId: string,
  labId: string,
  input: { moduleId: string; action: "add" | "remove" }
): { request: ModuleChangeRequest } {
  const lab = requireLab(clientId, labId);
  if (!LAB_MODULE_CATALOG.some((item) => item.id === input.moduleId)) {
    throw Object.assign(new Error("Unknown module"), { status: 400 });
  }
  if (input.action === "add" && lab.modules.includes(input.moduleId)) {
    throw Object.assign(new Error("That module is already installed"), { status: 409 });
  }
  if (input.action === "remove" && !lab.modules.includes(input.moduleId)) {
    throw Object.assign(new Error("That module is not installed"), { status: 404 });
  }
  const pending = requests.find(
    (item) =>
      item.labId === labId &&
      item.moduleId === input.moduleId &&
      item.action === input.action &&
      item.step !== "provisioned"
  );
  if (pending) {
    throw Object.assign(new Error("A matching module change is already in review"), { status: 409 });
  }
  const request: ModuleChangeRequest = {
    id: crypto.randomUUID(),
    clientId,
    labId,
    labName: lab.name,
    moduleId: input.moduleId,
    moduleLabel: moduleLabel(input.moduleId),
    action: input.action,
    step: "requested",
    requestedBy: DEMO_USER.name,
    createdAt: new Date().toISOString(),
  };
  requests.push(request);
  return { request };
}

export function demoApproveModuleRequest(
  clientId: string,
  requestId: string,
  step: "secondary" | "business"
): { request: ModuleChangeRequest } {
  const request = requests.find((item) => item.id === requestId && item.clientId === clientId);
  if (!request) {
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
    const lab = requireLab(clientId, request.labId);
    if (request.action === "add" && !lab.modules.includes(request.moduleId)) {
      lab.modules = [...lab.modules, request.moduleId];
    }
    if (request.action === "remove") {
      lab.modules = lab.modules.filter((id) => id !== request.moduleId);
    }
    request.step = "provisioned";
  }
  return { request };
}

export function demoRemoveLabModule(
  clientId: string,
  labId: string,
  moduleId: string
): { lab: Lab } {
  const lab = requireLab(clientId, labId);
  if (!lab.modules.includes(moduleId)) {
    throw Object.assign(new Error("That module is not installed"), { status: 404 });
  }
  lab.modules = lab.modules.filter((id) => id !== moduleId);
  return { lab };
}
