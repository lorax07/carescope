import type { CommunicationKind, CrmCommunication } from "../../crm";

export type InboxDirection = "in" | "out";

export type InboxLine = {
  id: string;
  contactId: string;
  at: string;
  direction: InboxDirection;
  kind: CommunicationKind;
  body: string;
};

export type InboxContact = {
  id: string;
  accountId: string;
  name: string;
  accountName: string;
  role: string;
};

export type InboxAccount = {
  id: string;
  industry: string;
  agreements: { name: string }[];
  activities: { when: string; summary: string }[];
};

export type InboxThread = {
  contactId: string;
  accountId: string;
  name: string;
  accountName: string;
  role: string;
  industry: string;
  messages: InboxLine[];
};

/** Conversations already on the laboratory accounts. Logged messages merge in by id. */
export const INBOX_LINES: InboxLine[] = [
  {
    id: "INBOX-helix-1",
    contactId: "acc-helix:m.brooks@helix.example",
    at: "2026-07-21 14:52",
    direction: "in",
    kind: "email",
    body: "The potency claim ST-220 came back denied. Can you tell me what information the payer still needs?",
  },
  {
    id: "COM-1",
    contactId: "acc-helix:m.brooks@helix.example",
    at: "2026-07-22 09:40",
    direction: "out",
    kind: "call",
    body: "Left a voicemail asking for a diagnosis and whether Helix will move potency onto a payer contract.",
  },
  {
    id: "INBOX-helix-2",
    contactId: "acc-helix:m.brooks@helix.example",
    at: "2026-07-25 15:10",
    direction: "in",
    kind: "email",
    body: "We can send the diagnosis today. Before we go further, can you outline the work process and the pricing to move potency off self-pay?",
  },
  {
    id: "INBOX-north-1",
    contactId: "acc-northwind:c.ibarra@northwind.example",
    at: "2026-07-20 13:15",
    direction: "out",
    kind: "note",
    body: "Billing is on hold until the pathogen surveillance agreement is renewed.",
  },
  {
    id: "INBOX-north-2",
    contactId: "acc-northwind:c.ibarra@northwind.example",
    at: "2026-07-24 11:05",
    direction: "in",
    kind: "email",
    body: "QA will not release new pathogen work until NW-2 is active. What do you need from us to sign?",
  },
  {
    id: "INBOX-aether-1",
    contactId: "acc-aether:l.shah@aether.example",
    at: "2026-07-23 16:02",
    direction: "in",
    kind: "email",
    body: "The impurity method transfer is ready for a second review. Can we walk through the timeline?",
  },
  {
    id: "INBOX-aether-2",
    contactId: "acc-aether:l.shah@aether.example",
    at: "2026-07-23 16:48",
    direction: "out",
    kind: "email",
    body: "Yes. I will bring the stability agreement and the open proposal.",
  },
  {
    id: "INBOX-summit-1",
    contactId: "acc-summit:p.alvarez@summit.example",
    at: "2026-07-25 10:22",
    direction: "in",
    kind: "email",
    body: "Uniformity is in review, and the claim is held for an ICD-10 code. Can billing send that today?",
  },
  {
    id: "INBOX-vertex-1",
    contactId: "acc-vertex:r.okonkwo@vertex.example",
    at: "2026-07-24 09:12",
    direction: "in",
    kind: "email",
    body: "Identity FTIR on SCP-20458 looks good. Are you available to scope the thermal analysis panel?",
  },
  {
    id: "INBOX-vertex-2",
    contactId: "acc-vertex:r.okonkwo@vertex.example",
    at: "2026-07-24 09:36",
    direction: "out",
    kind: "email",
    body: "Yes. I can send the proposal amount and the September close date.",
  },
  {
    id: "INBOX-cascade-1",
    contactId: "acc-cascade:d.nguyen@cascade.example",
    at: "2026-07-22 09:48",
    direction: "in",
    kind: "email",
    body: "Invoice INV-4420 is paid. The microbial limits add-on is the item I still want to clarify.",
  },
  {
    id: "INBOX-ortiz-1",
    contactId: "acc-summit:billing@summit.example",
    at: "2026-07-21 08:16",
    direction: "in",
    kind: "email",
    body: "Please walk me through the held uniformity charge. We can add the diagnosis once I see the claim.",
  },
  {
    id: "INBOX-payer-1",
    contactId: "acc-aether:payers@aether.example",
    at: "2026-07-19 14:02",
    direction: "in",
    kind: "meeting",
    body: "Payer contracting can review a draft exhibit for the impurity method if you send the current panel list.",
  },
  {
    id: "INBOX-patel-1",
    contactId: "acc-vertex:ap@vertex.example",
    at: "2026-07-18 11:04",
    direction: "out",
    kind: "email",
    body: "Invoice INV-4418 is open for $160 under the materials testing agreement.",
  },
];

export function inboxMessages(logged: CrmCommunication[]): InboxLine[] {
  const known = new Set(INBOX_LINES.map((line) => line.id));
  const extra = logged
    .filter((row) => !known.has(row.id))
    .map((row) => ({
      id: row.id,
      contactId: row.contactId,
      at: row.at,
      direction: "out" as const,
      kind: row.kind,
      body: row.body || row.subject,
    }));
  return [...INBOX_LINES, ...extra].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

export function buildInboxThreads(contacts: InboxContact[], accounts: InboxAccount[], logged: CrmCommunication[]): InboxThread[] {
  const messages = inboxMessages(logged);
  const grouped = new Map<string, InboxLine[]>();
  for (const message of messages) {
    const list = grouped.get(message.contactId) ?? [];
    list.push(message);
    grouped.set(message.contactId, list);
  }
  const people = new Map(contacts.map((contact) => [contact.id, contact]));
  const books = new Map(accounts.map((account) => [account.id, account]));
  return [...grouped.entries()]
    .map(([contactId, lines]) => {
      const person = people.get(contactId);
      const accountId = person?.accountId || contactId.split(":")[0] || "";
      const account = books.get(accountId);
      return {
        contactId,
        accountId,
        name: person?.name || contactId.split(":")[1]?.split("@")[0] || "Contact",
        accountName: person?.accountName || accountId,
        role: person?.role || "Contact",
        industry: account?.industry || "Laboratory",
        messages: lines,
      };
    })
    .sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? ""));
}

export function threadMatches(thread: InboxThread, query: string, platform: "all" | CommunicationKind): boolean {
  if (platform !== "all" && !thread.messages.some((message) => message.kind === platform)) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${thread.name} ${thread.accountName} ${thread.role} ${thread.messages.map((message) => message.body).join(" ")}`.toLowerCase();
  return hay.includes(needle);
}

export function unreadCount(thread: InboxThread): number {
  let count = 0;
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    if (thread.messages[index]?.direction === "out") break;
    count += 1;
  }
  return count;
}

export function parseStamp(at: string): Date {
  const [date, time] = at.split(" ");
  const [year, month, day] = (date ?? "").split("-").map(Number);
  const [hour, minute] = (time ?? "00:00").split(":").map(Number);
  if (!year || !month || !day) return new Date(0);
  return new Date(year, month - 1, day, hour || 0, minute || 0);
}

export function messageStamp(at: string): string {
  return parseStamp(at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeAge(at: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - parseStamp(at).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.max(1, Math.round(hours / 24));
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function smartReply(text: string): string {
  const value = text.toLowerCase();
  if (value.includes("denial") || value.includes("diagnosis") || value.includes("self-pay") || value.includes("pricing")) {
    return "I can send the diagnosis and a short outline of the work and pricing to move potency off self-pay.";
  }
  if (value.includes("agreement") || value.includes("sign") || value.includes("nw-2")) {
    return "I will send the renewal packet for the surveillance agreement so QA can release the next pathogen work.";
  }
  if (value.includes("icd") || value.includes("diagnosis") || value.includes("uniformity")) {
    return "I will ask billing to add the ICD-10 code on the uniformity charge today.";
  }
  if (value.includes("method") || value.includes("timeline") || value.includes("panel")) {
    return "I am available to walk through the timeline and send the current panel list.";
  }
  if (value.includes("invoice") || value.includes("paid")) {
    return "Thanks for confirming the invoice. I will follow up on the open add-on next.";
  }
  return "Thanks for the note. I will check the account and send the next step.";
}

export function formalTone(draft: string): string {
  const trimmed = draft.trim();
  if (!trimmed) return "Please let me know the next step on this account.";
  const expanded = trimmed
    .replace(/\bcan't\b/gi, "cannot")
    .replace(/\bwon't\b/gi, "will not")
    .replace(/\bI'm\b/g, "I am")
    .replace(/\bI'll\b/g, "I will")
    .replace(/\bdon't\b/gi, "do not");
  const sentence = /[.!?]$/.test(expanded) ? expanded : `${expanded}.`;
  return /^please\b/i.test(sentence) ? sentence : `Please note: ${sentence}`;
}

export function summarizeThread(bodies: string[]): string {
  const bits = bodies
    .map((body) => body.split(/(?<=[.!?])\s/)[0]?.trim() ?? "")
    .filter(Boolean);
  if (!bits.length) return "No messages in this conversation yet.";
  return bits.slice(-3).join(" ");
}

export function followUpDraft(taskTitles: string[]): string {
  const title = taskTitles.find(Boolean);
  if (!title) return "I will send a follow-up once the next account task is assigned.";
  return `Following up on ${title}. I can take that next step this week.`;
}

export function attachmentNote(names: string[]): string {
  if (!names.length) return "No agreement is on file to attach.";
  return `Suggested attachment: ${names.join(", ")}.`;
}

export function statusDraft(summary: string): string {
  if (!summary) return "No recent laboratory or billing activity is on this account.";
  return `Status update: ${summary}.`;
}

export function latestActivity(account: InboxAccount | undefined): string {
  const rows = [...(account?.activities ?? [])].sort((a, b) => b.when.localeCompare(a.when));
  return rows[0]?.summary ?? "";
}
