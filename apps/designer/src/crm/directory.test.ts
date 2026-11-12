import { describe, expect, it } from "vitest";
import { contactsOnAccount, directoryContacts } from "./directory";
import { CRM_TABLES } from "./schema";
import type { CrmOverlay } from "./types";

describe("CRM account contacts", () => {
  it("keeps a contact on more than one account", () => {
    const overlay = {
      contacts: [{ id: "con-shared", name: "A. Patel", role: "Buyer", email: "a@example.com", phone: "555" }],
      accountContactLinks: [
        { accountId: "acc-helix", contactId: "con-shared" },
        { accountId: "acc-vertex", contactId: "con-shared" },
      ],
    } as CrmOverlay;
    const shared = directoryContacts(overlay).find((contact) => contact.id === "con-shared");
    expect(shared?.accountIds).toEqual(["acc-helix", "acc-vertex"]);
    expect(contactsOnAccount("acc-vertex", overlay).some((contact) => contact.id === "con-shared")).toBe(true);
    expect(CRM_TABLES).toContain("crm_account_contacts");
  });
});
