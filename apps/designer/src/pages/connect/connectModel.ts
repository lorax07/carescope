export type InterfaceKind = "HL7 v2" | "FHIR R4" | "REST" | "Webhook" | "Instrument gateway" | "File";

export type ConnectInterface = {
  id: string;
  name: string;
  kind: InterfaceKind;
  direction: "Inbound" | "Outbound";
  endpoint: string;
  note: string;
};

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
  { id: "north-adt", name: "North Hospital ADT", kind: "HL7 v2", direction: "Inbound", endpoint: "MLLP 10.4.1.20:2575", note: "ADT^A08 and ADT^A31 from the hospital registration system." },
  { id: "north-orm", name: "North Hospital orders", kind: "HL7 v2", direction: "Inbound", endpoint: "MLLP 10.4.1.20:2576", note: "ORM^O01 orders. Reused by any hospital that sends the same v2 profile." },
  { id: "fhir-patient", name: "Epic FHIR", kind: "FHIR R4", direction: "Inbound", endpoint: "https://epic.north.example/fhir/R4", note: "Patient and ServiceRequest. The same map covers the next Epic site." },
  { id: "results-hook", name: "Result webhook", kind: "Webhook", direction: "Outbound", endpoint: "https://north.example/hooks/results", note: "POST when a result is released. The partner returns an acknowledgement id." },
  { id: "accession-api", name: "Accession API", kind: "REST", direction: "Outbound", endpoint: "POST /api/v1/accessions", note: "Creates the Sequence accession after an order is transformed." },
  { id: "cobas-gw", name: "Cobas 8000 gateway", kind: "Instrument gateway", direction: "Inbound", endpoint: "Agent LAB-GW-03 · ASTM", note: "The analyzer never leaves the lab network. The local gateway forwards results." },
  { id: "ref-file", name: "Reference lab drop", kind: "File", direction: "Inbound", endpoint: "sftp /inbound/ref-lab", note: "HL7 batch files. A bad header stops the file before any order is created." },
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

export type ConnectState = {
  interfaces: ConnectInterface[];
  messages: ConnectMessage[];
  transforms: TransformRow[];
  selectedId: string;
};

export function initialConnectState(): ConnectState {
  return {
    interfaces: CONNECT_INTERFACES.map((item) => ({ ...item })),
    messages: INITIAL_MESSAGES.map((message) => ({
      ...message,
      mapped: message.mapped.map((row) => ({ ...row })),
      steps: message.steps.map((row) => ({ ...row })),
    })),
    transforms: INITIAL_TRANSFORMS.map((row) => ({ ...row })),
    selectedId: "MSG-24018",
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

export function attentionMessages(messages: ConnectMessage[]): ConnectMessage[] {
  return messages.filter((message) => message.status === "failed" || message.status === "retrying");
}
