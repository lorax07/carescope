import type {
  Client,
  ClientDossier,
  InstallationNode,
  Lab,
  QueryResult,
} from "./api";

export type LabModuleId =
  | "sample_lifecycle"
  | "instrument_integration"
  | "results_entry"
  | "coa_generation"
  | "quality_events"
  | "capa"
  | "inventory"
  | "billing"
  | "customer_portal"
  | "workflow_automation"
  | "document_control"
  | "electronic_signatures";

export type LabModuleDef = {
  id: LabModuleId;
  label: string;
};

export const LAB_MODULE_CATALOG: LabModuleDef[] = [
  { id: "sample_lifecycle", label: "Sample Lifecycle" },
  { id: "instrument_integration", label: "Instrument Integration" },
  { id: "results_entry", label: "Results Entry" },
  { id: "coa_generation", label: "CoA Generation" },
  { id: "quality_events", label: "Quality Events" },
  { id: "capa", label: "CAPA" },
  { id: "inventory", label: "Inventory" },
  { id: "billing", label: "Billing" },
  { id: "customer_portal", label: "Customer Portal" },
  { id: "workflow_automation", label: "Workflow Automation" },
  { id: "document_control", label: "Document Control" },
  { id: "electronic_signatures", label: "E-Signatures" },
];

export const DEFAULT_LAB_MODULES: LabModuleId[] = ["sample_lifecycle"];

export function moduleLabel(id: string): string {
  return LAB_MODULE_CATALOG.find((item) => item.id === id)?.label ?? id;
}

export function buildDossier(client: Client, labs: Lab[]): ClientDossier {
  const architecture: InstallationNode[] = [
    { id: "hq", label: `${client.name} HQ`, kind: "hq", x: 220, y: 36, connectsTo: ["net"] },
    {
      id: "net",
      label: "Site network",
      kind: "network",
      x: 220,
      y: 118,
      connectsTo: labs.map((lab) => lab.id),
    },
    ...labs.flatMap((lab, index) => {
      const x = 70 + index * 180;
      return [
        {
          id: lab.id,
          label: lab.name,
          kind: "lab" as const,
          x,
          y: 210,
          connectsTo: [`${lab.id}-inst`],
        },
        {
          id: `${lab.id}-inst`,
          label: `${lab.siteCode} instruments`,
          kind: "instrument" as const,
          x,
          y: 300,
          connectsTo: [],
        },
      ];
    }),
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
    support: [
      {
        id: `${client.id}-sup-1`,
        title: "STAT queue notification delay",
        labId: labs[0]?.id ?? null,
        labName: labs[0]?.name ?? null,
        staff: "A. Ruiz",
        openedAt: "2026-08-12T14:20:00.000Z",
        status: "resolved",
        summary: "Webhook retry window increased for STAT accession events.",
      },
      {
        id: `${client.id}-sup-2`,
        title: "Instrument driver update",
        labId: labs[1]?.id ?? labs[0]?.id ?? null,
        labName: labs[1]?.name ?? labs[0]?.name ?? null,
        staff: "S. Patel",
        openedAt: "2026-08-28T09:05:00.000Z",
        status: "open",
        summary: "HPLC driver staged; waiting on change-control window.",
      },
      {
        id: `${client.id}-sup-3`,
        title: "SSO group mapping",
        labId: null,
        labName: null,
        staff: "L. Okonkwo",
        openedAt: "2026-07-03T16:40:00.000Z",
        status: "resolved",
        summary: "Mapped QA reviewers to the client IdP quality group.",
      },
      {
        id: `${client.id}-sup-4`,
        title: "CoA template tweak",
        labId: labs[0]?.id ?? null,
        labName: labs[0]?.name ?? null,
        staff: "M. Chen",
        openedAt: "2026-09-01T11:15:00.000Z",
        status: "open",
        summary: "Client requested additional lot lineage on released CoAs.",
      },
    ],
  };
}

export function runInfraQuery(sql: string, labs: Lab[], dossier: ClientDossier): QueryResult {
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
    const preview = Math.min(12, count);
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
