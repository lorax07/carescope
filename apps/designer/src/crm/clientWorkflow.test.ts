import { describe, expect, it } from "vitest";
import { accountSuggestions, dobError, mrnTaken, npiError, patientDuplicate, physicianByNpi, sameAccountName } from "./clientWorkflow";
import type { PatientRecord, PhysicianRecord } from "./types";

const patient = {
  id: "PAT-1",
  tenantId: "t",
  accountId: "acc-helix",
  accountName: "Helix Biologics",
  firstName: "Maya",
  lastName: "Brooks",
  dob: "1984-03-12",
  sex: "Female",
  mrn: "HB-1044",
  phone: "",
  address: "",
  createdAt: "",
} satisfies PatientRecord;

const physician = {
  id: "PHY-1",
  tenantId: "t",
  accountId: "acc-helix",
  accountName: "Helix Biologics",
  firstName: "Elena",
  lastName: "Cho",
  npi: "1245319599",
  specialty: "Oncology",
  phone: "",
  fax: "",
  email: "",
  createdAt: "",
} satisfies PhysicianRecord;

describe("client workflow rules", () => {
  it("treats an existing account name as a duplicate", () => {
    expect(sameAccountName([{ name: "Helix Biologics" }], " helix biologics ")).toBe(true);
    expect(sameAccountName([{ name: "Helix Biologics" }], "Harbor Clinical")).toBe(false);
    expect(accountSuggestions([{ name: "Helix Biologics" }, { name: "Harbor Clinical" }], "har")).toEqual([{ name: "Harbor Clinical" }]);
  });

  it("requires a 10-digit NPI and rejects a future date of birth", () => {
    expect(npiError("1245319599")).toBe("");
    expect(npiError("12345")).toMatch(/10 digits/);
    expect(dobError("2999-01-01", new Date("2026-11-08"))).toMatch(/future/);
    expect(dobError("1984-03-12", new Date("2026-11-08"))).toBe("");
  });

  it("finds a patient or physician that is already on file", () => {
    expect(patientDuplicate([patient], "acc-helix", "maya", "brooks", "1984-03-12")?.id).toBe("PAT-1");
    expect(patientDuplicate([patient], "acc-aether", "Maya", "Brooks", "1984-03-12")).toBeUndefined();
    expect(mrnTaken([patient], "acc-helix", "hb-1044")).toBe(true);
    expect(physicianByNpi([physician], "1245319599")?.lastName).toBe("Cho");
    expect(physicianByNpi([physician], "0000000000")).toBeUndefined();
  });
});
