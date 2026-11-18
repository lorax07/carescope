export type SequenceField = { id: string; label: string };

export const SEQUENCE_FIELDS: SequenceField[] = [
  { id: "patient.name", label: "Patient · Name" },
  { id: "patient.dob", label: "Patient · Date of birth" },
  { id: "patient.sex", label: "Patient · Sex" },
  { id: "patient.mrn", label: "Patient · MRN" },
  { id: "patient.phone", label: "Patient · Phone" },
  { id: "patient.address", label: "Patient · Address" },
  { id: "accession.id", label: "Accession · ID" },
  { id: "accession.collectedAt", label: "Accession · Collected" },
  { id: "accession.receivedAt", label: "Accession · Received" },
  { id: "accession.priority", label: "Accession · Priority" },
  { id: "accession.site", label: "Accession · Site" },
  { id: "order.code", label: "Order · Code" },
  { id: "order.specimen", label: "Order · Specimen" },
  { id: "provider.npi", label: "Provider · NPI" },
  { id: "provider.name", label: "Provider · Name" },
  { id: "result.analyte", label: "Result · Analyte" },
  { id: "result.value", label: "Result · Value" },
  { id: "result.unit", label: "Result · Unit" },
];

export type ImportFile = {
  id: string;
  name: string;
  table: string;
  rows: number;
  status: "loaded" | "waiting";
};

export type FieldMap = {
  id: string;
  sourceTable: string;
  sourceField: string;
  sample: string;
  sequenceField: string;
  confidence: number;
  review: boolean;
};

export type DataIssue = {
  id: string;
  kind: "missing" | "inconsistent";
  record: string;
  field: string;
  detail: string;
  count: number;
  severity: "block" | "warn";
  resolved: boolean;
};

export type DuplicateDecision = "open" | "keep-source" | "keep-destination" | "distinct";

export type DuplicatePair = {
  id: string;
  entity: string;
  left: string;
  right: string;
  reason: string;
  score: number;
  decision: DuplicateDecision;
};

export type CompareRecord = {
  id: string;
  label: string;
  entity: string;
  rows: { field: string; source: string; destination: string }[];
};

export type EntityTally = {
  entity: string;
  source: number;
  destination: number;
  matched: number;
};

export type MigrationTemplate = {
  id: string;
  name: string;
  system: string;
  ready: boolean;
  note: string;
  files: ImportFile[];
  maps: FieldMap[];
  issues: DataIssue[];
  duplicates: DuplicatePair[];
  compares: CompareRecord[];
  entities: EntityTally[];
};

export type MigrationState = {
  jobName: string;
  templateId: string;
  files: ImportFile[];
  maps: FieldMap[];
  issues: DataIssue[];
  duplicates: DuplicatePair[];
  compares: CompareRecord[];
  entities: EntityTally[];
  compareId: string;
  evidenceAt: string | null;
};

const sunquestFiles: ImportFile[] = [
  { id: "patients", name: "pat_demographics.csv", table: "Patients", rows: 12480, status: "loaded" },
  { id: "accessions", name: "acc_history.csv", table: "Accessions", rows: 48221, status: "loaded" },
  { id: "orders", name: "ord_codes.csv", table: "Orders", rows: 51004, status: "loaded" },
  { id: "providers", name: "prov_master.csv", table: "Providers", rows: 860, status: "loaded" },
  { id: "results", name: "res_archive.csv", table: "Results", rows: 210440, status: "waiting" },
];

function mapRow(id: string, sourceTable: string, sourceField: string, sample: string, sequenceField: string, confidence: number, review = false): FieldMap {
  return { id, sourceTable, sourceField, sample, sequenceField, confidence, review };
}

const sunquestMaps: FieldMap[] = [
  mapRow("pat-name", "Patients", "PAT_LAST + PAT_FIRST", "Okinkwo, R.", "patient.name", 0.96),
  mapRow("pat-dob", "Patients", "PAT_DOB", "1978-04-12", "patient.dob", 0.94),
  mapRow("pat-sex", "Patients", "PAT_SEX", "M / F / U / X", "patient.sex", 0.62, true),
  mapRow("pat-mrn", "Patients", "MRN", "V-104428", "patient.mrn", 0.99),
  mapRow("pat-phone", "Patients", "PAT_PHONE", "312-555-0142", "", 0.4),
  mapRow("acc-id", "Accessions", "ACC_NUM", "SQ-20491", "accession.id", 0.98),
  mapRow("acc-col", "Accessions", "COLL_DT", "2026-10-02 07:14", "accession.collectedAt", 0.91),
  mapRow("acc-recv", "Accessions", "RECV_DT", "2026-10-02 09:02", "accession.receivedAt", 0.9),
  mapRow("acc-pri", "Accessions", "PRI_CD", "ST / RT / UR", "accession.priority", 0.58, true),
  mapRow("ord-code", "Orders", "ORD_CD", "CBC", "order.code", 0.93),
  mapRow("prov-npi", "Providers", "PROV_NPI", "1467782201", "provider.npi", 0.97),
  mapRow("res-val", "Results", "RES_VAL", "4.2", "", 0.35),
];

const sunquestIssues: DataIssue[] = [
  { id: "dob-missing", kind: "missing", record: "Patients", field: "Date of birth", detail: "36 patients have a blank PAT_DOB. Sequence requires a date of birth before the accession can be received.", count: 36, severity: "block", resolved: false },
  { id: "mrn-missing", kind: "missing", record: "Patients", field: "MRN", detail: "12 patients have no MRN. They cannot be matched to a destination chart.", count: 12, severity: "block", resolved: false },
  { id: "sex-code", kind: "inconsistent", record: "Patients", field: "Sex", detail: "PAT_SEX uses X on 8 rows. Sequence accepts female, male, unknown, and other.", count: 8, severity: "warn", resolved: false },
  { id: "date-order", kind: "inconsistent", record: "Accessions", field: "Collected", detail: "21 accessions have a collection time after the receive time.", count: 21, severity: "block", resolved: false },
  { id: "priority", kind: "inconsistent", record: "Accessions", field: "Priority", detail: "PRI_CD uses ST for stat and RT for routine. Sequence stores stat, rush, and routine.", count: 140, severity: "warn", resolved: false },
  { id: "npi-blank", kind: "missing", record: "Providers", field: "NPI", detail: "19 ordering providers have a blank NPI, so the order cannot be tied to a destination provider.", count: 19, severity: "warn", resolved: false },
];

const sunquestDuplicates: DuplicatePair[] = [
  { id: "dup-mrn", entity: "Patient", left: "Source V-104428 · R. Okinkwo", right: "Sequence V-104428 · R. Okonkwo", reason: "Same MRN, one-character name difference", score: 0.94, decision: "open" },
  { id: "dup-name", entity: "Patient", left: "Source A-22011 · Northwind Foods", right: "Sequence A-22011 · Northwind Food", reason: "Same account number, shortened name", score: 0.88, decision: "open" },
  { id: "dup-acc", entity: "Accession", left: "Source SQ-20491 · CBC", right: "Sequence SQ-20491 · CBC", reason: "Accession number already exists in Sequence", score: 0.99, decision: "open" },
  { id: "dup-npi", entity: "Provider", left: "Source 1467782201 · S. Patel", right: "Sequence 1467782201 · S. Patel, MD", reason: "Same NPI, credential added on the destination", score: 0.91, decision: "open" },
  { id: "dup-order", entity: "Order", left: "Source CBC-D · CBC with differential", right: "Sequence CBC · Complete blood count", reason: "Order code alias for the same test", score: 0.86, decision: "open" },
];

const sunquestCompares: CompareRecord[] = [
  {
    id: "cmp-patient",
    label: "V-104428 · R. Okonkwo",
    entity: "Patient",
    rows: [
      { field: "Name", source: "Okinkwo, R.", destination: "R. Okonkwo" },
      { field: "Date of birth", source: "1978-04-12", destination: "1978-04-12" },
      { field: "Sex", source: "M", destination: "Male" },
      { field: "MRN", source: "V-104428", destination: "V-104428" },
      { field: "Phone", source: "312-555-0142", destination: "—" },
    ],
  },
  {
    id: "cmp-accession",
    label: "SQ-20491 · CBC",
    entity: "Accession",
    rows: [
      { field: "Accession", source: "SQ-20491", destination: "SQ-20491" },
      { field: "Collected", source: "2026-10-02 07:14", destination: "2026-10-02 07:14" },
      { field: "Received", source: "2026-10-02 09:02", destination: "2026-10-02 09:02" },
      { field: "Priority", source: "ST", destination: "Stat" },
      { field: "Site", source: "NORTH", destination: "North Lab" },
    ],
  },
  {
    id: "cmp-order",
    label: "CBC-D · Complete blood count",
    entity: "Order",
    rows: [
      { field: "Code", source: "CBC-D", destination: "CBC" },
      { field: "Name", source: "CBC with differential", destination: "Complete blood count" },
      { field: "Specimen", source: "LAV", destination: "Lavender top" },
    ],
  },
];

const sunquestEntities: EntityTally[] = [
  { entity: "Patients", source: 12480, destination: 12441, matched: 12402 },
  { entity: "Accessions", source: 48221, destination: 47980, matched: 47840 },
  { entity: "Orders", source: 51004, destination: 50660, matched: 50510 },
  { entity: "Providers", source: 860, destination: 841, matched: 822 },
  { entity: "Results", source: 0, destination: 0, matched: 0 },
];

function beakerPack(): Pick<MigrationTemplate, "files" | "maps" | "issues" | "duplicates" | "compares" | "entities"> {
  return {
    files: [
      { id: "patients", name: "PATIENT.csv", table: "Patients", rows: 9804, status: "loaded" },
      { id: "accessions", name: "SPECIMEN.csv", table: "Accessions", rows: 30112, status: "loaded" },
      { id: "orders", name: "ORDER_PROC.csv", table: "Orders", rows: 33450, status: "loaded" },
      { id: "providers", name: "SER.csv", table: "Providers", rows: 640, status: "loaded" },
      { id: "results", name: "ORDER_RESULTS.csv", table: "Results", rows: 140220, status: "waiting" },
    ],
    maps: [
      mapRow("pat-name", "Patients", "PAT_NAME", "OKONKWO,R", "patient.name", 0.9),
      mapRow("pat-dob", "Patients", "BIRTH_DATE", "1978-04-12", "patient.dob", 0.97),
      mapRow("pat-mrn", "Patients", "PAT_MRN_ID", "V-104428", "patient.mrn", 0.95),
      mapRow("acc-id", "Accessions", "SPECIMEN_ID", "SQ-20491", "accession.id", 0.92),
      mapRow("ord-code", "Orders", "PROC_CODE", "CBC", "order.code", 0.9),
      mapRow("prov-npi", "Providers", "NPI", "1467782201", "provider.npi", 0.96),
      mapRow("res-val", "Results", "ORD_VALUE", "4.2", "", 0.4),
    ],
    issues: [
      { id: "name-parse", kind: "inconsistent", record: "Patients", field: "Name", detail: "PAT_NAME is a single LAST,FIRST string. Sequence stores a display name.", count: 9804, severity: "warn", resolved: false },
      { id: "mrn-missing", kind: "missing", record: "Patients", field: "MRN", detail: "40 patients have no PAT_MRN_ID.", count: 40, severity: "block", resolved: false },
    ],
    duplicates: [
      { id: "dup-mrn", entity: "Patient", left: "Source V-104428 · OKONKWO,R", right: "Sequence V-104428 · R. Okonkwo", reason: "Same MRN", score: 0.93, decision: "open" },
    ],
    compares: sunquestCompares,
    entities: [
      { entity: "Patients", source: 9804, destination: 9760, matched: 9702 },
      { entity: "Accessions", source: 30112, destination: 29940, matched: 29810 },
      { entity: "Orders", source: 33450, destination: 33102, matched: 32940 },
      { entity: "Providers", source: 640, destination: 628, matched: 610 },
      { entity: "Results", source: 0, destination: 0, matched: 0 },
    ],
  };
}

export const MIGRATION_TEMPLATES: MigrationTemplate[] = [
  {
    id: "sunquest",
    name: "Sunquest",
    system: "Sunquest",
    ready: true,
    note: "Patient, accession, order, and provider extracts. Result archive stays optional until the file is loaded.",
    files: sunquestFiles,
    maps: sunquestMaps,
    issues: sunquestIssues,
    duplicates: sunquestDuplicates,
    compares: sunquestCompares,
    entities: sunquestEntities,
  },
  {
    id: "beaker",
    name: "Epic Beaker",
    system: "Epic Beaker",
    ready: true,
    note: "Clarity extracts for patient, specimen, order, and provider. Result rows wait on ORDER_RESULTS.",
    ...beakerPack(),
  },
  {
    id: "labware",
    name: "LabWare",
    system: "LabWare LIMS",
    ready: true,
    note: "Sample, test, and person tables. Folder names differ from a clinical accession, so priority stays on review.",
    files: [
      { id: "patients", name: "PERSON.csv", table: "Patients", rows: 4200, status: "loaded" },
      { id: "accessions", name: "SAMPLE.csv", table: "Accessions", rows: 18840, status: "loaded" },
      { id: "orders", name: "TEST.csv", table: "Orders", rows: 20110, status: "loaded" },
      { id: "providers", name: "CONTACT.csv", table: "Providers", rows: 310, status: "loaded" },
      { id: "results", name: "RESULT.csv", table: "Results", rows: 88012, status: "waiting" },
    ],
    maps: [
      mapRow("pat-name", "Patients", "PERSON_NAME", "R Okonkwo", "patient.name", 0.84),
      mapRow("acc-id", "Accessions", "SAMPLE_NUMBER", "SQ-20491", "accession.id", 0.8, true),
      mapRow("ord-code", "Orders", "ANALYSIS", "CBC", "order.code", 0.77, true),
      mapRow("res-val", "Results", "FORMATTED_RESULT", "4.2", "", 0.42),
    ],
    issues: [
      { id: "sample-id", kind: "inconsistent", record: "Accessions", field: "Accession", detail: "SAMPLE_NUMBER is a LabWare folder id, not a clinical accession. Confirm the crosswalk before load.", count: 18840, severity: "block", resolved: false },
    ],
    duplicates: [
      { id: "dup-sample", entity: "Accession", left: "Source SAMPLE 20491", right: "Sequence SQ-20491", reason: "Number matches after the SQ- prefix", score: 0.81, decision: "open" },
    ],
    compares: sunquestCompares,
    entities: [
      { entity: "Patients", source: 4200, destination: 4188, matched: 4102 },
      { entity: "Accessions", source: 18840, destination: 18602, matched: 18440 },
      { entity: "Orders", source: 20110, destination: 19880, matched: 19610 },
      { entity: "Providers", source: 310, destination: 304, matched: 290 },
      { entity: "Results", source: 0, destination: 0, matched: 0 },
    ],
  },
  {
    id: "starlims",
    name: "STARLIMS",
    system: "STARLIMS",
    ready: false,
    note: "Draft template. Folder and batch fields are only partly mapped. Finish the unmapped rows before a cutover.",
    files: [
      { id: "patients", name: "FOLDERS.csv", table: "Patients", rows: 2600, status: "loaded" },
      { id: "accessions", name: "ORDERS.csv", table: "Accessions", rows: 9400, status: "waiting" },
    ],
    maps: [
      mapRow("pat-name", "Patients", "FOLDER_NAME", "North batch 12", "", 0.3),
      mapRow("acc-id", "Accessions", "ORDNO", "10442", "accession.id", 0.55, true),
    ],
    issues: [
      { id: "folder", kind: "inconsistent", record: "Patients", field: "Name", detail: "FOLDER_NAME is a batch label, not a patient. The template does not yet split the two.", count: 2600, severity: "block", resolved: false },
    ],
    duplicates: [],
    compares: sunquestCompares.slice(1, 2),
    entities: [
      { entity: "Patients", source: 2600, destination: 0, matched: 0 },
      { entity: "Accessions", source: 0, destination: 0, matched: 0 },
    ],
  },
  {
    id: "orchard",
    name: "Orchard Harvest",
    system: "Orchard Harvest",
    ready: false,
    note: "Draft template. Patient and order codes load. Result and provider crosswalks are still being written.",
    files: [
      { id: "patients", name: "Patient.txt", table: "Patients", rows: 15110, status: "loaded" },
      { id: "orders", name: "OrderChoice.txt", table: "Orders", rows: 2204, status: "loaded" },
      { id: "results", name: "Result.txt", table: "Results", rows: 99000, status: "waiting" },
    ],
    maps: [
      mapRow("pat-name", "Patients", "LastName + FirstName", "Okonkwo, R", "patient.name", 0.9),
      mapRow("pat-mrn", "Patients", "PID", "V-104428", "patient.mrn", 0.7, true),
      mapRow("ord-code", "Orders", "OrderChoice", "CBC", "order.code", 0.88),
    ],
    issues: [
      { id: "pid", kind: "inconsistent", record: "Patients", field: "MRN", detail: "PID sometimes holds a chart number and sometimes a visit number.", count: 220, severity: "warn", resolved: false },
    ],
    duplicates: [
      { id: "dup-pid", entity: "Patient", left: "Source PID V-104428", right: "Sequence MRN V-104428", reason: "Same identifier, different field name", score: 0.84, decision: "open" },
    ],
    compares: sunquestCompares.slice(0, 1),
    entities: [
      { entity: "Patients", source: 15110, destination: 15002, matched: 14880 },
      { entity: "Orders", source: 2204, destination: 2188, matched: 2140 },
      { entity: "Results", source: 0, destination: 0, matched: 0 },
    ],
  },
];

export function cloneTemplate(id: string): MigrationState {
  const template = MIGRATION_TEMPLATES.find((item) => item.id === id) ?? MIGRATION_TEMPLATES[0];
  return {
    jobName: "North Lab cutover",
    templateId: template.id,
    files: template.files.map((file) => ({ ...file })),
    maps: template.maps.map((row) => ({ ...row })),
    issues: template.issues.map((issue) => ({ ...issue })),
    duplicates: template.duplicates.map((pair) => ({ ...pair })),
    compares: template.compares.map((record) => ({ ...record, rows: record.rows.map((row) => ({ ...row })) })),
    entities: template.entities.map((row) => ({ ...row })),
    compareId: template.compares[0]?.id ?? "",
    evidenceAt: null,
  };
}

export function fieldLabel(id: string): string {
  return SEQUENCE_FIELDS.find((field) => field.id === id)?.label ?? "Unmapped";
}

export function mappingStatus(row: FieldMap): "mapped" | "review" | "unmapped" {
  if (!row.sequenceField) return "unmapped";
  if (row.review) return "review";
  return "mapped";
}

export type MigrationSummary = {
  source: string;
  ready: boolean;
  loadedFiles: number;
  fileCount: number;
  rows: number;
  unmapped: number;
  review: number;
  openIssues: number;
  blockingIssues: number;
  openDuplicates: number;
  matched: number;
  sourceRows: number;
  evidenceAt: string | null;
};

export function summarize(state: MigrationState): MigrationSummary {
  const template = MIGRATION_TEMPLATES.find((item) => item.id === state.templateId);
  const loaded = state.files.filter((file) => file.status === "loaded");
  const resultsLoaded = state.files.some((file) => file.id === "results" && file.status === "loaded");
  const entities = state.entities.map((row) => (row.entity === "Results" && resultsLoaded ? { ...row, source: row.source || 210440, destination: row.destination || 208110, matched: row.matched || 207440 } : row));
  const matched = entities.reduce((sum, row) => sum + row.matched, 0);
  const sourceRows = entities.reduce((sum, row) => sum + row.source, 0);
  return {
    source: template?.system ?? "Legacy LIMS",
    ready: template?.ready ?? false,
    loadedFiles: loaded.length,
    fileCount: state.files.length,
    rows: loaded.reduce((sum, file) => sum + file.rows, 0),
    unmapped: state.maps.filter((row) => mappingStatus(row) === "unmapped").length,
    review: state.maps.filter((row) => mappingStatus(row) === "review").length,
    openIssues: state.issues.filter((issue) => !issue.resolved).length,
    blockingIssues: state.issues.filter((issue) => !issue.resolved && issue.severity === "block").length,
    openDuplicates: state.duplicates.filter((pair) => pair.decision === "open").length,
    matched,
    sourceRows,
    evidenceAt: state.evidenceAt,
  };
}

export function entityRows(state: MigrationState): EntityTally[] {
  const resultsLoaded = state.files.some((file) => file.id === "results" && file.status === "loaded");
  return state.entities.map((row) => {
    if (row.entity !== "Results" || !resultsLoaded || row.source > 0) return row;
    return { entity: "Results", source: 210440, destination: 208110, matched: 207440 };
  });
}

export function evidenceText(state: MigrationState, generatedAt: string): string {
  const summary = summarize({ ...state, evidenceAt: generatedAt });
  const lines = [
    "Sequence migration evidence",
    `Job: ${state.jobName}`,
    `Source: ${summary.source}`,
    `Generated: ${generatedAt}`,
    "",
    `Files loaded: ${summary.loadedFiles} of ${summary.fileCount}`,
    `Rows in loaded files: ${summary.rows}`,
    `Unmapped fields: ${summary.unmapped}`,
    `Fields still on review: ${summary.review}`,
    `Open data issues: ${summary.openIssues} (${summary.blockingIssues} blocking)`,
    `Open duplicate pairs: ${summary.openDuplicates}`,
    "",
    "Field map",
    ...state.maps.map((row) => `- ${row.sourceTable}.${row.sourceField} -> ${row.sequenceField ? fieldLabel(row.sequenceField) : "unmapped"} (${mappingStatus(row)})`),
    "",
    "Issues",
    ...state.issues.map((issue) => `- [${issue.resolved ? "resolved" : issue.severity}] ${issue.record} ${issue.field}: ${issue.detail}`),
    "",
    "Duplicates",
    ...state.duplicates.map((pair) => `- ${pair.entity}: ${pair.left} vs ${pair.right} · ${pair.decision}`),
    "",
    "Reconciliation",
    ...entityRows(state).map((row) => `- ${row.entity}: source ${row.source}, Sequence ${row.destination}, matched ${row.matched}, gap ${row.source - row.matched}`),
  ];
  return lines.join("\n");
}
