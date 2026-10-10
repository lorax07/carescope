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
  capaId?: string;
  /** Present on records created by the module seed. Records a person signs do not carry this flag. */
  sample?: boolean;
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
  sample?: boolean;
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
  sample?: boolean;
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
  assignees?: string[];
  changeId: string;
  obsoleteReason: string;
  sample?: boolean;
  signatures: Signature[];
};

export type TrainingStatus = "assigned" | "completed";

export type TrainingAssignment = {
  id: string;
  documentId: string;
  assignee: string;
  status: TrainingStatus;
  due: string;
  completedOn: string;
  sample?: boolean;
  signatures: Signature[];
};

export type AuditStatus = "planned" | "in_progress" | "findings" | "closed";
export type FindingStatus = "open" | "remediation" | "closed";
export type RiskLevel = "low" | "medium" | "high";

export type QualityAudit = {
  id: string;
  title: string;
  kind: "internal" | "external";
  status: AuditStatus;
  scope: string;
  criteria: string;
  auditor: string;
  scheduledOn: string;
  sample?: boolean;
  signatures: Signature[];
};

export type AuditFinding = {
  id: string;
  auditId: string;
  title: string;
  evidence: string;
  risk: RiskLevel;
  capaId: string;
  status: FindingStatus;
  closeReason: string;
  sample?: boolean;
  signatures: Signature[];
};

export type RiskStatus = "open" | "mitigating" | "reassessed";

export type QualityRisk = {
  id: string;
  title: string;
  hazard: string;
  status: RiskStatus;
  likelihood: number;
  impact: number;
  residualLikelihood: number;
  residualImpact: number;
  owner: string;
  reviewOn: string;
  changeId: string;
  control: string;
  sample?: boolean;
  signatures: Signature[];
};

export type EquipmentQualityStatus = "failed" | "restricted" | "released";

export type EquipmentQualityEvent = {
  id: string;
  instrumentId: string;
  title: string;
  status: EquipmentQualityStatus;
  impact: string;
  accessionIds: string[];
  capaId: string;
  restriction: string;
  releaseNote: string;
  reporter: string;
  sample?: boolean;
  signatures: Signature[];
};

export type SupplierStatus = "approved" | "conditional" | "disqualified";

export type SupplierRecord = {
  id: string;
  name: string;
  service: string;
  status: SupplierStatus;
  risk: RiskLevel;
  reviewOn: string;
  evaluation: string;
  issue: string;
  capaId: string;
  sample?: boolean;
};

export type ComplaintStatus = "received" | "investigation" | "actions" | "closed";

export type ComplaintRecord = {
  id: string;
  title: string;
  detail: string;
  status: ComplaintStatus;
  accountId: string;
  accessionId: string;
  impact: string;
  capaId: string;
  reporter: string;
  closeReason: string;
  sample?: boolean;
  signatures: Signature[];
};

export type ReviewStatus = "open" | "done";

export type ManagementReview = {
  id: string;
  title: string;
  decision: string;
  owner: string;
  due: string;
  status: ReviewStatus;
  evidence: string;
  sample?: boolean;
  signatures: Signature[];
};

export type QualityNotice = {
  id: string;
  at: string;
  recordId: string;
  message: string;
  read: boolean;
};

export type QualityConfig = {
  methodology: string;
  scale: number;
  escalationDays: number;
  documentReviewDays: number;
  retentionDays: number;
  separationOfDuties: boolean;
  approvalPolicy: string;
  categories: string[];
  severities: string[];
};

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  methodology: "Likelihood times impact on a 1–5 scale. A score of 15 or higher is high. The laboratory documents and validates this scale before relying on it.",
  scale: 5,
  escalationDays: 7,
  documentReviewDays: 365,
  retentionDays: 2555,
  separationOfDuties: true,
  approvalPolicy: "The author, reporter, investigator, implementer, and proposer cannot approve or close their own record. A reviewer PIN binds the signature to the signed-in person.",
  categories: ["deviation", "nonconformance", "incident", "complaint", "oos", "oot"],
  severities: ["low", "medium", "high", "critical"],
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
  training?: TrainingAssignment[];
  audits?: QualityAudit[];
  findings?: AuditFinding[];
  risks?: QualityRisk[];
  equipment?: EquipmentQualityEvent[];
  suppliers?: SupplierRecord[];
  complaints?: ComplaintRecord[];
  reviews?: ManagementReview[];
  notifications?: QualityNotice[];
  config?: QualityConfig;
  nextTraining?: number;
  nextAuditRecord?: number;
  nextFinding?: number;
  nextRisk?: number;
  nextEquipment?: number;
  nextSupplier?: number;
  nextComplaint?: number;
  nextCapa?: number;
  nextReview?: number;
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

export function configOf(system: QualitySystem): QualityConfig {
  return { ...DEFAULT_QUALITY_CONFIG, ...system.config };
}

function duties(system: QualitySystem): boolean {
  return configOf(system).separationOfDuties;
}

export function ensureQuality(system: QualitySystem): QualitySystem {
  system.training ??= [];
  system.audits ??= [];
  system.findings ??= [];
  system.risks ??= [];
  system.equipment ??= [];
  system.suppliers ??= [];
  system.complaints ??= [];
  system.reviews ??= [];
  system.notifications ??= [];
  system.config = configOf(system);
  system.nextTraining ??= 1;
  system.nextAuditRecord ??= 1;
  system.nextFinding ??= 1;
  system.nextRisk ??= 1;
  system.nextEquipment ??= 1;
  system.nextSupplier ??= 1;
  system.nextComplaint ??= 1;
  system.nextCapa ??= 1;
  system.nextReview ??= 1;
  system.capas ??= [];
  system.changes ??= [];
  system.documents ??= [];
  return system;
}

export function riskScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

export function riskBand(score: number, config = DEFAULT_QUALITY_CONFIG): RiskLevel {
  const high = Math.ceil(config.scale * config.scale * 0.6);
  const medium = Math.ceil(config.scale * config.scale * 0.3);
  if (score >= high) return "high";
  if (score >= medium) return "medium";
  return "low";
}

function onScale(value: number, scale: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= scale;
}

function audit(system: QualitySystem, event: Omit<AuditEvent, "id" | "at"> & { at: string }) {
  const row = { id: `AUD-${system.nextAudit++}`, ...event };
  system.audit.push(row);
  system.notifications = system.notifications ?? [];
  if (!system.notifications.some((notice) => notice.id === row.id)) {
    system.notifications.push({ id: row.id, at: row.at, recordId: row.recordId, message: `${row.action}. ${row.reason}`.trim(), read: false });
  }
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
  if (duties(system) && same(signer, record.reporter)) return reject(system, record.id, signer, "The reporter cannot apply the QA close signature.", now);
  const investigator = signerOf(record, "investigation");
  const disposer = signerOf(record, "disposition");
  if (duties(system) && investigator && same(signer, investigator)) return reject(system, record.id, signer, "The investigator cannot apply the QA close signature.", now);
  if (duties(system) && disposer && same(signer, disposer)) return reject(system, record.id, signer, "The person who signed disposition cannot apply the QA close signature.", now);
  if (record.capaId) {
    const capa = system.capas.find((item) => item.id === record.capaId);
    if (!capa || capa.status !== "closed") {
      return fail(`Close waits on ${record.capaId}. Complete the effectiveness check before QA close.`);
    }
  }
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
  if (duties(system) && same(signer, record.implementer)) return reject(system, record.id, signer, "The person who implemented the action cannot judge its effectiveness.", now);
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
  if (duties(system) && same(signer, record.proposer)) return reject(system, record.id, signer, "The proposer cannot sign implementation of their own change.", now);
  if (record.documentId) {
    const document = system.documents.find((item) => item.id === record.documentId);
    if (!document || document.status !== "effective") {
      return fail(`${record.documentId} has to be effective before this change can be implemented.`);
    }
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
  if (duties(system) && same(signer, record.implementer)) return reject(system, record.id, signer, "The implementer cannot close their own change.", now);
  if (duties(system) && same(signer, record.proposer)) return reject(system, record.id, signer, "The proposer cannot close their own change.", now);
  if (record.documentId) {
    const document = system.documents.find((item) => item.id === record.documentId);
    if (!document || document.status !== "effective") return fail("The controlled document is no longer effective.");
    ensureQuality(system);
    const openTraining = system.training!.filter((item) => item.documentId === record.documentId && item.status === "assigned");
    if (openTraining.length) {
      return fail(`Close waits on training. ${openTraining.map((item) => item.assignee).join(", ")} still assigned on ${record.documentId}.`);
    }
  }
  record.closeReason = reason.trim();
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, changeSectionDigest(record, "closure"), now, "Change closed", record.closeReason);
  return ok();
}

export function applyApproveDocument(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { effectiveOn: string; training: string; assignees?: string[] },
  now = new Date(),
): QualityResult {
  const record = system.documents.find((item) => item.id === id);
  if (!record) return fail("That document was not found.");
  if (record.status !== "review") return fail("Approval is available while the document is in review.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveOn)) return fail("Enter the effective date as YYYY-MM-DD.");
  if (!input.training.trim()) return fail("Record who was trained before approval.");
  if (duties(system) && same(signer, record.author)) return reject(system, record.id, signer, "The author cannot approve their own document.", now);
  record.effectiveOn = input.effectiveOn;
  record.training = input.training.trim();
  if (input.assignees) record.assignees = input.assignees.map((person) => person.trim()).filter(Boolean);
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
    reason: `Effective ${record.effectiveOn}. Approval ${approval.id} remains bound. Prior effective version of ${record.code} is obsolete.`,
  });
  ensureQuality(system);
  for (const person of record.assignees ?? []) {
    if (system.training!.some((item) => item.documentId === record.id && same(item.assignee, person))) continue;
    const assignment: TrainingAssignment = {
      id: `TRN-${String(system.nextTraining!).padStart(3, "0")}`,
      documentId: record.id,
      assignee: person,
      status: "assigned",
      due: record.effectiveOn,
      completedOn: "",
      signatures: [],
    };
    system.nextTraining! += 1;
    system.training!.push(assignment);
    audit(system, {
      at: stamp(now),
      actor: signer,
      recordId: assignment.id,
      action: "Training assigned",
      reason: `${person} must read and acknowledge ${record.id} by ${assignment.due}.`,
    });
  }
  return ok();
}

function dated(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function padId(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(3, "0")}`;
}

export function applyOpenCapa(
  system: QualitySystem,
  input: { sourceId: string; title: string; rootCause: string; corrective: string; preventive: string; owner: string; checkOn: string },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!input.title.trim() || !input.rootCause.trim() || !input.corrective.trim() || !input.preventive.trim() || !input.owner.trim()) {
    return fail("Title, root cause, corrective action, preventive action, and an owner are required.");
  }
  if (!dated(input.checkOn)) return fail("Enter the effectiveness date as YYYY-MM-DD.");
  const source = input.sourceId.trim();
  const deviation = system.deviations.find((item) => item.id === source);
  const finding = system.findings!.find((item) => item.id === source);
  const complaint = system.complaints!.find((item) => item.id === source);
  const risk = system.risks!.find((item) => item.id === source);
  const equipment = system.equipment!.find((item) => item.id === source);
  if (!deviation && !finding && !complaint && !risk && !equipment && source !== "trend") {
    return fail("Link the CAPA to an event, finding, complaint, risk, equipment record, or trend.");
  }
  if (deviation && (deviation.status === "reported" || deviation.status === "contained")) {
    return fail("Open a CAPA after the investigation is signed.");
  }
  if (deviation?.capaId) return fail(`${deviation.capaId} is already linked to this event.`);
  if (finding && !finding.evidence.trim()) return fail("Record finding evidence before a CAPA.");
  if (finding?.capaId) return fail(`${finding.capaId} is already linked to this finding.`);
  if (finding?.status === "closed") return fail("This finding is already closed.");
  if (complaint && complaint.status === "received") return fail("Investigate the complaint before opening a CAPA.");
  if (complaint?.capaId) return fail(`${complaint.capaId} is already linked to this complaint.`);
  if (complaint?.status === "closed") return fail("This complaint is already closed.");
  if (equipment?.status === "released") return fail("This equipment record is already released.");
  if (equipment?.capaId) return fail(`${equipment.capaId} is already linked to this equipment record.`);
  const record: Capa = {
    id: `CAPA-${String(system.nextCapa!).padStart(3, "0")}`,
    title: input.title.trim(),
    sourceId: source,
    status: "plan",
    rootCause: input.rootCause.trim(),
    corrective: input.corrective.trim(),
    preventive: input.preventive.trim(),
    owner: input.owner.trim(),
    planner: signer,
    implementer: "",
    checkOn: input.checkOn,
    implementationEvidence: "",
    effectiveness: "",
    effectivenessEvidence: "",
    failedChecks: [],
    signatures: [],
  };
  system.nextCapa! += 1;
  system.capas.unshift(record);
  if (deviation) deviation.capaId = record.id;
  if (finding) {
    finding.capaId = record.id;
    finding.status = "remediation";
  }
  if (complaint) {
    complaint.capaId = record.id;
    complaint.status = "actions";
  }
  if (equipment) equipment.capaId = record.id;
  sign(system, record, "plan", "approval", signer, capaSectionDigest(record, "plan"), now, "CAPA plan approved", `${record.title} from ${source}`);
  return ok();
}

export function applyImplementCapa(system: QualitySystem, id: string, signer: string, evidence: string, now = new Date()): QualityResult {
  const record = system.capas.find((item) => item.id === id);
  if (!record) return fail("That CAPA was not found.");
  if (record.status !== "plan") return fail("Evidence is recorded while the CAPA is in plan.");
  if (!evidence.trim()) return fail("Implementation evidence is required before the action can move forward.");
  record.implementationEvidence = evidence.trim();
  record.implementer = signer;
  record.status = "implementation";
  sign(system, record, "implementation", "authorship", signer, capaSectionDigest(record, "implementation"), now, "CAPA actions implemented", record.implementationEvidence);
  return ok();
}

export function applyReopenCapa(system: QualitySystem, id: string, signer: string, reason: string, now = new Date()): QualityResult {
  const record = system.capas.find((item) => item.id === id);
  if (!record) return fail("That CAPA was not found.");
  if (record.status !== "closed") return fail("Only a closed CAPA can be reopened.");
  if (!reason.trim()) return fail("A written reason is required to reopen a CAPA.");
  const closer = signerOf(record, "closure");
  if (duties(system) && closer && same(signer, closer)) return reject(system, record.id, signer, "The person who closed the CAPA cannot reopen it.", now);
  record.status = "implementation";
  record.effectiveness = "";
  record.failedChecks.push(`${stamp(now)} ${signer}: Reopened. ${reason.trim()}`);
  audit(system, { at: stamp(now), actor: signer, recordId: record.id, action: "CAPA reopened", reason: `From closed to implementation. ${reason.trim()}` });
  return ok();
}

export function applyCompleteTraining(system: QualitySystem, id: string, signer: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.training!.find((item) => item.id === id);
  if (!record) return fail("That training assignment was not found.");
  if (record.status !== "assigned") return fail("This training assignment is already complete.");
  if (!same(signer, record.assignee)) return reject(system, record.id, signer, "Only the assigned person can acknowledge this training.", now);
  const document = system.documents.find((item) => item.id === record.documentId);
  if (!document || document.status !== "effective") return fail("Acknowledge the effective version of the document.");
  record.status = "completed";
  record.completedOn = dayOf(now);
  const digest = hash([record.id, record.documentId, record.assignee, document.body].join("|"));
  sign(system, record, "acknowledgement", "review", signer, digest, now, "Training acknowledged", `Read and understood ${record.documentId}.`);
  return ok();
}

export function applyProposeChange(
  system: QualitySystem,
  input: { title: string; description: string; documentId?: string },
  signer: string,
  now = new Date(),
): QualityResult {
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!input.title.trim() || !input.description.trim()) return fail("A title and a reason for the change are required.");
  const next = system.changes.reduce((max, item) => {
    const value = Number(item.id.replace("CC-", ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const record: ChangeControl = {
    id: `CC-${String(next + 1).padStart(3, "0")}`,
    title: input.title.trim(),
    description: input.description.trim(),
    proposer: signer,
    status: "proposed",
    impact: "",
    validation: "",
    documentId: input.documentId?.trim() ?? "",
    implementer: "",
    implementationNote: "",
    closeReason: "",
    signatures: [],
  };
  system.changes.unshift(record);
  sign(system, record, "proposal", "authorship", signer, changeSectionDigest(record, "proposal"), now, "Change proposed", record.title);
  return ok();
}

export function applyAssessChange(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { impact: string; validation: ValidationImpact },
  now = new Date(),
): QualityResult {
  const record = system.changes.find((item) => item.id === id);
  if (!record) return fail("That change was not found.");
  if (record.status !== "proposed") return fail("Impact is assessed while the change is proposed.");
  if (!input.impact.trim() || !input.validation) return fail("Impact and a validation decision are required.");
  record.impact = input.impact.trim();
  record.validation = input.validation;
  record.status = "assessment";
  sign(system, record, "assessment", "review", signer, changeSectionDigest(record, "assessment"), now, "Impact assessed", record.validation);
  return ok();
}

export function applyApproveChange(system: QualitySystem, id: string, signer: string, now = new Date()): QualityResult {
  const record = system.changes.find((item) => item.id === id);
  if (!record) return fail("That change was not found.");
  if (record.status !== "assessment") return fail("Approval follows the impact assessment.");
  if (!record.impact.trim() || !record.validation) return fail("Impact and validation have to be recorded before approval.");
  if (duties(system) && same(signer, record.proposer)) return reject(system, record.id, signer, "The proposer cannot approve their own change.", now);
  record.status = "approved";
  sign(system, record, "approval", "approval", signer, changeSectionDigest(record, "approval"), now, "Change approved", record.documentId || record.title);
  return ok();
}

export function applyReviseDocument(
  system: QualitySystem,
  input: { code: string; title: string; body: string; changeId: string; docType?: ControlledDocument["docType"] },
  signer: string,
  now = new Date(),
): QualityResult {
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!input.code.trim() || !input.title.trim() || !input.body.trim()) return fail("A document code, title, and body are required.");
  const code = input.code.trim();
  const family = system.documents.filter((item) => item.code === code);
  if (family.some((item) => item.status === "draft" || item.status === "review" || item.status === "approved")) {
    return fail(`${code} already has a revision that is not yet effective.`);
  }
  const change = input.changeId ? system.changes.find((item) => item.id === input.changeId) : undefined;
  if (input.changeId && !change) return fail("That change was not found.");
  if (change && (change.status === "implemented" || change.status === "closed")) return fail("This change is already implemented.");
  const version = family.reduce((max, item) => Math.max(max, item.version), 0) + 1;
  const record: ControlledDocument = {
    id: `${code}:${version}`,
    code,
    version,
    title: input.title.trim(),
    docType: input.docType ?? family[0]?.docType ?? "SOP",
    status: "review",
    author: signer,
    body: input.body.trim(),
    effectiveOn: "",
    training: "",
    changeId: input.changeId,
    obsoleteReason: "",
    signatures: [],
  };
  system.documents.unshift(record);
  if (change && !change.documentId) change.documentId = record.id;
  sign(system, record, "authorship", "authorship", signer, documentSectionDigest(record, "authorship"), now, "Document authored", `Revision ${record.id} submitted for approval.`);
  return ok();
}

export function applyPlanAudit(
  system: QualitySystem,
  input: { title: string; kind: QualityAudit["kind"]; scope: string; criteria: string; auditor: string; scheduledOn: string },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  if (!input.title.trim() || !input.scope.trim() || !input.criteria.trim() || !input.auditor.trim()) {
    return fail("Title, scope, criteria, and an auditor are required.");
  }
  if (!dated(input.scheduledOn)) return fail("Enter the audit date as YYYY-MM-DD.");
  const record: QualityAudit = {
    id: padId("QA", system.nextAuditRecord!),
    title: input.title.trim(),
    kind: input.kind,
    status: "planned",
    scope: input.scope.trim(),
    criteria: input.criteria.trim(),
    auditor: input.auditor.trim(),
    scheduledOn: input.scheduledOn,
    signatures: [],
  };
  system.nextAuditRecord! += 1;
  system.audits!.unshift(record);
  sign(system, record, "plan", "authorship", signer, hash([record.title, record.scope, record.criteria, record.auditor].join("|")), now, "Audit planned", record.title);
  return ok();
}

export function applyStartAudit(system: QualitySystem, id: string, signer: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.audits!.find((item) => item.id === id);
  if (!record) return fail("That audit was not found.");
  if (record.status !== "planned") return fail("An audit starts from the planned state.");
  record.status = "in_progress";
  sign(system, record, "start", "review", signer, hash(record.id + record.scope), now, "Audit started", record.scope);
  return ok();
}

export function applyRecordFinding(
  system: QualitySystem,
  input: { auditId: string; title: string; evidence: string; risk: RiskLevel },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  const audit = system.audits!.find((item) => item.id === input.auditId);
  if (!audit) return fail("That audit was not found.");
  if (audit.status !== "in_progress" && audit.status !== "findings") return fail("Findings are recorded while the audit is in progress.");
  if (!input.title.trim() || !input.evidence.trim()) return fail("A finding title and evidence are required.");
  const record: AuditFinding = {
    id: padId("FND", system.nextFinding!),
    auditId: audit.id,
    title: input.title.trim(),
    evidence: input.evidence.trim(),
    risk: input.risk,
    capaId: "",
    status: "open",
    closeReason: "",
    signatures: [],
  };
  system.nextFinding! += 1;
  system.findings!.unshift(record);
  audit.status = "findings";
  sign(system, record, "record", "authorship", signer, hash([record.title, record.evidence, record.risk].join("|")), now, "Finding recorded", record.evidence);
  return ok();
}

export function applyCloseFinding(system: QualitySystem, id: string, signer: string, reason: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.findings!.find((item) => item.id === id);
  if (!record) return fail("That finding was not found.");
  if (record.status === "closed") return fail("This finding is already closed.");
  if (!reason.trim()) return fail("A written verification is required to close a finding.");
  if (!record.capaId) return fail("Link a CAPA before closing the finding.");
  const capa = system.capas.find((item) => item.id === record.capaId);
  if (!capa || capa.status !== "closed") return fail(`Close waits on ${record.capaId}. The corrective action has to be verified first.`);
  const recorder = signerOf(record, "record");
  if (duties(system) && recorder && same(signer, recorder)) return reject(system, record.id, signer, "The person who recorded the finding cannot close it.", now);
  record.closeReason = reason.trim();
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, hash(record.closeReason + record.capaId), now, "Finding closed", record.closeReason);
  return ok();
}

export function applyCloseAudit(system: QualitySystem, id: string, signer: string, reason: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.audits!.find((item) => item.id === id);
  if (!record) return fail("That audit was not found.");
  if (record.status === "closed") return fail("This audit is already closed.");
  if (record.status !== "findings" && record.status !== "in_progress") return fail("Close the audit after fieldwork.");
  if (!reason.trim()) return fail("A written summary is required to close an audit.");
  const findings = system.findings!.filter((item) => item.auditId === record.id);
  if (!findings.length) return fail("Record findings, including a documented statement when none were observed.");
  const open = findings.filter((item) => item.status !== "closed");
  if (open.length) return fail(`Close waits on ${open.map((item) => item.id).join(", ")}.`);
  if (duties(system) && findings.some((item) => same(signerOf(item, "record"), signer))) {
    return reject(system, record.id, signer, "The person who recorded a finding cannot close the audit.", now);
  }
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, hash(reason.trim()), now, "Audit closed", reason.trim());
  return ok();
}

export function applyRegisterRisk(
  system: QualitySystem,
  input: { title: string; hazard: string; likelihood: number; impact: number; owner: string; reviewOn: string },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  const config = configOf(system);
  if (!input.title.trim() || !input.hazard.trim() || !input.owner.trim()) return fail("A title, hazard, and owner are required.");
  if (!onScale(input.likelihood, config.scale) || !onScale(input.impact, config.scale)) {
    return fail(`Score likelihood and impact from 1 to ${config.scale}. ${config.methodology}`);
  }
  if (!dated(input.reviewOn)) return fail("Enter the review date as YYYY-MM-DD.");
  const record: QualityRisk = {
    id: padId("RSK", system.nextRisk!),
    title: input.title.trim(),
    hazard: input.hazard.trim(),
    status: "open",
    likelihood: input.likelihood,
    impact: input.impact,
    residualLikelihood: 0,
    residualImpact: 0,
    owner: input.owner.trim(),
    reviewOn: input.reviewOn,
    changeId: "",
    control: "",
    signatures: [],
  };
  system.nextRisk! += 1;
  system.risks!.unshift(record);
  const score = riskScore(record.likelihood, record.impact);
  sign(system, record, "register", "authorship", signer, hash([record.hazard, String(score), config.methodology].join("|")), now, "Risk registered", `${config.methodology} Score ${score} (${riskBand(score, config)}).`);
  return ok();
}

export function applyMitigateRisk(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { control: string; changeId: string },
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  const record = system.risks!.find((item) => item.id === id);
  if (!record) return fail("That risk was not found.");
  if (record.status !== "open") return fail("Mitigation starts while the risk is open.");
  if (!input.control.trim()) return fail("Describe the control that reduces this risk.");
  const change = system.changes.find((item) => item.id === input.changeId);
  if (!change) return fail("Link a change request before mitigation can start.");
  record.control = input.control.trim();
  record.changeId = change.id;
  record.status = "mitigating";
  sign(system, record, "mitigation", "review", signer, hash([record.control, record.changeId].join("|")), now, "Mitigation linked", `${record.changeId}: ${record.control}`);
  return ok();
}

export function applyReassessRisk(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { likelihood: number; impact: number },
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  const record = system.risks!.find((item) => item.id === id);
  if (!record) return fail("That risk was not found.");
  if (record.status !== "mitigating") return fail("Reassess residual risk after mitigation has started.");
  const change = system.changes.find((item) => item.id === record.changeId);
  if (!change || change.status !== "closed") return fail("Reassess residual risk after the linked change is closed.");
  const config = configOf(system);
  if (!onScale(input.likelihood, config.scale) || !onScale(input.impact, config.scale)) {
    return fail(`Score residual likelihood and impact from 1 to ${config.scale}.`);
  }
  const mitigator = signerOf(record, "mitigation");
  if (duties(system) && mitigator && same(signer, mitigator)) return reject(system, record.id, signer, "The person who assigned the mitigation cannot reassess residual risk.", now);
  record.residualLikelihood = input.likelihood;
  record.residualImpact = input.impact;
  record.status = "reassessed";
  const score = riskScore(input.likelihood, input.impact);
  sign(system, record, "reassess", "review", signer, hash([String(score), config.methodology].join("|")), now, "Residual risk reassessed", `${config.methodology} Residual score ${score} (${riskBand(score, config)}).`);
  return ok();
}

export function applyReportEquipment(
  system: QualitySystem,
  input: { instrumentId: string; title: string; accessionIds: string[] },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!input.instrumentId.trim() || !input.title.trim()) return fail("An instrument and a description are required.");
  const record: EquipmentQualityEvent = {
    id: `EQ-${system.nextEquipment!}`,
    instrumentId: input.instrumentId.trim(),
    title: input.title.trim(),
    status: "failed",
    impact: "",
    accessionIds: input.accessionIds.map((item) => item.trim()).filter(Boolean),
    capaId: "",
    restriction: "",
    releaseNote: "",
    reporter: signer,
    signatures: [],
  };
  system.nextEquipment! += 1;
  system.equipment!.unshift(record);
  sign(system, record, "report", "authorship", signer, hash([record.instrumentId, record.title, record.accessionIds.join(",")].join("|")), now, "Calibration failure recorded", record.title);
  return ok();
}

export function applyRestrictEquipment(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { impact: string; restriction: string },
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  const record = system.equipment!.find((item) => item.id === id);
  if (!record) return fail("That equipment record was not found.");
  if (record.status !== "failed") return fail("A restriction follows the failed calibration or qualification.");
  if (!input.impact.trim() || !input.restriction.trim()) return fail("Impact and the restriction are required.");
  record.impact = input.impact.trim();
  record.restriction = input.restriction.trim();
  record.status = "restricted";
  sign(system, record, "restriction", "review", signer, hash([record.impact, record.restriction].join("|")), now, "Equipment restricted", record.restriction);
  return ok();
}

export function applyReleaseEquipment(system: QualitySystem, id: string, signer: string, note: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.equipment!.find((item) => item.id === id);
  if (!record) return fail("That equipment record was not found.");
  if (record.status !== "restricted") return fail("Release follows a documented restriction and impact assessment.");
  if (!note.trim()) return fail("Release requires a written investigation and approval note.");
  if (!record.impact.trim() || !record.restriction.trim()) return fail("Impact and the restriction have to be recorded first.");
  if (duties(system) && same(signer, record.reporter)) return reject(system, record.id, signer, "The person who reported the failure cannot release the equipment.", now);
  if (record.capaId) {
    const capa = system.capas.find((item) => item.id === record.capaId);
    if (!capa || capa.status !== "closed") return fail(`Release waits on ${record.capaId}.`);
  }
  record.releaseNote = note.trim();
  record.status = "released";
  sign(system, record, "release", "approval", signer, hash(record.releaseNote), now, "Equipment released", "Returned to service. Linked accessions were not changed.");
  return ok();
}

export function applyQualifySupplier(
  system: QualitySystem,
  input: { name: string; service: string; risk: RiskLevel; reviewOn: string; evaluation: string },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  if (!input.name.trim() || !input.service.trim() || !input.evaluation.trim()) return fail("Name, service, and an evaluation are required.");
  if (!dated(input.reviewOn)) return fail("Enter the review date as YYYY-MM-DD.");
  const record: SupplierRecord = {
    id: padId("SUP", system.nextSupplier!),
    name: input.name.trim(),
    service: input.service.trim(),
    status: "approved",
    risk: input.risk,
    reviewOn: input.reviewOn,
    evaluation: input.evaluation.trim(),
    issue: "",
    capaId: "",
  };
  system.nextSupplier! += 1;
  system.suppliers!.unshift(record);
  audit(system, { at: stamp(now), actor: signer, recordId: record.id, action: "Supplier qualified", reason: record.evaluation });
  return ok();
}

export function applySupplierIssue(system: QualitySystem, id: string, signer: string, input: { issue: string; capaId?: string }, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.suppliers!.find((item) => item.id === id);
  if (!record) return fail("That supplier was not found.");
  if (record.status === "disqualified") return fail("This supplier is already disqualified.");
  if (!input.issue.trim()) return fail("Describe the supplier issue.");
  record.issue = input.issue.trim();
  if (input.capaId) {
    const capa = system.capas.find((item) => item.id === input.capaId);
    if (!capa) return fail("That CAPA was not found.");
    record.capaId = capa.id;
  }
  record.status = record.risk === "high" ? "conditional" : "conditional";
  audit(system, { at: stamp(now), actor: signer, recordId: record.id, action: "Supplier issue recorded", reason: `From approved to conditional. ${record.issue}` });
  return ok();
}

export function applyRecordComplaint(
  system: QualitySystem,
  input: { title: string; detail: string; accountId: string; accessionId: string },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!input.title.trim() || !input.detail.trim()) return fail("A title and the complaint detail are required.");
  const record: ComplaintRecord = {
    id: padId("CMP", system.nextComplaint!),
    title: input.title.trim(),
    detail: input.detail.trim(),
    status: "received",
    accountId: input.accountId.trim(),
    accessionId: input.accessionId.trim(),
    impact: "",
    capaId: "",
    reporter: signer,
    closeReason: "",
    signatures: [],
  };
  system.nextComplaint! += 1;
  system.complaints!.unshift(record);
  sign(system, record, "report", "authorship", signer, hash([record.title, record.detail, record.accountId, record.accessionId].join("|")), now, "Complaint recorded", record.title);
  return ok();
}

export function applyInvestigateComplaint(
  system: QualitySystem,
  id: string,
  signer: string,
  input: { impact: string },
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  const record = system.complaints!.find((item) => item.id === id);
  if (!record) return fail("That complaint was not found.");
  if (record.status !== "received") return fail("Investigation starts from a received complaint.");
  if (!input.impact.trim()) return fail("An impact assessment is required.");
  record.impact = input.impact.trim();
  record.status = "investigation";
  sign(system, record, "investigation", "review", signer, hash(record.impact), now, "Complaint investigated", record.impact);
  return ok();
}

export function applyCloseComplaint(system: QualitySystem, id: string, signer: string, reason: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.complaints!.find((item) => item.id === id);
  if (!record) return fail("That complaint was not found.");
  if (record.status !== "investigation" && record.status !== "actions") return fail("Close follows investigation.");
  if (!record.impact.trim()) return fail("Assess impact before closing the complaint.");
  if (!reason.trim()) return fail("A written closure reason is required.");
  if (duties(system) && same(signer, record.reporter)) return reject(system, record.id, signer, "The person who recorded the complaint cannot close it.", now);
  if (record.capaId) {
    const capa = system.capas.find((item) => item.id === record.capaId);
    if (!capa || capa.status !== "closed") return fail(`Close waits on ${record.capaId}.`);
  }
  record.closeReason = reason.trim();
  record.status = "closed";
  sign(system, record, "closure", "closure", signer, hash(record.closeReason), now, "Complaint closed", record.closeReason);
  return ok();
}

export function applyRecordReview(
  system: QualitySystem,
  input: { title: string; decision: string; owner: string; due: string },
  signer: string,
  now = new Date(),
): QualityResult {
  ensureQuality(system);
  if (!input.title.trim() || !input.decision.trim() || !input.owner.trim()) return fail("A title, decision, and owner are required.");
  if (!dated(input.due)) return fail("Enter the follow-up date as YYYY-MM-DD.");
  const record: ManagementReview = {
    id: padId("MR", system.nextReview!),
    title: input.title.trim(),
    decision: input.decision.trim(),
    owner: input.owner.trim(),
    due: input.due,
    status: "open",
    evidence: "",
    signatures: [],
  };
  system.nextReview! += 1;
  system.reviews!.unshift(record);
  sign(system, record, "decision", "approval", signer, hash([record.title, record.decision, record.owner].join("|")), now, "Management review recorded", record.decision);
  return ok();
}

export function applyCompleteReview(system: QualitySystem, id: string, signer: string, evidence: string, now = new Date()): QualityResult {
  ensureQuality(system);
  const record = system.reviews!.find((item) => item.id === id);
  if (!record) return fail("That review was not found.");
  if (record.status !== "open") return fail("This review action is already complete.");
  if (!evidence.trim()) return fail("Follow-up evidence is required.");
  const decider = signerOf(record, "decision");
  if (duties(system) && decider && same(signer, decider)) return reject(system, record.id, signer, "The person who recorded the decision cannot close the follow-up.", now);
  record.evidence = evidence.trim();
  record.status = "done";
  sign(system, record, "followup", "closure", signer, hash(record.evidence), now, "Review action completed", record.evidence);
  return ok();
}

export function applyUpdateConfig(system: QualitySystem, signer: string, next: QualityConfig, now = new Date()): QualityResult {
  ensureQuality(system);
  if (!signer.trim()) return fail("A signed-in person is required.");
  if (!next.methodology.trim()) return fail("Document the scoring methodology.");
  if (!Number.isInteger(next.scale) || next.scale < 2 || next.scale > 5) return fail("The risk scale must be a whole number from 2 to 5.");
  if (!Number.isInteger(next.escalationDays) || next.escalationDays < 1) return fail("Escalation days must be at least 1.");
  if (!Number.isInteger(next.documentReviewDays) || next.documentReviewDays < 1) return fail("The document review period must be at least 1 day.");
  if (!Number.isInteger(next.retentionDays) || next.retentionDays < 1) return fail("Retention days must be at least 1.");
  if (!next.approvalPolicy.trim()) return fail("Document the approval policy.");
  if (!next.categories.length || !next.severities.length) return fail("At least one category and one severity are required.");
  const before = JSON.stringify(configOf(system));
  system.config = { ...next, categories: [...next.categories], severities: [...next.severities] };
  audit(system, {
    at: stamp(now),
    actor: signer,
    recordId: "quality-config",
    action: "Configuration updated",
    reason: `Before ${before}. After ${JSON.stringify(system.config)}.`,
  });
  return ok();
}

export type ComplianceMetrics = {
  openEvents: number;
  overdueActions: number;
  upcomingDeadlines: number;
  highRiskOpen: number;
  capaEffectiveness: number | null;
  trainingGaps: number;
  pendingApprovals: number;
  auditReadiness: number;
  calibrationAlerts: number;
  openComplaints: number;
};

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const value = new Date(year, (month ?? 1) - 1, date ?? 1);
  value.setDate(value.getDate() + days);
  return dayOf(value);
}

export function complianceMetrics(system: QualitySystem, today = new Date()): ComplianceMetrics {
  ensureQuality(system);
  const config = configOf(system);
  const day = dayOf(today);
  const horizon = addDays(day, config.escalationDays);
  const overdueCapas = system.capas.filter((item) => item.status !== "closed" && item.checkOn && item.checkOn < day).length;
  const overdueTraining = system.training!.filter((item) => item.status === "assigned" && item.due && item.due < day).length;
  const closedCapas = system.capas.filter((item) => item.status === "closed");
  const effective = closedCapas.filter((item) => item.effectiveness === "effective").length;
  const dates = [
    ...system.capas.filter((item) => item.status !== "closed").map((item) => item.checkOn),
    ...system.training!.filter((item) => item.status === "assigned").map((item) => item.due),
    ...system.risks!.map((item) => item.reviewOn),
    ...system.suppliers!.map((item) => item.reviewOn),
    ...system.audits!.filter((item) => item.status !== "closed").map((item) => item.scheduledOn),
    ...system.reviews!.filter((item) => item.status === "open").map((item) => item.due),
  ].filter((value) => value >= day && value <= horizon);
  const highRisks = system.risks!.filter((item) => item.status !== "reassessed" && riskBand(riskScore(item.likelihood, item.impact), config) === "high").length;
  const highFindings = system.findings!.filter((item) => item.status !== "closed" && item.risk === "high").length;
  return {
    openEvents: system.deviations.filter((item) => item.status !== "closed").length,
    overdueActions: overdueCapas + overdueTraining,
    upcomingDeadlines: dates.length,
    highRiskOpen: highRisks + highFindings + system.equipment!.filter((item) => item.status !== "released").length,
    capaEffectiveness: closedCapas.length ? Math.round((effective / closedCapas.length) * 100) : null,
    trainingGaps: system.training!.filter((item) => item.status === "assigned").length,
    pendingApprovals: system.documents.filter((item) => item.status === "review" || item.status === "approved").length + system.changes.filter((item) => item.status === "proposed" || item.status === "assessment").length,
    auditReadiness: system.findings!.filter((item) => item.status !== "closed").length,
    calibrationAlerts: system.equipment!.filter((item) => item.status !== "released").length,
    openComplaints: system.complaints!.filter((item) => item.status !== "closed").length,
  };
}

export function qualityRecordKey(instanceId?: string): string {
  return qualityKey(instanceId);
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
    nextTraining: 5,
    nextAuditRecord: 5,
    nextFinding: 15,
    nextRisk: 8,
    nextEquipment: 222,
    nextSupplier: 4,
    nextComplaint: 9,
    nextCapa: 16,
    nextReview: 4,
    deviations: [],
    capas: [],
    changes: [],
    documents: [],
    training: [],
    audits: [],
    findings: [],
    risks: [],
    equipment: [],
    suppliers: [],
    complaints: [],
    reviews: [],
    notifications: [],
    config: { ...DEFAULT_QUALITY_CONFIG },
    audit: [],
  };

  const sop = (values: Omit<ControlledDocument, "signatures" | "obsoleteReason" | "effectiveOn" | "training"> & { effectiveOn?: string; training?: string }): ControlledDocument => ({
    effectiveOn: "",
    training: "",
    obsoleteReason: "",
    signatures: [],
    sample: true,
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
  closed.capaId = "CAPA-015";
  closed.sample = true;
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
  excursion.sample = true;
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
  label.sample = true;
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
    sample: true,
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
    sample: true,
    signatures: [],
  };
  system.changes.push(change);
  seal(system, change, "proposal", "authorship", change.proposer, changeSectionDigest(change, "proposal"), "2026-07-18 13:45", "Change proposed", change.title);
  seal(system, change, "assessment", "review", "L. Okonkwo", changeSectionDigest(change, "assessment"), "2026-07-19 10:00", "Impact assessed", change.validation);
  seal(system, change, "approval", "approval", "Jonah Park", changeSectionDigest(change, "approval"), "2026-07-22 15:10", "Change approved", change.documentId);

  system.training!.push({
    id: "TRN-004",
    documentId: "SOP-QA-004:2",
    assignee: "J. Ortiz",
    status: "assigned",
    due: "2026-08-01",
    completedOn: "",
    sample: true,
    signatures: [],
  });
  audit(system, { at: "2026-07-20 09:00", actor: "A. Ruiz", recordId: "TRN-004", action: "Training assigned", reason: "J. Ortiz must read and acknowledge SOP-QA-004:2 by 2026-08-01." });

  const plannedAudit: QualityAudit = {
    id: "QA-004",
    title: "Chamber alarm and training controls",
    kind: "internal",
    status: "in_progress",
    scope: "East Lab chamber alarms and the on-call response.",
    criteria: "SOP-QA-004 and the July management review.",
    auditor: "Jonah Park",
    scheduledOn: "2026-09-30",
    sample: true,
    signatures: [],
  };
  system.audits!.push(plannedAudit);
  seal(system, plannedAudit, "plan", "authorship", "A. Ruiz", hash("Chamber alarm and training controls|East Lab chamber alarms and the on-call response.|SOP-QA-004 and the July management review.|Jonah Park"), "2026-07-28 10:00", "Audit planned", plannedAudit.title);

  const finding: AuditFinding = {
    id: "FND-014",
    auditId: "QA-004",
    title: "Alarm response missing from two training rosters",
    evidence: "The July roster does not list J. Ortiz or S. Patel for the chamber alarm response.",
    risk: "high",
    capaId: "",
    status: "open",
    closeReason: "",
    sample: true,
    signatures: [],
  };
  system.findings!.push(finding);
  plannedAudit.status = "findings";
  seal(system, finding, "record", "authorship", "Jonah Park", hash([finding.title, finding.evidence, finding.risk].join("|")), "2026-07-28 11:20", "Finding recorded", finding.evidence);

  const risk: QualityRisk = {
    id: "RSK-007",
    title: "Unanswered chamber alarm",
    hazard: "A stability chamber can leave its range without an on-call response.",
    status: "open",
    likelihood: 4,
    impact: 4,
    residualLikelihood: 0,
    residualImpact: 0,
    owner: "A. Ruiz",
    reviewOn: "2026-10-01",
    changeId: "",
    control: "",
    sample: true,
    signatures: [],
  };
  system.risks!.push(risk);
  seal(system, risk, "register", "authorship", "A. Ruiz", hash([risk.hazard, "16", DEFAULT_QUALITY_CONFIG.methodology].join("|")), "2026-07-21 14:00", "Risk registered", "Score 16 (high).");

  const equipment: EquipmentQualityEvent = {
    id: "EQ-221",
    instrumentId: "inst-ftir",
    title: "FTIR calibration out of tolerance",
    status: "failed",
    impact: "",
    accessionIds: ["SCP-20458"],
    capaId: "",
    restriction: "",
    releaseNote: "",
    reporter: "J. Ortiz",
    sample: true,
    signatures: [],
  };
  system.equipment!.push(equipment);
  seal(system, equipment, "report", "authorship", equipment.reporter, hash([equipment.instrumentId, equipment.title, equipment.accessionIds.join(",")].join("|")), "2026-07-24 10:40", "Calibration failure recorded", equipment.title);

  system.suppliers!.push({
    id: "SUP-003",
    name: "North Calibration",
    service: "Balance and FTIR calibration",
    status: "approved",
    risk: "medium",
    reviewOn: "2026-11-01",
    evaluation: "Last on-site evaluation 2026-05-12. Certificates are filed with the supplier record and are not invented here.",
    issue: "",
    capaId: "",
    sample: true,
  });
  audit(system, { at: "2026-05-12 15:00", actor: "A. Ruiz", recordId: "SUP-003", action: "Supplier qualified", reason: "On-site evaluation completed." });

  const complaint: ComplaintRecord = {
    id: "CMP-008",
    title: "Identity result not yet reported",
    detail: "Vertex Materials asked why Identity FTIR for SCP-20458 has not been reported.",
    status: "received",
    accountId: "acc-vertex",
    accessionId: "SCP-20458",
    impact: "",
    capaId: "",
    reporter: "S. Patel",
    closeReason: "",
    sample: true,
    signatures: [],
  };
  system.complaints!.push(complaint);
  seal(system, complaint, "report", "authorship", complaint.reporter, hash([complaint.title, complaint.detail, complaint.accountId, complaint.accessionId].join("|")), "2026-07-26 09:15", "Complaint recorded", complaint.title);

  const review: ManagementReview = {
    id: "MR-003",
    title: "July quality review",
    decision: "Chamber alarm training stays open until CAPA-015 passes its effectiveness check.",
    owner: "Jonah Park",
    due: "2026-09-30",
    status: "open",
    evidence: "",
    sample: true,
    signatures: [],
  };
  system.reviews!.push(review);
  seal(system, review, "decision", "approval", "Jonah Park", hash([review.title, review.decision, review.owner].join("|")), "2026-07-29 16:00", "Management review recorded", review.decision);

  return system;
}

function readQuality(instanceId = currentInstanceId()): QualitySystem | null {
  const parsed = readJson<QualitySystem>(qualityKey(instanceId), instanceId === "demo" ? [STORAGE_KEY] : []);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.deviations) || !Array.isArray(parsed.audit)) return null;
  parsed.instanceId = instanceId;
  parsed.deviations = parsed.deviations.map((row) => ({ ...row, labId: row.labId || labIdFromSite(row.site) }));
  return ensureQuality(parsed);
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

export function approveDocument(id: string, signer: string, input: { effectiveOn: string; training: string; assignees?: string[] }): string {
  return run((draft) => applyApproveDocument(draft, id, signer, input));
}

export function issueDocument(id: string, signer: string): string {
  return run((draft) => applyIssueDocument(draft, id, signer));
}

export function openCapa(input: { sourceId: string; title: string; rootCause: string; corrective: string; preventive: string; owner: string; checkOn: string }, signer: string): string {
  return run((draft) => applyOpenCapa(draft, input, signer));
}

export function implementCapa(id: string, signer: string, evidence: string): string {
  return run((draft) => applyImplementCapa(draft, id, signer, evidence));
}

export function reopenCapa(id: string, signer: string, reason: string): string {
  return run((draft) => applyReopenCapa(draft, id, signer, reason));
}

export function completeTraining(id: string, signer: string): string {
  return run((draft) => applyCompleteTraining(draft, id, signer));
}

export function proposeChange(input: { title: string; description: string; documentId?: string }, signer: string): string {
  return run((draft) => applyProposeChange(draft, input, signer));
}

export function assessChange(id: string, signer: string, input: { impact: string; validation: ValidationImpact }): string {
  return run((draft) => applyAssessChange(draft, id, signer, input));
}

export function approveChange(id: string, signer: string): string {
  return run((draft) => applyApproveChange(draft, id, signer));
}

export function reviseDocument(input: { code: string; title: string; body: string; changeId: string; docType?: ControlledDocument["docType"] }, signer: string): string {
  return run((draft) => applyReviseDocument(draft, input, signer));
}

export function planAudit(input: { title: string; kind: QualityAudit["kind"]; scope: string; criteria: string; auditor: string; scheduledOn: string }, signer: string): string {
  return run((draft) => applyPlanAudit(draft, input, signer));
}

export function startAudit(id: string, signer: string): string {
  return run((draft) => applyStartAudit(draft, id, signer));
}

export function recordFinding(input: { auditId: string; title: string; evidence: string; risk: RiskLevel }, signer: string): string {
  return run((draft) => applyRecordFinding(draft, input, signer));
}

export function closeFinding(id: string, signer: string, reason: string): string {
  return run((draft) => applyCloseFinding(draft, id, signer, reason));
}

export function closeAudit(id: string, signer: string, reason: string): string {
  return run((draft) => applyCloseAudit(draft, id, signer, reason));
}

export function registerRisk(input: { title: string; hazard: string; likelihood: number; impact: number; owner: string; reviewOn: string }, signer: string): string {
  return run((draft) => applyRegisterRisk(draft, input, signer));
}

export function mitigateRisk(id: string, signer: string, input: { control: string; changeId: string }): string {
  return run((draft) => applyMitigateRisk(draft, id, signer, input));
}

export function reassessRisk(id: string, signer: string, input: { likelihood: number; impact: number }): string {
  return run((draft) => applyReassessRisk(draft, id, signer, input));
}

export function reportEquipment(input: { instrumentId: string; title: string; accessionIds: string[] }, signer: string): string {
  return run((draft) => applyReportEquipment(draft, input, signer));
}

export function restrictEquipment(id: string, signer: string, input: { impact: string; restriction: string }): string {
  return run((draft) => applyRestrictEquipment(draft, id, signer, input));
}

export function releaseEquipment(id: string, signer: string, note: string): string {
  return run((draft) => applyReleaseEquipment(draft, id, signer, note));
}

export function qualifySupplier(input: { name: string; service: string; risk: RiskLevel; reviewOn: string; evaluation: string }, signer: string): string {
  return run((draft) => applyQualifySupplier(draft, input, signer));
}

export function supplierIssue(id: string, signer: string, input: { issue: string; capaId?: string }): string {
  return run((draft) => applySupplierIssue(draft, id, signer, input));
}

export function recordComplaint(input: { title: string; detail: string; accountId: string; accessionId: string }, signer: string): string {
  return run((draft) => applyRecordComplaint(draft, input, signer));
}

export function investigateComplaint(id: string, signer: string, input: { impact: string }): string {
  return run((draft) => applyInvestigateComplaint(draft, id, signer, input));
}

export function closeComplaint(id: string, signer: string, reason: string): string {
  return run((draft) => applyCloseComplaint(draft, id, signer, reason));
}

export function recordReview(input: { title: string; decision: string; owner: string; due: string }, signer: string): string {
  return run((draft) => applyRecordReview(draft, input, signer));
}

export function completeReview(id: string, signer: string, evidence: string): string {
  return run((draft) => applyCompleteReview(draft, id, signer, evidence));
}

export function updateQualityConfig(signer: string, next: QualityConfig): string {
  return run((draft) => applyUpdateConfig(draft, signer, next));
}

export function markNoticeRead(id: string): void {
  update((draft) => {
    ensureQuality(draft);
    const notice = draft.notifications!.find((item) => item.id === id);
    if (notice) notice.read = true;
  });
}

export function markAllNoticesRead(): void {
  update((draft) => {
    ensureQuality(draft);
    for (const notice of draft.notifications!) notice.read = true;
  });
}

export function rejectSignature(recordId: string, actor: string, reason: string): void {
  update((draft) => {
    audit(draft, { at: stamp(new Date()), actor, recordId, action: "Signature rejected", reason });
  });
}

export type QualityKind = "deviation" | "capa" | "change" | "document" | "training" | "audit" | "finding" | "risk" | "equipment" | "supplier" | "complaint" | "review" | "";

export function recordKind(system: QualitySystem, id: string): QualityKind {
  ensureQuality(system);
  if (system.deviations.some((record) => record.id === id)) return "deviation";
  if (system.capas.some((record) => record.id === id)) return "capa";
  if (system.changes.some((record) => record.id === id)) return "change";
  if (system.documents.some((record) => record.id === id)) return "document";
  if (system.training!.some((record) => record.id === id)) return "training";
  if (system.audits!.some((record) => record.id === id)) return "audit";
  if (system.findings!.some((record) => record.id === id)) return "finding";
  if (system.risks!.some((record) => record.id === id)) return "risk";
  if (system.equipment!.some((record) => record.id === id)) return "equipment";
  if (system.suppliers!.some((record) => record.id === id)) return "supplier";
  if (system.complaints!.some((record) => record.id === id)) return "complaint";
  if (system.reviews!.some((record) => record.id === id)) return "review";
  return "";
}
