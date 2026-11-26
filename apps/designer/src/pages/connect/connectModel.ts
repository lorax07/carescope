export type InterfaceKind = "HL7 v2" | "FHIR R4" | "REST" | "Webhook" | "Instrument gateway" | "File";

export type ConnectInterface = {
  id: string;
  name: string;
  /** System that sends on this connection. */
  fromSystem: string;
  /** System that receives on this connection. */
  toSystem: string;
  kind: InterfaceKind;
  direction: "Inbound" | "Outbound";
  endpoint: string;
  note: string;
};

/** Interface channels are system-to-system connections. Instrument gateways and app APIs stay in their own submodules. */
export function isInterfaceChannel(channel: ConnectInterface): boolean {
  return channel.kind !== "Instrument gateway" && !channel.id.startsWith("gw-") && !channel.id.startsWith("app-");
}

export type TrailStep = {
  at: string;
  label: string;
  detail: string;
  state: "ok" | "fail" | "wait";
};

export type MappedField = {
  source: string;
  target: string;
  value: string;
};

export type MessageStatus = "delivered" | "failed" | "retrying" | "held";

export type ConnectMessage = {
  id: string;
  interfaceId: string;
  messageType: string;
  summary: string;
  correlation: string;
  status: MessageStatus;
  recoverable: boolean;
  credential: boolean;
  quarantine: boolean;
  attention: string;
  action: string;
  payload: string;
  mapped: MappedField[];
  steps: TrailStep[];
  /** Set when a workflow recorded the message, so it does not trigger another workflow. */
  origin?: "workflow";
};

export type TransformRow = {
  id: string;
  interfaceId: string;
  source: string;
  sample: string;
  target: string;
  note: string;
};

export const CONNECT_TARGETS = [
  { id: "patient.name", label: "Patient · Name" },
  { id: "patient.mrn", label: "Patient · MRN" },
  { id: "patient.dob", label: "Patient · Date of birth" },
  { id: "patient.address", label: "Patient · Address" },
  { id: "accession.id", label: "Accession · ID" },
  { id: "order.code", label: "Order · Code" },
  { id: "order.specimen", label: "Order · Specimen" },
  { id: "result.analyte", label: "Result · Analyte" },
  { id: "result.value", label: "Result · Value" },
  { id: "result.unit", label: "Result · Unit" },
];

export const CONNECT_INTERFACES: ConnectInterface[] = [
  { id: "north-adt", name: "Registration", fromSystem: "North Hospital registration", toSystem: "Sequence", kind: "HL7 v2", direction: "Inbound", endpoint: "MLLP 10.4.1.20:2575", note: "ADT^A08 and ADT^A31 from the hospital registration system." },
  { id: "north-orm", name: "Orders", fromSystem: "North Hospital orders", toSystem: "Sequence", kind: "HL7 v2", direction: "Inbound", endpoint: "MLLP 10.4.1.20:2576", note: "ORM^O01 orders. Reused by any hospital that sends the same v2 profile." },
  { id: "fhir-patient", name: "Patients and orders", fromSystem: "Epic", toSystem: "Sequence", kind: "FHIR R4", direction: "Inbound", endpoint: "https://epic.north.example/fhir/R4", note: "Patient and ServiceRequest. The same map covers the next Epic site." },
  { id: "results-hook", name: "Released results", fromSystem: "Sequence", toSystem: "North Hospital results", kind: "Webhook", direction: "Outbound", endpoint: "https://north.example/hooks/results", note: "POST when a result is released. The partner returns an acknowledgement id." },
  { id: "accession-api", name: "Accession create", fromSystem: "Sequence", toSystem: "Sequence accession", kind: "REST", direction: "Outbound", endpoint: "POST /api/v1/accessions", note: "Creates the Sequence accession after an order is transformed." },
  { id: "cobas-gw", name: "Cobas 8000 gateway", fromSystem: "cobas 8000", toSystem: "Sequence", kind: "Instrument gateway", direction: "Inbound", endpoint: "Agent LAB-GW-03 · ASTM", note: "The analyzer never leaves the lab network. The local gateway forwards results." },
  { id: "ref-file", name: "Reference lab files", fromSystem: "Reference lab", toSystem: "Sequence", kind: "File", direction: "Inbound", endpoint: "sftp /inbound/ref-lab", note: "HL7 batch files. A bad header stops the file before any order is created." },
];

function step(at: string, label: string, detail: string, state: TrailStep["state"]): TrailStep {
  return { at, label, detail, state };
}

export const INITIAL_MESSAGES: ConnectMessage[] = [
  {
    id: "MSG-24018",
    interfaceId: "north-orm",
    messageType: "ORM^O01",
    summary: "CBC order for MRN V-104428",
    correlation: "SQ-20491",
    status: "failed",
    recoverable: false,
    credential: false,
    quarantine: false,
    attention: "Sequence has no patient for MRN V-104428. The accession API returned 422.",
    action: "Create or match the patient, then retry. Another retry now will record the same 422.",
    payload: "MSH|^~\\&|SUNQUEST|NORTH|SEQUENCE|LAB|202611171612||ORM^O01|CTRL-8821|P|2.5\nPID|1||V-104428||OKONKWO^R||19780412|M\nOBR|1|SQ-20491||CBC^Complete blood count",
    mapped: [
      { source: "PID-3", target: "Patient · MRN", value: "V-104428" },
      { source: "PID-5", target: "Patient · Name", value: "OKONKWO^R" },
      { source: "OBR-4", target: "Order · Code", value: "CBC" },
    ],
    steps: [
      step("Nov 17, 4:12 PM CT", "Received", "MLLP frame, 1,842 bytes, from 10.4.1.20:2576.", "ok"),
      step("Nov 17, 4:12 PM CT", "Parsed", "ORM^O01. Control id CTRL-8821. Version 2.5.", "ok"),
      step("Nov 17, 4:12 PM CT", "Transformed", "PID-3, PID-5, and OBR-4 mapped with the North Hospital orders profile.", "ok"),
      step("Nov 17, 4:12 PM CT", "Delivery attempt 1", "POST /api/v1/accessions returned 422. Patient V-104428 was not found.", "fail"),
    ],
  },
  {
    id: "MSG-24022",
    interfaceId: "fhir-patient",
    messageType: "Patient",
    summary: "Patient update for R. Okonkwo",
    correlation: "Patient/V-104428",
    status: "retrying",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "The FHIR server timed out after 30 seconds. The payload was not rejected.",
    action: "Retry now. The update can be delivered without changing the message.",
    payload: "{\n  \"resourceType\": \"Patient\",\n  \"id\": \"V-104428\",\n  \"name\": [{ \"family\": \"Okonkwo\", \"given\": [\"R\"] }],\n  \"birthDate\": \"1978-04-12\"\n}",
    mapped: [
      { source: "Patient.name", target: "Patient · Name", value: "Okonkwo, R" },
      { source: "Patient.birthDate", target: "Patient · Date of birth", value: "1978-04-12" },
      { source: "Patient.id", target: "Patient · MRN", value: "V-104428" },
    ],
    steps: [
      step("Nov 17, 4:18 PM CT", "Received", "FHIR Bundle with one Patient resource.", "ok"),
      step("Nov 17, 4:18 PM CT", "Validated", "R4 Patient. Required name and birth date are present.", "ok"),
      step("Nov 17, 4:18 PM CT", "Transformed", "name, birthDate, and id mapped with the Epic FHIR profile.", "ok"),
      step("Nov 17, 4:18 PM CT", "Delivery attempt 1", "GET Patient/V-104428 timed out after 30 seconds.", "fail"),
      step("Nov 17, 4:20 PM CT", "Retry scheduled", "Next attempt uses the same payload. Nothing in the message changed.", "wait"),
    ],
  },
  {
    id: "MSG-24031",
    interfaceId: "accession-api",
    messageType: "POST /accessions",
    summary: "Outbound create for SQ-20610",
    correlation: "SQ-20610",
    status: "failed",
    recoverable: false,
    credential: true,
    quarantine: false,
    attention: "The destination returned 401 invalid_token. The API token expired at 3:40 PM CT.",
    action: "Replace the token, then retry. A retry before that records another 401.",
    payload: "{\n  \"accessionId\": \"SQ-20610\",\n  \"mrn\": \"A-22011\",\n  \"orderCode\": \"CMP\"\n}",
    mapped: [
      { source: "accessionId", target: "Accession · ID", value: "SQ-20610" },
      { source: "mrn", target: "Patient · MRN", value: "A-22011" },
      { source: "orderCode", target: "Order · Code", value: "CMP" },
    ],
    steps: [
      step("Nov 17, 3:41 PM CT", "Built", "JSON body for accession SQ-20610.", "ok"),
      step("Nov 17, 3:41 PM CT", "Signed", "Bearer token issued at 8:40 AM CT.", "ok"),
      step("Nov 17, 3:41 PM CT", "Delivery attempt 1", "POST /api/v1/accessions returned 401 invalid_token.", "fail"),
    ],
  },
  {
    id: "MSG-24040",
    interfaceId: "ref-file",
    messageType: "HL7 batch",
    summary: "REF-2026-11-17.hl7 rejected",
    correlation: "REF-2026-11-17.hl7",
    status: "failed",
    recoverable: false,
    credential: false,
    quarantine: false,
    attention: "The file header is missing MSH-4 sending facility. No orders were created.",
    action: "Quarantine the file. Retrying cannot invent the missing facility.",
    payload: "FHS|^~\\&|||SEQUENCE|20261117\nMSH|^~\\&|REF||SEQUENCE|LAB|202611171100||ORM^O01|BATCH-17|P|2.5",
    mapped: [],
    steps: [
      step("Nov 17, 11:02 AM CT", "File arrived", "842 KB on sftp /inbound/ref-lab/REF-2026-11-17.hl7.", "ok"),
      step("Nov 17, 11:02 AM CT", "Header check", "MSH-4 sending facility is empty.", "fail"),
      step("Nov 17, 11:02 AM CT", "Stopped", "0 of 140 expected orders were accepted. The file was not split.", "fail"),
    ],
  },
  {
    id: "MSG-24060",
    interfaceId: "fhir-patient",
    messageType: "ServiceRequest",
    summary: "Service request SR-441 held",
    correlation: "SR-441",
    status: "held",
    recoverable: false,
    credential: false,
    quarantine: false,
    attention: "specimen.coding has no Sequence field. The rest of the message transformed.",
    action: "Map specimen.coding on the Epic FHIR profile, then retry.",
    payload: "{\n  \"resourceType\": \"ServiceRequest\",\n  \"id\": \"SR-441\",\n  \"code\": { \"text\": \"CBC\" },\n  \"specimen\": [{ \"coding\": [{ \"code\": \"SERUM\" }] }]\n}",
    mapped: [
      { source: "ServiceRequest.code", target: "Order · Code", value: "CBC" },
      { source: "specimen.coding", target: "Unmapped", value: "SERUM" },
    ],
    steps: [
      step("Nov 17, 2:06 PM CT", "Received", "FHIR ServiceRequest SR-441.", "ok"),
      step("Nov 17, 2:06 PM CT", "Validated", "R4 ServiceRequest. Code is present.", "ok"),
      step("Nov 17, 2:06 PM CT", "Transform stopped", "specimen.coding is not on the Epic FHIR map.", "fail"),
      step("Nov 17, 2:06 PM CT", "Held", "Nothing was sent to Sequence.", "wait"),
    ],
  },
  {
    id: "MSG-24019",
    interfaceId: "north-orm",
    messageType: "ORM^O01",
    summary: "CMP order for MRN A-22011",
    correlation: "SQ-20502",
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: "MSH|^~\\&|SUNQUEST|NORTH|SEQUENCE|LAB|202611171540||ORM^O01|CTRL-8804|P|2.5\nPID|1||A-22011||NORTHWIND^FOODS\nOBR|1|SQ-20502||CMP^Comprehensive metabolic panel",
    mapped: [
      { source: "PID-3", target: "Patient · MRN", value: "A-22011" },
      { source: "OBR-4", target: "Order · Code", value: "CMP" },
    ],
    steps: [
      step("Nov 17, 3:40 PM CT", "Received", "MLLP frame from 10.4.1.20:2576.", "ok"),
      step("Nov 17, 3:40 PM CT", "Parsed", "ORM^O01. Control id CTRL-8804.", "ok"),
      step("Nov 17, 3:40 PM CT", "Transformed", "North Hospital orders profile.", "ok"),
      step("Nov 17, 3:40 PM CT", "Delivery attempt 1", "Accession SQ-20502 created.", "ok"),
    ],
  },
  {
    id: "MSG-24044",
    interfaceId: "cobas-gw",
    messageType: "ASTM result",
    summary: "Glucose 4.2 mmol/L for SQ-20491",
    correlation: "SQ-20491",
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: "H|\\^&|||LAB-GW-03\nP|1||SQ-20491\nR|1|^^^GLU|4.2|mmol/L",
    mapped: [
      { source: "R-2 analyte", target: "Result · Analyte", value: "GLU" },
      { source: "R-3", target: "Result · Value", value: "4.2" },
      { source: "R-4", target: "Result · Unit", value: "mmol/L" },
    ],
    steps: [
      step("Nov 17, 4:28 PM CT", "Gateway received", "Agent LAB-GW-03 accepted an ASTM frame from the Cobas 8000.", "ok"),
      step("Nov 17, 4:28 PM CT", "Transformed", "Analyte GLU, value, and unit mapped. The analyzer stayed on the lab network.", "ok"),
      step("Nov 17, 4:28 PM CT", "Delivery attempt 1", "Result posted on accession SQ-20491.", "ok"),
    ],
  },
  {
    id: "MSG-24051",
    interfaceId: "results-hook",
    messageType: "result.released",
    summary: "Released result notice for SQ-20502",
    correlation: "SQ-20502",
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: "{\n  \"event\": \"result.released\",\n  \"accessionId\": \"SQ-20502\",\n  \"orderCode\": \"CMP\"\n}",
    mapped: [
      { source: "accessionId", target: "Accession · ID", value: "SQ-20502" },
      { source: "orderCode", target: "Order · Code", value: "CMP" },
    ],
    steps: [
      step("Nov 17, 3:52 PM CT", "Built", "Webhook body for the released CMP.", "ok"),
      step("Nov 17, 3:52 PM CT", "Delivery attempt 1", "POST https://north.example/hooks/results returned 200.", "ok"),
      step("Nov 17, 3:52 PM CT", "Acknowledged", "Partner acknowledgement WH-991.", "ok"),
    ],
  },
  {
    id: "MSG-24055",
    interfaceId: "north-adt",
    messageType: "ADT^A08",
    summary: "Address update for V-104428",
    correlation: "V-104428",
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: "MSH|^~\\&|SUNQUEST|NORTH|SEQUENCE|LAB|202611171105||ADT^A08|CTRL-1022|P|2.5\nPID|1||V-104428||OKONKWO^R||19780412|M|||100 N STATE^^CHICAGO^IL^60601",
    mapped: [
      { source: "PID-3", target: "Patient · MRN", value: "V-104428" },
      { source: "PID-11", target: "Patient · Address", value: "100 N STATE, CHICAGO IL 60601" },
    ],
    steps: [
      step("Nov 17, 11:05 AM CT", "Received", "MLLP frame from 10.4.1.20:2575.", "ok"),
      step("Nov 17, 11:05 AM CT", "Parsed", "ADT^A08. Control id CTRL-1022.", "ok"),
      step("Nov 17, 11:05 AM CT", "Transformed", "PID-11 address mapped.", "ok"),
      step("Nov 17, 11:05 AM CT", "Delivery attempt 1", "Patient V-104428 updated.", "ok"),
    ],
  },
  {
    id: "MSG-24071",
    interfaceId: "ref-file",
    messageType: "HL7 batch",
    summary: "REF-2026-11-16.hl7 accepted",
    correlation: "REF-2026-11-16.hl7",
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: "FHS|^~\\&|REF|NORTH|SEQUENCE|LAB|20261116\nMSH|^~\\&|REF|NORTH|SEQUENCE|LAB|202611161100||ORM^O01|BATCH-16|P|2.5",
    mapped: [
      { source: "MSH-4", target: "Sending facility", value: "NORTH" },
    ],
    steps: [
      step("Nov 16, 11:04 AM CT", "File arrived", "610 KB on sftp /inbound/ref-lab/REF-2026-11-16.hl7.", "ok"),
      step("Nov 16, 11:04 AM CT", "Split", "140 orders accepted from the batch.", "ok"),
      step("Nov 16, 11:06 AM CT", "Delivery attempt 1", "140 accessions created.", "ok"),
    ],
  },
];

export const INITIAL_TRANSFORMS: TransformRow[] = [
  { id: "orm-mrn", interfaceId: "north-orm", source: "PID-3", sample: "V-104428", target: "patient.mrn", note: "Same path on every ORM that uses this profile." },
  { id: "orm-name", interfaceId: "north-orm", source: "PID-5", sample: "OKONKWO^R", target: "patient.name", note: "Family and given name stay in HL7 component order until display." },
  { id: "orm-code", interfaceId: "north-orm", source: "OBR-4", sample: "CBC", target: "order.code", note: "" },
  { id: "adt-addr", interfaceId: "north-adt", source: "PID-11", sample: "100 N STATE^^CHICAGO^IL^60601", target: "patient.address", note: "" },
  { id: "fhir-name", interfaceId: "fhir-patient", source: "Patient.name", sample: "Okonkwo, R", target: "patient.name", note: "Reused for the next Epic site." },
  { id: "fhir-dob", interfaceId: "fhir-patient", source: "Patient.birthDate", sample: "1978-04-12", target: "patient.dob", note: "" },
  { id: "fhir-spec", interfaceId: "fhir-patient", source: "specimen.coding", sample: "SERUM", target: "", note: "ServiceRequest SR-441 is held until this has a Sequence field." },
  { id: "hook-acc", interfaceId: "results-hook", source: "accessionId", sample: "SQ-20502", target: "accession.id", note: "" },
  { id: "api-acc", interfaceId: "accession-api", source: "accessionId", sample: "SQ-20610", target: "accession.id", note: "" },
  { id: "gw-analyte", interfaceId: "cobas-gw", source: "R-2 analyte", sample: "GLU", target: "result.analyte", note: "The gateway sends the analyzer code. Sequence stores the analyte." },
  { id: "gw-value", interfaceId: "cobas-gw", source: "R-3", sample: "4.2", target: "result.value", note: "" },
  { id: "file-fac", interfaceId: "ref-file", source: "MSH-4", sample: "NORTH", target: "accession.site", note: "A blank MSH-4 rejects the whole file." },
];

export const CONNECTOR_CATEGORIES = ["Messaging", "CRM", "Email", "EHR", "Storage", "Identity"] as const;

export type ConnectorCategory = (typeof CONNECTOR_CATEGORIES)[number];

export type AppConnector = {
  id: string;
  name: string;
  category: ConnectorCategory;
  kind: InterfaceKind;
  direction: ConnectInterface["direction"];
  summary: string;
  accountLabel: string;
  accountHint: string;
  endpoint: string;
  handshake: string;
  accepted: string;
};

export const APP_CONNECTORS: AppConnector[] = [
  { id: "slack", name: "Slack", category: "Messaging", kind: "Webhook", direction: "Outbound", summary: "Holds and released results posted to a lab channel.", accountLabel: "Workspace", accountHint: "north-lab", endpoint: "https://hooks.slack.com/services/{account}", handshake: "POST hook", accepted: "Slack accepted the connection and returned a channel id." },
  { id: "teams", name: "Microsoft Teams", category: "Messaging", kind: "Webhook", direction: "Outbound", summary: "The same hold and release notices in a Teams channel.", accountLabel: "Team", accountHint: "North Hospital Lab", endpoint: "https://outlook.office.com/webhook/{account}", handshake: "POST hook", accepted: "Teams accepted the connector for that team." },
  { id: "twilio", name: "Twilio", category: "Messaging", kind: "REST", direction: "Outbound", summary: "Text the ordering provider when a result is released.", accountLabel: "Account SID", accountHint: "AC-north-lab", endpoint: "https://api.twilio.com/2010-04-01/Accounts/{account}/Messages.json", handshake: "POST /Messages", accepted: "Twilio accepted the account and can send from the lab number." },
  { id: "salesforce", name: "Salesforce", category: "CRM", kind: "REST", direction: "Outbound", summary: "Accounts and open cases stay in step with Sequence CRM.", accountLabel: "Org", accountHint: "north-health", endpoint: "https://{account}.my.salesforce.com/services/data/v60.0", handshake: "GET /limits", accepted: "Salesforce returned the org limits. The API session is live." },
  { id: "hubspot", name: "HubSpot", category: "CRM", kind: "REST", direction: "Outbound", summary: "Client accounts and outreach written to HubSpot companies.", accountLabel: "Portal", accountHint: "44102", endpoint: "https://api.hubapi.com/crm/v3/objects/companies", handshake: "GET /companies", accepted: "HubSpot listed the portal companies. Sequence can write accounts." },
  { id: "dynamics", name: "Dynamics 365", category: "CRM", kind: "REST", direction: "Outbound", summary: "Accounts and activities for labs that already run Dynamics.", accountLabel: "Environment", accountHint: "north-health", endpoint: "https://{account}.crm.dynamics.com/api/data/v9.2", handshake: "GET /WhoAmI", accepted: "Dynamics confirmed the environment user. The API is open." },
  { id: "m365", name: "Microsoft 365", category: "Email", kind: "REST", direction: "Outbound", summary: "Result letters sent from the laboratory mailbox.", accountLabel: "Mailbox domain", accountHint: "northlab.org", endpoint: "https://graph.microsoft.com/v1.0/users/{account}/sendMail", handshake: "GET /users", accepted: "Microsoft Graph accepted the mailbox domain." },
  { id: "gmail", name: "Gmail", category: "Email", kind: "REST", direction: "Outbound", summary: "The same result letters from a Google Workspace mailbox.", accountLabel: "Domain", accountHint: "northlab.org", endpoint: "https://gmail.googleapis.com/gmail/v1/users/{account}/messages/send", handshake: "GET /profile", accepted: "Gmail returned the mailbox profile. Sending is allowed." },
  { id: "sendgrid", name: "SendGrid", category: "Email", kind: "REST", direction: "Outbound", summary: "Bulk client notices when the laboratory mailbox should stay quiet.", accountLabel: "Sender domain", accountHint: "notify.northlab.org", endpoint: "https://api.sendgrid.com/v3/mail/send", handshake: "GET /scopes", accepted: "SendGrid confirmed mail.send for that sender domain." },
  { id: "epic", name: "Epic", category: "EHR", kind: "FHIR R4", direction: "Inbound", summary: "Patients and orders from another Epic site, on the same FHIR profile.", accountLabel: "Site", accountHint: "west-campus", endpoint: "https://{account}.epic.example/fhir/R4", handshake: "GET /metadata", accepted: "The Epic FHIR server returned its capability statement." },
  { id: "oracle-health", name: "Oracle Health", category: "EHR", kind: "FHIR R4", direction: "Inbound", summary: "Patients and service requests from a Cerner Millennium site.", accountLabel: "Tenant", accountHint: "millennium-north", endpoint: "https://{account}.oraclehealth.example/r4", handshake: "GET /metadata", accepted: "Oracle Health returned the R4 capability statement." },
  { id: "athena", name: "athenahealth", category: "EHR", kind: "REST", direction: "Inbound", summary: "Orders and results for practices that chart in athenaOne.", accountLabel: "Practice", accountHint: "1959", endpoint: "https://api.platform.athenahealth.com/v1/{account}", handshake: "GET /practiceinfo", accepted: "athenahealth returned the practice. Orders can be read." },
  { id: "sharepoint", name: "SharePoint", category: "Storage", kind: "REST", direction: "Outbound", summary: "Released reports filed in the laboratory document library.", accountLabel: "Site", accountHint: "north-lab", endpoint: "https://{account}.sharepoint.com/sites/lab", handshake: "GET /sites", accepted: "SharePoint returned the lab site. The document library is reachable." },
  { id: "box", name: "Box", category: "Storage", kind: "REST", direction: "Outbound", summary: "The same reports in a Box folder the client already uses.", accountLabel: "Enterprise", accountHint: "north-health", endpoint: "https://api.box.com/2.0/folders", handshake: "GET /users/me", accepted: "Box confirmed the enterprise user. The folder can take files." },
  { id: "s3", name: "Amazon S3", category: "Storage", kind: "File", direction: "Outbound", summary: "A bucket for reference-lab files and released report copies.", accountLabel: "Bucket", accountHint: "north-lab-results", endpoint: "s3://{account}", handshake: "HEAD bucket", accepted: "The bucket exists and Sequence can write objects to it." },
  { id: "okta", name: "Okta", category: "Identity", kind: "REST", direction: "Inbound", summary: "Laboratory people and groups, so access is not a second directory.", accountLabel: "Org domain", accountHint: "northlab.okta.com", endpoint: "https://{account}/api/v1/users", handshake: "GET /users", accepted: "Okta listed the org users. Sequence can match people to access." },
  { id: "entra", name: "Microsoft Entra ID", category: "Identity", kind: "REST", direction: "Inbound", summary: "The same directory when the laboratory already uses Entra.", accountLabel: "Tenant", accountHint: "northlab.onmicrosoft.com", endpoint: "https://graph.microsoft.com/v1.0/users", handshake: "GET /users", accepted: "Entra returned the tenant users. Directory matching can start." },
];

export type AppConnection = {
  connectorId: string;
  account: string;
  interfaceId: string;
};

export const INSTRUMENT_CATEGORIES = ["Chemistry", "Hematology", "Immunoassay", "Microbiology", "Molecular", "Mass spectrometry", "Chromatography"] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

export type LabInstrument = {
  id: string;
  name: string;
  maker: string;
  category: InstrumentCategory;
  protocol: string;
  summary: string;
};

export type ConnectedInstrument = {
  id: string;
  catalogId: string;
  name: string;
  category: InstrumentCategory;
  protocol: string;
  site: string;
  labId: string;
  status: "Online" | "Idle";
  interfaceId: string;
};

export const INSTRUMENT_CATALOG: LabInstrument[] = [
  { id: "cobas-8000", name: "cobas 8000", maker: "Roche", category: "Chemistry", protocol: "ASTM", summary: "Chemistry line already on the local gateway." },
  { id: "alinity-c", name: "Alinity c", maker: "Abbott", category: "Chemistry", protocol: "HL7", summary: "Chemistry orders down and results back." },
  { id: "au5800", name: "AU5800", maker: "Beckman Coulter", category: "Chemistry", protocol: "ASTM", summary: "High-volume chemistry with host query." },
  { id: "atellica-ch", name: "Atellica CH", maker: "Siemens", category: "Chemistry", protocol: "HL7", summary: "Chemistry module on an Atellica track." },
  { id: "xn-1000", name: "XN-1000", maker: "Sysmex", category: "Hematology", protocol: "ASTM", summary: "CBC and differential from the hematology bench." },
  { id: "dxh-900", name: "DxH 900", maker: "Beckman Coulter", category: "Hematology", protocol: "HL7", summary: "Hematology results with slide review flags." },
  { id: "alinity-h", name: "Alinity h", maker: "Abbott", category: "Hematology", protocol: "HL7", summary: "Hematology on the same host as Alinity c." },
  { id: "cobas-e801", name: "cobas e 801", maker: "Roche", category: "Immunoassay", protocol: "ASTM", summary: "Immunoassay results beside the chemistry line." },
  { id: "alinity-i", name: "Alinity i", maker: "Abbott", category: "Immunoassay", protocol: "HL7", summary: "Immunoassay orders and released results." },
  { id: "liaison-xl", name: "Liaison XL", maker: "DiaSorin", category: "Immunoassay", protocol: "ASTM", summary: "Specialty immunoassay from a standalone analyzer." },
  { id: "bact-alert", name: "BacT/ALERT 3D", maker: "bioMérieux", category: "Microbiology", protocol: "Result file", summary: "Blood culture positives as they signal." },
  { id: "bactec-fx", name: "BACTEC FX", maker: "BD", category: "Microbiology", protocol: "Result file", summary: "Blood culture signals from the FX cabinet." },
  { id: "vitek-2", name: "VITEK 2", maker: "bioMérieux", category: "Microbiology", protocol: "HL7", summary: "Identification and susceptibility cards." },
  { id: "cobas-6800", name: "cobas 6800", maker: "Roche", category: "Molecular", protocol: "HL7", summary: "Molecular orders and the released result." },
  { id: "quantstudio-5", name: "QuantStudio 5", maker: "Thermo Fisher", category: "Molecular", protocol: "File drop", summary: "qPCR exports dropped by the instrument PC." },
  { id: "panther", name: "Panther", maker: "Hologic", category: "Molecular", protocol: "HL7", summary: "Molecular testing with host query." },
  { id: "exploris-120", name: "Orbitrap Exploris 120", maker: "Thermo Fisher", category: "Mass spectrometry", protocol: "File drop", summary: "Raw files and a result summary from the MS PC." },
  { id: "icp-7900", name: "7900 ICP-MS", maker: "Agilent", category: "Mass spectrometry", protocol: "File drop", summary: "Metals results from the ICP-MS batch." },
  { id: "tq-6500", name: "Triple Quad 6500", maker: "SCIEX", category: "Mass spectrometry", protocol: "File drop", summary: "Quantitation batches from the triple quad." },
  { id: "xevo-tqs", name: "Xevo TQ-S", maker: "Waters", category: "Mass spectrometry", protocol: "File drop", summary: "LC-MS/MS batches from the Xevo." },
  { id: "hplc-1260", name: "1260 Infinity II", maker: "Agilent", category: "Chromatography", protocol: "File drop", summary: "HPLC chromatograms and peak tables." },
  { id: "acquity", name: "ACQUITY UPLC", maker: "Waters", category: "Chromatography", protocol: "File drop", summary: "UPLC batches from Empower." },
  { id: "vanquish", name: "Vanquish", maker: "Thermo Fisher", category: "Chromatography", protocol: "File drop", summary: "UHPLC runs from Chromeleon." },
];

const SEEDED_INSTRUMENTS: ConnectedInstrument[] = [
  { id: "conn-cobas-8000", catalogId: "cobas-8000", name: "cobas 8000", category: "Chemistry", protocol: "ASTM", site: "North Lab", labId: "lab-north", status: "Online", interfaceId: "cobas-gw" },
  { id: "conn-xn-1000", catalogId: "xn-1000", name: "XN-1000", category: "Hematology", protocol: "ASTM", site: "North Lab", labId: "lab-north", status: "Online", interfaceId: "gw-xn-1000" },
  { id: "conn-bact-alert", catalogId: "bact-alert", name: "BacT/ALERT 3D", category: "Microbiology", protocol: "Result file", site: "North Lab", labId: "lab-north", status: "Idle", interfaceId: "gw-bact-alert" },
  { id: "conn-hplc-1260", catalogId: "hplc-1260", name: "1260 Infinity II", category: "Chromatography", protocol: "File drop", site: "North Lab", labId: "lab-north", status: "Idle", interfaceId: "gw-hplc-1260" },
];

function instrumentChannel(item: ConnectedInstrument, note: string): ConnectInterface {
  return {
    id: item.interfaceId,
    name: item.name,
    fromSystem: item.name,
    toSystem: "Sequence",
    kind: "Instrument gateway",
    direction: "Inbound",
    endpoint: `Agent LAB-GW · ${item.protocol} · ${item.site}`,
    note,
  };
}

export type ConnectState = {
  interfaces: ConnectInterface[];
  messages: ConnectMessage[];
  transforms: TransformRow[];
  connections: AppConnection[];
  instruments: ConnectedInstrument[];
  selectedId: string;
};

export function initialConnectState(): ConnectState {
  const seededChannels = SEEDED_INSTRUMENTS
    .filter((item) => !CONNECT_INTERFACES.some((channel) => channel.id === item.interfaceId))
    .map((item) => instrumentChannel(item, `${item.name} is connected to this lab instance.`));
  return {
    interfaces: [...CONNECT_INTERFACES.map((item) => ({ ...item })), ...seededChannels],
    messages: INITIAL_MESSAGES.map((message) => ({
      ...message,
      mapped: message.mapped.map((row) => ({ ...row })),
      steps: message.steps.map((row) => ({ ...row })),
    })),
    transforms: INITIAL_TRANSFORMS.map((row) => ({ ...row })),
    connections: [],
    instruments: SEEDED_INSTRUMENTS.map((item) => ({ ...item })),
    selectedId: "MSG-24018",
  };
}

export function catalogInstrument(id: string): LabInstrument | undefined {
  return INSTRUMENT_CATALOG.find((item) => item.id === id);
}

export function connectorById(id: string): AppConnector | undefined {
  return APP_CONNECTORS.find((item) => item.id === id);
}

export function withInstrumentIntegration(state: ConnectState, instrument: LabInstrument, site: string, labId: string, at: string): ConnectState {
  const trimmed = site.trim();
  if (!trimmed) return state;
  const scopedLab = labId || "lab-north";
  if (state.instruments.some((item) => item.catalogId === instrument.id && item.labId === scopedLab)) return state;
  const interfaceId = `gw-${instrument.id}`;
  const connected: ConnectedInstrument = {
    id: `conn-${instrument.id}`,
    catalogId: instrument.id,
    name: instrument.name,
    category: instrument.category,
    protocol: instrument.protocol,
    site: trimmed,
    labId: scopedLab,
    status: "Online",
    interfaceId,
  };
  const channel = instrumentChannel(connected, `Integration started ${at}. ${instrument.summary}`);
  const exists = state.interfaces.some((item) => item.id === interfaceId);
  const message: ConnectMessage = {
    id: `MSG-INST-${instrument.id.toUpperCase()}`,
    interfaceId,
    messageType: "Gateway handshake",
    summary: `${instrument.maker} ${instrument.name} integration for ${trimmed}`,
    correlation: trimmed,
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: `HANDSHAKE ${channel.endpoint}`,
    mapped: [],
    steps: [
      { at, label: "Integration started", detail: `Sequence opened the ${instrument.protocol} gateway for ${instrument.maker} ${instrument.name} at ${trimmed}.`, state: "ok" },
      { at, label: "Gateway accepted", detail: "The local gateway answered. Results can arrive on this channel.", state: "ok" },
    ],
  };
  return {
    ...state,
    interfaces: exists ? state.interfaces : [...state.interfaces, channel],
    messages: [message, ...state.messages],
    instruments: [...state.instruments, connected],
    selectedId: message.id,
  };
}

export function withAppConnection(state: ConnectState, connector: AppConnector, account: string, at: string): ConnectState {
  const trimmed = account.trim();
  if (!trimmed) return state;
  if (state.connections.some((item) => item.connectorId === connector.id)) return state;
  const interfaceId = `app-${connector.id}`;
  const endpoint = connector.endpoint.replaceAll("{account}", trimmed);
  const channel: ConnectInterface = {
    id: interfaceId,
    name: connector.name,
    fromSystem: connector.direction === "Inbound" ? connector.name : "Sequence",
    toSystem: connector.direction === "Inbound" ? "Sequence" : connector.name,
    kind: connector.kind,
    direction: connector.direction,
    endpoint,
    note: `API connection started for ${trimmed}. ${connector.summary}`,
  };
  const message: ConnectMessage = {
    id: `MSG-APP-${connector.id.toUpperCase()}`,
    interfaceId,
    messageType: connector.handshake,
    summary: `${connector.name} API handshake for ${trimmed}`,
    correlation: trimmed,
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: `${connector.handshake} ${endpoint}`,
    mapped: [],
    steps: [
      { at, label: "API connection started", detail: `Sequence called the ${connector.name} ${connector.kind} API for ${trimmed}.`, state: "ok" },
      { at, label: "Handshake accepted", detail: connector.accepted, state: "ok" },
    ],
  };
  return {
    ...state,
    interfaces: [...state.interfaces, channel],
    messages: [message, ...state.messages],
    connections: [...state.connections, { connectorId: connector.id, account: trimmed, interfaceId }],
    instruments: state.instruments,
    selectedId: message.id,
  };
}

export function targetLabel(id: string): string {
  return CONNECT_TARGETS.find((field) => field.id === id)?.label ?? "Unmapped";
}

export function interfaceById(interfaces: ConnectInterface[], id: string): ConnectInterface | undefined {
  return interfaces.find((item) => item.id === id);
}

export function messagesFor(messages: ConnectMessage[], interfaceId: string): ConnectMessage[] {
  return messages.filter((message) => message.interfaceId === interfaceId);
}

export type InterfaceHealth = {
  tone: "ok" | "warn" | "block" | "wait";
  label: string;
  detail: string;
};

export function interfaceHealth(messages: ConnectMessage[], transforms: TransformRow[], channel: ConnectInterface): InterfaceHealth {
  const own = messagesFor(messages, channel.id);
  const failed = own.find((message) => message.status === "failed");
  if (failed) return { tone: "block", label: "Needs attention", detail: `${failed.id}: ${failed.attention}` };
  const retrying = own.find((message) => message.status === "retrying");
  if (retrying) return { tone: "warn", label: "Retrying", detail: `${retrying.id}: ${retrying.attention}` };
  const unmapped = transforms.filter((row) => row.interfaceId === channel.id && !row.target);
  const held = own.find((message) => message.status === "held");
  if (held) return { tone: "wait", label: "Held", detail: `${held.id}: ${held.attention}` };
  if (unmapped.length) return { tone: "wait", label: "Map incomplete", detail: `${unmapped.length} field${unmapped.length === 1 ? "" : "s"} still unmapped` };
  const delivered = own.find((message) => message.status === "delivered");
  if (delivered) return { tone: "ok", label: "Delivering", detail: `${delivered.id} delivered. ${delivered.summary}` };
  return { tone: "wait", label: "Quiet", detail: "No messages on this interface yet." };
}

export function messageBlob(message: ConnectMessage, interfaceName: string): string {
  return [
    message.id,
    message.messageType,
    message.summary,
    message.correlation,
    message.attention,
    message.action,
    message.payload,
    interfaceName,
    ...message.steps.map((step) => `${step.label} ${step.detail}`),
    ...message.mapped.flatMap((row) => [row.source, row.target, row.value]),
  ].join("\n").toLowerCase();
}

export function matchesQuery(message: ConnectMessage, interfaceName: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return messageBlob(message, interfaceName).includes(needle);
}

function deliveryCount(message: ConnectMessage): number {
  return message.steps.filter((item) => item.label.startsWith("Delivery attempt")).length;
}

export function withAttempt(message: ConnectMessage, at: string, replay: boolean): ConnectMessage {
  const steps = message.steps.map((item) => ({ ...item }));
  if (replay) {
    steps.push({ at, label: "Replay", detail: `Replayed ${message.id} from the original payload. The partner message was not edited.`, state: "wait" });
  }
  if (message.status === "delivered") {
    steps.push({ at, label: replay ? "Replay skipped" : "Retry skipped", detail: "This message already delivered. Nothing was sent again.", state: "ok" });
    return { ...message, steps };
  }
  if (message.quarantine) {
    steps.push({ at, label: "Retry blocked", detail: "This file is quarantined and will not be sent again.", state: "fail" });
    return { ...message, steps };
  }
  const attempt = deliveryCount(message) + 1;
  if (message.recoverable) {
    steps.push({ at, label: `Delivery attempt ${attempt}`, detail: "Destination accepted the message.", state: "ok" });
    return { ...message, status: "delivered", attention: "", action: "", steps };
  }
  steps.push({
    at,
    label: `Delivery attempt ${attempt}`,
    detail: message.attention || "Destination rejected the message.",
    state: "fail",
  });
  return { ...message, status: message.status === "held" ? "held" : "failed", steps };
}

export function withTokenReplaced(message: ConnectMessage, at: string): ConnectMessage {
  if (!message.credential || message.recoverable) return message;
  return {
    ...message,
    recoverable: true,
    attention: "Token replaced. The next delivery can use it.",
    action: "Retry now.",
    steps: [...message.steps, { at, label: "Token replaced", detail: "A new API token is on the Accession API. The previous 401 stays in the trail.", state: "ok" }],
  };
}

export function withQuarantine(message: ConnectMessage, at: string): ConnectMessage {
  if (message.interfaceId !== "ref-file" || message.status === "delivered") return message;
  return {
    ...message,
    status: "held",
    quarantine: true,
    recoverable: false,
    attention: "Quarantined. The file stays in /inbound/ref-lab/rejected.",
    action: "Ask the reference lab to resend the file with MSH-4 filled in.",
    steps: [...message.steps, { at, label: "Quarantined", detail: "The file will not be retried. The header failure stays in the trail.", state: "wait" }],
  };
}

export function withWorkflowDelivery(
  state: ConnectState,
  input: { id: string; interfaceId: string; summary: string; payload: string; at: string },
): ConnectState {
  if (state.messages.some((message) => message.id === input.id)) return state;
  const message: ConnectMessage = {
    id: input.id,
    interfaceId: input.interfaceId,
    messageType: "Workflow delivery",
    summary: input.summary,
    correlation: input.id,
    status: "delivered",
    recoverable: true,
    credential: false,
    quarantine: false,
    attention: "",
    action: "",
    payload: input.payload,
    mapped: [],
    origin: "workflow",
    steps: [{ at: input.at, label: "Workflow delivery", detail: "A workflow recorded this delivery on the connection. It was not sent outside Sequence.", state: "ok" }],
  };
  return { ...state, messages: [message, ...state.messages], selectedId: message.id };
}

export function attentionMessages(messages: ConnectMessage[]): ConnectMessage[] {
  return messages.filter((message) => message.status === "failed" || message.status === "retrying");
}
