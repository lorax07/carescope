import type {
  AccountPerson,
  AccountPersonKind,
  Client,
  ClientDossier,
  InstallationNode,
  Lab,
  QueryEnvironment,
  QueryResult,
  TicketMessage,
} from "./api";

export type LabModuleId =
  | "lab_operations"
  | "instrument_integration"
  | "connectivity"
  | "quality_compliance"
  | "insights";

export type LabModuleDef = {
  id: LabModuleId;
  label: string;
  positioning: string;
  capabilities: string;
};

export const LAB_MODULE_CATALOG: LabModuleDef[] = [
  {
    id: "lab_operations",
    label: "Lab Operations",
    positioning: "The core LIMS",
    capabilities:
      "Orders, accessioning, specimens, tests, analyses, results, QC, workflows, queues, batching, TAT, reports, inventory, storage",
  },
  {
    id: "instrument_integration",
    label: "Instrument Integration",
    positioning: "Connect your instruments to Sequence",
    capabilities:
      "Instrument interfaces, bidirectional communication, result ingestion, worklists, instrument mapping, interface monitoring",
  },
  {
    id: "connectivity",
    label: "Healthcare CRM",
    positioning: "A custom CRM designed for healthcare",
    capabilities:
      "Client accounts, provider relationships, referrals, outreach, service agreements, follow-up",
  },
  {
    id: "quality_compliance",
    label: "Quality & Compliance",
    positioning: "Keep the laboratory controlled and traceable",
    capabilities:
      "Audit trails, e-signatures, change control, validation, CAPA, nonconformance, document control",
  },
  {
    id: "insights",
    label: "Insights",
    positioning: "Turn laboratory data into operational intelligence",
    capabilities: "Dashboards, TAT analytics, productivity, quality metrics, custom reporting",
  },
];

export const DEFAULT_LAB_MODULES: LabModuleId[] = ["lab_operations"];

export const INTERNAL_RESOURCES: AccountPerson[] = [
  { id: "ir-ruiz", name: "A. Ruiz", roles: ["Customer success", "Implementation"] },
  { id: "ir-patel", name: "S. Patel", roles: ["Support engineer"] },
  { id: "ir-okonkwo", name: "L. Okonkwo", roles: ["Solutions architect"] },
  { id: "ir-chen", name: "M. Chen", roles: ["Technical account manager"] },
  { id: "ir-ellis", name: "Jordan Ellis", roles: ["Onboarding specialist"] },
];

export const BUSINESS_CONTACTS: AccountPerson[] = [
  { id: "bc-shah", name: "Priya Shah", roles: ["Executive sponsor"] },
  { id: "bc-hale", name: "Marcus Hale", roles: ["Lab operations lead"] },
  { id: "bc-voss", name: "Elena Voss", roles: ["IT", "Validation"] },
  { id: "bc-park", name: "Jonah Park", roles: ["Quality business contact"] },
  { id: "bc-nguyen", name: "Amira Nguyen", roles: ["Procurement", "Billing"] },
];

export function accountPeopleCatalog(kind: AccountPersonKind): AccountPerson[] {
  return kind === "internal_resource" ? INTERNAL_RESOURCES : BUSINESS_CONTACTS;
}

export function moduleLabel(id: string): string {
  return LAB_MODULE_CATALOG.find((item) => item.id === id)?.label ?? id;
}

const ENV_META: Array<{ id: QueryEnvironment["id"]; label: string; purpose: string; scale: number }> = [
  { id: "dev1", label: "Dev1", purpose: "Developer sandbox", scale: 0.25 },
  { id: "dev2", label: "Dev2", purpose: "Integration / vendor dry-run", scale: 0.4 },
  { id: "qa", label: "QA", purpose: "Validation and change-control", scale: 0.7 },
  { id: "prod", label: "Production", purpose: "Live laboratory operations", scale: 1 },
];

export function environmentsFor(client: Client): QueryEnvironment[] {
  return ENV_META.map((env) => ({
    id: env.id,
    label: env.label,
    purpose: env.purpose,
    databaseName: `${client.databaseName}_${env.id}`,
    host: `${env.id}.db.${client.slug}.intrasite.internal`,
    region: "us-east-1",
  }));
}

export function buildDossier(client: Client, labs: Lab[]): ClientDossier {
  const environments = environmentsFor(client);
  const architecture: InstallationNode[] = [
    {
      id: "hq",
      label: `${client.name} HQ`,
      kind: "hq",
      x: 280,
      y: 24,
      connectsTo: environments.map((env) => env.id),
    },
    ...environments.map((env, envIndex) => ({
      id: env.id,
      label: env.label,
      kind: "environment" as const,
      x: 70 + envIndex * 210,
      y: 112,
      connectsTo: labs.map((lab) => `${env.id}-${lab.id}`),
    })),
    ...environments.flatMap((env, envIndex) =>
      labs.map((lab, labIndex) => ({
        id: `${env.id}-${lab.id}`,
        label: `${lab.name} · ${env.label}`,
        kind: "lab" as const,
        x: 30 + envIndex * 210 + labIndex * 95,
        y: 210,
        connectsTo: [`${env.id}-${lab.id}-inst`],
      }))
    ),
    ...environments.flatMap((env, envIndex) =>
      labs.map((lab, labIndex) => ({
        id: `${env.id}-${lab.id}-inst`,
        label: `${lab.siteCode} ${env.label}`,
        kind: "instrument" as const,
        x: 30 + envIndex * 210 + labIndex * 95,
        y: 300,
        connectsTo: [],
      }))
    ),
  ];

  return {
    infrastructure: {
      databaseName: client.databaseName,
      engine: "PostgreSQL 16",
      host: `db.${client.slug}.intrasite.internal`,
      region: "us-east-1",
      isolation: "dedicated_database",
      tables: [
        { name: "labs", rows: labs.length },
        { name: "samples", rows: 128 + labs.length * 40 },
        { name: "instruments", rows: labs.length * 4 },
        { name: "contacts", rows: 4 },
      ],
      environments,
    },
    architecture,
    contacts: [
      {
        id: `${client.id}-exec`,
        name: "Priya Shah",
        role: "Executive sponsor",
        email: `priya.shah@${client.slug.replace(/-/g, "")}.example`,
        phone: "+1 202 555 0148",
      },
      {
        id: `${client.id}-ops`,
        name: "Marcus Hale",
        role: "Lab operations lead",
        email: `marcus.hale@${client.slug.replace(/-/g, "")}.example`,
        phone: "+1 202 555 0172",
      },
      {
        id: `${client.id}-it`,
        name: "Elena Voss",
        role: "IT / validation",
        email: `elena.voss@${client.slug.replace(/-/g, "")}.example`,
        phone: "+1 202 555 0190",
      },
      {
        id: `${client.id}-qa`,
        name: "Jonah Park",
        role: "Quality business contact",
        email: `jonah.park@${client.slug.replace(/-/g, "")}.example`,
        phone: "+1 202 555 0114",
      },
    ],
    support: supportTickets(client.id, labs),
  };
}

function supportTickets(clientId: string, labs: Lab[]) {
  return [
    {
      id: `${clientId}-sup-1`,
      title: "STAT queue notification delay",
      labId: labs[0]?.id ?? null,
      labName: labs[0]?.name ?? null,
      requestor: "Marcus Hale",
      staff: "A. Ruiz",
      openedAt: "2026-08-12T14:20:00.000Z",
      status: "resolved" as const,
      summary: "Webhook retry window increased for STAT accession events.",
      messages: ticketThread(`${clientId}-sup-1`, "A. Ruiz", "Marcus Hale", [
        ["2026-08-12T14:22:00.000Z", "client", "STAT accessions are sitting in the queue for almost an hour before the lab sees them."],
        ["2026-08-12T15:05:00.000Z", "internal", "I can see the webhook retries dying after the first failure. I am widening the retry window."],
        ["2026-08-12T18:40:00.000Z", "internal", "Retry window is increased. New STAT events are posting within a minute."],
        ["2026-08-13T09:10:00.000Z", "client", "Confirmed on our side. You can close this."],
      ]),
    },
    {
      id: `${clientId}-sup-2`,
      title: "Instrument driver update",
      labId: labs[1]?.id ?? labs[0]?.id ?? null,
      labName: labs[1]?.name ?? labs[0]?.name ?? null,
      requestor: "Elena Voss",
      staff: "S. Patel",
      openedAt: "2026-08-28T09:05:00.000Z",
      status: "open" as const,
      summary: "HPLC driver staged; waiting on change-control window.",
      messages: ticketThread(`${clientId}-sup-2`, "S. Patel", "Elena Voss", [
        ["2026-08-28T09:10:00.000Z", "client", "The HPLC driver on the harbor instrument is still on the previous build."],
        ["2026-08-28T11:30:00.000Z", "internal", "Driver is staged in Dev1. We need your change-control window before it can move to QA."],
        ["2026-08-29T08:15:00.000Z", "client", "Change control is Thursday 18:00. Please hold until then."],
      ]),
    },
    {
      id: `${clientId}-sup-3`,
      title: "SSO group mapping",
      labId: null,
      labName: null,
      requestor: "Priya Shah",
      staff: "L. Okonkwo",
      openedAt: "2026-07-03T16:40:00.000Z",
      status: "resolved" as const,
      summary: "Mapped QA reviewers to the client IdP quality group.",
      messages: ticketThread(`${clientId}-sup-3`, "L. Okonkwo", "Priya Shah", [
        ["2026-07-03T16:45:00.000Z", "client", "QA reviewers are not landing in the quality group after SSO."],
        ["2026-07-03T17:20:00.000Z", "internal", "The IdP claim was mapped to the analyst group. I am pointing it at quality."],
        ["2026-07-06T10:00:00.000Z", "client", "Reviewers can sign results now. Thank you."],
      ]),
    },
    {
      id: `${clientId}-sup-4`,
      title: "CoA template tweak",
      labId: labs[0]?.id ?? null,
      labName: labs[0]?.name ?? null,
      requestor: "Jonah Park",
      staff: "M. Chen",
      openedAt: "2026-09-01T11:15:00.000Z",
      status: "open" as const,
      summary: "Client requested additional lot lineage on released CoAs.",
      messages: ticketThread(`${clientId}-sup-4`, "M. Chen", "Jonah Park", [
        ["2026-09-01T11:20:00.000Z", "client", "Released certificates need the full lot lineage, not just the batch id."],
        ["2026-09-01T13:45:00.000Z", "internal", "I added the lineage block to the draft template in Dev2. Can you review a sample CoA?"],
        ["2026-09-02T09:05:00.000Z", "client", "The sample looks right. Please keep this open until QA signs the template."],
      ]),
    },
  ];
}

function ticketThread(
  id: string,
  staff: string,
  clientName: string,
  lines: Array<[string, TicketMessage["side"], string]>
): TicketMessage[] {
  return lines.map(([at, side, body], index) => ({
    id: `${id}-m${index}`,
    at,
    author: side === "client" ? clientName : staff,
    side,
    body,
  }));
}

function environmentScale(envId?: string): number {
  return ENV_META.find((item) => item.id === envId)?.scale ?? 1;
}

export function runInfraQuery(
  sql: string,
  labs: Lab[],
  dossier: ClientDossier,
  environmentId?: string
): QueryResult {
  const normalized = sql.trim().replace(/;+\s*$/, "").replace(/\s+/g, " ");
  if (!normalized) {
    throw new Error("SQL is required");
  }
  const upper = normalized.toUpperCase();
  if (upper === "SHOW TABLES") {
    return {
      columns: ["table_name", "estimated_rows"],
      rows: dossier.infrastructure.tables.map((table) => ({
        table_name: table.name,
        estimated_rows: table.rows,
      })),
    };
  }
  const select = /^SELECT \* FROM ([a-zA-Z_]+)$/i.exec(normalized);
  if (!select) {
    throw new Error("This IDE accepts SHOW TABLES or SELECT * FROM labs|samples|instruments|contacts.");
  }
  const table = select[1].toLowerCase();
  if (table === "labs") {
    return {
      columns: ["id", "name", "slug", "site_code", "status", "modules"],
      rows: labs.map((lab) => ({
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        site_code: lab.siteCode,
        status: lab.status,
        modules: lab.modules.join(", "),
      })),
    };
  }
  if (table === "contacts") {
    return {
      columns: ["id", "name", "role", "email", "phone"],
      rows: dossier.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
      })),
    };
  }
  if (table === "samples") {
    const count = dossier.infrastructure.tables.find((item) => item.name === "samples")?.rows ?? 8;
    const preview = Math.min(12, Math.max(3, Math.round(count * environmentScale(environmentId))));
    return {
      columns: ["id", "accession", "lab_id", "status"],
      rows: Array.from({ length: preview }, (_, index) => ({
        id: `smp-${index + 1}`,
        accession: `A-${1000 + index}`,
        lab_id: labs[index % Math.max(labs.length, 1)]?.id ?? "",
        status: index % 3 === 0 ? "released" : "in_process",
      })),
    };
  }
  if (table === "instruments") {
    const count = dossier.infrastructure.tables.find((item) => item.name === "instruments")?.rows ?? 4;
    const preview = Math.min(12, count);
    return {
      columns: ["id", "name", "lab_id", "status"],
      rows: Array.from({ length: preview }, (_, index) => ({
        id: `ins-${index + 1}`,
        name: `Analyzer ${index + 1}`,
        lab_id: labs[index % Math.max(labs.length, 1)]?.id ?? "",
        status: "online",
      })),
    };
  }
  throw new Error(`Unknown table '${table}'.`);
}
