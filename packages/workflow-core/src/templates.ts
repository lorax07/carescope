/**
 * Reusable laboratory workflow templates.
 * Templates are first-class workflow definitions with isTemplate=true.
 */

import { v4 as uuid } from "uuid";
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from "./types.js";

function node(
  type: WorkflowNode["type"],
  label: string,
  x: number,
  y: number,
  config: Record<string, unknown> = {}
): WorkflowNode {
  return { id: uuid(), type, label, position: { x, y }, config };
}

function edge(
  source: string,
  target: string,
  label?: string,
  extra?: Partial<WorkflowEdge>
): WorkflowEdge {
  return { id: uuid(), source, target, label, ...extra };
}

function base(
  partial: Omit<WorkflowDefinition, "id" | "lineageId" | "createdAt" | "updatedAt" | "version" | "status"> & {
    id?: string;
  }
): WorkflowDefinition {
  const id = partial.id ?? uuid();
  const ts = new Date().toISOString();
  return {
    ...partial,
    id,
    lineageId: id,
    version: 1,
    status: "draft",
    isTemplate: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Sample intake → assign → test → review → CoA */
export function sampleLifecycleTemplate(tenantId: string, createdBy: string): WorkflowDefinition {
  const start = node("start", "Start", 80, 200);
  const receive = node("task", "Receive Sample", 260, 200, {
    instructions: "Log sample receipt and verify chain of custody",
    autoComplete: true,
  });
  const barcode = node("barcode_scan", "Scan Barcode", 440, 200, {});
  const assign = node("role_assignment", "Assign Analyst", 620, 200, {
    role: "analyst",
    instructions: "Assign sample to available analyst",
  });
  const decision = node("decision", "STAT Priority?", 800, 200, {
    expression: "priority == 'STAT' || sample.priority == 'STAT'",
    trueLabel: "yes",
    falseLabel: "no",
  });
  const notify = node("notification", "Notify Lab Manager", 980, 80, {
    recipients: "lab_manager",
    message: "STAT sample received and assigned",
    subject: "STAT Sample",
  });
  const test = node("task", "Perform Testing", 980, 200, {
    instructions: "Execute assigned test methods",
    autoComplete: false,
  });
  const validate = node("data_validation", "Validate Results", 1160, 200, {
    expression: "result != null",
    errorMessage: "Results are required before review",
  });
  const review = node("review", "Peer Review", 1340, 200, {
    reviewerRole: "reviewer",
  });
  const approve = node("approval", "QA Approval", 1520, 200, {
    approverRole: "qa_officer",
    minApprovals: 1,
  });
  const esign = node("electronic_signature", "E-Sign Release", 1700, 200, {
    meaning: "I have reviewed and approve release of these results",
    requireReason: true,
    requirePassword: true,
  });
  const coa = node("report_generation", "Generate CoA", 1880, 200, {
    reportType: "coa",
    includeSignature: true,
  });
  const email = node("email", "Email Client", 2060, 200, {
    to: "client.email",
    subject: "Certificate of Analysis Available",
    body: "Your Certificate of Analysis is ready.",
  });
  const end = node("end", "End", 2240, 200, { outcome: "success" });

  const nodes = [start, receive, barcode, assign, decision, notify, test, validate, review, approve, esign, coa, email, end];
  const edges = [
    edge(start.id, receive.id),
    edge(receive.id, barcode.id),
    edge(barcode.id, assign.id),
    edge(assign.id, decision.id),
    edge(decision.id, notify.id, "yes"),
    edge(decision.id, test.id, "no"),
    edge(notify.id, test.id),
    edge(test.id, validate.id),
    edge(validate.id, review.id),
    edge(review.id, approve.id),
    edge(approve.id, esign.id, "approved"),
    edge(esign.id, coa.id),
    edge(coa.id, email.id),
    edge(email.id, end.id),
  ];

  return base({
    tenantId,
    name: "Sample Lifecycle — Standard",
    description:
      "Receive, barcode, assign, test, validate, review, approve, e-sign, and generate CoA with client notification.",
    createdBy,
    nodes,
    edges,
    triggers: [
      {
        id: uuid(),
        type: "event",
        eventType: "sample.created",
        enabled: true,
        module: "sample_lifecycle",
      },
    ],
    entityTypes: ["sample"],
    modules: ["sample_lifecycle", "barcode_qr", "results_entry", "electronic_signatures", "coa_generation", "notifications"],
    tags: ["sample", "coa", "release", "template"],
    isTemplate: true,
  });
}

/** CAPA workflow */
export function capaTemplate(tenantId: string, createdBy: string): WorkflowDefinition {
  const start = node("start", "Start", 80, 180);
  const intake = node("task", "Log CAPA", 260, 180, {
    instructions: "Capture CAPA details and linked quality event",
  });
  const assign = node("role_assignment", "Assign Owner", 440, 180, { role: "qa_officer" });
  const investigate = node("task", "Root Cause Investigation", 620, 180, { autoComplete: false });
  const decision = node("decision", "Systemic Issue?", 800, 180, {
    expression: "systemic == true",
    trueLabel: "yes",
    falseLabel: "no",
  });
  const change = node("task", "Initiate Change Control", 980, 80, { autoComplete: false });
  const actions = node("task", "Define Corrective Actions", 980, 180, { autoComplete: false });
  const approve = node("approval", "Approve CAPA Plan", 1160, 180, { approverRole: "lab_manager" });
  const implement = node("task", "Implement Actions", 1340, 180, { autoComplete: false });
  const verify = node("review", "Verify Effectiveness", 1520, 180, { reviewerRole: "qa_officer" });
  const esign = node("electronic_signature", "Close CAPA", 1700, 180, {
    meaning: "CAPA verified effective and closed",
  });
  const end = node("end", "End", 1880, 180);

  const nodes = [start, intake, assign, investigate, decision, change, actions, approve, implement, verify, esign, end];
  const edges = [
    edge(start.id, intake.id),
    edge(intake.id, assign.id),
    edge(assign.id, investigate.id),
    edge(investigate.id, decision.id),
    edge(decision.id, change.id, "yes"),
    edge(decision.id, actions.id, "no"),
    edge(change.id, actions.id),
    edge(actions.id, approve.id),
    edge(approve.id, implement.id, "approved"),
    edge(implement.id, verify.id),
    edge(verify.id, esign.id),
    edge(esign.id, end.id),
  ];

  return base({
    tenantId,
    name: "CAPA — Standard",
    description: "Corrective and Preventive Action workflow with investigation, approval, and effectiveness check.",
    createdBy,
    nodes,
    edges,
    triggers: [
      { id: uuid(), type: "event", eventType: "capa.initiated", enabled: true, module: "capa" },
      { id: uuid(), type: "event", eventType: "quality_event.opened", enabled: true, filter: "severity == 'critical'", module: "quality_events" },
    ],
    entityTypes: ["capa", "quality_event"],
    modules: ["capa", "quality_events", "change_control", "electronic_signatures"],
    tags: ["capa", "quality", "template"],
    isTemplate: true,
  });
}

/** Equipment calibration due workflow */
export function calibrationDueTemplate(tenantId: string, createdBy: string): WorkflowDefinition {
  const start = node("start", "Start", 80, 160);
  const notify = node("email", "Notify Metrology", 280, 160, {
    to: "metrology@lab.local",
    subject: "Calibration Due",
    body: "Equipment requires calibration.",
  });
  const assign = node("role_assignment", "Assign Technician", 480, 160, { role: "analyst" });
  const calibrate = node("task", "Perform Calibration", 680, 160, { autoComplete: false });
  const upload = node("file_upload", "Upload Certificate", 880, 160, { required: true });
  const review = node("approval", "Review Calibration", 1080, 160, { approverRole: "qa_officer" });
  const update = node("task", "Update Equipment Record", 1280, 160, { autoComplete: true });
  const end = node("end", "End", 1480, 160);

  const nodes = [start, notify, assign, calibrate, upload, review, update, end];
  const edges = [
    edge(start.id, notify.id),
    edge(notify.id, assign.id),
    edge(assign.id, calibrate.id),
    edge(calibrate.id, upload.id),
    edge(upload.id, review.id),
    edge(review.id, update.id, "approved"),
    edge(update.id, end.id),
  ];

  return base({
    tenantId,
    name: "Equipment Calibration Due",
    description: "Notify, assign, calibrate, upload certificate, approve, and update equipment records.",
    createdBy,
    nodes,
    edges,
    triggers: [
      {
        id: uuid(),
        type: "event",
        eventType: "equipment.calibration_due",
        enabled: true,
        module: "calibration_maintenance",
      },
    ],
    entityTypes: ["equipment"],
    modules: ["equipment", "calibration_maintenance", "notifications"],
    tags: ["calibration", "equipment", "template"],
    isTemplate: true,
  });
}

/** Inventory reorder workflow */
export function inventoryReorderTemplate(tenantId: string, createdBy: string): WorkflowDefinition {
  const start = node("start", "Start", 80, 160);
  const validate = node("data_validation", "Confirm Below Threshold", 280, 160, {
    expression: "quantity <= reorderLevel",
  });
  const notify = node("notification", "Notify Inventory Manager", 480, 160, {
    recipients: "inventory_manager",
    message: "Stock below reorder threshold",
  });
  const approve = node("approval", "Approve Purchase", 680, 160, { approverRole: "lab_manager" });
  const api = node("api_call", "Create PO", 880, 160, {
    method: "POST",
    url: "/api/purchasing/orders",
    body: {},
  });
  const end = node("end", "End", 1080, 160);

  const nodes = [start, validate, notify, approve, api, end];
  const edges = [
    edge(start.id, validate.id),
    edge(validate.id, notify.id),
    edge(notify.id, approve.id),
    edge(approve.id, api.id, "approved"),
    edge(api.id, end.id),
  ];

  return base({
    tenantId,
    name: "Inventory Reorder",
    description: "When inventory hits threshold, notify, approve, and create a purchase order.",
    createdBy,
    nodes,
    edges,
    triggers: [
      {
        id: uuid(),
        type: "event",
        eventType: "inventory.threshold_reached",
        enabled: true,
        module: "inventory",
      },
    ],
    entityTypes: ["inventory_item", "reagent", "standard"],
    modules: ["inventory", "reagents", "standards", "billing"],
    tags: ["inventory", "reorder", "template"],
    isTemplate: true,
  });
}

/** User onboarding */
export function userOnboardingTemplate(tenantId: string, createdBy: string): WorkflowDefinition {
  const start = node("start", "Start", 80, 160);
  const assignRole = node("approval", "Role Approval", 280, 160, { approverRole: "admin" });
  const training = node("task", "Assign Training", 480, 160, { autoComplete: true });
  const waitTrain = node("role_assignment", "Complete Training", 680, 160, { role: "analyst" });
  const access = node("task", "Provision Lab Access", 880, 160, { autoComplete: true });
  const email = node("email", "Welcome Email", 1080, 160, {
    to: "user.email",
    subject: "Welcome to CareScope LIMS",
    body: "Your account is ready. Complete assigned training to begin.",
  });
  const end = node("end", "End", 1280, 160);

  const nodes = [start, assignRole, training, waitTrain, access, email, end];
  const edges = [
    edge(start.id, assignRole.id),
    edge(assignRole.id, training.id, "approved"),
    edge(training.id, waitTrain.id),
    edge(waitTrain.id, access.id),
    edge(access.id, email.id),
    edge(email.id, end.id),
  ];

  return base({
    tenantId,
    name: "User Onboarding",
    description: "Role approval, training assignment, access provisioning, and welcome notification.",
    createdBy,
    nodes,
    edges,
    triggers: [
      { id: uuid(), type: "event", eventType: "user.created", enabled: true, module: "user_onboarding" },
    ],
    entityTypes: ["user"],
    modules: ["user_onboarding", "role_approvals", "training_records", "notifications"],
    tags: ["onboarding", "users", "template"],
    isTemplate: true,
  });
}

export function allBuiltinTemplates(tenantId: string, createdBy: string): WorkflowDefinition[] {
  return [
    sampleLifecycleTemplate(tenantId, createdBy),
    capaTemplate(tenantId, createdBy),
    calibrationDueTemplate(tenantId, createdBy),
    inventoryReorderTemplate(tenantId, createdBy),
    userOnboardingTemplate(tenantId, createdBy),
  ];
}
