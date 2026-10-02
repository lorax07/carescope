import type { LimsModule, NodeType, SystemEventType } from "@carescope/workflow-core";

export type SystemWorkflowScreen = {
  name: string;
  title: string;
  description: string;
  fields: string;
  primaryAction: string;
};

export type SystemWorkflowStage = {
  id: string;
  label: string;
  description: string;
  type?: NodeType;
  screen: SystemWorkflowScreen;
};

export type SystemWorkflowEdge = {
  source: string;
  target: string;
  label?: string;
  condition?: string;
};

export type SystemWorkflowDefinition = {
  id: string;
  module: string;
  name: string;
  description: string;
  stages: SystemWorkflowStage[];
  edges?: SystemWorkflowEdge[];
  triggers?: { eventType: SystemEventType | string; module: LimsModule }[];
  modules?: LimsModule[];
};

const screen = (
  name: string,
  title: string,
  description: string,
  fields: string,
  primaryAction: string,
): SystemWorkflowScreen => ({ name, title, description, fields, primaryAction });

export const SYSTEM_WORKFLOWS: SystemWorkflowDefinition[] = [
  {
    id: "operations-home",
    module: "Sequence Operations",
    name: "Home — Sample Intake & Work Queues",
    description: "Every Home action from electronic receipt and manual logging through filters, sample details, records, results, and workflow configuration.",
    modules: ["sample_lifecycle", "chain_of_custody", "results_entry", "customer_portal", "workflow_automation"],
    triggers: [
      { eventType: "workflow.manual_trigger", module: "sample_lifecycle" },
      { eventType: "sample.received", module: "sample_lifecycle" },
    ],
    stages: [
      { id: "home", label: "Home workspace", description: "Open the complete sample work queue and priority panels.", type: "start", screen: screen("Home", "Home", "Receive, prioritize, and move samples from the operational work queues.", "Tests filter\nClients filter\nQuick filter\nSample table", "Open sample") },
      { id: "receive", label: "Receive sample button", description: "Click Receive sample to start the electronic-order receipt workflow.", screen: screen("Receive sample", "Samples awaiting receipt", "Select one or more electronic orders that have arrived at the laboratory.", "Electronic orders\nClient\nTests\nExpected containers", "Continue") },
      { id: "receipt", label: "Receipt details", description: "Record receiving lab, condition, temperature, and seal verification.", screen: screen("Receipt details", "Document receipt details", "Capture the condition and chain-of-custody facts at receipt.", "Receiving laboratory\nCondition\nTemperature\nSeal verified", "Continue") },
      { id: "confirm-receipt", label: "Confirm receipt", description: "Review the selected electronic orders before creating samples.", type: "review", screen: screen("Confirm receipt", "Confirm received samples", "Review the receipt summary before accession records are created.", "Selected orders\nReceipt condition\nReceiving laboratory\nReceived by", "Receive samples") },
      { id: "log", label: "Log sample button", description: "Click Log sample to manually create a sample without an electronic order.", screen: screen("Log sample", "Manually log sample", "Enter identifying, client, matrix, test, priority, and custody information.", "Order ID\nClient\nMatrix\nTests\nPriority\nLocation\nSite", "Log sample") },
      { id: "tests", label: "Tests dropdown", description: "Click for multi-select or double-click to wildcard-search tests.", type: "condition", screen: screen("Tests filter", "Filter by tests", "Select multiple tests, change sort order, or enter a wildcard query.", "Wildcard search\nSelected tests\nSort direction", "Apply tests") },
      { id: "clients", label: "Clients dropdown", description: "Click for multi-select or double-click to wildcard-search clients.", type: "condition", screen: screen("Clients filter", "Filter by clients", "Select multiple clients, change sort order, or enter a wildcard query.", "Wildcard search\nSelected clients\nSort direction", "Apply clients") },
      { id: "queues", label: "All Open and quick filters", description: "Reset the table or filter by STAT, In testing, Review, or On hold.", type: "condition", screen: screen("Work queue filters", "Choose a Home work queue", "A single click resets or applies the selected table filter; double-click enables wildcard search.", "All Open\nSTAT\nIn testing\nReview\nOn hold", "Apply filter") },
      { id: "sample", label: "Accession ID button", description: "Open Sample Details for the selected accession.", screen: screen("Sample Details", "Sample Details", "Review metadata, attachments, results, and chronological chain of custody.", "Sample metadata\nTests\nAttachments\nChain of custody", "Tab screen") },
      { id: "receipt-folder", label: "Receipt folder button", description: "Open the scanned paperwork and receipt record.", type: "document_generation", screen: screen("Receipt paperwork", "Scanned receipt paperwork", "Review or update the paperwork associated with the order.", "Order ID\nReceived document\nReceipt metadata\nNotes", "Save receipt") },
      { id: "results", label: "View Results button", description: "Open available analyte results for the selected sample.", type: "review", screen: screen("View Results", "Sample results", "Review analytes, values, units, reference ranges, and flags.", "Analyte results\nReference ranges\nFlags\nReviewer notes", "Close results") },
      { id: "account", label: "Client account link", description: "Open the linked client account and connectivity record.", screen: screen("Client account", "Client account", "View the account, laboratories, contacts, and connected samples.", "Account\nLaboratories\nContacts\nSamples", "Open account") },
      { id: "automations", label: "Configure automations link", description: "Open the workflow library from Home.", type: "workflow_trigger", screen: screen("Workflow library", "Laboratory workflows", "View system workflows, templates, and user workflows.", "System workflows\nYour workflows\nTemplates\nTraining", "View workflows") },
    ],
    edges: [
      { source: "home", target: "receive", label: "Click Receive sample" },
      { source: "receive", target: "receipt", label: "Continue with selected orders" },
      { source: "receipt", target: "confirm-receipt", label: "Seal verified" },
      { source: "confirm-receipt", target: "home", label: "Receive samples" },
      { source: "home", target: "log", label: "Click Log sample" },
      { source: "log", target: "home", label: "Log sample" },
      ...["tests", "clients", "queues", "sample", "receipt-folder", "results", "account", "automations"].map((target) => ({ source: "home", target, label: `Click ${target}` })),
      { source: "tests", target: "home", label: "Apply or clear" },
      { source: "clients", target: "home", label: "Apply or clear" },
      { source: "queues", target: "home", label: "Filter or reset" },
    ],
  },
  {
    id: "operations-testing",
    module: "Sequence Operations",
    name: "Testing — Instrument Runs & Sample Testing",
    description: "Every Testing action, including run monitoring, instrument control, intake, filters, sample records, and the complete Start Testing workflow.",
    modules: ["test_scheduling", "instrument_integration", "sample_lifecycle", "inventory", "reagents", "standards"],
    triggers: [
      { eventType: "workflow.manual_trigger", module: "test_scheduling" },
      { eventType: "test.started", module: "instrument_integration" },
      { eventType: "instrument.data_imported", module: "instrument_integration" },
    ],
    stages: [
      { id: "testing", label: "Testing workspace", description: "Open current run sequences and samples in testing.", type: "start", screen: screen("Testing", "Testing", "Monitor live runs and manage samples currently in testing.", "Current run sequences\nTests filter\nClients filter\nIn Testing table", "Open run") },
      { id: "run", label: "Current run sequence button", description: "Click a current sequence line to open the run in a workspace tab.", screen: screen("Run sequence", "Current run sequence", "See run progress, instrument state, audit information, samples, mobile phases, and solutions.", "Current step\nInstrument\nAudit trail\nSamples\nMobile phases\nSolutions", "Open control panel") },
      { id: "run-control", label: "Instrument control panel button", description: "Open controls for an integrated instrument from the run record.", type: "instrument_action", screen: screen("Instrument control panel", "Instrument control panel", "Monitor the active instrument step and available integrated controls.", "Instrument status\nCurrent step\nSequence controls\nConnection state", "Return to run") },
      { id: "receive", label: "Receive sample button", description: "Launch the electronic-order receiving workflow from Testing.", screen: screen("Receive sample", "Samples awaiting receipt", "Select electronic orders and complete receipt details.", "Electronic orders\nReceipt condition\nTemperature\nSeal verification", "Receive samples") },
      { id: "log", label: "Log sample button", description: "Launch manual sample logging from Testing.", screen: screen("Log sample", "Manually log sample", "Create a sample record and route it into the testing queue.", "Order ID\nClient\nTests\nPriority\nLocation", "Log sample") },
      { id: "start", label: "Start Testing button", description: "Open the tab-capable Start Testing workflow.", type: "workflow_trigger", screen: screen("Start Testing", "Start Testing", "Begin a guided setup for samples, instrument, method, solutions, and run review.", "Available samples\nSelected samples\nWorkflow progress", "Continue") },
      { id: "select", label: "Select samples", description: "Choose one or more testing samples for the run.", screen: screen("Samples", "Select samples", "Choose the samples that will be included in this instrument run.", "Sample selection\nAccession ID\nTests\nPriority", "Continue") },
      { id: "instrument", label: "Configure instrument", description: "Select the instrument and run type; show controls when integrated.", type: "instrument_action", screen: screen("Instrument", "Select instrument", "Choose a qualified instrument and run type for this sequence.", "Instrument\nRun type\nIntegration status\nCurrent state", "Continue") },
      { id: "setup-control", label: "Setup control panel button", description: "Open the integrated control panel during run setup.", type: "instrument_action", screen: screen("Setup control panel", "Instrument control panel", "Verify readiness and control the integrated instrument before starting.", "Instrument state\nReadiness checks\nCurrent step\nControls", "Return to setup") },
      { id: "method", label: "Method & solutions", description: "Set method, column, mobile phase, solution, flow, and temperature.", screen: screen("Method & solutions", "Configure method and solutions", "Enter all analytical setup information required by the chemist.", "Method\nColumn\nMobile phase\nSolution\nFlow rate\nTemperature", "Continue") },
      { id: "review", label: "Review run setup", description: "Review samples and instrument setup before execution.", type: "review", screen: screen("Review run", "Review testing setup", "Confirm the sequence, instrument, method, and solutions.", "Selected samples\nInstrument\nMethod\nSolutions\nRun parameters", "Start testing") },
      { id: "tab", label: "Tab workflow button", description: "Pin the Start Testing workflow in the workspace.", screen: screen("Tabbed testing workflow", "Start Testing workspace tab", "Continue the same testing setup as a persistent workspace tab.", "Workflow stage\nCurrent values\nRun summary", "Return to workflow") },
      { id: "filters", label: "Tests, Clients and In Testing filters", description: "Multi-select, wildcard-search, sort, apply, or reset Testing filters.", type: "condition", screen: screen("Testing filters", "Filter samples in testing", "Use Tests and Clients dropdowns or reset/search In Testing.", "Tests\nClients\nIn Testing\nWildcard query\nSort direction", "Apply filters") },
      { id: "sample", label: "Testing table buttons", description: "Open Sample Details, receipt paperwork, client account, or View Results.", screen: screen("Testing sample actions", "Testing sample record", "Choose the sample action from the testing table.", "Sample Details\nReceipt paperwork\nClient account\nView Results", "Open selected action") },
    ],
    edges: [
      { source: "testing", target: "run", label: "Click run sequence" },
      { source: "run", target: "run-control", label: "Open instrument control panel" },
      { source: "testing", target: "receive", label: "Click Receive sample" },
      { source: "receive", target: "testing", label: "Receive samples" },
      { source: "testing", target: "log", label: "Click Log sample" },
      { source: "log", target: "testing", label: "Log sample" },
      { source: "testing", target: "start", label: "Click Start Testing" },
      { source: "start", target: "select", label: "Open workflow" },
      { source: "select", target: "instrument", label: "Samples selected" },
      { source: "instrument", target: "setup-control", label: "Open control panel" },
      { source: "instrument", target: "method", label: "Continue" },
      { source: "method", target: "review", label: "Continue" },
      { source: "review", target: "run", label: "Start testing" },
      { source: "start", target: "tab", label: "Click Tab workflow" },
      { source: "testing", target: "filters", label: "Click or double-click filters" },
      { source: "filters", target: "testing", label: "Apply or reset" },
      { source: "testing", target: "sample", label: "Click table action" },
    ],
  },
  {
    id: "operations-review",
    module: "Sequence Operations",
    name: "Review — Results Review & Authorization",
    description: "Every Review action from resulted-sample filtering and individual or batch selection through flags, PIN authorization, and sample records.",
    modules: ["results_entry", "electronic_signatures", "role_approvals", "sample_lifecycle"],
    triggers: [
      { eventType: "test.completed", module: "results_entry" },
      { eventType: "result.entered", module: "results_entry" },
    ],
    stages: [
      { id: "review-home", label: "Review workspace", description: "Open completed testing for individual or batch review.", type: "start", screen: screen("Review", "Review", "Review resulted samples and complete controlled authorization.", "Tests filter\nClients filter\nIn Review\nIndividual\nBatch\nResults table", "Open results") },
      { id: "receive", label: "Receive sample button", description: "Launch electronic-order receipt from Review.", screen: screen("Receive sample", "Samples awaiting receipt", "Select electronic orders and complete receipt details.", "Electronic orders\nReceipt details\nSeal verification", "Receive samples") },
      { id: "log", label: "Log sample button", description: "Launch manual logging from Review.", screen: screen("Log sample", "Manually log sample", "Create a manual sample record.", "Order ID\nClient\nTests\nPriority\nLocation", "Log sample") },
      { id: "filters", label: "Tests, Clients and In Review filters", description: "Multi-select, wildcard-search, sort, apply, or reset Review filters.", type: "condition", screen: screen("Review filters", "Filter samples in review", "Use Tests, Clients, and In Review controls to refine or reset the table.", "Tests\nClients\nIn Review\nWildcard query\nSort direction", "Apply filters") },
      { id: "mode", label: "Individual and Batch buttons", description: "Switch the review list between individual samples and batches.", type: "condition", screen: screen("Review type", "Choose review type", "Show all completed tests or narrow to individual or batch review.", "All completed\nIndividual\nBatch\nSelected records", "Apply review type") },
      { id: "complete", label: "Complete Review button", description: "Open selected completed tests in Result Review.", type: "workflow_trigger", screen: screen("Complete Review", "Complete Review", "Review the selected individual samples or full batches.", "Selected samples\nBatch membership\nTest Complete\nFlags", "View Results") },
      { id: "results", label: "View Results button", description: "Open analyte-level results and authorization controls.", type: "review", screen: screen("Result review", "Review sample results", "Inspect analytes, values, reference ranges, and existing flags.", "Analyte\nResult\nUnits\nReference range\nFlag state", "Authorize") },
      { id: "flag", label: "Flag result button", description: "Choose a reason and confirm a result flag with reviewer PIN.", type: "condition", screen: screen("Flag result", "Flag a result", "Document the reason and reviewer identity before flagging.", "Flag reasons\nReview notes\nReviewer PIN", "Confirm flag") },
      { id: "clear", label: "Clear flag button", description: "Remove the selected result flag.", screen: screen("Clear flag", "Clear result flag", "Confirm that the current result flag should be removed.", "Analyte\nCurrent reason\nReviewer", "Clear flag") },
      { id: "authorize", label: "Authorize button", description: "Authorize unflagged results and advance them to QA approval.", type: "electronic_signature", screen: screen("Authorization", "Authorize results", "Apply controlled authorization to eligible results.", "Eligible samples\nExcluded flagged results\nReviewer PIN\nDecision", "Authorize") },
      { id: "sample", label: "Review table buttons", description: "Open Sample Details, Tab screen, receipt paperwork, or client account.", screen: screen("Review sample actions", "Review sample record", "Choose the action required for the selected review record.", "Sample Details\nTab screen\nReceipt paperwork\nClient account", "Open selected action") },
    ],
    edges: [
      { source: "review-home", target: "receive", label: "Click Receive sample" },
      { source: "receive", target: "review-home", label: "Receive samples" },
      { source: "review-home", target: "log", label: "Click Log sample" },
      { source: "log", target: "review-home", label: "Log sample" },
      { source: "review-home", target: "filters", label: "Click or double-click filters" },
      { source: "filters", target: "review-home", label: "Apply or reset" },
      { source: "review-home", target: "mode", label: "Click Individual or Batch" },
      { source: "mode", target: "complete", label: "Select records" },
      { source: "review-home", target: "complete", label: "Click Complete Review" },
      { source: "complete", target: "results", label: "View selected results" },
      { source: "review-home", target: "results", label: "Click View Results" },
      { source: "results", target: "flag", label: "Click Flag" },
      { source: "flag", target: "results", label: "Confirm flag" },
      { source: "results", target: "clear", label: "Click Clear" },
      { source: "clear", target: "results", label: "Clear flag" },
      { source: "results", target: "authorize", label: "Click Authorize" },
      { source: "authorize", target: "review-home", label: "Authorization complete" },
      { source: "review-home", target: "sample", label: "Click table action" },
    ],
  },
  {
    id: "operations-release",
    module: "Sequence Operations",
    name: "Release — Ready for Release Queue",
    description: "Every Release action for ready and released samples, including priority branches, intake, wildcard filters, records, paperwork, accounts, and result review.",
    modules: ["coa_generation", "reporting", "results_entry", "sample_lifecycle", "customer_portal"],
    triggers: [
      { eventType: "result.approved", module: "coa_generation" },
      { eventType: "workflow.manual_trigger", module: "reporting" },
    ],
    stages: [
      { id: "release", label: "Release workspace", description: "Open QA-approved and released samples.", type: "start", screen: screen("Release", "Release", "Review samples that are ready for release or already released.", "Tests filter\nClients filter\nReady for Release\nPriority tabs\nRelease table", "Open sample") },
      { id: "receive", label: "Receive sample button", description: "Launch electronic-order receipt from Release.", screen: screen("Receive sample", "Samples awaiting receipt", "Select electronic orders and complete receipt details.", "Electronic orders\nReceipt condition\nTemperature\nSeal verification", "Receive samples") },
      { id: "log", label: "Log sample button", description: "Launch manual logging from Release.", screen: screen("Log sample", "Manually log sample", "Create a manual sample record.", "Order ID\nClient\nTests\nPriority\nLocation", "Log sample") },
      { id: "tests", label: "Tests dropdown", description: "Multi-select, sort, or wildcard-search tests.", type: "condition", screen: screen("Tests filter", "Filter release samples by tests", "Choose multiple tests or enter a wildcard query.", "Wildcard search\nSelected tests\nSort direction", "Apply tests") },
      { id: "clients", label: "Clients dropdown", description: "Multi-select, sort, or wildcard-search clients.", type: "condition", screen: screen("Clients filter", "Filter release samples by clients", "Choose multiple clients or enter a wildcard query.", "Wildcard search\nSelected clients\nSort direction", "Apply clients") },
      { id: "ready", label: "Ready for Release button", description: "Reset filters and show the complete release queue; double-click enables wildcard search.", type: "condition", screen: screen("Ready for Release", "Ready for Release", "Show all QA-approved and released samples or enter a wildcard table query.", "Release status\nWildcard query\nVisible records", "Reset filters") },
      { id: "priority", label: "Priority tab buttons", description: "Filter Ready for Release by every configured sample priority.", type: "condition", screen: screen("Release priorities", "Filter by sample priority", "Choose any configured priority such as STAT, Rush, or Routine.", "Configured priorities\nSelected priority\nVisible records", "Apply priority") },
      { id: "sample", label: "Accession ID button", description: "Open Sample Details and chain of custody.", screen: screen("Sample Details", "Sample Details", "Review release metadata, results, attachments, and chronological custody.", "Sample metadata\nResults\nAttachments\nChain of custody", "Tab screen") },
      { id: "receipt-folder", label: "Receipt folder button", description: "Open scanned receipt paperwork.", type: "document_generation", screen: screen("Receipt paperwork", "Scanned receipt paperwork", "Review the order receipt document and metadata.", "Order ID\nReceipt document\nNotes", "Save receipt") },
      { id: "results", label: "View Results button", description: "Open released analyte results.", type: "review", screen: screen("View Results", "Released sample results", "Review the authorized results associated with this release record.", "Analytes\nResults\nUnits\nFlags\nAuthorization", "Close results") },
      { id: "account", label: "Client account link", description: "Open the linked client account.", screen: screen("Client account", "Client account", "View the account, laboratories, contacts, and samples.", "Account\nLaboratories\nContacts\nSamples", "Open account") },
    ],
    edges: [
      { source: "release", target: "receive", label: "Click Receive sample" },
      { source: "receive", target: "release", label: "Receive samples" },
      { source: "release", target: "log", label: "Click Log sample" },
      { source: "log", target: "release", label: "Log sample" },
      ...["tests", "clients", "ready", "priority", "sample", "receipt-folder", "results", "account"].map((target) => ({ source: "release", target, label: `Click ${target}` })),
      { source: "tests", target: "release", label: "Apply or clear" },
      { source: "clients", target: "release", label: "Apply or clear" },
      { source: "ready", target: "release", label: "Reset or search" },
      { source: "priority", target: "release", label: "Apply priority" },
    ],
  },
  ...[
    ["quality-capa", "Sequence Compliance", "Deviation & CAPA", "Report deviations, contain impact, investigate root cause, implement CAPA, and verify effectiveness.", ["Report", "Containment", "Investigation", "CAPA", "QA close"]],
    ["instrument-qualification", "Sequence Instruments", "Instrument Qualification & Calibration", "Add instruments, qualify interfaces, schedule calibration, and retain maintenance evidence.", ["Identity", "Interface", "Qualification", "Calibration", "In service"]],
    ["revenue-cycle", "Sequence Revenue", "Laboratory Revenue Cycle", "Create charges from completed testing, resolve exceptions, and route approved billing.", ["Charge capture", "Coding", "Exception review", "Approval", "Invoice"]],
    ["client-environment", "Sequence Client", "Client & Lab Environment Setup", "Create a client, configure laboratories and environments, assign modules, and promote an installation.", ["Create client", "Add laboratory", "Configure environment", "Assign modules", "Promote"]],
    ["insight-escalation", "Sequence Insights", "Operational Insight Escalation", "Detect an operational signal, assemble supporting records, assign an owner, and track resolution.", ["Signal detected", "Evidence assembled", "Owner assigned", "Action tracked", "Resolved"]],
  ].map(([id, module, name, description, labels]) => ({
    id: id as string,
    module: module as string,
    name: name as string,
    description: description as string,
    stages: (labels as string[]).map((label, index) => ({
      id: `${id}-${index}`,
      label,
      description: `${label} in the ${name} workflow.`,
      type: /review/i.test(label) ? "review" : /approval|promote/i.test(label) ? "approval" : "task",
      screen: screen(label, label, `${label} for ${description.toString().charAt(0).toLowerCase()}${description.toString().slice(1)}`, "Owner\nStatus\nNotes", index === (labels as string[]).length - 1 ? "Complete" : "Continue"),
    })),
  } satisfies SystemWorkflowDefinition)),
];
