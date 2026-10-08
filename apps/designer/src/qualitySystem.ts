import { useEffect, useState } from "react";
import { readLimsSession } from "./limsSession";
import { currentInstanceId, labIdFromSite, moduleStorageKey, readJson, writeJson } from "./storageScope";

export type SignatureMeaning = "authorship" | "review" | "approval" | "closure";

export type Signature = {
  id: string;
  at: string;
  signer: string;
  meaning: SignatureMeaning;
  section: string;
  digest: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  recordId: string;
  action: string;
  reason: string;
};

export type DeviationStatus = "reported" | "contained" | "investigation" | "disposition" | "closed";
export type RootCause = "" | "method" | "equipment" | "personnel" | "material" | "environment";
export type Disposition = "" | "retest" | "reject" | "continue" | "use-as-is";

export type Deviation = {
  id: string;
  kind: "deviation" | "nonconformance";
  title: string;
  description: string;
  accessionId: string;
  site: string;
  labId?: string;
  reporter: string;
  status: DeviationStatus;
  containment: string;
  investigation: string;
  rootCause: RootCause;
  impact: string;
  disposition: Disposition;
  dispositionNote: string;
  closeReason: string;
  signatures: Signature[];
};

export type CapaStatus = "plan" | "implementation" | "closed";
export type Effectiveness = "" | "effective" | "not-effective";

export type Capa = {
  id: string;
  title: string;
  labId?: string;
  sourceId: string;
  status: CapaStatus;
  rootCause: string;
  corrective: string;
  preventive: string;
  owner: string;
  planner: string;
  implementer: string;
  checkOn: string;
  implementationEvidence: string;
  effectiveness: Effectiveness;
  effectivenessEvidence: string;
  failedChecks: string[];
  signatures: Signature[];
};

export type ChangeStatus = "proposed" | "assessment" | "approved" | "implemented" | "closed";
export type ValidationImpact = "" | "none" | "partial" | "full";

export type ChangeControl = {
  id: string;
  title: string;
  labId?: string;
  description: string;
  proposer: string;
  status: ChangeStatus;
  impact: string;
  validation: ValidationImpact;
  documentId: string;
  implementer: string;
  implementationNote: string;
  closeReason: string;
  signatures: Signature[];
};

export type DocumentStatus = "draft" | "review" | "approved" | "effective" | "obsolete";

export type ControlledDocument = {
  id: string;
  code: string;
  version: number;
  title: string;
  labId?: string;
  docType: "SOP" | "Method" | "Policy";
  status: DocumentStatus;
  author: string;
  body: string;
  effectiveOn: string;
  training: string;
  changeId: string;
  obsoleteReason: string;
  signatures: Signature[];
};

export type QualitySystem = {
  version: 1;
  instanceId?: string;
  nextAudit: number;
  nextDeviation: number;
  deviations: Deviation[];
  capas: Capa[];
  changes: ChangeControl[];
  documents: ControlledDocument[];
  audit: AuditEvent[];
};

export type QualityResult = { ok: true } | { ok: false; error: string };

export const SIGNATURE_MEANING: Record<SignatureMeaning, string> = {
  authorship: "I authored this record and it is true and complete.",
  review: "I reviewed this record against the quality system.",
  approval: "I approve this record for its stated use.",
  closure: "I close this record. The work and evidence are complete.",
};

export const DEVIATION_STAGES: { id: DeviationStatus; label: string }[] = [
  { id: "reported", label: "Reported" },
  { id: "contained", label: "Contained" },
  { id: "investigation", label: "Investigation" },
  { id: "disposition", label: "Disposition" },
  { id: "closed", label: "QA closed" },
];

export const CAPA_STAGES: { id: CapaStatus; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "implementation", label: "Implementation" },
  { id: "closed", label: "Closed" },
];

export const CHANGE_STAGES: { id: ChangeStatus; label: string }[] = [
  { id: "proposed", label: "Proposed" },
  { id: "assessment", label: "Impact" },
  { id: "approved", label: "Approved" },
  { id: "implemented", label: "Implemented" },
  { id: "closed", label: "Closed" },
];

export const DOCUMENT_STAGES: { id: DocumentStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "review", label: "In review" },
  { id: "approved", label: "Approved" },
  { id: "effective", label: "Effective" },
  { id: "obsolete", label: "Obsolete" },
];

export const ROOT_CAUSES: { id: Exclude<RootCause, "">; label: string }[] = [
  { id: "method", label: "Method" },
  { id: "equipment", label: "Equipment" },
  { id: "personnel", label: "Personnel" },
  { id: "material", label: "Material" },
  { id: "environment", label: "Environment" },
];

export const DISPOSITIONS: { id: Exclude<Disposition, "">; label: string }[] = [
  { id: "retest", label: "Retest" },
  { id: "reject", label: "Reject" },
  { id: "continue", label: "Continue testing" },
  { id: "use-as-is", label: "Use as is" },
];

const STORAGE_KEY = "carescope.quality.v1";

function qualityKey(instanceId = currentInstanceId()): string {
  return moduleStorageKey("quality_compliance", "system", instanceId);
}

function hash(value: string): string {
  let hashValue = 2166136261;
  for (const char of value) {
    hashValue ^= char.charCodeAt(0);
    hashValue = Math.imul(hashValue, 16777619);
  }
  return (hashValue >>> 0).toString(16).padStart(8, "0");
}

export function dayOf(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${dayOf(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function ok(): QualityResult {
  return { ok: true };
}

function fail(error: string): QualityResult {
  return { ok: false, error };
}

export function deviationSectionDigest(record: Deviation, section: string): string {
  const parts: Record<string, string> = {
    report: [record.id, record.title, record.description, record.accessionId, record.site, record.reporter].join("|"),
    containment: record.containment,
    investigation: [record.investigation, record.rootCause, record.impact].join("|"),
    disposition: [record.disposition, record.dispositionNote].join("|"),
    closure: record.closeReason,
  };
  return hash(parts[section] ?? "");
}

export function capaSectionDigest(record: Capa, section: string): string {
  const parts: Record<string, string> = {
    plan: [record.sourceId, record.rootCause, record.corrective, record.preventive, record.owner, record.checkOn].join("|"),
    implementation: record.implementationEvidence,
    closure: [record.effectiveness, record.effectivenessEvidence].join("|"),
  };
  return hash(parts[section] ?? "");
}

export function changeSectionDigest(record: ChangeControl, section: string): string {
  const parts: Record<string, string> = {
    proposal: [record.title, record.description, record.proposer].join("|"),
    assessment: [record.impact, record.validation, record.documentId].join("|"),
    approval: record.documentId,
    implementation: record.implementationNote,
    closure: record.closeReason,
  };
  return hash(parts[section] ?? "");
}

export function documentSectionDigest(record: ControlledDocument, section: string): string {
  const parts: Record<string, string> = {
    authorship: [record.code, String(record.version), record.title, record.body, record.author].join("|"),
    approval: [record.code, String(record.version), record.title, record.body, record.effectiveOn, record.training].join("|"),
  };
  return hash(parts[section] ?? "");
}

export function signatureIsBound(signature: Signature, digest: string): boolean {
  return signature.digest === digest;
}

function signerOf(record: { signatures: Signature[] }, section: string): string {
  return record.signatures.find((signature) => signature.section === section)?.signer ?? "";
}

function audit(system: QualitySystem, event: Omit<AuditEvent, "id" | "at"> & { at: string }) {
  system.audit.push({ id: `AUD-${system.nextAudit++}`, ...event });
}

function sign(
  system: QualitySystem,
  record: { id: string; signatures: Signature[] },
  section: string,
  meaning: SignatureMeaning,
  signer: string,
  digest: string,
  now: Date,
  action: string,
  reason: string,
) {
  const at = stamp(now);
  const id = `SIG-${system.nextAudit}`;
  record.signatures.push({ id, at, signer, meaning, section, digest });
  audit(system, {
    at,
    actor: signer,
    recordId: record.id,
    action,
    reason: `${SIGNATURE_MEANING[meaning]} ${reason}`.trim(),
  });
}

function reject(system: QualitySystem, recordId: string, actor: string, reason: string, now: Date): QualityResult {
  audit(system, { at: stamp(now), actor, recordId, action: "Signature rejected", reason });
  return fail(reason);
}

function blankDeviation(values: Pick<Deviation, "id" | "kind" | "title" | "description" | "accessionId" | "site" | "reporter">): Deviation {
  return {
    ...values,
    labId: labIdFromSite(values.site),
    status: "reported",
    containment: "",
    investigation: "",
    rootCause: "",
    impact: "",
    disposition: "",
    dispositionNote: "",
    closeReason: "",
    signatures: [],
  };
}

export function applyReportDeviation(
  system: QualitySystem,
  input: { title: string; description: string; accessionId: string; site: string },
  signer: string,
  now = new Date(),
): QualityResult {
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!input.title.trim() || !input.description.trim()) return fail("A title and a description are required.");
  const record = blankDeviation({
    id: `DEV-${system.nextDeviation++}`,
    kind: "deviation",
    title: input.title.trim(),
    description: input.description.trim(),
    accessionId: input.accessionId.trim(),
    site: input.site.trim() || "East Lab",
    reporter: signer,
  });
  system.deviations.unshift(record);
  sign(system, record, "report", "authorship", signer, deviationSectionDigest(record, "report"), now, "Deviation reported", record.title);
  return ok();
}

export function applyContainDeviation(system: QualitySystem, id: string, signer: string, containment: string, now = new Date()): QualityResult {
  const record = system.deviations.find((item) => item.id === id);
  if (!record) return fail("That quality event was not found.");
  if (record.status !== "reported") return fail("Containment is recorded while the event is reported.");
  if (!containment.trim()) return fail("Describe how the event was contained.");
  record.containment = containment.trim();
  record.status = "contained";
  sign(system, record, "containment", "authorship", signer, deviationSectionDigest(record, "containment"), now, "Containment recorded", record.containment);
  return ok();
}

export function applyInvestigateDeviation(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { investigation: string; rootCause: RootCause; impact: string },
  now = new Date(),
): QualityResult {
  const record = system.deviations.find((item) => item.id === id);
  if (!record) return fail("That quality event was not found.");
  if (record.status !== "contained") return fail("Investigation starts after containment.");
  if (!input.investigation.trim() || !input.rootCause || !input.impact.trim()) {
    return fail("Investigation, root cause, and impact are required.");
  }
  record.investigation = input.investigation.trim();
  record.rootCause = input.rootCause;
  record.impact = input.impact.trim();
  record.status = "investigation";
  sign(system, record, "investigation", "review", signer, deviationSectionDigest(record, "investigation"), now, "Investigation signed", record.rootCause);
  return ok();
}

export function applyDisposeDeviation(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { disposition: Disposition; note: string },
  now = new Date(),
): QualityResult {
  const record = system.deviations.find((item) => item.id === id);
  if (!record) return fail("That quality event was not found.");
  if (record.status !== "investigation") return fail("Disposition follows the investigation.");
  if (!input.disposition) return fail("Choose a disposition.");
  if (input.disposition === "use-as-is" && !input.note.trim()) return fail("Use as is requires a written justification.");
  if (!input.note.trim()) return fail("A disposition note is required.");
  record.disposition = input.disposition;
  record.dispositionNote = input.note.trim();
  record.status = "disposition";
  sign(system, record, "disposition", "review", signer, deviationSectionDigest(record, "disposition"), now, "Disposition signed", input.disposition);
  return ok();
}

export function applyCloseDeviation(system: QualitySystem, id: string, signer: string, reason: string, now = new Date()): QualityResult {
  const record = system.deviations.find((item) => item.id === id);
  if (!record) return fail("That quality event was not found.");
  if (record.status !== "disposition") return fail("QA close is available after disposition.");
  if (!reason.trim()) return fail("A written reason is required to close a quality event.");
  if (same(signer, record.reporter)) return reject(system, record.id, signer, "The reporter cannot apply the QA close signature.", now);
  const investigator = signerOf(record, "investigation");
  const disposer = signerOf(record, "disposition");
  if (investigator && same(signer, investigator)) return reject(system, record.id, signer, "The investigator cannot apply the QA close signature.", now);
  if (disposer && same(signer, disposer)) return reject(system, record.id, signer, "The person who signed disposition cannot apply the QA close signature.", now);
  record.closeReason = reason.trim();
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, deviationSectionDigest(record, "closure"), now, "QA closed", record.closeReason);
  return ok();
}

export function applyCheckEffectiveness(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { result: Effectiveness; evidence: string },
  now = new Date(),
): QualityResult {
  const record = system.capas.find((item) => item.id === id);
  if (!record) return fail("That CAPA was not found.");
  if (record.status !== "implementation") return fail("Effectiveness is checked after the actions are implemented.");
  if (!input.result || !input.evidence.trim()) return fail("An effectiveness result and evidence are required.");
  if (dayOf(now) < record.checkOn) return fail(`The effectiveness check is scheduled for ${record.checkOn}.`);
  if (same(signer, record.implementer)) return reject(system, record.id, signer, "The person who implemented the action cannot judge its effectiveness.", now);
  if (input.result === "not-effective") {
    record.failedChecks.push(`${stamp(now)} ${signer}: ${input.evidence.trim()}`);
    audit(system, {
      at: stamp(now),
      actor: signer,
      recordId: record.id,
      action: "Effectiveness not met",
      reason: input.evidence.trim(),
    });
    return ok();
  }
  record.effectiveness = "effective";
  record.effectivenessEvidence = input.evidence.trim();
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, capaSectionDigest(record, "closure"), now, "CAPA closed", record.effectivenessEvidence);
  return ok();
}

export function applyImplementChange(system: QualitySystem, id: string, signer: string, note: string, now = new Date()): QualityResult {
  const record = system.changes.find((item) => item.id === id);
  if (!record) return fail("That change was not found.");
  if (record.status !== "approved") return fail("Implementation follows QA approval.");
  if (!note.trim()) return fail("Describe how the change was implemented.");
  if (same(signer, record.proposer)) return reject(system, record.id, signer, "The proposer cannot sign implementation of their own change.", now);
  const document = system.documents.find((item) => item.id === record.documentId);
  if (!document || document.status !== "effective") {
    return fail(`${record.documentId} has to be effective before this change can be implemented.`);
  }
  record.implementationNote = note.trim();
  record.implementer = signer;
  record.status = "implemented";
  sign(system, record, "implementation", "authorship", signer, changeSectionDigest(record, "implementation"), now, "Change implemented", record.implementationNote);
  return ok();
}

export function applyCloseChange(system: QualitySystem, id: string, signer: string, reason: string, now = new Date()): QualityResult {
  const record = system.changes.find((item) => item.id === id);
  if (!record) return fail("That change was not found.");
  if (record.status !== "implemented") return fail("Close follows implementation.");
  if (!reason.trim()) return fail("A written verification is required to close a change.");
  if (same(signer, record.implementer)) return reject(system, record.id, signer, "The implementer cannot close their own change.", now);
  if (same(signer, record.proposer)) return reject(system, record.id, signer, "The proposer cannot close their own change.", now);
  const document = system.documents.find((item) => item.id === record.documentId);
  if (!document || document.status !== "effective") return fail("The controlled document is no longer effective.");
  record.closeReason = reason.trim();
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, changeSectionDigest(record, "closure"), now, "Change closed", record.closeReason);
  return ok();
}

export function applyApproveDocument(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { effectiveOn: string; training: string },
  now = new Date(),
): QualityResult {
  const record = system.documents.find((item) => item.id === id);
  if (!record) return fail("That document was not found.");
  if (record.status !== "review") return fail("Approval is available while the document is in review.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveOn)) return fail("Enter the effective date as YYYY-MM-DD.");
  if (!input.training.trim()) return fail("Record who was trained before approval.");
  if (same(signer, record.author)) return reject(system, record.id, signer, "The author cannot approve their own document.", now);
  record.effectiveOn = input.effectiveOn;
  record.training = input.training.trim();
  record.status = "approved";
  sign(system, record, "approval", "approval", signer, documentSectionDigest(record, "approval"), now, "Document approved", `Effective ${record.effectiveOn}. ${record.training}`);
  return ok();
}

export function applyIssueDocument(system: QualitySystem, id: string, signer: string, now = new Date()): QualityResult {
  const record = system.documents.find((item) => item.id === id);
  if (!record) return fail("That document was not found.");
  if (record.status !== "approved") return fail("Only an approved document can be issued.");
  if (!record.training.trim()) return fail("Training has to be recorded before the document is issued.");
  if (dayOf(now) < record.effectiveOn) return fail(`This version becomes effective on ${record.effectiveOn}.`);
  const approval = record.signatures.find((signature) => signature.section === "approval");
  if (!approval || !signatureIsBound(approval, documentSectionDigest(record, "approval"))) {
    return fail("The approval signature does not match this version. Approve it again.");
  }
  record.status = "effective";
  for (const prior of system.documents) {
    if (prior.code === record.code && prior.id !== record.id && prior.status === "effective") {
      prior.status = "obsolete";
      prior.obsoleteReason = `Superseded by ${record.code} version ${record.version}.`;
      audit(system, {
        at: stamp(now),
        actor: signer,
        recordId: prior.id,
        action: "Obsoleted",
        reason: prior.obsoleteReason,
      });
    }
  }
  audit(system, {
    at: stamp(now),
    actor: signer,
    recordId: record.id,
    action: "Issued for use",
    reason: `Effective ${record.effectiveOn}. Approval ${approval.id} remains bound.`,
  });
  return ok();
}

function seal(
  system: QualitySystem,
  record: { id: string; signatures: Signature[] },
  section: string,
  meaning: SignatureMeaning,
  signer: string,
  digest: string,
  at: string,
  action: string,
  reason: string,
) {
  const id = `SIG-${system.nextAudit}`;
  record.signatures.push({ id, at, signer, meaning, section, digest });
  audit(system, { at, actor: signer, recordId: record.id, action, reason: `${SIGNATURE_MEANING[meaning]} ${reason}`.trim() });
}

export function seedQuality(instanceId = currentInstanceId()): QualitySystem {
  const system: QualitySystem = {
    version: 1,
    instanceId,
    nextAudit: 1000,
    nextDeviation: 119,
    deviations: [],
    capas: [],
    changes: [],
    documents: [],
    audit: [],
  };

  const sop = (values: Omit<ControlledDocument, "signatures" | "obsoleteReason" | "effectiveOn" | "training"> & { effectiveOn?: string; training?: string }): ControlledDocument => ({
    effectiveOn: "",
    training: "",
    obsoleteReason: "",
    signatures: [],
    ...values,
  });

  const qaSop = sop({
    id: "SOP-QA-004:2",
    code: "SOP-QA-004",
    version: 2,
    title: "Deviation, nonconformance, and CAPA handling",
    docType: "SOP",
    status: "effective",
    author: "A. Ruiz",
    body: "Contain the event, investigate root cause, record disposition, and obtain an independent QA signature before closure.",
    effectiveOn: "2026-01-15",
    training: "QA staff trained 2026-01-10.",
    changeId: "",
  });
  system.documents.push(qaSop);
  seal(system, qaSop, "authorship", "authorship", qaSop.author, documentSectionDigest(qaSop, "authorship"), "2026-01-08 11:00", "Document authored", qaSop.title);
  seal(system, qaSop, "approval", "approval", "Jonah Park", documentSectionDigest(qaSop, "approval"), "2026-01-12 15:20", "Document approved", qaSop.training);

  const method = sop({
    id: "SOP-HPLC-12:3",
    code: "SOP-HPLC-12",
    version: 3,
    title: "HPLC assay for potency",
    docType: "Method",
    status: "effective",
    author: "L. Okonkwo",
    body: "Assay range 90–110%. System suitability is five replicate injections with an RSD at or below 2.0%.",
    effectiveOn: "2025-11-01",
    training: "HPLC analysts trained 2025-10-28.",
    changeId: "",
  });
  system.documents.push(method);
  seal(system, method, "authorship", "authorship", method.author, documentSectionDigest(method, "authorship"), "2025-10-20 10:00", "Document authored", method.title);
  seal(system, method, "approval", "approval", "Jonah Park", documentSectionDigest(method, "approval"), "2025-10-27 16:10", "Document approved", method.training);

  const revision = sop({
    id: "SOP-HPLC-12:4",
    code: "SOP-HPLC-12",
    version: 4,
    title: "HPLC assay for potency",
    docType: "Method",
    status: "review",
    author: "L. Okonkwo",
    body: "Assay range 80–120%. Bracket a standard every ten injections. Confirm specificity and precision before this version is effective.",
    changeId: "CC-009",
  });
  system.documents.push(revision);
  seal(system, revision, "authorship", "authorship", revision.author, documentSectionDigest(revision, "authorship"), "2026-07-18 13:40", "Document authored", "Submitted for QA approval.");

  const closed = blankDeviation({
    id: "DEV-100",
    kind: "deviation",
    title: "Chamber alarm missed during a weekend hold",
    description: "Analysts did not respond to a chamber alarm. No client result was released.",
    accessionId: "",
    site: "North Lab",
    reporter: "J. Ortiz",
  });
  closed.status = "closed";
  closed.containment = "Chamber placed out of service until the alarm was challenged.";
  closed.investigation = "The alarm sounded and the on-call analyst did not follow the response SOP.";
  closed.rootCause = "personnel";
  closed.impact = "No result was reported. The chamber was qualified again before use.";
  closed.disposition = "continue";
  closed.dispositionNote = "Resume use after retraining and a successful alarm challenge.";
  closed.closeReason = "Independent QA review. CAPA-015 tracks the training effectiveness.";
  system.deviations.push(closed);
  seal(system, closed, "report", "authorship", closed.reporter, deviationSectionDigest(closed, "report"), "2026-06-02 08:10", "Deviation reported", closed.title);
  seal(system, closed, "containment", "authorship", "J. Ortiz", deviationSectionDigest(closed, "containment"), "2026-06-02 09:00", "Containment recorded", closed.containment);
  seal(system, closed, "investigation", "review", "A. Patel", deviationSectionDigest(closed, "investigation"), "2026-06-04 14:15", "Investigation signed", closed.rootCause);
  seal(system, closed, "disposition", "review", "A. Patel", deviationSectionDigest(closed, "disposition"), "2026-06-04 14:40", "Disposition signed", closed.disposition);
  seal(system, closed, "closure", "closure", "Jonah Park", deviationSectionDigest(closed, "closure"), "2026-06-05 11:05", "QA closed", closed.closeReason);

  const excursion = blankDeviation({
    id: "DEV-118",
    kind: "deviation",
    title: "Out-of-temperature excursion",
    description: "Chamber 2 exceeded 8°C while Identity FTIR for SCP-20458 was in process.",
    accessionId: "SCP-20458",
    site: "East Lab",
    reporter: "J. Ortiz",
  });
  excursion.status = "disposition";
  excursion.containment = "The sample was moved to a qualified chamber. The alarm was acknowledged and the chamber was taken out of service.";
  excursion.investigation = "Chamber 2 was above 8°C for 46 minutes. No Identity FTIR result was reported.";
  excursion.rootCause = "equipment";
  excursion.impact = "Vertex Materials was notified. The result remains unreported while the sample is on laboratory hold.";
  excursion.disposition = "retest";
  excursion.dispositionNote = "Repeat Identity FTIR after the chamber is qualified. Do not report the in-process run.";
  system.deviations.push(excursion);
  seal(system, excursion, "report", "authorship", excursion.reporter, deviationSectionDigest(excursion, "report"), "2026-07-24 09:50", "Deviation reported", excursion.title);
  seal(system, excursion, "containment", "authorship", "J. Ortiz", deviationSectionDigest(excursion, "containment"), "2026-07-24 10:20", "Containment recorded", excursion.containment);
  seal(system, excursion, "investigation", "review", "A. Patel", deviationSectionDigest(excursion, "investigation"), "2026-07-25 11:05", "Investigation signed", excursion.rootCause);
  seal(system, excursion, "disposition", "review", "A. Patel", deviationSectionDigest(excursion, "disposition"), "2026-07-25 11:30", "Disposition signed", excursion.disposition);

  const label = blankDeviation({
    id: "NCR-042",
    kind: "nonconformance",
    title: "Label mismatch at intake",
    description: "Two receipts arrived with swapped client labels and were quarantined before accessioning.",
    accessionId: "",
    site: "East Lab",
    reporter: "S. Patel",
  });
  system.deviations.push(label);
  seal(system, label, "report", "authorship", label.reporter, deviationSectionDigest(label, "report"), "2026-07-25 08:05", "Nonconformance reported", label.title);

  const capa: Capa = {
    id: "CAPA-015",
    title: "Training effectiveness for chamber alarms",
    sourceId: "DEV-100",
    status: "implementation",
    rootCause: "Analysts could not show the alarm-response steps.",
    corrective: "Retrain the on-call analysts and challenge the chamber alarm.",
    preventive: "Add the alarm response to SOP-QA-004 and to new-analyst training.",
    owner: "A. Ruiz",
    planner: "A. Ruiz",
    implementer: "A. Ruiz",
    checkOn: "2026-09-15",
    implementationEvidence: "Roster completed 2026-08-20. Alarm challenge passed.",
    effectiveness: "",
    effectivenessEvidence: "",
    failedChecks: [],
    signatures: [],
  };
  system.capas.push(capa);
  seal(system, capa, "plan", "approval", capa.planner, capaSectionDigest(capa, "plan"), "2026-06-12 09:30", "CAPA plan approved", capa.corrective);
  seal(system, capa, "implementation", "authorship", capa.implementer, capaSectionDigest(capa, "implementation"), "2026-08-20 16:00", "CAPA actions implemented", capa.implementationEvidence);

  const change: ChangeControl = {
    id: "CC-009",
    title: "Method update HPLC-12",
    description: "Widen the assay range and add bracketing standards.",
    proposer: "L. Okonkwo",
    status: "approved",
    impact: "Results reported with version 3 stay under version 3. New runs wait for version 4.",
    validation: "partial",
    documentId: "SOP-HPLC-12:4",
    implementer: "",
    implementationNote: "",
    closeReason: "",
    signatures: [],
  };
  system.changes.push(change);
  seal(system, change, "proposal", "authorship", change.proposer, changeSectionDigest(change, "proposal"), "2026-07-18 13:45", "Change proposed", change.title);
  seal(system, change, "assessment", "review", "L. Okonkwo", changeSectionDigest(change, "assessment"), "2026-07-19 10:00", "Impact assessed", change.validation);
  seal(system, change, "approval", "approval", "Jonah Park", changeSectionDigest(change, "approval"), "2026-07-22 15:10", "Change approved", change.documentId);

  return system;
}

function readQuality(instanceId = currentInstanceId()): QualitySystem | null {
  const parsed = readJson<QualitySystem>(qualityKey(instanceId), instanceId === "demo" ? [STORAGE_KEY] : []);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.deviations) || !Array.isArray(parsed.audit)) return null;
  parsed.instanceId = instanceId;
  parsed.deviations = parsed.deviations.map((row) => ({ ...row, labId: row.labId || labIdFromSite(row.site) }));
  return parsed;
}

const qualityByInstance = new Map<string, QualitySystem>();
const listeners = new Set<() => void>();

function qualityFor(instanceId = currentInstanceId()): QualitySystem {
  const cached = qualityByInstance.get(instanceId);
  if (cached) return cached;
  const loaded = readQuality(instanceId) ?? seedQuality(instanceId);
  qualityByInstance.set(instanceId, loaded);
  return loaded;
}

function commit(next: QualitySystem) {
  const instanceId = next.instanceId || currentInstanceId();
  next.instanceId = instanceId;
  qualityByInstance.set(instanceId, next);
  try {
    writeJson(qualityKey(instanceId), next);
  } catch {
    /* The quality record still updates in memory when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}

function update(mutator: (draft: QualitySystem) => void) {
  const quality = qualityFor();
  const draft = structuredClone(quality);
  mutator(draft);
  if (JSON.stringify(draft) === JSON.stringify(quality)) return;
  commit(draft);
}

export function getQuality(): QualitySystem {
  return qualityFor();
}

export function useQuality(): QualitySystem {
  const [state, setState] = useState(() => qualityFor());
  useEffect(() => {
    const sync = () => setState(qualityFor());
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return state;
}

export function qualityActor(): string {
  return readLimsSession()?.username || "M. Chen";
}

function run(mutator: (draft: QualitySystem) => QualityResult): string {
  let error = "";
  update((draft) => {
    const result = mutator(draft);
    if (!result.ok) error = result.error;
  });
  return error;
}

export function reportDeviation(input: { title: string; description: string; accessionId: string; site: string }, signer: string): string {
  return run((draft) => applyReportDeviation(draft, input, signer));
}

export function containDeviation(id: string, signer: string, containment: string): string {
  return run((draft) => applyContainDeviation(draft, id, signer, containment));
}

export function investigateDeviation(id: string, signer: string, input: { investigation: string; rootCause: RootCause; impact: string }): string {
  return run((draft) => applyInvestigateDeviation(draft, id, signer, input));
}

export function disposeDeviation(id: string, signer: string, input: { disposition: Disposition; note: string }): string {
  return run((draft) => applyDisposeDeviation(draft, id, signer, input));
}

export function closeDeviation(id: string, signer: string, reason: string): string {
  return run((draft) => applyCloseDeviation(draft, id, signer, reason));
}

export function checkEffectiveness(id: string, signer: string, input: { result: Effectiveness; evidence: string }): string {
  return run((draft) => applyCheckEffectiveness(draft, id, signer, input));
}

export function implementChange(id: string, signer: string, note: string): string {
  return run((draft) => applyImplementChange(draft, id, signer, note));
}

export function closeChange(id: string, signer: string, reason: string): string {
  return run((draft) => applyCloseChange(draft, id, signer, reason));
}

export function approveDocument(id: string, signer: string, input: { effectiveOn: string; training: string }): string {
  return run((draft) => applyApproveDocument(draft, id, signer, input));
}

export function issueDocument(id: string, signer: string): string {
  return run((draft) => applyIssueDocument(draft, id, signer));
}

export function rejectSignature(recordId: string, actor: string, reason: string): void {
  update((draft) => {
    audit(draft, { at: stamp(new Date()), actor, recordId, action: "Signature rejected", reason });
  });
}

export function recordKind(system: QualitySystem, id: string): "deviation" | "capa" | "change" | "document" | "" {
  if (system.deviations.some((record) => record.id === id)) return "deviation";
  if (system.capas.some((record) => record.id === id)) return "capa";
  if (system.changes.some((record) => record.id === id)) return "change";
  if (system.documents.some((record) => record.id === id)) return "document";
  return "";
}
