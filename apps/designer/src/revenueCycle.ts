import { useEffect, useState } from "react";
import { accountById, accountByName, CRM_ACCOUNTS, type CrmAccount } from "./crmAccounts";
import { findSample, useSamples, type SampleRecord } from "./samples";

export type BillRoute = "837P" | "Invoice" | "Statement";

export type ChargeStatus = "held" | "ready" | "submitted" | "partial" | "paid" | "denied" | "rebilled" | "written_off";

export type WorkStage = "awaiting" | "capture" | "edits" | "ready" | "submitted" | "denials" | "closed";

export type FeeLine = {
  test: string;
  cpt: string;
  description: string;
  listCents: number;
};

export type ContractLine = {
  accountId: string;
  test: string;
  cents: number;
  agreement: string;
};

export type LedgerEvent = {
  at: string;
  text: string;
};

export type Charge = {
  id: string;
  accessionId: string;
  orderId: string;
  accountId: string;
  accountName: string;
  test: string;
  cpt: string;
  cptDescription: string;
  icd10: string;
  listCents: number;
  amountCents: number;
  paidCents: number;
  writeOffCents: number;
  route: BillRoute;
  payerName: string;
  payerId: string;
  plan: string;
  documentId: string;
  replacesId: string;
  status: ChargeStatus;
  holdReason: string;
  denialCode: string;
  denialReason: string;
  agreement: string;
  submittedAt: string;
  labOverride: string;
  accountOverride: string;
  manualHold: string;
  events: LedgerEvent[];
};

export type Cycle = {
  version: 1;
  fees: FeeLine[];
  contracts: ContractLine[];
  charges: Charge[];
  nextCharge: number;
  nextClaim: number;
  nextInvoice: number;
  nextStatement: number;
};

export type Quote = {
  test: string;
  cpt: string;
  description: string;
  listCents: number;
  amountCents: number;
  agreement: string;
};

export const ICD10 = [
  { code: "Z01.89", description: "Encounter for other specified special examination" },
  { code: "R79.89", description: "Other specified abnormal findings of blood chemistry" },
  { code: "Z13.89", description: "Encounter for screening for other disorder" },
  { code: "Z02.89", description: "Encounter for other administrative examinations" },
] as const;

export const CARC = [
  { code: "CO-16", reason: "Claim lacks information" },
  { code: "CO-18", reason: "Exact duplicate claim" },
  { code: "CO-45", reason: "Charge exceeds fee schedule" },
  { code: "CO-50", reason: "Not medically necessary" },
  { code: "PR-1", reason: "Deductible amount" },
] as const;

export const PAYER_DIRECTORY = [
  { name: "Aetna Commercial", payerId: "60054", plan: "PPO" },
  { name: "UnitedHealthcare", payerId: "87726", plan: "Choice Plus" },
  { name: "Patient", payerId: "SELF", plan: "Self-pay" },
] as const;

export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  held: "Held",
  ready: "Ready",
  submitted: "Submitted",
  partial: "Partial",
  paid: "Paid",
  denied: "Denied",
  rebilled: "Rebilled",
  written_off: "Written off",
};

const FEES: FeeLine[] = [
  { test: "Identity FTIR", cpt: "82542", description: "Column chromatography, qualitative or quantitative", listCents: 18600 },
  { test: "HPLC Assay", cpt: "80150", description: "Drug assay, quantitative", listCents: 24000 },
  { test: "Assay", cpt: "80150", description: "Drug assay, quantitative", listCents: 24000 },
  { test: "Impurities", cpt: "80299", description: "Quantitation of drug, not otherwise specified", listCents: 22000 },
  { test: "Dissolution", cpt: "80299", description: "Quantitation of drug, not otherwise specified", listCents: 26000 },
  { test: "Uniformity", cpt: "80375", description: "Drug or substance, definitive, not otherwise specified", listCents: 31000 },
  { test: "Heavy Metals ICP-MS", cpt: "82175", description: "Arsenic", listCents: 42000 },
  { test: "Potency ELISA", cpt: "83520", description: "Immunoassay, quantitative", listCents: 39000 },
  { test: "Salmonella", cpt: "87045", description: "Culture, bacterial, stool", listCents: 17500 },
  { test: "Microbial Limits", cpt: "87070", description: "Culture, bacterial, other", listCents: 16500 },
];

const CONTRACTS: ContractLine[] = [
  { accountId: "acc-vertex", test: "Identity FTIR", cents: 16000, agreement: "VM-12" },
  { accountId: "acc-aether", test: "HPLC Assay", cents: 19800, agreement: "AP-4" },
  { accountId: "acc-aether", test: "Assay", cents: 19800, agreement: "AP-4" },
  { accountId: "acc-summit", test: "Uniformity", cents: 27500, agreement: "SG-9" },
  { accountId: "acc-summit", test: "Dissolution", cents: 24000, agreement: "SG-9" },
  { accountId: "acc-northwind", test: "Salmonella", cents: 15000, agreement: "NW-2" },
  { accountId: "acc-northwind", test: "Microbial Limits", cents: 14000, agreement: "NW-2" },
];

const STORAGE_KEY = "carescope.revenue.cycle.v1";

export function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function balance(charge: Charge): number {
  return Math.max(0, charge.amountCents - charge.paidCents - charge.writeOffCents);
}

export function splitTests(tests: string): string[] {
  return tests.split(",").map((test) => test.trim()).filter(Boolean);
}

export function labReady(sample: SampleRecord): boolean {
  if (sample.condition === "cancelled" || sample.condition === "rejected") return false;
  return sample.status === "review" || sample.status === "released" || sample.condition === "on_hold";
}

export function routeLabel(route: BillRoute): string {
  if (route === "837P") return "Insurance claim";
  if (route === "Invoice") return "Client invoice";
  return "Self-pay statement";
}

export function billingRoute(account: CrmAccount): { route: BillRoute; payerName: string; payerId: string; plan: string } {
  if (account.billTo === "Insurance") {
    const payer = PAYER_DIRECTORY.find((item) => item.name === account.payer);
    return { route: "837P", payerName: account.payer, payerId: payer?.payerId ?? "", plan: payer?.plan ?? "" };
  }
  if (account.billTo === "Self-pay") {
    return { route: "Statement", payerName: "Patient", payerId: "SELF", plan: "Self-pay" };
  }
  return {
    route: "Invoice",
    payerName: account.payer,
    payerId: "CLIENT",
    plan: account.agreements[0]?.term ?? "Net 30",
  };
}

export function quote(cycle: Cycle, accountId: string, test: string): Quote | null {
  const fee = cycle.fees.find((item) => item.test === test);
  if (!fee) return null;
  const contract = cycle.contracts.find((item) => item.accountId === accountId && item.test === test);
  return {
    test,
    cpt: fee.cpt,
    description: fee.description,
    listCents: fee.listCents,
    amountCents: contract?.cents ?? fee.listCents,
    agreement: contract?.agreement ?? "List",
  };
}

export function editsFor(charge: Charge, account: CrmAccount | undefined, sample: SampleRecord | undefined): string[] {
  const reasons: string[] = [];
  if (charge.manualHold) reasons.push(charge.manualHold);
  if ((charge.route === "837P" || charge.route === "Statement") && !charge.icd10) reasons.push("ICD-10 required before billing");
  if (!charge.cpt) reasons.push("CPT/HCPCS is missing for this test");
  if (account?.status === "On hold" && !charge.accountOverride) reasons.push("Account is on hold");
  if (sample?.condition === "on_hold" && !charge.labOverride) reasons.push(`Laboratory hold: ${sample.custody}`);
  return reasons;
}

export function stageFor(charge: Charge): WorkStage {
  if (charge.status === "held") return "edits";
  if (charge.status === "ready") return "ready";
  if (charge.status === "submitted" || charge.status === "partial") return "submitted";
  if (charge.status === "denied") return "denials";
  return "closed";
}

export function ageDays(submittedAt: string, today = new Date()): number {
  if (!submittedAt) return 0;
  const [year, month, day] = submittedAt.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return 0;
  const then = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now - then) / 86400000);
}

export function aging(charges: Charge[], today = new Date()) {
  const buckets = { current: 0, d31: 0, d61: 0, d90: 0 };
  for (const charge of charges) {
    if (charge.status !== "submitted" && charge.status !== "partial" && charge.status !== "denied") continue;
    const days = ageDays(charge.submittedAt, today);
    const due = balance(charge);
    if (days <= 30) buckets.current += due;
    else if (days <= 60) buckets.d31 += due;
    else if (days <= 90) buckets.d61 += due;
    else buckets.d90 += due;
  }
  return buckets;
}

export function ledgerSnapshot(charges: Charge[]) {
  const active = charges.filter((charge) => charge.status !== "rebilled");
  const due = (statuses: ChargeStatus[]) =>
    active.filter((charge) => statuses.includes(charge.status)).reduce((sum, charge) => sum + balance(charge), 0);
  return {
    unbilled: due(["held", "ready"]),
    ar: due(["submitted", "partial", "denied"]),
    collected: charges.reduce((sum, charge) => sum + charge.paidCents, 0),
    openDenials: active.filter((charge) => charge.status === "denied").length,
  };
}

export type AccountRollup = {
  accountId: string;
  gross: number;
  allowance: number;
  net: number;
  collected: number;
  writeOff: number;
  unbilled: number;
  ar: number;
};

export function rollup(charges: Charge[]): AccountRollup[] {
  return CRM_ACCOUNTS.map((account) => {
    const rows = charges.filter((charge) => charge.accountId === account.id);
    const active = rows.filter((charge) => charge.status !== "rebilled");
    const gross = active.reduce((sum, charge) => sum + charge.listCents, 0);
    const net = active.reduce((sum, charge) => sum + charge.amountCents, 0);
    const due = (statuses: ChargeStatus[]) =>
      active.filter((charge) => statuses.includes(charge.status)).reduce((sum, charge) => sum + balance(charge), 0);
    return {
      accountId: account.id,
      gross,
      allowance: gross - net,
      net,
      collected: rows.reduce((sum, charge) => sum + charge.paidCents, 0),
      writeOff: active.reduce((sum, charge) => sum + charge.writeOffCents, 0),
      unbilled: due(["held", "ready"]),
      ar: due(["submitted", "partial", "denied"]),
    };
  });
}

export function accountRevenueLabel(charges: Charge[], accountId: string): string {
  const rows = charges.filter((charge) => charge.accountId === accountId && charge.status !== "rebilled");
  const open = rows.filter((charge) => ["held", "ready", "submitted", "partial", "denied"].includes(charge.status));
  const openBalance = open.reduce((sum, charge) => sum + balance(charge), 0);
  const paid = charges.filter((charge) => charge.accountId === accountId).reduce((sum, charge) => sum + charge.paidCents, 0);
  if (openBalance > 0 && open.every((charge) => charge.status === "denied")) return `${money(openBalance)} denied`;
  if (openBalance > 0 && open.every((charge) => charge.status === "held")) return `${money(openBalance)} held`;
  if (openBalance > 0) return `${money(openBalance)} open`;
  if (paid > 0) return `${money(paid)} paid`;
  return "$0.00";
}

function stamp(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function blankCharge(values: Omit<Charge, "paidCents" | "writeOffCents" | "documentId" | "replacesId" | "holdReason" | "denialCode" | "denialReason" | "submittedAt" | "labOverride" | "accountOverride" | "manualHold" | "events"> & Partial<Charge>): Charge {
  return {
    paidCents: 0,
    writeOffCents: 0,
    documentId: "",
    replacesId: "",
    holdReason: "",
    denialCode: "",
    denialReason: "",
    submittedAt: "",
    labOverride: "",
    accountOverride: "",
    manualHold: "",
    events: [],
    ...values,
  };
}

function seededCharge(values: Omit<Charge, "labOverride" | "accountOverride" | "manualHold"> & Partial<Pick<Charge, "labOverride" | "accountOverride" | "manualHold">>): Charge {
  return { labOverride: "", accountOverride: "", manualHold: "", ...values };
}

export function seedCycle(): Cycle {
  return {
    version: 1,
    fees: FEES.map((fee) => ({ ...fee })),
    contracts: CONTRACTS.map((contract) => ({ ...contract })),
    nextCharge: 1005,
    nextClaim: 88421,
    nextInvoice: 4421,
    nextStatement: 221,
    charges: [
      seededCharge({
        id: "CHG-1001",
        accessionId: "SCP-20458",
        orderId: "ORD-44071",
        accountId: "acc-vertex",
        accountName: "Vertex Materials",
        test: "Identity FTIR",
        cpt: "82542",
        cptDescription: "Column chromatography, qualitative or quantitative",
        icd10: "",
        listCents: 18600,
        amountCents: 16000,
        paidCents: 0,
        writeOffCents: 0,
        route: "Invoice",
        payerName: "Vertex AP",
        payerId: "CLIENT",
        plan: "Net 30",
        documentId: "",
        replacesId: "",
        status: "held",
        holdReason: "Laboratory hold: Deviation DEV-118",
        denialCode: "",
        denialReason: "",
        agreement: "VM-12",
        submittedAt: "",
        events: [
          { at: "2026-07-25 09:20", text: "Charge captured from SCP-20458" },
          { at: "2026-07-25 09:20", text: "Edit failed: Laboratory hold: Deviation DEV-118" },
        ],
      }),
      seededCharge({
        id: "CHG-1002",
        accessionId: "SCP-20460",
        orderId: "ORD-44041",
        accountId: "acc-aether",
        accountName: "Aether Pharma",
        test: "Assay",
        cpt: "80150",
        cptDescription: "Drug assay, quantitative",
        icd10: "R79.89",
        listCents: 24000,
        amountCents: 19800,
        paidCents: 19800,
        writeOffCents: 0,
        route: "837P",
        payerName: "Aetna Commercial",
        payerId: "60054",
        plan: "PPO",
        documentId: "CLM-88302",
        replacesId: "",
        status: "paid",
        holdReason: "",
        denialCode: "",
        denialReason: "",
        agreement: "AP-4",
        submittedAt: "2026-07-24 11:40",
        events: [
          { at: "2026-07-24 11:20", text: "Charge captured from SCP-20460" },
          { at: "2026-07-24 11:22", text: "ICD-10 R79.89 assigned" },
          { at: "2026-07-24 11:40", text: "Insurance claim CLM-88302 submitted" },
          { at: "2026-07-26 09:12", text: "Payment posted $198.00" },
        ],
      }),
      seededCharge({
        id: "CHG-1003",
        accessionId: "SCP-20485",
        orderId: "ORD-44088",
        accountId: "acc-helix",
        accountName: "Helix Biologics",
        test: "Potency ELISA",
        cpt: "83520",
        cptDescription: "Immunoassay, quantitative",
        icd10: "",
        listCents: 39000,
        amountCents: 39000,
        paidCents: 0,
        writeOffCents: 0,
        route: "Statement",
        payerName: "Patient",
        payerId: "SELF",
        plan: "Self-pay",
        documentId: "ST-220",
        replacesId: "",
        status: "denied",
        holdReason: "",
        denialCode: "CO-16",
        denialReason: "Claim lacks information",
        agreement: "List",
        submittedAt: "2026-07-21 14:00",
        events: [
          { at: "2026-07-21 13:40", text: "Charge captured from SCP-20485" },
          { at: "2026-07-21 14:00", text: "Self-pay statement ST-220 submitted" },
          { at: "2026-07-21 14:45", text: "Denied CO-16 Claim lacks information" },
        ],
      }),
      seededCharge({
        id: "CHG-1004",
        accessionId: "SCP-20390",
        orderId: "ORD-43902",
        accountId: "acc-cascade",
        accountName: "Cascade Nutraceuticals",
        test: "Heavy Metals ICP-MS",
        cpt: "82175",
        cptDescription: "Arsenic",
        icd10: "",
        listCents: 42000,
        amountCents: 42000,
        paidCents: 42000,
        writeOffCents: 0,
        route: "Invoice",
        payerName: "Cascade AP",
        payerId: "CLIENT",
        plan: "Net 30",
        documentId: "INV-4420",
        replacesId: "",
        status: "paid",
        holdReason: "",
        denialCode: "",
        denialReason: "",
        agreement: "List",
        submittedAt: "2026-07-18 10:00",
        events: [
          { at: "2026-07-18 10:00", text: "Client invoice INV-4420 submitted" },
          { at: "2026-07-22 09:30", text: "Payment posted $420.00" },
        ],
      }),
    ],
  };
}

function restatus(charge: Charge, sample?: SampleRecord) {
  if (charge.status !== "held" && charge.status !== "ready") return;
  const reason = editsFor(charge, accountById(charge.accountId), sample).join(" · ");
  const next: ChargeStatus = reason ? "held" : "ready";
  if (charge.status === next && charge.holdReason === reason) return;
  charge.status = next;
  charge.holdReason = reason;
  charge.events.push({ at: stamp(), text: next === "held" ? `Edit failed: ${reason}` : "Edits cleared" });
}

function nextDocument(cycle: Cycle, route: BillRoute): string {
  if (route === "837P") {
    const id = `CLM-${cycle.nextClaim}`;
    cycle.nextClaim += 1;
    return id;
  }
  if (route === "Invoice") {
    const id = `INV-${cycle.nextInvoice}`;
    cycle.nextInvoice += 1;
    return id;
  }
  const id = `ST-${cycle.nextStatement}`;
  cycle.nextStatement += 1;
  return id;
}

function reprice(cycle: Cycle, test: string) {
  for (const charge of cycle.charges) {
    if (charge.test !== test) continue;
    if (charge.status !== "held" && charge.status !== "ready") continue;
    const priced = quote(cycle, charge.accountId, test);
    if (!priced) continue;
    const amountChanged = charge.amountCents !== priced.amountCents;
    const listChanged = charge.listCents !== priced.listCents;
    if (!amountChanged && !listChanged && charge.agreement === priced.agreement && charge.cpt === priced.cpt) continue;
    charge.listCents = priced.listCents;
    charge.amountCents = priced.amountCents;
    charge.agreement = priced.agreement;
    charge.cpt = priced.cpt;
    charge.cptDescription = priced.description;
    charge.events.push({
      at: stamp(),
      text: amountChanged ? `Charge amount updated to ${money(priced.amountCents)}` : `List price updated to ${money(priced.listCents)}`,
    });
  }
}

export function applyCapture(cycle: Cycle, sample: SampleRecord, account: CrmAccount): { ids: string[]; skipped: string[] } {
  const ids: string[] = [];
  const skipped: string[] = [];
  if (!labReady(sample)) return { ids, skipped };
  const route = billingRoute(account);
  for (const test of splitTests(sample.tests)) {
    const taken = cycle.charges.some((charge) => charge.accessionId === sample.accessionId && charge.test === test && charge.status !== "rebilled");
    if (taken) continue;
    const priced = quote(cycle, account.id, test);
    if (!priced) {
      skipped.push(test);
      continue;
    }
    const charge = blankCharge({
      id: `CHG-${cycle.nextCharge}`,
      accessionId: sample.accessionId,
      orderId: sample.orderId,
      accountId: account.id,
      accountName: account.name,
      test,
      cpt: priced.cpt,
      cptDescription: priced.description,
      icd10: "",
      listCents: priced.listCents,
      amountCents: priced.amountCents,
      route: route.route,
      payerName: route.payerName,
      payerId: route.payerId,
      plan: route.plan,
      status: "ready",
      agreement: priced.agreement,
    });
    cycle.nextCharge += 1;
    charge.events.push({ at: stamp(), text: `Charge captured from ${sample.accessionId}` });
    cycle.charges.push(charge);
    restatus(charge, sample);
    ids.push(charge.id);
  }
  return { ids, skipped };
}

export function applyDiagnosis(cycle: Cycle, chargeId: string, icd10: string, sample?: SampleRecord) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge) return;
  if (charge.status !== "held" && charge.status !== "ready" && charge.status !== "denied") return;
  if (charge.icd10 === icd10) return;
  charge.icd10 = icd10;
  const known = ICD10.find((item) => item.code === icd10);
  charge.events.push({
    at: stamp(),
    text: known ? `ICD-10 ${known.code} assigned` : icd10 ? `ICD-10 ${icd10} assigned` : "ICD-10 cleared",
  });
  if (charge.status === "held" || charge.status === "ready") restatus(charge, sample);
}

export function applyLabOverride(cycle: Cycle, chargeId: string, sample?: SampleRecord) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || charge.labOverride || (charge.status !== "held" && charge.status !== "ready")) return;
  charge.labOverride = "Billed while the laboratory hold is open";
  charge.events.push({ at: stamp(), text: charge.labOverride });
  restatus(charge, sample);
}

export function applyAccountOverride(cycle: Cycle, chargeId: string, sample?: SampleRecord) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || charge.accountOverride || (charge.status !== "held" && charge.status !== "ready")) return;
  charge.accountOverride = "Billing supervisor override";
  charge.events.push({ at: stamp(), text: charge.accountOverride });
  restatus(charge, sample);
}

export function applyManualHold(cycle: Cycle, chargeId: string, reason: string, sample?: SampleRecord) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  const text = reason.trim();
  if (!charge || !text || (charge.status !== "held" && charge.status !== "ready")) return;
  charge.manualHold = text;
  charge.events.push({ at: stamp(), text: `Manual hold: ${text}` });
  restatus(charge, sample);
}

export function applyReleaseHold(cycle: Cycle, chargeId: string, sample?: SampleRecord) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || !charge.manualHold) return;
  charge.manualHold = "";
  charge.events.push({ at: stamp(), text: "Manual hold released" });
  restatus(charge, sample);
}

export function applySubmit(cycle: Cycle, chargeId: string): string {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || charge.status !== "ready") return "";
  charge.documentId = nextDocument(cycle, charge.route);
  charge.submittedAt = stamp();
  charge.status = "submitted";
  charge.holdReason = "";
  charge.events.push({ at: charge.submittedAt, text: `${routeLabel(charge.route)} ${charge.documentId} submitted` });
  return charge.documentId;
}

export function applyPayment(cycle: Cycle, chargeId: string, cents: number): number {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || (charge.status !== "submitted" && charge.status !== "partial")) return 0;
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  const applied = Math.min(Math.round(cents), balance(charge));
  if (applied <= 0) return 0;
  charge.paidCents += applied;
  charge.status = balance(charge) === 0 ? "paid" : "partial";
  charge.events.push({ at: stamp(), text: `Payment posted ${money(applied)}` });
  return applied;
}

export function applyDenial(cycle: Cycle, chargeId: string, code: string) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || (charge.status !== "submitted" && charge.status !== "partial")) return;
  const carc = CARC.find((item) => item.code === code) ?? CARC[0];
  charge.status = "denied";
  charge.denialCode = carc.code;
  charge.denialReason = carc.reason;
  charge.events.push({ at: stamp(), text: `Denied ${carc.code} ${carc.reason}` });
}

export function applyRebill(cycle: Cycle, chargeId: string, sample?: SampleRecord): string {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || charge.status !== "denied") return "";
  const replacement = blankCharge({
    id: `CHG-${cycle.nextCharge}`,
    accessionId: charge.accessionId,
    orderId: charge.orderId,
    accountId: charge.accountId,
    accountName: charge.accountName,
    test: charge.test,
    cpt: charge.cpt,
    cptDescription: charge.cptDescription,
    icd10: charge.icd10,
    listCents: charge.listCents,
    amountCents: charge.amountCents,
    route: charge.route,
    payerName: charge.payerName,
    payerId: charge.payerId,
    plan: charge.plan,
    status: "ready",
    agreement: charge.agreement,
    replacesId: charge.documentId,
    labOverride: charge.labOverride,
    accountOverride: charge.accountOverride,
  });
  cycle.nextCharge += 1;
  replacement.events.push({ at: stamp(), text: `Replacement for ${charge.documentId}` });
  cycle.charges.push(replacement);
  restatus(replacement, sample);
  charge.status = "rebilled";
  charge.events.push({ at: stamp(), text: `Rebilled on ${replacement.id}` });
  return replacement.id;
}

export function applyWriteOff(cycle: Cycle, chargeId: string) {
  const charge = cycle.charges.find((item) => item.id === chargeId);
  if (!charge || (charge.status !== "submitted" && charge.status !== "partial" && charge.status !== "denied")) return;
  const amount = balance(charge);
  charge.writeOffCents += amount;
  charge.status = "written_off";
  charge.events.push({ at: stamp(), text: amount > 0 ? `Wrote off ${money(amount)}` : "Wrote off the balance" });
}

export function applyListPrice(cycle: Cycle, test: string, cents: number) {
  if (!Number.isFinite(cents) || cents < 0) return;
  const fee = cycle.fees.find((item) => item.test === test);
  if (!fee || fee.listCents === Math.round(cents)) return;
  fee.listCents = Math.round(cents);
  reprice(cycle, test);
}

export function applyContractPrice(cycle: Cycle, accountId: string, test: string, cents: number) {
  if (!Number.isFinite(cents) || cents < 0) return;
  const contract = cycle.contracts.find((item) => item.accountId === accountId && item.test === test);
  if (!contract || contract.cents === Math.round(cents)) return;
  contract.cents = Math.round(cents);
  reprice(cycle, test);
}

export function syncCycle(cycle: Cycle, samples: SampleRecord[]) {
  for (const charge of cycle.charges) {
    restatus(charge, samples.find((sample) => sample.accessionId === charge.accessionId));
  }
}

function readCycle(): Cycle | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cycle;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.charges) || !Array.isArray(parsed.fees)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let cycle: Cycle = readCycle() ?? seedCycle();
const listeners = new Set<() => void>();

function commit(next: Cycle) {
  cycle = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* The ledger still updates in memory when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}

function update(mutator: (draft: Cycle) => void) {
  const draft = structuredClone(cycle);
  mutator(draft);
  if (JSON.stringify(draft) === JSON.stringify(cycle)) return;
  commit(draft);
}

export function getCycle(): Cycle {
  return cycle;
}

export function useRevenue(): Cycle {
  const samples = useSamples();
  const [state, setState] = useState(cycle);
  useEffect(() => {
    const sync = () => setState(cycle);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  useEffect(() => {
    const draft = structuredClone(cycle);
    syncCycle(draft, samples);
    if (JSON.stringify(draft) === JSON.stringify(cycle)) return;
    commit(draft);
  }, [samples]);
  return state;
}

export function captureAccession(accessionId: string): { ids: string[]; skipped: string[] } {
  const sample = findSample(accessionId);
  const account = sample ? accountByName(sample.client) : undefined;
  if (!sample || !account) return { ids: [], skipped: [] };
  const draft = structuredClone(cycle);
  const result = applyCapture(draft, sample, account);
  if (result.ids.length) commit(draft);
  return result;
}

export function setDiagnosis(chargeId: string, icd10: string) {
  update((draft) => applyDiagnosis(draft, chargeId, icd10, findSample(draft.charges.find((charge) => charge.id === chargeId)?.accessionId ?? "")));
}

export function billDespiteLabHold(chargeId: string) {
  update((draft) => applyLabOverride(draft, chargeId, findSample(draft.charges.find((charge) => charge.id === chargeId)?.accessionId ?? "")));
}

export function overrideAccountHold(chargeId: string) {
  update((draft) => applyAccountOverride(draft, chargeId, findSample(draft.charges.find((charge) => charge.id === chargeId)?.accessionId ?? "")));
}

export function placeHold(chargeId: string, reason: string) {
  update((draft) => applyManualHold(draft, chargeId, reason, findSample(draft.charges.find((charge) => charge.id === chargeId)?.accessionId ?? "")));
}

export function releaseHold(chargeId: string) {
  update((draft) => applyReleaseHold(draft, chargeId, findSample(draft.charges.find((charge) => charge.id === chargeId)?.accessionId ?? "")));
}

export function submitCharge(chargeId: string): string {
  let documentId = "";
  update((draft) => {
    documentId = applySubmit(draft, chargeId);
  });
  return documentId;
}

export function postPayment(chargeId: string, cents: number): number {
  let applied = 0;
  update((draft) => {
    applied = applyPayment(draft, chargeId, cents);
  });
  return applied;
}

export function denyCharge(chargeId: string, code: string) {
  update((draft) => applyDenial(draft, chargeId, code));
}

export function rebillCharge(chargeId: string): string {
  let id = "";
  update((draft) => {
    id = applyRebill(draft, chargeId, findSample(draft.charges.find((charge) => charge.id === chargeId)?.accessionId ?? ""));
  });
  return id;
}

export function writeOffCharge(chargeId: string) {
  update((draft) => applyWriteOff(draft, chargeId));
}

export function setListPrice(test: string, cents: number) {
  update((draft) => applyListPrice(draft, test, cents));
}

export function setContractPrice(accountId: string, test: string, cents: number) {
  update((draft) => applyContractPrice(draft, accountId, test, cents));
}
