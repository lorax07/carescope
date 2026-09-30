import type { ReactNode } from "react";

export type MarketingModule = {
  slug: string;
  title: string;
  detail: string;
  tone: string;
  icon: ReactNode;
  problemTitle: string;
  problem: string;
  solutionTitle: string;
  solution: string;
  points: string[];
  appPath: string;
};

export const MARKETING_MODULES: MarketingModule[] = [
  {
    slug: "operations",
    title: "Sequence Operations",
    detail: "The core LIMS for the laboratory queue",
    tone: "blue",
    appPath: "/app",
    problemTitle: "The queue lives in too many places",
    problem:
      "A sample’s status is a spreadsheet row, an inbox, and a conversation at the bench. STAT and routine work look alike until someone notices. Turnaround is counted after the shift, when the work has already stalled.",
    solutionTitle: "One operations queue, from receive to release",
    solution:
      "Sequence Operations is the laboratory queue. A sample is received, tested, reviewed, and released as one record. The overview shows what is open, what is on hold, and what is waiting on review, by site.",
    points: [
      "Home, Testing, Review, and Release are stages of the same accession",
      "Priority, site, and hold stay on the work",
      "The shift view shows open work and what is stuck",
    ],
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M12 5h8M13.5 5v8.2L8.2 24.2A4.2 4.2 0 0 0 12 30h8a4.2 4.2 0 0 0 3.8-5.8L18.5 13.2V5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M11 21h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: "instruments",
    title: "Sequence Instruments",
    detail: "Instrument connectivity, with status and the live sequence",
    tone: "green",
    appPath: "/app/instruments",
    problemTitle: "A new instrument waits on someone else",
    problem:
      "Connecting an instrument usually means waiting on a vendor interface and a programmer. Until that lands, status stays on the bench. Nobody can see whether a sequence is running without walking over.",
    solutionTitle: "The connection, the status, and the sequence in one list",
    solution:
      "Sequence Instruments keeps each instrument’s identity, interface, and place together. The list shows whether a sequence is running or the instrument is idle. Open the record beside the list and return to the bench when you want.",
    points: [
      "Add an instrument by name, model, interface, and place",
      "The list shows a running sequence or an idle instrument",
      "The instrument record can sit beside the list",
    ],
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <rect x="6" y="8" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 13h6M10 17h6M20 12h6M20 16h6M20 20h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: "compliance",
    title: "Sequence Compliance",
    detail: "Quality and compliance for regulated laboratories",
    tone: "blue",
    appPath: "/app/quality",
    problemTitle: "The inspection file is rebuilt at the end",
    problem:
      "Deviations, signatures, and the audit trail are assembled when an inspection is already on the calendar. CAPA, change control, and controlled documents sit in separate binders, and a signature is a scan of a page.",
    solutionTitle: "Quality work recorded as it happens",
    solution:
      "Sequence Compliance keeps deviations, CAPA, change control, controlled documents, and the audit trail in one module. A signature is bound to the section it approves, so the file is the work itself.",
    points: [
      "Deviations move through report, containment, investigation, and disposition",
      "CAPA and change control keep their stages next to the documents they affect",
      "The audit trail is the record of those actions",
    ],
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M16 5.5 7.5 9v6.2c0 5.2 3.4 8.8 8.5 10.8 5.1-2 8.5-5.6 8.5-10.8V9L16 5.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="m12.2 16.2 2.6 2.6 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    slug: "client",
    title: "Sequence Client",
    detail: "A state-of-the-art CRM, tailor-made for the healthcare industry",
    tone: "violet",
    appPath: "/app/connectivity",
    problemTitle: "The account and the lab work are different systems",
    problem:
      "The account, the agreement, and the laboratory work live apart. A client call starts with three searches, and the person on the phone cannot see the accessions already in the lab.",
    solutionTitle: "One client record for the account and the work",
    solution:
      "Sequence Client holds contacts, agreements, pipeline, and the laboratory work under that name. It is the same account table Sequence Revenue and the sample pages use.",
    points: [
      "Accounts, owners, and health sit on the client record",
      "Open opportunities stay with the account",
      "Accessions for that client come from the laboratory queue",
    ],
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="16" cy="11" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.5 23.5c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M22 8.5h5M24.5 6v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: "revenue",
    title: "Sequence Revenue",
    detail: "Laboratory RCM, from charge capture through payment",
    tone: "amber",
    appPath: "/app/billing",
    problemTitle: "Billing starts after the science is finished",
    problem:
      "Charges are late, incomplete, or held for a code the bench cannot see. A denial shows up in a system the laboratory does not open, long after the result was released.",
    solutionTitle: "Revenue follows the account and the accession",
    solution:
      "Sequence Revenue uses the same account and the work already in the laboratory. Charge capture, edits, submission, denials, and payment sit on the accession.",
    points: [
      "Work moves from the lab through charge capture, edits, and submission",
      "Denials, holds, and write-offs stay on the charge",
      "Prices and diagnosis are set on the work",
    ],
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <rect x="8" y="5.5" width="16" height="21" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 12h8M12 16h8M12 20h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: "insights",
    title: "Sequence Insights",
    detail: "Operational intelligence, answered from your own laboratory text",
    tone: "cyan",
    appPath: "/app/insights",
    problemTitle: "The number waits on the person who knows where it lives",
    problem:
      "A question about revenue, open work, or an account becomes a report request. Leaders wait on someone who knows which system holds the figure.",
    solutionTitle: "The operating picture, and a chat that stays inside it",
    solution:
      "Sequence Insights puts accounts, laboratory work, revenue, and pipeline on one page. The chat answers from that briefing. It does not invent a figure that is not in the text.",
    points: [
      "Accounts, open work, revenue, and pipeline are on one page",
      "The briefing is text the laboratory can read and replace",
      "The chat answers only from that text",
    ],
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path d="M7 24V14M13 24V8M19 24v-6M25 24V11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function moduleBySlug(slug: string | undefined): MarketingModule | undefined {
  return MARKETING_MODULES.find((item) => item.slug === slug);
}
