import type { BillRoute, Charge, ChargeStatus } from "../revenueCycle";

export type ClaimWorkflow =
  | "draft"
  | "review"
  | "scrubbed"
  | "ready"
  | "submitted"
  | "accepted"
  | "rejected"
  | "adjudicated"
  | "paid"
  | "denied"
  | "appealed"
  | "resolved";

export type ClaimFinancial =
  | "unbilled"
  | "receivable"
  | "partial"
  | "collected"
  | "denied_balance"
  | "credit"
  | "written_off";

export type ClaimRecordStatus = "open" | "closed";

export type QueueId =
  | "review"
  | "capture"
  | "missing"
  | "ready"
  | "rejected"
  | "denials"
  | "appeals"
  | "eligibility"
  | "authorization"
  | "unposted"
  | "aging";

export type Exception = {
  code: string;
  message: string;
  impact: string;
  action: string;
  owner: string;
};

export type Claim = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName: string;
  accessionId: string;
  orderId: string;
  route: BillRoute;
  payerName: string;
  payerId: string;
  plan: string;
  workflow: ClaimWorkflow;
  financial: ClaimFinancial;
  recordStatus: ClaimRecordStatus;
  billedCents: number;
  paidCents: number;
  adjustmentCents: number;
  balanceCents: number;
  submittedAt: string;
  ageDays: number;
  lineIds: string[];
  lines: Charge[];
  exceptions: Exception[];
  nextAction: string;
  owner: string;
};

export type AgingBucket = "current" | "d1" | "d31" | "d61" | "d91" | "d120";

export type Payment = {
  id: string;
  tenantId: string;
  claimId: string;
  chargeId: string;
  remittanceId: string;
  cents: number;
  method: "era" | "check" | "eft" | "patient" | "client";
  postedBy: string;
  at: string;
};

export type Remittance = {
  id: string;
  tenantId: string;
  payerName: string;
  payerId: string;
  checkNumber: string;
  receivedAt: string;
  totalCents: number;
  postedCents: number;
  status: "unposted" | "partial" | "posted";
};

export type Denial = {
  id: string;
  tenantId: string;
  claimId: string;
  chargeId: string;
  carc: string;
  rarc: string;
  reason: string;
  rootCause: string;
  payerName: string;
  cpt: string;
  impactCents: number;
  owner: string;
  receivedAt: string;
  appealDeadline: string;
  appealStatus: "none" | "draft" | "submitted" | "won" | "lost";
  recoveryCents: number;
  resolution: string;
};

export type Appeal = {
  id: string;
  tenantId: string;
  denialId: string;
  claimId: string;
  status: "draft" | "submitted" | "won" | "lost";
  submittedAt: string;
  note: string;
  owner: string;
};

export type EligibilityCheck = {
  id: string;
  tenantId: string;
  accountId: string;
  claimId: string;
  status: "active" | "inactive" | "unknown";
  checkedAt: string;
  detail: string;
};

export type Authorization = {
  id: string;
  tenantId: string;
  accountId: string;
  claimId: string;
  number: string;
  status: "missing" | "pending" | "approved" | "denied";
  detail: string;
};

export type BillingRuleDef = {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  priority: number;
  field: string;
  operator: "eq" | "neq" | "is_null" | "is_not_null";
  value: string;
  action: "prevent_submit" | "route_queue" | "require_field";
  message: string;
  queueId?: QueueId;
};

export type AuditEvent = {
  id: string;
  tenantId: string;
  at: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  before: string;
  after: string;
};

export type RcmNote = {
  id: string;
  tenantId: string;
  claimId: string;
  at: string;
  actor: string;
  text: string;
};

export type RcmOverlay = {
  version: 1;
  tenantId: string;
  payments: Payment[];
  remittances: Remittance[];
  denials: Denial[];
  appeals: Appeal[];
  eligibility: EligibilityCheck[];
  authorizations: Authorization[];
  rules: BillingRuleDef[];
  notes: RcmNote[];
  audit: AuditEvent[];
  nextPayment: number;
  nextRemit: number;
  nextDenial: number;
  nextAppeal: number;
  nextNote: number;
  nextAudit: number;
};

export const WORKFLOW_LABEL: Record<ClaimWorkflow, string> = {
  draft: "Draft",
  review: "Ready for review",
  scrubbed: "Scrubbed",
  ready: "Ready to submit",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  adjudicated: "Adjudicated",
  paid: "Paid",
  denied: "Denied",
  appealed: "Appealed",
  resolved: "Resolved",
};

export const FINANCIAL_LABEL: Record<ClaimFinancial, string> = {
  unbilled: "Unbilled",
  receivable: "Receivable",
  partial: "Partial",
  collected: "Collected",
  denied_balance: "Denied balance",
  credit: "Credit",
  written_off: "Written off",
};

export const QUEUE_META: { id: QueueId; label: string; question: string }[] = [
  { id: "review", label: "Claims requiring review", question: "What still fails scrubbing?" },
  { id: "capture", label: "Charge capture", question: "Which accessions are ready to bill?" },
  { id: "missing", label: "Missing information", question: "What coding or coverage is incomplete?" },
  { id: "ready", label: "Ready to submit", question: "What can go to the payer or client today?" },
  { id: "rejected", label: "Rejected claims", question: "What did the clearinghouse send back?" },
  { id: "denials", label: "Denied claims", question: "What money was refused?" },
  { id: "appeals", label: "Appeals required", question: "What denials still have recovery time?" },
  { id: "eligibility", label: "Eligibility problems", question: "Which accounts are not active?" },
  { id: "authorization", label: "Authorization problems", question: "What work is blocked on auth?" },
  { id: "unposted", label: "Unposted payments", question: "What remittances still need posting?" },
  { id: "aging", label: "Aging A/R", question: "What balances are getting old?" },
];

export function chargeActive(status: ChargeStatus): boolean {
  return status !== "rebilled";
}
