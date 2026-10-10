import { describe, expect, it } from "vitest";
import type { CrmCommunication } from "./crm";
import {
  attachmentNote,
  buildInboxThreads,
  followUpDraft,
  formalTone,
  inboxMessages,
  relativeAge,
  smartReply,
  summarizeThread,
  threadMatches,
  unreadCount,
} from "./pages/crm/inboxStudio";

const contacts = [
  { id: "acc-helix:m.brooks@helix.example", accountId: "acc-helix", name: "M. Brooks", accountName: "Helix Biologics", role: "Program lead" },
];
const accounts = [{ id: "acc-helix", industry: "Biologics", agreements: [{ name: "Potency testing" }], activities: [] }];

describe("client inbox", () => {
  it("merges a newly logged message into the existing thread", () => {
    const logged: CrmCommunication[] = [
      {
        id: "COM-9",
        tenantId: "lab",
        accountId: "acc-helix",
        contactId: "acc-helix:m.brooks@helix.example",
        kind: "email",
        at: "2026-07-26 08:00",
        actor: "M. Chen",
        subject: "Pricing outline",
        body: "Here is the pricing to move potency off self-pay.",
      },
    ];
    const threads = buildInboxThreads(contacts, accounts, logged);
    const helix = threads.find((thread) => thread.contactId === contacts[0]?.id);
    expect(helix?.messages.some((message) => message.id === "COM-1")).toBe(true);
    expect(helix?.messages.at(-1)?.id).toBe("COM-9");
    expect(inboxMessages(logged).filter((message) => message.id === "COM-1")).toHaveLength(1);
    expect(helix?.industry).toBe("Biologics");
  });

  it("filters by channel and search, and counts unread incoming notes", () => {
    const threads = buildInboxThreads(contacts, accounts, []);
    const helix = threads.find((thread) => thread.name === "M. Brooks");
    expect(helix).toBeTruthy();
    expect(threadMatches(helix!, "potency", "email")).toBe(true);
    expect(threadMatches(helix!, "potency", "meeting")).toBe(false);
    expect(unreadCount(helix!)).toBe(1);
    expect(summarizeThread(["First note.", "Second note."])).toBe("First note. Second note.");
  });

  it("drafts a reply from the account, not a generic vendor script", () => {
    expect(smartReply("Can you outline the pricing to move potency off self-pay?")).toMatch(/pricing/i);
    expect(formalTone("I'll send the packet")).toBe("Please note: I will send the packet.");
    expect(followUpDraft(["Call Helix about the denied potency claim"])).toMatch(/denied potency claim/);
    expect(attachmentNote(["Potency testing"])).toBe("Suggested attachment: Potency testing.");
    const now = new Date(2026, 6, 25, 18, 0);
    expect(relativeAge("2026-07-25 15:10", now)).toBe("3 hours");
    expect(relativeAge("2026-07-22 09:40", now)).toBe("3 days");
  });
});
