import { CRM_ACCOUNTS, type CrmAccount } from "./crmAccounts";
import { ledgerSnapshot, money, type AccountRollup, type Charge } from "./revenueCycle";
import { STATUS_LABEL, type SampleRecord, type SampleStatus } from "./samples";

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "to",
  "for",
  "in",
  "on",
  "is",
  "are",
  "what",
  "how",
  "many",
  "show",
  "me",
  "about",
  "this",
  "that",
  "with",
  "from",
  "do",
  "does",
  "we",
  "our",
]);

const STATUSES: SampleStatus[] = ["received", "testing", "review", "approval", "released", "hold"];

export const ASK_FOR_QUESTION = "Ask a question about the text provided.";
export const NO_ANSWER = "The text provided does not include an answer to that.";

export type AccountBrief = {
  account: CrmAccount;
  openLab: number;
  rollup: AccountRollup;
};

export type BusinessSnapshot = {
  accountCount: number;
  atRisk: number;
  openLab: number;
  accessionCount: number;
  collected: number;
  unbilled: number;
  ar: number;
  openDenials: number;
  statusCounts: Record<SampleStatus, number>;
  accounts: AccountBrief[];
};

function accountRollup(charges: Charge[], accountId: string): AccountRollup {
  const rows = charges.filter((charge) => charge.accountId === accountId);
  const active = rows.filter((charge) => charge.status !== "rebilled");
  const gross = active.reduce((sum, charge) => sum + charge.listCents, 0);
  const net = active.reduce((sum, charge) => sum + charge.amountCents, 0);
  const due = (statuses: Charge["status"][]) =>
    active.filter((charge) => statuses.includes(charge.status)).reduce((sum, charge) => sum + Math.max(0, charge.amountCents - charge.paidCents - charge.writeOffCents), 0);
  return {
    accountId,
    gross,
    allowance: gross - net,
    net,
    collected: rows.reduce((sum, charge) => sum + charge.paidCents, 0),
    writeOff: active.reduce((sum, charge) => sum + charge.writeOffCents, 0),
    unbilled: due(["held", "ready"]),
    ar: due(["submitted", "partial", "denied"]),
  };
}

export function businessSnapshot(
  samples: SampleRecord[],
  charges: Charge[],
  accounts: CrmAccount[] = CRM_ACCOUNTS,
): BusinessSnapshot {
  const books = ledgerSnapshot(charges);
  const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<SampleStatus, number>;
  for (const sample of samples) statusCounts[sample.status] += 1;
  return {
    accountCount: accounts.length,
    atRisk: accounts.filter((account) => account.health === "At risk").length,
    openLab: samples.filter((sample) => sample.status !== "released").length,
    accessionCount: samples.length,
    collected: books.collected,
    unbilled: books.unbilled,
    ar: books.ar,
    openDenials: books.openDenials,
    statusCounts,
    accounts: accounts.map((account) => ({
      account,
      openLab: samples.filter((sample) => sample.client === account.name && sample.status !== "released").length,
      rollup: accountRollup(charges, account.id),
    })),
  };
}

export function businessBrief(
  samples: SampleRecord[],
  charges: Charge[],
  accounts: CrmAccount[] = CRM_ACCOUNTS,
): string {
  const snapshot = businessSnapshot(samples, charges, accounts);
  const paragraphs = [
    `The laboratory serves ${snapshot.accountCount} client accounts and has ${snapshot.accessionCount} accessions in the current queue. Collected revenue is ${money(snapshot.collected)}.`,
    `Unbilled charges total ${money(snapshot.unbilled)}. Accounts receivable is ${money(snapshot.ar)}. Open denials: ${snapshot.openDenials}.`,
    ...snapshot.accounts.map(({ account, openLab, rollup }) => {
      const work = openLab === 1 ? "1 accession" : `${openLab} accessions`;
      return `${account.name} (${account.number}) is ${account.health} and ${account.status}. Owner ${account.owner}. Bills ${account.billTo} through ${account.payer}. Open laboratory work: ${work}. Net charges ${money(rollup.net)}, collected ${money(rollup.collected)}, unbilled ${money(rollup.unbilled)}, accounts receivable ${money(rollup.ar)}.`;
    }),
    `Laboratory status: ${STATUSES.map((status) => `${STATUS_LABEL[status]} ${snapshot.statusCounts[status]}`).join(", ")}.`,
    ...samples.map(
      (sample) =>
        `Accession ${sample.accessionId} for ${sample.client} is ${STATUS_LABEL[sample.status]}, priority ${sample.priority}, tests ${sample.tests}, order ${sample.orderId}.`,
    ),
    ...accounts.flatMap((account) =>
      account.opportunities.map(
        (opportunity) =>
          `Opportunity ${opportunity.name} for ${account.name} is in ${opportunity.stage} for ${opportunity.amount}, close ${opportunity.close}.`,
      ),
    ),
  ];
  return paragraphs.join("\n\n");
}

function tokenSet(text: string): Set<string> {
  const found = text.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
  return new Set(found.filter((token) => token.length > 1 && !STOP.has(token)));
}

export function answerFromText(question: string, source: string): string {
  const asked = question.trim();
  if (!asked) return ASK_FOR_QUESTION;
  const wanted = tokenSet(asked);
  if (wanted.size === 0) return NO_ANSWER;
  const paragraphs = source
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const ranked = paragraphs
    .map((paragraph, index) => {
      const tokens = tokenSet(paragraph);
      let score = 0;
      for (const token of wanted) if (tokens.has(token)) score += 1;
      return { paragraph, index, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  if (ranked.length === 0) return NO_ANSWER;
  return ranked
    .slice(0, 2)
    .map((item) => item.paragraph)
    .join("\n\n");
}
