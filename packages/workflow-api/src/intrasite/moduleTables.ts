import type { ClientDossier, Lab, QueryResult } from "./types.js";

type LabModuleId =
  | "lab_operations"
  | "instrument_integration"
  | "connectivity"
  | "quality_compliance"
  | "billing_revenue"
  | "insights";

export type InfraTable = { name: string; rows: number };

export const MODULE_TABLE_CATALOG: Array<{
  moduleId: LabModuleId | null;
  name: string;
  aliases?: string[];
}> = [
  { moduleId: null, name: "labs" },
  { moduleId: null, name: "contacts" },
  { moduleId: "lab_operations", name: "lab_operations.samples", aliases: ["samples"] },
  { moduleId: "lab_operations", name: "lab_operations.workflow_stages" },
  { moduleId: "instrument_integration", name: "instrument_integration.instruments", aliases: ["instruments"] },
  { moduleId: "quality_compliance", name: "quality_compliance.deviations" },
  { moduleId: "quality_compliance", name: "quality_compliance.capas" },
  { moduleId: "quality_compliance", name: "quality_compliance.changes" },
  { moduleId: "quality_compliance", name: "quality_compliance.documents" },
  { moduleId: "billing_revenue", name: "billing_revenue.charges" },
  { moduleId: "billing_revenue", name: "billing_revenue.claims" },
  { moduleId: "connectivity", name: "connectivity.accounts" },
  { moduleId: "connectivity", name: "connectivity.contacts" },
  { moduleId: "insights", name: "insights.metrics" },
];

export function moduleInstanceTables(labs: Lab[]): InfraTable[] {
  const labCount = Math.max(labs.length, 1);
  return [
    { name: "labs", rows: labs.length },
    { name: "contacts", rows: 4 },
    { name: "lab_operations.samples", rows: 128 + labs.length * 40 },
    { name: "lab_operations.workflow_stages", rows: labs.length * 6 },
    { name: "instrument_integration.instruments", rows: labs.length * 4 },
    { name: "quality_compliance.deviations", rows: 8 * labCount },
    { name: "quality_compliance.capas", rows: 4 * labCount },
    { name: "quality_compliance.changes", rows: 3 * labCount },
    { name: "quality_compliance.documents", rows: 12 },
    { name: "billing_revenue.charges", rows: 24 * labCount },
    { name: "billing_revenue.claims", rows: 16 * labCount },
    { name: "connectivity.accounts", rows: 8 },
    { name: "connectivity.contacts", rows: 16 },
    { name: "insights.metrics", rows: 6 },
  ];
}

export function instanceIdFor(dossier: ClientDossier, environmentId?: string): string {
  const env = dossier.infrastructure.environments.find((item) => item.id === environmentId);
  if (env?.databaseName) return env.databaseName;
  return environmentId ? `${dossier.infrastructure.databaseName}_${environmentId}` : dossier.infrastructure.databaseName;
}

function canonicalTable(name: string): string {
  const lower = name.toLowerCase();
  const match = MODULE_TABLE_CATALOG.find((item) => item.name === lower || item.aliases?.includes(lower));
  return match?.name ?? lower;
}

function labIdAt(labs: Lab[], index: number): string {
  return labs[index % Math.max(labs.length, 1)]?.id ?? "";
}

function previewRows(count: number, environmentScale: number, cap = 12): number {
  return Math.min(cap, Math.max(3, Math.round(count * environmentScale)));
}

export function moduleInstanceList(labs: Lab[], dossier: ClientDossier, environmentId?: string): QueryResult {
  const instanceId = instanceIdFor(dossier, environmentId);
  const groups = labs.map((lab) => lab.id).join(", ");
  const modules: LabModuleId[] = [
    "lab_operations",
    "instrument_integration",
    "connectivity",
    "quality_compliance",
    "billing_revenue",
    "insights",
  ];
  return {
    columns: ["module_id", "instance_id", "lab_groups"],
    rows: modules.map((moduleId) => ({
      module_id: moduleId,
      instance_id: instanceId,
      lab_groups: groups,
    })),
  };
}

export function selectModuleTable(
  tableName: string,
  labs: Lab[],
  dossier: ClientDossier,
  environmentId: string | undefined,
  environmentScale: number,
  labIdFilter?: string,
): QueryResult {
  const table = canonicalTable(tableName);
  const instanceId = instanceIdFor(dossier, environmentId);
  const filter = (labId: string) => !labIdFilter || labId === labIdFilter;

  if (table === "labs") {
    const rows = labs
      .filter((lab) => filter(lab.id))
      .map((lab) => ({
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        site_code: lab.siteCode,
        status: lab.status,
        modules: lab.modules.join(", "),
        instance_id: instanceId,
      }));
    return { columns: ["id", "name", "slug", "site_code", "status", "modules", "instance_id"], rows };
  }

  if (table === "contacts") {
    return {
      columns: ["id", "name", "role", "email", "phone", "instance_id"],
      rows: dossier.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        instance_id: instanceId,
      })),
    };
  }

  const rowCount = (name: string, fallback: number) =>
    dossier.infrastructure.tables.find((item) => item.name === name)?.rows ?? fallback;

  if (table === "lab_operations.samples") {
    const preview = previewRows(rowCount(table, 8), environmentScale);
    const rows = Array.from({ length: preview }, (_, index) => {
      const lab_id = labIdAt(labs, index);
      return {
        id: `smp-${index + 1}`,
        accession: `A-${1000 + index}`,
        lab_id,
        instance_id: instanceId,
        status: index % 3 === 0 ? "released" : "in_process",
      };
    }).filter((row) => filter(row.lab_id));
    return { columns: ["id", "accession", "lab_id", "instance_id", "status"], rows };
  }

  if (table === "lab_operations.workflow_stages") {
    const stages = ["received", "accessioning", "processing", "testing", "review", "released"];
    const rows = labs.flatMap((lab) =>
      stages.map((stage, index) => ({
        id: `${lab.id}-${stage}`,
        lab_id: lab.id,
        instance_id: instanceId,
        stage,
        sort: index,
      })),
    ).filter((row) => filter(row.lab_id));
    return { columns: ["id", "lab_id", "instance_id", "stage", "sort"], rows };
  }

  if (table === "instrument_integration.instruments") {
    const preview = Math.min(12, rowCount(table, 4));
    const rows = Array.from({ length: preview }, (_, index) => {
      const lab_id = labIdAt(labs, index);
      return {
        id: `ins-${index + 1}`,
        name: `Analyzer ${index + 1}`,
        lab_id,
        instance_id: instanceId,
        status: "online",
      };
    }).filter((row) => filter(row.lab_id));
    return { columns: ["id", "name", "lab_id", "instance_id", "status"], rows };
  }

  if (table === "quality_compliance.deviations") {
    const rows = labs.flatMap((lab, labIndex) =>
      ["DEV-118", "NCR-042"].map((code, index) => ({
        id: `${code}-${lab.siteCode}`,
        lab_id: lab.id,
        instance_id: instanceId,
        status: labIndex + index === 0 ? "disposition" : "closed",
      })),
    ).filter((row) => filter(row.lab_id));
    return { columns: ["id", "lab_id", "instance_id", "status"], rows };
  }

  if (table === "quality_compliance.capas") {
    const rows = labs.map((lab) => ({
      id: `CAPA-${lab.siteCode}`,
      lab_id: lab.id,
      instance_id: instanceId,
      status: "implementation",
    })).filter((row) => filter(row.lab_id));
    return { columns: ["id", "lab_id", "instance_id", "status"], rows };
  }

  if (table === "quality_compliance.changes") {
    const rows = labs.map((lab) => ({
      id: `CC-${lab.siteCode}`,
      lab_id: lab.id,
      instance_id: instanceId,
      status: "approved",
    })).filter((row) => filter(row.lab_id));
    return { columns: ["id", "lab_id", "instance_id", "status"], rows };
  }

  if (table === "quality_compliance.documents") {
    return {
      columns: ["id", "lab_id", "instance_id", "status"],
      rows: [
        { id: "SOP-QA-004:2", lab_id: "", instance_id: instanceId, status: "effective" },
        { id: "SOP-HPLC-12:3", lab_id: labIdAt(labs, 0), instance_id: instanceId, status: "effective" },
      ].filter((row) => !labIdFilter || row.lab_id === labIdFilter || row.lab_id === ""),
    };
  }

  if (table === "billing_revenue.charges" || table === "billing_revenue.claims") {
    const kind = table.endsWith("claims") ? "CLM" : "CHG";
    const preview = previewRows(rowCount(table, 8), environmentScale);
    const rows = Array.from({ length: preview }, (_, index) => {
      const lab_id = labIdAt(labs, index);
      return {
        id: `${kind}-${1000 + index}`,
        lab_id,
        instance_id: instanceId,
        status: index % 4 === 0 ? "denied" : "open",
      };
    }).filter((row) => filter(row.lab_id));
    return { columns: ["id", "lab_id", "instance_id", "status"], rows };
  }

  if (table === "connectivity.accounts") {
    return {
      columns: ["id", "lab_id", "instance_id", "name"],
      rows: [
        { id: "acc-helix", lab_id: labIdAt(labs, 0), instance_id: instanceId, name: "Helix Biologics" },
        { id: "acc-aether", lab_id: labIdAt(labs, 1), instance_id: instanceId, name: "Aether Pharma" },
      ].filter((row) => filter(row.lab_id)),
    };
  }

  if (table === "connectivity.contacts") {
    const rows = labs.flatMap((lab) => [
      {
        id: `${lab.id}-mgr`,
        lab_id: lab.id,
        instance_id: instanceId,
        name: "Lab manager",
      },
    ]).filter((row) => filter(row.lab_id));
    return { columns: ["id", "lab_id", "instance_id", "name"], rows };
  }

  if (table === "insights.metrics") {
    return {
      columns: ["id", "lab_id", "instance_id", "value"],
      rows: labs.map((lab) => ({
        id: `tat-${lab.id}`,
        lab_id: lab.id,
        instance_id: instanceId,
        value: "1.4 d",
      })).filter((row) => filter(row.lab_id)),
    };
  }

  throw new Error(`Unknown table '${tableName}'.`);
}

export const INFRA_QUERY_HELP =
  "This IDE accepts SHOW TABLES, SHOW INSTANCES, or SELECT * FROM a module table, optionally WHERE lab_id = 'lab-id'.";
