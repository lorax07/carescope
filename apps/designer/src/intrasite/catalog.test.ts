import { describe, expect, it } from "vitest";
import { buildDossier, runInfraQuery } from "./catalog";
import type { Client, Lab } from "./api";

const client: Client = {
  id: "client-apex",
  name: "Apex Diagnostics",
  slug: "apex-diagnostics",
  status: "active",
  databaseName: "cs_apex_diagnostics",
  isolation: "dedicated_database",
  labCount: 2,
  internalResources: [],
  businessContacts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const labs: Lab[] = [
  {
    id: "lab-north",
    clientId: client.id,
    name: "North Lab",
    slug: "north-lab",
    siteCode: "NTH",
    status: "active",
    modules: ["lab_operations", "quality_compliance"],
    administrator: "",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "lab-east",
    clientId: client.id,
    name: "East Lab",
    slug: "east-lab",
    siteCode: "EST",
    status: "active",
    modules: ["lab_operations"],
    administrator: "",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("intranet module storage instances", () => {
  const dossier = buildDossier(client, labs);

  it("lists a distinct table namespace for each module in the account environment", () => {
    const names = dossier.infrastructure.tables.map((table) => table.name);
    expect(names).toContain("lab_operations.samples");
    expect(names).toContain("instrument_integration.instruments");
    expect(names).toContain("quality_compliance.deviations");
    expect(names).toContain("billing_revenue.claims");
    expect(names).toContain("connectivity.accounts");
    expect(names).toContain("insights.metrics");
    const shown = runInfraQuery("SHOW TABLES", labs, dossier, "prod");
    expect(shown.rows.some((row) => row.table_name === "lab_operations.samples")).toBe(true);
  });

  it("shows one instance per module for the selected environment with lab groups", () => {
    const result = runInfraQuery("SHOW INSTANCES", labs, dossier, "prod");
    expect(result.rows).toHaveLength(6);
    expect(result.rows.every((row) => row.instance_id === "cs_apex_diagnostics_prod")).toBe(true);
    expect(result.rows[0]?.lab_groups).toBe("lab-north, lab-east");
    const qa = runInfraQuery("SHOW INSTANCES", labs, dossier, "qa");
    expect(qa.rows[0]?.instance_id).toBe("cs_apex_diagnostics_qa");
  });

  it("filters module rows by lab group", () => {
    const all = runInfraQuery("SELECT * FROM lab_operations.samples", labs, dossier, "prod");
    const north = runInfraQuery("SELECT * FROM lab_operations.samples WHERE lab_id = 'lab-north'", labs, dossier, "prod");
    expect(all.rows.length).toBeGreaterThan(north.rows.length);
    expect(north.rows.every((row) => row.lab_id === "lab-north")).toBe(true);
    expect(north.rows.every((row) => row.instance_id === "cs_apex_diagnostics_prod")).toBe(true);
  });
});
