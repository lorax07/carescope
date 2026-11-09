import { useEffect, useMemo, useState } from "react";
import { CRM_ACCOUNTS, type CrmAccount } from "../crmAccounts";
import { readLimsSession } from "../limsSession";
import { currentInstanceId, moduleStorageKey, readJson, writeJson } from "../storageScope";
import { useQuality, type Deviation } from "../qualitySystem";
import { findSample, useSamples, type SampleRecord } from "../samples";
import { rollup, type Charge, type Cycle, useRevenue } from "../revenueCycle";
import { allContacts, contactsFor } from "./contacts";
import { derivedHealth, signalsFor } from "./health";
import {
  mrnTaken,
  npiError,
  patientDuplicate,
  personName,
  physicianByNpi,
  sameAccountName,
} from "./clientWorkflow";
import type {
  CommunicationKind,
  CrmActivity,
  CrmAudit,
  CrmCommunication,
  CrmDocument,
  CrmNote,
  CrmOverlay,
  DerivedHealth,
  HealthSignal,
  IssueStatus,
  OpportunityRecord,
  OpportunityStage,
  PatientRecord,
  PatientSex,
  PhysicianRecord,
  TaskStatus,
} from "./types";
import { PIPELINE_STAGES } from "./types";

const EVENT = "carescope-crm";

export function crmTenantId(): string {
  return currentInstanceId();
}

export function crmActor(): string {
  try {
    return readLimsSession()?.username || "M. Chen";
  } catch {
    return "M. Chen";
  }
}

export function crmCanWrite(): boolean {
  const user = crmActor();
  return user === "admin" || user === "M. Chen" || user === "AD";
}

function storageKey(tenantId: string): string {
  return moduleStorageKey("connectivity", "overlay", tenantId);
}

function stamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function seedOverlay(tenantId: string): CrmOverlay {
  return {
    version: 1,
    tenantId,
    tasks: [
      {
        id: "TSK-1",
        tenantId,
        title: "Call Helix about the denied potency claim",
        description: "ST-220 denied CO-16. Confirm a diagnosis and a payer path with M. Brooks.",
        owner: "M. Chen",
        accountId: "acc-helix",
        contactId: "acc-helix:m.brooks@helix.example",
        due: "2026-07-28",
        priority: "high",
        status: "open",
        relatedIssueId: "ISS-1001",
        relatedOpportunityId: "OPP-198",
        createdAt: "2026-07-21 15:00",
        completedAt: "",
      },
      {
        id: "TSK-2",
        tenantId,
        title: "Renew Northwind pathogen surveillance",
        description: "NW-2 is on hold. Collection work is blocked until the agreement is signed.",
        owner: "Jordan Ellis",
        accountId: "acc-northwind",
        contactId: "acc-northwind:c.ibarra@northwind.example",
        due: "2026-07-22",
        priority: "high",
        status: "in_progress",
        relatedIssueId: "ISS-1002",
        relatedOpportunityId: "OPP-188",
        createdAt: "2026-07-20 13:10",
        completedAt: "",
      },
      {
        id: "TSK-3",
        tenantId,
        title: "Confirm ICD-10 with Summit billing",
        description: "Uniformity claim is held until a diagnosis is on the charge.",
        owner: "L. Okonkwo",
        accountId: "acc-summit",
        contactId: "acc-summit:billing@summit.example",
        due: "2026-07-26",
        priority: "normal",
        status: "open",
        relatedIssueId: "",
        relatedOpportunityId: "OPP-231",
        createdAt: "2026-07-25 10:20",
        completedAt: "",
      },
    ],
    issues: [
      {
        id: "ISS-1001",
        tenantId,
        accountId: "acc-helix",
        contactId: "acc-helix:m.brooks@helix.example",
        category: "billing",
        priority: "high",
        owner: "M. Chen",
        status: "open",
        title: "Potency claim denied for missing information",
        description: "Self-pay statement ST-220 denied CO-16. The client cannot see a payer path.",
        createdAt: "2026-07-21 14:45",
        due: "2026-07-30",
        resolution: "",
        accessionId: "SCP-20485",
        claimId: "ST-220",
      },
      {
        id: "ISS-1002",
        tenantId,
        accountId: "acc-northwind",
        contactId: "acc-northwind:c.ibarra@northwind.example",
        category: "service",
        priority: "high",
        owner: "Jordan Ellis",
        status: "open",
        title: "Account hold until the surveillance agreement is renewed",
        description: "Northwind QA will not release new pathogen work until NW-2 is active.",
        createdAt: "2026-07-20 13:00",
        due: "2026-07-25",
        resolution: "",
        accessionId: "SCP-20494",
        claimId: "",
      },
    ],
    communications: [
      {
        id: "COM-1",
        tenantId,
        accountId: "acc-helix",
        contactId: "acc-helix:m.brooks@helix.example",
        kind: "call",
        at: "2026-07-22 09:40",
        actor: "M. Chen",
        subject: "Denial follow-up",
        body: "Left a voicemail asking for a diagnosis and whether Helix will move potency onto a payer contract.",
      },
    ],
    documents: [],
    activities: [],
    notes: [],
    audit: [
      {
        id: "AUD-1",
        tenantId,
        at: "2026-07-21 14:50",
        actor: "M. Chen",
        entity: "issue",
        entityId: "ISS-1001",
        action: "opened",
        before: "",
        after: "open",
      },
    ],
    opportunityNext: {
      "OPP-198": { nextAction: "Send a draft payer exhibit", probability: 40 },
      "OPP-188": { nextAction: "Return the signed renewal", probability: 70, stage: "Negotiation" },
      "OPP-231": { nextAction: "Schedule method review", probability: 55 },
    },
    nextTask: 4,
    nextIssue: 1003,
    nextComm: 2,
    nextDoc: 1,
    nextActivity: 1,
    nextNote: 1,
    nextAudit: 2,
    patients: [
      {
        id: "PAT-1001",
        tenantId,
        accountId: "acc-helix",
        accountName: "Helix Biologics",
        firstName: "Maya",
        lastName: "Brooks",
        dob: "1984-03-12",
        sex: "Female",
        mrn: "HB-1044",
        phone: "858-555-0144",
        address: "410 Torrey Pines, La Jolla",
        createdAt: "2026-07-18 09:00",
      },
      {
        id: "PAT-1002",
        tenantId,
        accountId: "acc-summit",
        accountName: "Summit Generics",
        firstName: "Owen",
        lastName: "Alvarez",
        dob: "1971-11-02",
        sex: "Male",
        mrn: "SG-2208",
        phone: "919-555-0177",
        address: "88 Capitol Blvd, Raleigh",
        createdAt: "2026-07-19 11:20",
      },
    ],
    physicians: [
      {
        id: "PHY-1001",
        tenantId,
        accountId: "acc-helix",
        accountName: "Helix Biologics",
        firstName: "Elena",
        lastName: "Cho",
        npi: "1245319599",
        specialty: "Oncology",
        phone: "858-555-0108",
        fax: "858-555-0109",
        email: "e.cho@helix.example",
        createdAt: "2026-07-18 09:05",
      },
      {
        id: "PHY-1002",
        tenantId,
        accountId: "acc-aether",
        accountName: "Aether Pharma",
        firstName: "Amir",
        lastName: "Shah",
        npi: "1093746281",
        specialty: "Clinical pharmacology",
        phone: "617-555-0160",
        fax: "",
        email: "a.shah@aether.example",
        createdAt: "2026-07-19 08:40",
      },
    ],
    nextPatient: 1003,
    nextPhysician: 1003,
  };
}

function hydrate(overlay: CrmOverlay): CrmOverlay {
  overlay.patients = overlay.patients ?? [];
  overlay.physicians = overlay.physicians ?? [];
  overlay.nextPatient = overlay.nextPatient || 1001;
  overlay.nextPhysician = overlay.nextPhysician || 1001;
  overlay.extraAccounts = overlay.extraAccounts ?? [];
  return overlay;
}

function readOverlay(tenantId: string): CrmOverlay {
  const parsed = readJson<CrmOverlay>(storageKey(tenantId), [`carescope.crm.v1:${tenantId}`]);
  if (!parsed || parsed.version !== 1 || parsed.tenantId !== tenantId) return seedOverlay(tenantId);
  return hydrate(parsed);
}

const overlays = new Map<string, CrmOverlay>();
const listeners = new Set<() => void>();

function overlayFor(tenantId: string): CrmOverlay {
  const cached = overlays.get(tenantId);
  if (cached) return cached;
  const loaded = hydrate(readOverlay(tenantId));
  overlays.set(tenantId, loaded);
  return loaded;
}

function commit(overlay: CrmOverlay) {
  overlays.set(overlay.tenantId, overlay);
  try {
    writeJson(storageKey(overlay.tenantId), overlay);
  } catch {
    /* Keep the overlay in memory if storage is full. */
  }
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function currentOverlay(): CrmOverlay {
  return overlayFor(crmTenantId());
}

function audit(overlay: CrmOverlay, entity: string, entityId: string, action: string, before: string, after: string) {
  const event: CrmAudit = {
    id: `AUD-${overlay.nextAudit}`,
    tenantId: overlay.tenantId,
    at: stamp(),
    actor: crmActor(),
    entity,
    entityId,
    action,
    before,
    after,
  };
  overlay.nextAudit += 1;
  overlay.audit = [event, ...overlay.audit].slice(0, 500);
}

export function addNote(accountId: string, text: string) {
  const body = text.trim();
  if (!body || !crmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const note: CrmNote = {
    id: `NOTE-${overlay.nextNote}`,
    tenantId: overlay.tenantId,
    accountId,
    at: stamp(),
    actor: crmActor(),
    text: body,
  };
  overlay.nextNote += 1;
  overlay.notes.unshift(note);
  overlay.activities.unshift({
    id: `ACT-${overlay.nextActivity}`,
    tenantId: overlay.tenantId,
    accountId,
    contactId: "",
    at: note.at,
    kind: "Note",
    summary: body,
    source: "crm",
  });
  overlay.nextActivity += 1;
  audit(overlay, "note", accountId, "note", "", body);
  commit(overlay);
}

export function completeTask(taskId: string) {
  if (!crmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const task = overlay.tasks.find((item) => item.id === taskId);
  if (!task || task.status === "done") return;
  const before = task.status;
  task.status = "done";
  task.completedAt = stamp();
  audit(overlay, "task", taskId, "complete", before, "done");
  commit(overlay);
}

export function setTaskStatus(taskId: string, status: TaskStatus) {
  if (!crmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const task = overlay.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const before = task.status;
  task.status = status;
  if (status === "done") task.completedAt = stamp();
  audit(overlay, "task", taskId, "status", before, status);
  commit(overlay);
}

export function resolveIssue(issueId: string, resolution: string) {
  if (!crmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const issue = overlay.issues.find((item) => item.id === issueId);
  if (!issue) return;
  const before = issue.status;
  issue.status = "resolved";
  issue.resolution = resolution.trim() || "Resolved from the issue queue.";
  audit(overlay, "issue", issueId, "resolve", before, "resolved");
  commit(overlay);
}

export function setIssueStatus(issueId: string, status: IssueStatus) {
  if (!crmCanWrite()) return;
  const overlay = structuredClone(currentOverlay());
  const issue = overlay.issues.find((item) => item.id === issueId);
  if (!issue) return;
  const before = issue.status;
  issue.status = status;
  audit(overlay, "issue", issueId, "status", before, status);
  commit(overlay);
}

export function logCommunication(input: {
  accountId: string;
  contactId: string;
  kind: CommunicationKind;
  subject: string;
  body: string;
}) {
  if (!crmCanWrite() || !input.subject.trim()) return;
  const overlay = structuredClone(currentOverlay());
  const row: CrmCommunication = {
    id: `COM-${overlay.nextComm}`,
    tenantId: overlay.tenantId,
    accountId: input.accountId,
    contactId: input.contactId,
    kind: input.kind,
    at: stamp(),
    actor: crmActor(),
    subject: input.subject.trim(),
    body: input.body.trim(),
  };
  overlay.nextComm += 1;
  overlay.communications.unshift(row);
  overlay.activities.unshift({
    id: `ACT-${overlay.nextActivity}`,
    tenantId: overlay.tenantId,
    accountId: input.accountId,
    contactId: input.contactId,
    at: row.at,
    kind: input.kind,
    summary: row.subject,
    source: "crm",
  });
  overlay.nextActivity += 1;
  audit(overlay, "communication", row.id, "log", "", row.subject);
  commit(overlay);
}

function isStage(value: string): value is OpportunityStage {
  return PIPELINE_STAGES.includes(value as OpportunityStage);
}

function listedAccounts(overlay: CrmOverlay): CrmAccount[] {
  const extras = overlay.extraAccounts ?? [];
  return extras.length ? [...CRM_ACCOUNTS, ...extras] : CRM_ACCOUNTS;
}

export type NewClientAccount = {
  name: string;
  industry: string;
  phone: string;
  contact: string;
  role: string;
  email: string;
  contactPhone: string;
  billTo: "Client" | "Insurance" | "Self-pay";
  payer: string;
};

export function addClientAccount(input: NewClientAccount): CrmAccount | null {
  if (!crmCanWrite()) return null;
  const name = input.name.trim();
  const contact = input.contact.trim();
  if (!name || !contact) return null;
  const overlay = structuredClone(currentOverlay());
  if (sameAccountName(listedAccounts(overlay), name)) return null;
  const when = stamp();
  const account: CrmAccount = {
    id: `acc-${crypto.randomUUID().slice(0, 8)}`,
    number: `ACC-${1000 + (overlay.extraAccounts?.length ?? 0) + CRM_ACCOUNTS.length}`,
    name,
    relationship: "Client",
    industry: input.industry.trim() || "Laboratory",
    owner: crmActor(),
    phone: input.phone.trim(),
    contact,
    status: "Active",
    health: "Healthy",
    revenue: "$0 open",
    billTo: input.billTo,
    payer: input.payer.trim() || (input.billTo === "Self-pay" ? "Patient" : `${name} AP`),
    pricing: "List",
    contacts: [
      {
        name: contact,
        role: input.role.trim() || "Primary contact",
        email: input.email.trim(),
        phone: input.contactPhone.trim() || input.phone.trim(),
      },
    ],
    activities: [{ when, kind: "Account", summary: "Client account opened" }],
    agreements: [],
    opportunities: [],
  };
  overlay.extraAccounts = [...(overlay.extraAccounts ?? []), account];
  audit(overlay, "account", account.id, "create", "", name);
  commit(overlay);
  return account;
}

export type NewPatient = {
  accountId: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: PatientSex;
  mrn: string;
  phone: string;
  address: string;
};

export function addPatient(input: NewPatient): PatientRecord | null {
  if (!crmCanWrite()) return null;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName || !input.dob) return null;
  const overlay = structuredClone(currentOverlay());
  const account = listedAccounts(overlay).find((item) => item.id === input.accountId);
  if (!account) return null;
  if (patientDuplicate(overlay.patients, account.id, firstName, lastName, input.dob)) return null;
  const mrn = input.mrn.trim() || `MRN-${overlay.nextPatient}`;
  if (mrnTaken(overlay.patients, account.id, mrn)) return null;
  const patient: PatientRecord = {
    id: `PAT-${overlay.nextPatient}`,
    tenantId: overlay.tenantId,
    accountId: account.id,
    accountName: account.name,
    firstName,
    lastName,
    dob: input.dob,
    sex: input.sex,
    mrn,
    phone: input.phone.trim(),
    address: input.address.trim(),
    createdAt: stamp(),
  };
  overlay.nextPatient += 1;
  overlay.patients = [patient, ...overlay.patients];
  overlay.activities.unshift({
    id: `ACT-${overlay.nextActivity}`,
    tenantId: overlay.tenantId,
    accountId: account.id,
    contactId: "",
    at: patient.createdAt,
    kind: "Patient",
    summary: `${personName(patient)} registered · ${patient.mrn}`,
    source: "crm",
  });
  overlay.nextActivity += 1;
  audit(overlay, "patient", patient.id, "create", "", personName(patient));
  commit(overlay);
  return patient;
}

export type NewPhysician = {
  accountId: string;
  firstName: string;
  lastName: string;
  npi: string;
  specialty: string;
  phone: string;
  fax: string;
  email: string;
};

export function addPhysician(input: NewPhysician): PhysicianRecord | null {
  if (!crmCanWrite()) return null;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName || npiError(input.npi) || !input.specialty.trim()) return null;
  const overlay = structuredClone(currentOverlay());
  const account = listedAccounts(overlay).find((item) => item.id === input.accountId);
  if (!account) return null;
  if (physicianByNpi(overlay.physicians, input.npi.trim())) return null;
  const physician: PhysicianRecord = {
    id: `PHY-${overlay.nextPhysician}`,
    tenantId: overlay.tenantId,
    accountId: account.id,
    accountName: account.name,
    firstName,
    lastName,
    npi: input.npi.trim(),
    specialty: input.specialty.trim(),
    phone: input.phone.trim(),
    fax: input.fax.trim(),
    email: input.email.trim(),
    createdAt: stamp(),
  };
  overlay.nextPhysician += 1;
  overlay.physicians = [physician, ...overlay.physicians];
  overlay.activities.unshift({
    id: `ACT-${overlay.nextActivity}`,
    tenantId: overlay.tenantId,
    accountId: account.id,
    contactId: "",
    at: physician.createdAt,
    kind: "Physician",
    summary: `${personName(physician)} added · NPI ${physician.npi}`,
    source: "crm",
  });
  overlay.nextActivity += 1;
  audit(overlay, "physician", physician.id, "create", "", personName(physician));
  commit(overlay);
  return physician;
}

/** Drops the in-memory overlay so a test can start from the seed. */
export function testingClearCrm() {
  overlays.clear();
}

function opportunities(tenantId: string, overlay: CrmOverlay): OpportunityRecord[] {
  return listedAccounts(overlay).flatMap((account) =>
    account.opportunities.map((item) => {
      const extra = overlay.opportunityNext[item.id];
      return {
        id: item.id,
        tenantId,
        accountId: account.id,
        accountName: account.name,
        name: item.name,
        owner: account.owner,
        stage: extra?.stage && isStage(extra.stage) ? extra.stage : isStage(item.stage) ? item.stage : "Discovery",
        amount: item.amount,
        probability: extra?.probability ?? 50,
        close: item.close,
        source: "Account pipeline",
        nextAction: extra?.nextAction || "Record the next conversation",
      };
    }),
  );
}

function documentsFor(account: CrmAccount, overlay: CrmOverlay, tenantId: string): CrmDocument[] {
  const agreements: CrmDocument[] = account.agreements.map((item) => ({
    id: item.id,
    tenantId,
    accountId: account.id,
    kind: "agreement",
    name: `${item.id} · ${item.name}`,
    status: item.status,
    at: "",
  }));
  return [...agreements, ...overlay.documents.filter((item) => item.accountId === account.id)];
}

function projectedActivities(
  account: CrmAccount,
  samples: SampleRecord[],
  charges: Charge[],
  deviations: Deviation[],
  overlay: CrmOverlay,
  tenantId: string,
): CrmActivity[] {
  const fromAccount: CrmActivity[] = account.activities.map((item, index) => ({
    id: `ACC-${account.id}-${index}`,
    tenantId,
    accountId: account.id,
    contactId: "",
    at: item.when,
    kind: item.kind,
    summary: item.summary,
    source: "account",
  }));
  const fromLab: CrmActivity[] = samples
    .filter((sample) => sample.client === account.name)
    .map((sample) => ({
      id: `LAB-${sample.accessionId}`,
      tenantId,
      accountId: account.id,
      contactId: "",
      at: sample.received,
      kind: "Lab",
      summary: `${sample.tests} · ${sample.accessionId} · ${sample.status}`,
      source: "lab" as const,
    }));
  const fromBilling: CrmActivity[] = charges
    .filter((charge) => charge.accountId === account.id)
    .flatMap((charge) =>
      charge.events.slice(-2).map((event, index) => ({
        id: `BIL-${charge.id}-${index}`,
        tenantId,
        accountId: account.id,
        contactId: "",
        at: event.at,
        kind: "Billing",
        summary: `${charge.id}: ${event.text}`,
        source: "billing" as const,
      })),
    );
  const fromQuality: CrmActivity[] = deviations
    .filter((item) => {
      if (!item.accessionId) return false;
      const sample = findSample(item.accessionId);
      return sample?.client === account.name;
    })
    .map((item) => ({
      id: `QLT-${item.id}`,
      tenantId,
      accountId: account.id,
      contactId: "",
      at: item.signatures[0]?.at || "",
      kind: "Quality",
      summary: `${item.id}: ${item.title}`,
      source: "quality" as const,
    }));
  const owned = overlay.activities.filter((item) => item.accountId === account.id);
  return [...owned, ...fromAccount, ...fromLab, ...fromBilling, ...fromQuality].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

export type ClientCard = {
  account: CrmAccount;
  health: DerivedHealth;
  signals: HealthSignal[];
  openWork: number;
  openIssues: number;
  openTasks: number;
  opportunities: number;
  arCents: number;
  collectedCents: number;
};

export type CrmSnapshot = {
  tenantId: string;
  actor: string;
  canWrite: boolean;
  overlay: CrmOverlay;
  accounts: CrmAccount[];
  contacts: ReturnType<typeof allContacts>;
  patients: PatientRecord[];
  physicians: PhysicianRecord[];
  opportunities: OpportunityRecord[];
  cards: ClientCard[];
};

export function snapshot(cycle: Cycle, samples: SampleRecord[]): CrmSnapshot {
  const tenantId = crmTenantId();
  const overlay = overlayFor(tenantId);
  const books = rollup(cycle.charges);
  const accounts = listedAccounts(overlay);
  const contacts = allContacts(accounts, tenantId);
  const patients = overlay.patients;
  const physicians = overlay.physicians;
  const opportunityRows = opportunities(tenantId, overlay);
  const cards = accounts.map((account) => {
    const accountIssues = overlay.issues.filter((item) => item.accountId === account.id);
    const accountTasks = overlay.tasks.filter((item) => item.accountId === account.id);
    const signals = signalsFor(account, cycle.charges, samples, overlay.issues, overlay.tasks);
    const finance = books.find((row) => row.accountId === account.id);
    return {
      account,
      health: derivedHealth(account, signals),
      signals,
      openWork: samples.filter((sample) => sample.client === account.name && sample.status !== "released").length,
      openIssues: accountIssues.filter((item) => item.status !== "resolved").length,
      openTasks: accountTasks.filter((item) => item.status !== "done").length,
      opportunities: opportunityRows.filter((item) => item.accountId === account.id && item.stage !== "Won" && item.stage !== "Lost").length,
      arCents: finance?.ar ?? 0,
      collectedCents: finance?.collected ?? 0,
    };
  });
  return { tenantId, actor: crmActor(), canWrite: crmCanWrite(), overlay, accounts, contacts, patients, physicians, opportunities: opportunityRows, cards };
}

export function useCrm() {
  const cycle = useRevenue();
  const samples = useSamples();
  const quality = useQuality();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sync = () => setTick((value) => value + 1);
    listeners.add(sync);
    window.addEventListener(EVENT, sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  const state = useMemo(() => snapshot(cycle, samples), [cycle, samples, tick]);
  return {
    ...state,
    samples,
    charges: cycle.charges,
    deviations: quality.deviations,
    activitiesFor: (accountId: string) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account) return [] as CrmActivity[];
      return projectedActivities(account, samples, cycle.charges, quality.deviations, state.overlay, state.tenantId);
    },
    documentsFor: (accountId: string) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account) return [] as CrmDocument[];
      return documentsFor(account, state.overlay, state.tenantId);
    },
    contactsFor: (accountId: string) => {
      const account = state.accounts.find((item) => item.id === accountId);
      return account ? contactsFor(account, state.tenantId) : [];
    },
  };
}

export function pageRows<T>(rows: T[], page: number, size = 25): { rows: T[]; pages: number; page: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((safe - 1) * size, safe * size), pages, page: safe };
}

export { contactsFor, derivedHealth, signalsFor };
