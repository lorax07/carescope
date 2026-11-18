import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ModuleHeader } from "../ModuleHeader";
import {
  MIGRATION_TEMPLATES,
  SEQUENCE_FIELDS,
  entityRows,
  evidenceText,
  mappingStatus,
  summarize,
  type DataIssue,
  type DuplicateDecision,
  type FieldMap,
} from "./migrationModel";
import {
  acceptMapping,
  applyTemplate,
  decideDuplicate,
  markFileLoaded,
  resolveIssue,
  selectCompare,
  setSequenceField,
  stampEvidence,
  useMigration,
} from "./migrationStore";

const STEPS = [
  { to: "/app/migration/import", label: "Import", key: "import" },
  { to: "/app/migration/mapping", label: "Mapping", key: "mapping" },
  { to: "/app/migration/issues", label: "Issues", key: "issues" },
  { to: "/app/migration/duplicates", label: "Duplicates", key: "duplicates" },
  { to: "/app/migration/reconcile", label: "Reconcile", key: "reconcile" },
  { to: "/app/migration/evidence", label: "Evidence", key: "evidence" },
  { to: "/app/migration/templates", label: "Templates", key: "templates" },
] as const;

const COPY: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: "Migration Studio",
    subtitle: "Move a laboratory off its current LIMS without losing the record of what changed.",
  },
  import: { title: "Import", subtitle: "Bring in the extracts the current LIMS already knows how to write." },
  mapping: { title: "Field mapping", subtitle: "Point each source field at the Sequence field it becomes." },
  issues: { title: "Data issues", subtitle: "Rows that are missing a required value, or that do not match Sequence." },
  duplicates: { title: "Duplicates", subtitle: "Records that already exist in Sequence, or that repeat inside the extract." },
  reconcile: { title: "Reconciliation", subtitle: "Source counts next to Sequence counts, then the record itself." },
  evidence: { title: "Evidence", subtitle: "A packet of the map, the exceptions, and the decisions for this cutover." },
  templates: { title: "Templates", subtitle: "A starting map for a system other labs have already left." },
};

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function StatusPill({ tone, children }: { tone: string; children: string }) {
  return <span className={`migration-pill is-${tone}`}>{children}</span>;
}

function StepLinks({ current }: { current: string }) {
  return (
    <nav className="migration-steps" aria-label="Migration steps">
      {STEPS.map((step) => (
        <Link key={step.key} to={step.to} className={step.key === current ? "is-current" : undefined} aria-current={step.key === current ? "page" : undefined}>
          {step.label}
        </Link>
      ))}
    </nav>
  );
}

function OverviewView() {
  const state = useMigration();
  const summary = summarize(state);
  const cards = [
    { label: "Files loaded", value: `${summary.loadedFiles}/${summary.fileCount}`, hint: `${formatCount(summary.rows)} rows from ${summary.source}` },
    { label: "Unmapped fields", value: String(summary.unmapped), hint: summary.review ? `${summary.review} still on review` : "Mapping is accepted" },
    { label: "Open issues", value: String(summary.openIssues), hint: summary.blockingIssues ? `${summary.blockingIssues} block the load` : "Nothing is blocking" },
    { label: "Open duplicates", value: String(summary.openDuplicates), hint: "Decide keep, skip, or distinct" },
  ];
  return (
    <>
      <section className="lims-kpi-row" aria-label="Cutover status">
        {cards.map((card) => (
          <article key={card.label} className="lims-kpi">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </article>
        ))}
      </section>
      <section className="lims-panel migration-panel">
        <h2>North Lab cutover</h2>
        <p>
          {state.jobName} is leaving {summary.source}. Import the extracts, confirm the field map, clear missing and inconsistent rows, decide the duplicates, then compare what landed in Sequence. The evidence packet records those decisions.
        </p>
        <ol className="migration-flow">
          <li><Link to="/app/migration/import">Import</Link> the files the current system exported.</li>
          <li><Link to="/app/migration/mapping">Map</Link> each old field onto a Sequence field.</li>
          <li><Link to="/app/migration/issues">Review</Link> missing and inconsistent values before they load.</li>
          <li><Link to="/app/migration/duplicates">Detect duplicates</Link> against records already in Sequence.</li>
          <li><Link to="/app/migration/reconcile">Reconcile</Link> counts, then compare a source row with its destination.</li>
          <li><Link to="/app/migration/evidence">Generate evidence</Link> for the cutover file.</li>
        </ol>
      </section>
    </>
  );
}

function ImportView() {
  const state = useMigration();
  const template = MIGRATION_TEMPLATES.find((item) => item.id === state.templateId);
  return (
    <section className="lims-panel migration-panel">
      <div className="migration-panel-head">
        <div>
          <h2>Source extracts</h2>
          <p>{template?.note}</p>
        </div>
        <label className="migration-select">
          Source system
          <select aria-label="Source system" value={state.templateId} onChange={(event) => applyTemplate(event.target.value)}>
            {MIGRATION_TEMPLATES.map((item) => (
              <option key={item.id} value={item.id}>{item.name}{item.ready ? "" : " (draft)"}</option>
            ))}
          </select>
        </label>
      </div>
      <table className="lims-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Table</th>
            <th>Rows</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {state.files.map((file) => (
            <tr key={file.id}>
              <td>{file.name}</td>
              <td>{file.table}</td>
              <td>{formatCount(file.rows)}</td>
              <td><StatusPill tone={file.status === "loaded" ? "ok" : "wait"}>{file.status === "loaded" ? "Loaded" : "Waiting"}</StatusPill></td>
              <td>
                {file.status === "waiting" ? (
                  <button type="button" className="btn btn-primary" onClick={() => markFileLoaded(file.id)}>Mark received</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MappingView() {
  const state = useMigration();
  const [filter, setFilter] = useState<"all" | "review" | "unmapped">("all");
  const rows = state.maps.filter((row) => filter === "all" || mappingStatus(row) === filter);
  return (
    <section className="lims-panel migration-panel">
      <div className="migration-panel-head">
        <h2>Source field to Sequence field</h2>
        <div className="migration-filters" role="group" aria-label="Mapping filter">
          {(["all", "review", "unmapped"] as const).map((key) => (
            <button key={key} type="button" className={filter === key ? "is-current" : undefined} aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {key === "all" ? "All" : key === "review" ? "Needs review" : "Unmapped"}
            </button>
          ))}
        </div>
      </div>
      <table className="lims-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Sample</th>
            <th>Sequence field</th>
            <th>Confidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <MappingRow key={row.id} row={row} />
          ))}
          {rows.length === 0 ? (
            <tr><td colSpan={5}>Nothing in this filter.</td></tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function MappingRow({ row }: { row: FieldMap }) {
  const status = mappingStatus(row);
  return (
    <tr>
      <td>{row.sourceTable} · {row.sourceField}</td>
      <td>{row.sample}</td>
      <td>
        <select aria-label={`Sequence field for ${row.sourceField}`} value={row.sequenceField} onChange={(event) => setSequenceField(row.id, event.target.value)}>
          <option value="">Leave unmapped</option>
          {SEQUENCE_FIELDS.map((field) => (
            <option key={field.id} value={field.id}>{field.label}</option>
          ))}
        </select>
      </td>
      <td>{Math.round(row.confidence * 100)}%</td>
      <td>
        <StatusPill tone={status === "mapped" ? "ok" : status === "review" ? "warn" : "wait"}>{status === "mapped" ? "Mapped" : status === "review" ? "Review" : "Unmapped"}</StatusPill>
        {status === "review" ? (
          <button type="button" className="btn" onClick={() => acceptMapping(row.id)}>Accept</button>
        ) : null}
      </td>
    </tr>
  );
}

function IssuesView() {
  const state = useMigration();
  const [kind, setKind] = useState<"all" | DataIssue["kind"]>("all");
  const rows = state.issues.filter((issue) => kind === "all" || issue.kind === kind);
  return (
    <section className="lims-panel migration-panel">
      <div className="migration-panel-head">
        <h2>Missing and inconsistent rows</h2>
        <div className="migration-filters" role="group" aria-label="Issue filter">
          {(["all", "missing", "inconsistent"] as const).map((key) => (
            <button key={key} type="button" className={kind === key ? "is-current" : undefined} aria-pressed={kind === key} onClick={() => setKind(key)}>
              {key === "all" ? "All" : key === "missing" ? "Missing" : "Inconsistent"}
            </button>
          ))}
        </div>
      </div>
      <ul className="migration-list">
        {rows.map((issue) => (
          <li key={issue.id}>
            <div>
              <StatusPill tone={issue.resolved ? "ok" : issue.severity === "block" ? "block" : "warn"}>{issue.resolved ? "Resolved" : issue.severity === "block" ? "Blocks load" : "Review"}</StatusPill>
              <strong>{issue.record} · {issue.field}</strong>
              <p>{issue.detail}</p>
            </div>
            <span>{formatCount(issue.count)} rows</span>
            {issue.resolved ? null : (
              <button type="button" className="btn btn-primary" onClick={() => resolveIssue(issue.id)}>Mark resolved</button>
            )}
          </li>
        ))}
        {rows.length === 0 ? <li>No issues in this filter.</li> : null}
      </ul>
    </section>
  );
}

const DECISIONS: { id: DuplicateDecision; label: string }[] = [
  { id: "keep-source", label: "Keep source" },
  { id: "keep-destination", label: "Keep Sequence" },
  { id: "distinct", label: "Not a duplicate" },
];

function DuplicatesView() {
  const state = useMigration();
  return (
    <section className="lims-panel migration-panel">
      <h2>Possible duplicates</h2>
      {state.duplicates.length === 0 ? <p>This template has no duplicate pairs yet.</p> : null}
      <ul className="migration-list">
        {state.duplicates.map((pair) => (
          <li key={pair.id}>
            <div>
              <StatusPill tone={pair.decision === "open" ? "warn" : "ok"}>{pair.decision === "open" ? "Open" : pair.decision === "keep-source" ? "Keep source" : pair.decision === "keep-destination" ? "Keep Sequence" : "Distinct"}</StatusPill>
              <strong>{pair.entity} · {Math.round(pair.score * 100)}% match</strong>
              <p>{pair.left}</p>
              <p>{pair.right}</p>
              <p>{pair.reason}</p>
            </div>
            <div className="migration-actions">
              {DECISIONS.map((choice) => (
                <button key={choice.id} type="button" className="btn" aria-pressed={pair.decision === choice.id} onClick={() => decideDuplicate(pair.id, choice.id)}>
                  {choice.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReconcileView() {
  const state = useMigration();
  const rows = entityRows(state);
  const record = state.compares.find((item) => item.id === state.compareId) ?? state.compares[0];
  return (
    <>
      <section className="lims-panel migration-panel">
        <h2>Source and Sequence counts</h2>
        <table className="lims-table">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Source</th>
              <th>Sequence</th>
              <th>Matched</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.entity}>
                <td>{row.entity}</td>
                <td>{formatCount(row.source)}</td>
                <td>{formatCount(row.destination)}</td>
                <td>{formatCount(row.matched)}</td>
                <td>{formatCount(row.source - row.matched)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {record ? (
        <section className="lims-panel migration-panel">
          <div className="migration-panel-head">
            <div>
              <h2>Record comparison</h2>
              <p>{record.entity} · {record.label}</p>
            </div>
            {state.compares.length > 1 ? (
              <label className="migration-select">
                Record
                <select aria-label="Record to compare" value={record.id} onChange={(event) => selectCompare(event.target.value)}>
                  {state.compares.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <table className="lims-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Source</th>
                <th>Sequence</th>
              </tr>
            </thead>
            <tbody>
              {record.rows.map((row) => {
                const differs = row.source !== row.destination;
                return (
                  <tr key={row.field} className={differs ? "is-diff" : undefined}>
                    <td>{row.field}</td>
                    <td>{row.source}</td>
                    <td>{row.destination}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}

function EvidenceView() {
  const state = useMigration();
  const packet = useMemo(() => (state.evidenceAt ? evidenceText(state, state.evidenceAt) : ""), [state]);
  function generate() {
    const generatedAt = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" });
    stampEvidence(`${generatedAt} CT`);
  }
  function download() {
    if (!packet) return;
    const blob = new Blob([packet], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sequence-migration-evidence.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  const summary = summarize(state);
  return (
    <section className="lims-panel migration-panel">
      <div className="migration-panel-head">
        <div>
          <h2>Cutover packet</h2>
          <p>
            {summary.blockingIssues
              ? `${summary.blockingIssues} blocking issues are still open. The packet records them as exceptions.`
              : "No blocking issues are open. The packet can go in the cutover file."}
          </p>
        </div>
        <div className="migration-actions">
          <button type="button" className="btn btn-primary" onClick={generate}>{state.evidenceAt ? "Regenerate" : "Generate evidence"}</button>
          <button type="button" className="btn" onClick={download} disabled={!packet}>Download</button>
        </div>
      </div>
      {packet ? <pre className="migration-evidence">{packet}</pre> : <p>Generate the packet to capture the current map, issues, duplicate decisions, and reconciliation counts.</p>}
    </section>
  );
}

function TemplatesView() {
  const state = useMigration();
  return (
    <section className="migration-templates">
      {MIGRATION_TEMPLATES.map((template) => (
        <article key={template.id} className="lims-panel migration-panel">
          <StatusPill tone={template.ready ? "ok" : "wait"}>{template.ready ? "Ready" : "Draft"}</StatusPill>
          <h2>{template.name}</h2>
          <p>{template.note}</p>
          <p>{template.maps.length} mapped fields · {template.files.length} files</p>
          <button type="button" className="btn btn-primary" aria-pressed={state.templateId === template.id} onClick={() => applyTemplate(template.id)}>
            {state.templateId === template.id ? "In use" : "Use this template"}
          </button>
        </article>
      ))}
    </section>
  );
}

export function MigrationPage({ section }: { section?: string }) {
  const view = section && section in COPY ? section : "overview";
  const copy = COPY[view];
  return (
    <div className="lims-page migration-studio">
      <ModuleHeader title={copy.title} subtitle={copy.subtitle} />
      <StepLinks current={view === "overview" ? "" : view} />
      {view === "import" ? <ImportView /> : null}
      {view === "mapping" ? <MappingView /> : null}
      {view === "issues" ? <IssuesView /> : null}
      {view === "duplicates" ? <DuplicatesView /> : null}
      {view === "reconcile" ? <ReconcileView /> : null}
      {view === "evidence" ? <EvidenceView /> : null}
      {view === "templates" ? <TemplatesView /> : null}
      {view === "overview" ? <OverviewView /> : null}
    </div>
  );
}
