import { describe, expect, it } from "vitest";
import { previewAccountCsv, previewContactCsv } from "./crmImport";

describe("CRM import", () => {
  it("maps an account spreadsheet and skips incomplete rows", () => {
    const rows = previewAccountCsv("Account name,Primary contact,Role,Sector\nNorthline,A. Shah,Lab director,Pharma\n,Missing contact,,\n");
    expect(rows[0]).toMatchObject({ name: "Northline", contact: "A. Shah", role: "Lab director", industry: "Pharma", ready: true });
    expect(rows[1]?.ready).toBe(false);
  });

  it("matches a contact to an existing account", () => {
    const rows = previewContactCsv("Name,Role,Email,Phone,Account\nJ. Kim,Billing,j.kim@lab.example,503-555-0101,Vertex Materials\n", [
      { id: "acc-vertex", name: "Vertex Materials" },
    ]);
    expect(rows[0]).toMatchObject({ accountId: "acc-vertex", ready: true });
  });
});
