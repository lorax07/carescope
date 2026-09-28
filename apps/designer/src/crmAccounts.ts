export type AccountStatus = "Active" | "On hold";
export type AccountHealth = "Healthy" | "Watch" | "At risk";

export type AccountContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type AccountActivity = {
  when: string;
  kind: string;
  summary: string;
};

export type AccountAgreement = {
  id: string;
  name: string;
  term: string;
  status: string;
};

export type AccountOpportunity = {
  id: string;
  accountId: string;
  name: string;
  stage: string;
  amount: string;
  close: string;
};

export type CrmAccount = {
  id: string;
  number: string;
  name: string;
  relationship: string;
  industry: string;
  owner: string;
  contact: string;
  status: AccountStatus;
  health: AccountHealth;
  revenue: string;
  billTo: string;
  payer: string;
  pricing: string;
  contacts: AccountContact[];
  activities: AccountActivity[];
  agreements: AccountAgreement[];
  opportunities: AccountOpportunity[];
};

/** One account list for Sequence Client, Sequence Revenue, and the rest of the app. */
export const CRM_ACCOUNTS: CrmAccount[] = [
  {
    id: "acc-vertex",
    number: "ACC-1042",
    name: "Vertex Materials",
    relationship: "Client",
    industry: "Advanced materials",
    owner: "A. Ruiz",
    contact: "R. Okonkwo",
    status: "Active",
    health: "Healthy",
    revenue: "$160 open",
    billTo: "Client",
    payer: "Vertex AP",
    pricing: "VM-12",
    contacts: [
      { name: "R. Okonkwo", role: "Lab director", email: "r.okonkwo@vertex.example", phone: "312-555-0142" },
      { name: "S. Patel", role: "Accounts payable", email: "ap@vertex.example", phone: "312-555-0188" },
    ],
    activities: [
      { when: "2026-07-25 09:10", kind: "Lab", summary: "Identity FTIR logged as SCP-20458" },
      { when: "2026-07-24 16:40", kind: "Billing", summary: "Invoice INV-4418 opened for $160" },
    ],
    agreements: [{ id: "VM-12", name: "Materials testing", term: "Net 30", status: "Active" }],
    opportunities: [
      { id: "OPP-220", accountId: "acc-vertex", name: "Add thermal analysis panel", stage: "Proposal", amount: "$48,000", close: "2026-09-15" },
    ],
  },
  {
    id: "acc-aether",
    number: "ACC-1048",
    name: "Aether Pharma",
    relationship: "Client",
    industry: "Pharmaceutical",
    owner: "M. Chen",
    contact: "L. Shah",
    status: "Active",
    health: "Healthy",
    revenue: "$198 paid",
    billTo: "Insurance",
    payer: "Aetna Commercial",
    pricing: "AP-4",
    contacts: [
      { name: "L. Shah", role: "Quality lead", email: "l.shah@aether.example", phone: "617-555-0114" },
      { name: "N. Brooks", role: "Payer contracting", email: "payers@aether.example", phone: "617-555-0190" },
    ],
    activities: [
      { when: "2026-07-25 08:20", kind: "Lab", summary: "STAT HPLC Assay in testing on SCP-20491" },
      { when: "2026-07-23 11:05", kind: "Billing", summary: "Claim CLM-88302 paid in full" },
    ],
    agreements: [{ id: "AP-4", name: "Stability and release testing", term: "Annual", status: "Active" }],
    opportunities: [
      { id: "OPP-214", accountId: "acc-aether", name: "Impurity method transfer", stage: "Negotiation", amount: "$120,000", close: "2026-08-30" },
    ],
  },
  {
    id: "acc-cascade",
    number: "ACC-1055",
    name: "Cascade Nutraceuticals",
    relationship: "Client",
    industry: "Nutrition",
    owner: "S. Patel",
    contact: "D. Nguyen",
    status: "Active",
    health: "Healthy",
    revenue: "$420 paid",
    billTo: "Client",
    payer: "Cascade AP",
    pricing: "List",
    contacts: [{ name: "D. Nguyen", role: "Regulatory", email: "d.nguyen@cascade.example", phone: "503-555-0166" }],
    activities: [
      { when: "2026-07-24 15:12", kind: "Lab", summary: "Heavy Metals ICP-MS received as SCP-20471" },
      { when: "2026-07-22 09:30", kind: "Billing", summary: "Invoice INV-4420 paid" },
    ],
    agreements: [{ id: "CN-1", name: "Metals panel", term: "Net 30", status: "Active" }],
    opportunities: [
      { id: "OPP-208", accountId: "acc-cascade", name: "Microbial limits add-on", stage: "Qualified", amount: "$36,000", close: "2026-10-01" },
    ],
  },
  {
    id: "acc-summit",
    number: "ACC-1061",
    name: "Summit Generics",
    relationship: "Client",
    industry: "Generic pharmaceuticals",
    owner: "L. Okonkwo",
    contact: "P. Alvarez",
    status: "Active",
    health: "Watch",
    revenue: "$275 pending",
    billTo: "Insurance",
    payer: "UnitedHealthcare",
    pricing: "SG-9",
    contacts: [
      { name: "P. Alvarez", role: "CMC lead", email: "p.alvarez@summit.example", phone: "919-555-0133" },
      { name: "J. Ortiz", role: "Billing contact", email: "billing@summit.example", phone: "919-555-0171" },
    ],
    activities: [
      { when: "2026-07-25 09:05", kind: "Lab", summary: "Uniformity in review on SCP-20496" },
      { when: "2026-07-25 10:15", kind: "Billing", summary: "Claim held until an ICD-10 code is added" },
    ],
    agreements: [{ id: "SG-9", name: "Solid dose release", term: "Annual", status: "Active" }],
    opportunities: [
      { id: "OPP-231", accountId: "acc-summit", name: "Dissolution method expansion", stage: "Proposal", amount: "$64,000", close: "2026-09-01" },
    ],
  },
  {
    id: "acc-helix",
    number: "ACC-1070",
    name: "Helix Biologics",
    relationship: "Client",
    industry: "Biologics",
    owner: "M. Chen",
    contact: "M. Brooks",
    status: "Active",
    health: "At risk",
    revenue: "$390 denied",
    billTo: "Self-pay",
    payer: "Patient",
    pricing: "List",
    contacts: [{ name: "M. Brooks", role: "Program lead", email: "m.brooks@helix.example", phone: "858-555-0120" }],
    activities: [
      { when: "2026-07-25 07:18", kind: "Lab", summary: "Potency ELISA received as SCP-20485" },
      { when: "2026-07-21 14:45", kind: "Billing", summary: "Claim CLM-88110 denied CO-16" },
    ],
    agreements: [{ id: "HX-3", name: "Potency testing", term: "Self-pay", status: "Renewal due" }],
    opportunities: [
      { id: "OPP-198", accountId: "acc-helix", name: "Move potency to a payer contract", stage: "Discovery", amount: "$80,000", close: "2026-11-15" },
    ],
  },
  {
    id: "acc-northwind",
    number: "ACC-1077",
    name: "Northwind Foods",
    relationship: "Client",
    industry: "Food",
    owner: "Jordan Ellis",
    contact: "C. Ibarra",
    status: "On hold",
    health: "At risk",
    revenue: "$150 held",
    billTo: "Client",
    payer: "Northwind AP",
    pricing: "NW-2",
    contacts: [{ name: "C. Ibarra", role: "QA manager", email: "c.ibarra@northwind.example", phone: "206-555-0194" }],
    activities: [
      { when: "2026-07-25 08:40", kind: "Lab", summary: "Salmonella in review on SCP-20494" },
      { when: "2026-07-20 13:00", kind: "Account", summary: "Billing hold placed until the agreement is renewed" },
    ],
    agreements: [{ id: "NW-2", name: "Pathogen surveillance", term: "Net 30", status: "On hold" }],
    opportunities: [
      { id: "OPP-188", accountId: "acc-northwind", name: "Renew pathogen surveillance", stage: "Negotiation", amount: "$52,000", close: "2026-08-12" },
    ],
  },
];

export function accountById(id: string): CrmAccount | undefined {
  return CRM_ACCOUNTS.find((account) => account.id === id);
}

export function accountByName(name: string): CrmAccount | undefined {
  return CRM_ACCOUNTS.find((account) => account.name === name);
}

export function accountOpportunities(): AccountOpportunity[] {
  return CRM_ACCOUNTS.flatMap((account) => account.opportunities);
}
