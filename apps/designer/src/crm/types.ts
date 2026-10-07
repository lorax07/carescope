export type ContactType =
  | "ordering_provider"
  | "office_manager"
  | "lab_manager"
  | "billing"
  | "it"
  | "clinical"
  | "executive"
  | "other";

export type TaskStatus = "open" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type IssueStatus = "open" | "in_progress" | "resolved";
export type IssueCategory =
  | "specimen"
  | "result"
  | "tat"
  | "billing"
  | "integration"
  | "ordering"
  | "report"
  | "complaint"
  | "training"
  | "service";
export type OpportunityStage = "Discovery" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type DerivedHealth = "Healthy" | "Watch" | "At risk" | "Critical";
export type CommunicationKind = "email" | "call" | "meeting" | "note";
export type DocumentKind = "contract" | "agreement" | "training" | "form" | "implementation" | "other";

export type HealthSignal = {
  code: string;
  level: "watch" | "risk" | "critical";
  message: string;
  why: string;
  action: string;
  href: string;
  owner: string;
};

export type ContactRecord = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  role: string;
  contactType: ContactType;
  primary: boolean;
  active: boolean;
};

export type CrmTask = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  owner: string;
  accountId: string;
  contactId: string;
  due: string;
  priority: TaskPriority;
  status: TaskStatus;
  relatedIssueId: string;
  relatedOpportunityId: string;
  createdAt: string;
  completedAt: string;
};

export type CrmIssue = {
  id: string;
  tenantId: string;
  accountId: string;
  contactId: string;
  category: IssueCategory;
  priority: TaskPriority;
  owner: string;
  status: IssueStatus;
  title: string;
  description: string;
  createdAt: string;
  due: string;
  resolution: string;
  accessionId: string;
  claimId: string;
};

export type CrmActivity = {
  id: string;
  tenantId: string;
  accountId: string;
  contactId: string;
  at: string;
  kind: string;
  summary: string;
  source: "crm" | "lab" | "billing" | "quality" | "account";
};

export type CrmCommunication = {
  id: string;
  tenantId: string;
  accountId: string;
  contactId: string;
  kind: CommunicationKind;
  at: string;
  actor: string;
  subject: string;
  body: string;
};

export type CrmDocument = {
  id: string;
  tenantId: string;
  accountId: string;
  kind: DocumentKind;
  name: string;
  status: string;
  at: string;
};

export type OpportunityRecord = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName: string;
  name: string;
  owner: string;
  stage: OpportunityStage;
  amount: string;
  probability: number;
  close: string;
  source: string;
  nextAction: string;
};

export type CrmNote = {
  id: string;
  tenantId: string;
  accountId: string;
  at: string;
  actor: string;
  text: string;
};

export type CrmAudit = {
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

export type CrmOverlay = {
  version: 1;
  tenantId: string;
  tasks: CrmTask[];
  issues: CrmIssue[];
  communications: CrmCommunication[];
  documents: CrmDocument[];
  activities: CrmActivity[];
  notes: CrmNote[];
  audit: CrmAudit[];
  opportunityNext: Record<string, { nextAction: string; probability: number; stage?: OpportunityStage }>;
  nextTask: number;
  nextIssue: number;
  nextComm: number;
  nextDoc: number;
  nextActivity: number;
  nextNote: number;
  nextAudit: number;
};

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  ordering_provider: "Ordering provider",
  office_manager: "Office manager",
  lab_manager: "Lab manager",
  billing: "Billing contact",
  it: "IT contact",
  clinical: "Clinical contact",
  executive: "Executive contact",
  other: "Other",
};

export const ISSUE_CATEGORY_LABEL: Record<IssueCategory, string> = {
  specimen: "Specimen",
  result: "Result",
  tat: "TAT",
  billing: "Billing",
  integration: "Integration",
  ordering: "Ordering",
  report: "Report",
  complaint: "Complaint",
  training: "Training",
  service: "Service",
};

export const PIPELINE_STAGES: OpportunityStage[] = ["Discovery", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
