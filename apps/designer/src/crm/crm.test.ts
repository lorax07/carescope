import { describe, expect, it } from "vitest";
import { CRM_ACCOUNTS } from "../crmAccounts";
import { seedCycle } from "../revenueCycle";
import { contactTypeFor } from "./contacts";
import { derivedHealth, signalsFor } from "./health";
import { pageRows, snapshot } from "./store";

describe("Sequence Client CRM", () => {
  it("does not duplicate Sequence Client accounts", () => {
    const state = snapshot(seedCycle(), []);
    expect(state.accounts).toBe(CRM_ACCOUNTS);
    expect(state.cards).toHaveLength(CRM_ACCOUNTS.length);
  });

  it("keeps client status, health, task status, issue status, and opportunity stage separate", () => {
    const helix = CRM_ACCOUNTS.find((account) => account.id === "acc-helix");
    if (!helix) throw new Error("helix");
    const cycle = seedCycle();
    const state = snapshot(cycle, []);
    const card = state.cards.find((item) => item.account.id === "acc-helix");
    const issue = state.overlay.issues.find((item) => item.id === "ISS-1001");
    const task = state.overlay.tasks.find((item) => item.id === "TSK-1");
    const opportunity = state.opportunities.find((item) => item.id === "OPP-198");
    expect(helix.status).toBe("Active");
    expect(card?.health).toBe("At risk");
    expect(issue?.status).toBe("open");
    expect(task?.status).toBe("open");
    expect(opportunity?.stage).toBe("Discovery");
  });

  it("explains why a client is at risk instead of inventing a score", () => {
    const helix = CRM_ACCOUNTS.find((account) => account.id === "acc-helix");
    const northwind = CRM_ACCOUNTS.find((account) => account.id === "acc-northwind");
    if (!helix || !northwind) throw new Error("accounts");
    const cycle = seedCycle();
    const state = snapshot(cycle, []);
    const helixSignals = signalsFor(helix, cycle.charges, [], state.overlay.issues, state.overlay.tasks);
    expect(helixSignals.some((item) => item.code === "DENIAL")).toBe(true);
    expect(helixSignals.every((item) => item.why && item.action)).toBe(true);
    const hold = signalsFor(northwind, cycle.charges, [], state.overlay.issues, state.overlay.tasks);
    expect(derivedHealth(northwind, hold)).toBe("Critical");
    expect(hold.some((item) => item.code === "HOLD")).toBe(true);
  });

  it("reuses existing contact rows and maps laboratory roles", () => {
    expect(contactTypeFor("Accounts payable")).toBe("billing");
    expect(contactTypeFor("Lab director")).toBe("lab_manager");
    expect(contactTypeFor("Quality lead")).toBe("clinical");
    const state = snapshot(seedCycle(), []);
    expect(state.contacts.some((item) => item.email === "m.brooks@helix.example" && item.primary)).toBe(true);
  });

  it("scopes overlay records to the tenant", () => {
    const state = snapshot(seedCycle(), []);
    expect(state.overlay.tenantId).toBe(state.tenantId);
    expect(state.overlay.tasks.every((item) => item.tenantId === state.tenantId)).toBe(true);
    expect(state.overlay.issues.every((item) => item.tenantId === state.tenantId)).toBe(true);
  });

  it("pages client lists instead of sending the whole portfolio to the table", () => {
    const paged = pageRows(Array.from({ length: 60 }, (_, index) => index), 2, 25);
    expect(paged.rows).toHaveLength(25);
    expect(paged.pages).toBe(3);
  });
});
