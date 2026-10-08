import { describe, expect, it } from "vitest";
import { CRM_ACCOUNTS } from "./crmAccounts";
import { answerFromText, ASK_FOR_QUESTION, businessBrief, NO_ANSWER } from "./insightsBrief";
import { ledgerSnapshot, money, seedCycle } from "./revenueCycle";
import { withAccountSampleIds, type SampleRecord } from "./samples";

const SAMPLES = withAccountSampleIds([
  {
    accountId: "client-apex",
    accountName: "Apex Diagnostics",
    accessionId: "SCP-20458",
    orderId: "ORD-44071",
    received: "2026-07-24 09:44",
    client: "Vertex Materials",
    matrix: "Polymer",
    tests: "Identity FTIR",
    status: "processing",
    condition: "on_hold",
    priority: "Rush",
    custody: "Deviation DEV-118",
    site: "East Lab",
    batchId: null,
  },
  {
    accountId: "client-apex",
    accountName: "Apex Diagnostics",
    accessionId: "SCP-20488",
    orderId: "ORD-44096",
    received: "2026-07-25 07:40",
    client: "Northwind Foods",
    matrix: "Raw material",
    tests: "Microbial Limits",
    status: "review",
    condition: "normal",
    priority: "Routine",
    custody: "Micro suite",
    site: "North Lab",
    batchId: "B-1184",
  },
] satisfies Array<Omit<SampleRecord, "sampleId" | "labId" | "instanceId">>);

describe("business brief", () => {
  const charges = seedCycle().charges;
  const books = ledgerSnapshot(charges);
  const brief = businessBrief(SAMPLES, charges, CRM_ACCOUNTS);

  it("writes collected revenue, denials, accounts, accessions, and pipeline", () => {
    expect(brief).toContain(`Collected revenue is ${money(books.collected)}.`);
    expect(brief).toContain(`Open denials: ${books.openDenials}.`);
    expect(brief).toContain("Northwind Foods (ACC-1077) is At risk and On hold.");
    expect(brief).toContain("Accession SCP-20458 for Vertex Materials is Processing, condition On Hold");
    expect(brief).toContain("Opportunity Renew pathogen surveillance for Northwind Foods is in Negotiation for $52,000, close 2026-08-12.");
  });

  it("answers a collected question from the briefing", () => {
    const answer = answerFromText("how much collected revenue do we have", brief);
    expect(answer).toContain(`Collected revenue is ${money(books.collected)}.`);
    expect(answer).not.toContain("Northwind Foods");
  });

  it("answers from text the user provided", () => {
    const source = "The pilot plant opens in October.\n\nOpen denials: 1.";
    expect(answerFromText("when does the pilot plant open", source)).toBe("The pilot plant opens in October.");
  });

  it("returns two paragraphs when they match equally", () => {
    const source = "Northwind Foods is On hold.\n\nAccession SCP-20488 for Northwind Foods is Peer review.";
    const answer = answerFromText("Northwind Foods", source);
    expect(answer).toContain("Northwind Foods is On hold.");
    expect(answer).toContain("Accession SCP-20488 for Northwind Foods is Peer review.");
  });

  it("says when the text has no answer", () => {
    expect(answerFromText("what is the cafeteria menu", "Vertex Materials is Healthy.")).toBe(NO_ANSWER);
    expect(answerFromText("   ", "Vertex Materials is Healthy.")).toBe(ASK_FOR_QUESTION);
  });
});
