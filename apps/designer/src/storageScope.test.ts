import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  currentInstanceId,
  inLabGroup,
  labIdFromSite,
  moduleInstance,
  moduleStorageKey,
  readJson,
  recordsInLabGroup,
  withLabGroup,
  writeJson,
} from "./storageScope";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

describe("module storage instances", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "localStorage", { value: memoryStore(), configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: memoryStore(), configurable: true });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("keys each module separately for the same account environment", () => {
    sessionStorage.setItem(
      "carescope.lims.session",
      JSON.stringify({
        username: "admin",
        clientName: "Apex Diagnostics",
        labName: "North Lab",
        labId: "lab-north",
        envLabel: "Production",
        connectionSpeed: "1 Gbps",
        databaseName: "cs_apex_diagnostics_prod",
        errorLog: "",
        lastBackup: "",
      }),
    );

    expect(currentInstanceId()).toBe("cs_apex_diagnostics_prod");
    expect(moduleStorageKey("lab_operations", "samples")).toBe(
      "carescope.lab_operations.v1:cs_apex_diagnostics_prod:samples",
    );
    expect(moduleStorageKey("quality_compliance", "system")).toBe(
      "carescope.quality_compliance.v1:cs_apex_diagnostics_prod:system",
    );
    expect(moduleStorageKey("lab_operations", "samples")).not.toBe(moduleStorageKey("billing_revenue", "samples"));
    expect(moduleInstance("quality_compliance")).toEqual({
      moduleId: "quality_compliance",
      accountId: "Apex Diagnostics",
      instanceId: "cs_apex_diagnostics_prod",
      labId: "lab-north",
      labName: "North Lab",
    });
  });

  it("keeps lab groups queryable inside one module instance", () => {
    expect(labIdFromSite("North Lab")).toBe("lab-north");
    expect(labIdFromSite("East Lab")).toBe("lab-east");
    const rows = [
      { id: "a", labId: "lab-north" },
      { id: "b", labId: "lab-east" },
      { id: "c", labId: "lab-north" },
    ];
    expect(recordsInLabGroup(rows, "lab-east").map((row) => row.id)).toEqual(["b"]);
    expect(inLabGroup(rows[0], "lab-north")).toBe(true);
    expect(recordsInLabGroup(rows).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mix two environment instances of the same module", () => {
    writeJson(moduleStorageKey("lab_operations", "samples", "cs_apex_diagnostics_dev1"), [{ id: "dev" }]);
    writeJson(moduleStorageKey("lab_operations", "samples", "cs_apex_diagnostics_prod"), [{ id: "prod" }]);
    expect(readJson<{ id: string }[]>(moduleStorageKey("lab_operations", "samples", "cs_apex_diagnostics_dev1"))).toEqual([
      { id: "dev" },
    ]);
    expect(readJson<{ id: string }[]>(moduleStorageKey("lab_operations", "samples", "cs_apex_diagnostics_prod"))).toEqual([
      { id: "prod" },
    ]);
  });

  it("stamps instance and lab group on new records", () => {
    const stamped = withLabGroup({ accessionId: "SCP-1" }, "lab-east", "cs_apex_diagnostics_qa");
    expect(stamped).toEqual({
      accessionId: "SCP-1",
      instanceId: "cs_apex_diagnostics_qa",
      labId: "lab-east",
    });
  });
});
