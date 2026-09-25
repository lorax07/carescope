export type SampleStatus = "received" | "testing" | "review" | "approval" | "released" | "hold";

export type SampleRecord = {
  /** Account-scoped sequence. Staff do not see this on the sample list. */
  sampleId: number;
  accountId: string;
  accountName: string;
  accessionId: string;
  orderId: string;
  received: string;
  client: string;
  matrix: string;
  tests: string;
  status: SampleStatus;
  priority: "STAT" | "Rush" | "Routine";
  custody: string;
  site: string;
};

const ACCOUNT = {
  id: "client-apex",
  name: "Apex Diagnostics",
};

/**
 * Logged samples for one account. Sample ID is assigned by log order across
 * every lab on the account, so East Lab and North Lab share one sequence.
 */
const LOGGED: Omit<SampleRecord, "sampleId">[] = [
  {
    ...ACCOUNT_FIELDS("SCP-20458", "ORD-44071"),
    received: "2026-07-24 09:44",
    client: "Vertex Materials",
    matrix: "Polymer",
    tests: "Identity FTIR",
    status: "hold",
    priority: "Rush",
    custody: "Deviation DEV-118",
    site: "East Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20460", "ORD-44041"),
    received: "2026-07-24 11:02",
    client: "Aether Pharma",
    matrix: "Stability pull",
    tests: "Assay, Appearance",
    status: "released",
    priority: "Routine",
    custody: "Archive",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20471", "ORD-44055"),
    received: "2026-07-24 15:10",
    client: "Cascade Nutraceuticals",
    matrix: "Powder",
    tests: "Heavy Metals ICP-MS",
    status: "testing",
    priority: "Routine",
    custody: "Metals lab",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20479", "ORD-44064"),
    received: "2026-07-24 16:55",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Dissolution",
    status: "approval",
    priority: "Routine",
    custody: "QA hold",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20485", "ORD-44088"),
    received: "2026-07-25 07:18",
    client: "Helix Biologics",
    matrix: "Drug substance",
    tests: "Potency ELISA",
    status: "received",
    priority: "Rush",
    custody: "Intake rack A",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20488", "ORD-44096"),
    received: "2026-07-25 07:40",
    client: "Northwind Foods",
    matrix: "Raw material",
    tests: "Microbial Limits",
    status: "review",
    priority: "Routine",
    custody: "Micro suite",
    site: "North Lab",
  },
  {
    ...ACCOUNT_FIELDS("SCP-20491", "ORD-44102"),
    received: "2026-07-25 08:12",
    client: "Aether Pharma",
    matrix: "Finished product",
    tests: "HPLC Assay, Impurities",
    status: "testing",
    priority: "STAT",
    custody: "Bench 3 · QR verified",
    site: "North Lab",
  },
];

function ACCOUNT_FIELDS(accessionId: string, orderId: string) {
  return {
    accountId: ACCOUNT.id,
    accountName: ACCOUNT.name,
    accessionId,
    orderId,
  };
}

export function withAccountSampleIds(rows: Omit<SampleRecord, "sampleId">[]): SampleRecord[] {
  const counters = new Map<string, number>();
  return [...rows]
    .sort((a, b) => a.received.localeCompare(b.received) || a.accessionId.localeCompare(b.accessionId))
    .map((row) => {
      const next = (counters.get(row.accountId) ?? 0) + 1;
      counters.set(row.accountId, next);
      return { ...row, sampleId: next };
    });
}

export const SAMPLES: SampleRecord[] = withAccountSampleIds(LOGGED);

export function findSample(accessionId: string): SampleRecord | undefined {
  return SAMPLES.find((sample) => sample.accessionId === accessionId);
}

export const STATUS_LABEL: Record<SampleStatus, string> = {
  received: "Received",
  testing: "In testing",
  review: "Peer review",
  approval: "QA approval",
  released: "Released",
  hold: "On hold",
};
