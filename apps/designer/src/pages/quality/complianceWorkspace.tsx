import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { findInstrument } from "../../instruments";
import { pinState, verifyReviewerPin } from "../../reviewerPin";
import { RevenueChart, StudioLink, greetingName, paymentBars } from "../crm/clientStudio";
import {
  SIGNATURE_MEANING,
  approveChange,
  approveDocument,
  assessChange,
  checkEffectiveness,
  closeAudit,
  closeChange,
  closeComplaint,
  closeDeviation,
  closeFinding,
  completeReview,
  completeTraining,
  complianceMetrics,
  configOf,
  containDeviation,
  dayOf,
  disposeDeviation,
  implementCapa,
  implementChange,
  investigateComplaint,
  investigateDeviation,
  issueDocument,
  markAllNoticesRead,
  mitigateRisk,
  openCapa,
  planAudit,
  proposeChange,
  qualifySupplier,
  qualityActor,
  reassessRisk,
  recordComplaint,
  recordFinding,
  recordReview,
  registerRisk,
  rejectSignature,
  releaseEquipment,
  reopenCapa,
  reportDeviation,
  reportEquipment,
  restrictEquipment,
  reviseDocument,
  riskBand,
  riskScore,
  startAudit,
  supplierIssue,
  updateQualityConfig,
  useQuality,
  type QualityConfig,
  type QualitySystem,
  type SignatureMeaning,
} from "../../qualitySystem";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lims-page rcm-page client-studio">
      <div className="client-home">
        <h1 className="client-overview-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function PinForm({
  actor,
  recordId,
  meaning,
  label,
  disabled,
  onSubmit,
  children,
}: {
  actor: string;
  recordId: string;
  meaning: SignatureMeaning;
  label: string;
  disabled?: boolean;
  onSubmit: () => string;
  children?: ReactNode;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pinState() !== "active") {
      setError("Set a reviewer PIN in Settings. A PIN lasts 90 days.");
      return;
    }
    if (!verifyReviewerPin(pin)) {
      rejectSignature(recordId, actor, "PIN does not match.");
      setPin("");
      setError("PIN does not match. The record was not changed.");
      return;
    }
    setPin("");
    setError(onSubmit());
  }

  return (
    <form className="quality-sign" onSubmit={submit}>
      {children}
      <p>{SIGNATURE_MEANING[meaning]}</p>
      <p className="quality-legal">Signing as {actor}. The signature stores its meaning, time, and a digest of this record. A typed name alone is not a signature.</p>
      <label>
        Reviewer PIN
        <input type="password" inputMode="numeric" autoComplete="off" aria-label="Reviewer PIN" value={pin} onChange={(event) => setPin(event.target.value)} />
      </label>
      {error ? <p className="quality-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={disabled}>{label}</button>
    </form>
  );
}

function tone(status: string): "done" | "stop" | "review" | "go" | "draft" {
  if (["closed", "effective", "released", "done", "completed", "reassessed"].includes(status)) return "done";
  if (["failed", "restricted", "disqualified", "obsolete"].includes(status)) return status === "obsolete" ? "draft" : "stop";
  if (["review", "approved", "assessment", "remediation", "actions", "investigation", "disposition"].includes(status)) return "review";
  if (["planned", "proposed", "received", "assigned", "draft"].includes(status)) return "draft";
  return "go";
}

type Row = {
  id: string;
  href: string;
  title: string;
  owner: string;
  due: string;
  status: string;
  next: string;
  sample?: boolean;
  open: boolean;
  mine: boolean;
};

function useView(page: string) {
  const storageKey = `carescope.quality.view.${page}`;
  const [filter, setFilter] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || "open";
    } catch {
      return "open";
    }
  });
  function choose(next: string) {
    setFilter(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* The view still changes for this session. */
    }
  }
  return [filter, choose] as const;
}

function currentDay() {
  return dayOf(new Date());
}

function rowsFor(section: string, system: QualitySystem, actor: string): Row[] {
  if (section === "events" || section === "deviations") {
    return system.deviations.map((item) => ({
      id: item.id,
      href: `/app/quality/${section}/${item.id}`,
      title: item.title,
      owner: item.reporter,
      due: "",
      status: item.status,
      next: item.status === "closed" ? "Closed" : item.capaId && item.status === "disposition" ? `Close waits on ${item.capaId}` : "Open the record for the next signature",
      sample: item.sample,
      open: item.status !== "closed",
      mine: item.reporter === actor,
    }));
  }
  if (section === "capa") {
    return system.capas.map((item) => ({
      id: item.id,
      href: `/app/quality/capa/${item.id}`,
      title: item.title,
      owner: item.owner,
      due: item.checkOn,
      status: item.status,
      next: item.status === "plan" ? "Record implementation evidence" : item.status === "implementation" ? `Effectiveness check ${item.checkOn}` : "Closed",
      sample: item.sample,
      open: item.status !== "closed",
      mine: item.owner === actor || item.implementer === actor,
    }));
  }
  if (section === "documents") {
    return system.documents.map((item) => ({
      id: item.id,
      href: `/app/quality/documents/${encodeURIComponent(item.id)}`,
      title: `${item.code} v${item.version} ${item.title}`,
      owner: item.author,
      due: item.effectiveOn,
      status: item.status,
      next: item.status === "review" ? "Independent approval" : item.status === "approved" ? `Issue on ${item.effectiveOn}` : item.status,
      sample: item.sample,
      open: item.status === "draft" || item.status === "review" || item.status === "approved",
      mine: item.author === actor,
    }));
  }
  if (section === "training") {
    return (system.training ?? []).map((item) => ({
      id: item.id,
      href: `/app/quality/training/${item.id}`,
      title: `${item.assignee} · ${item.documentId}`,
      owner: item.assignee,
      due: item.due,
      status: item.status,
      next: item.status === "assigned" ? "Read and acknowledge the effective version" : `Acknowledged ${item.completedOn}`,
      sample: item.sample,
      open: item.status === "assigned",
      mine: item.assignee === actor,
    }));
  }
  if (section === "changes") {
    return system.changes.map((item) => ({
      id: item.id,
      href: `/app/quality/changes/${item.id}`,
      title: item.title,
      owner: item.proposer,
      due: "",
      status: item.status,
      next: item.status === "proposed" ? "Assess impact" : item.status === "assessment" ? "Independent approval" : item.status === "approved" ? "Implement after any linked document is effective" : item.status === "implemented" ? "Verify training, then close" : "Closed",
      sample: item.sample,
      open: item.status !== "closed",
      mine: item.proposer === actor || item.implementer === actor,
    }));
  }
  if (section === "audits") {
    const findings = system.findings ?? [];
    return (system.audits ?? []).map((item) => {
      const openFindings = findings.filter((finding) => finding.auditId === item.id && finding.status !== "closed");
      return {
        id: item.id,
        href: `/app/quality/audits/${item.id}`,
        title: item.title,
        owner: item.auditor,
        due: item.scheduledOn,
        status: item.status,
        next: openFindings.length ? `${openFindings.length} open finding${openFindings.length === 1 ? "" : "s"}` : item.status === "closed" ? "Closed" : "Record findings",
        sample: item.sample,
        open: item.status !== "closed",
        mine: item.auditor === actor,
      };
    });
  }
  if (section === "risks") {
    const config = configOf(system);
    return (system.risks ?? []).map((item) => {
      const score = riskScore(item.likelihood, item.impact);
      return {
        id: item.id,
        href: `/app/quality/risks/${item.id}`,
        title: item.title,
        owner: item.owner,
        due: item.reviewOn,
        status: item.status,
        next: item.status === "open" ? `Score ${score} (${riskBand(score, config)}). Link a change.` : item.status === "mitigating" ? `Close ${item.changeId}, then reassess` : "Residual risk recorded",
        sample: item.sample,
        open: item.status !== "reassessed",
        mine: item.owner === actor,
      };
    });
  }
  if (section === "equipment") {
    return (system.equipment ?? []).map((item) => ({
      id: item.id,
      href: `/app/quality/equipment/${item.id}`,
      title: item.title,
      owner: item.reporter,
      due: "",
      status: item.status,
      next: item.status === "failed" ? "Assess impact and restrict use" : item.status === "restricted" ? "Release only after an independent approval" : "Released to service",
      sample: item.sample,
      open: item.status !== "released",
      mine: item.reporter === actor,
    }));
  }
  if (section === "suppliers") {
    return (system.suppliers ?? []).map((item) => ({
      id: item.id,
      href: `/app/quality/suppliers/${item.id}`,
      title: item.name,
      owner: item.service,
      due: item.reviewOn,
      status: item.status,
      next: item.issue || "Qualified",
      sample: item.sample,
      open: item.status !== "approved",
      mine: false,
    }));
  }
  if (section === "complaints") {
    return (system.complaints ?? []).map((item) => ({
      id: item.id,
      href: `/app/quality/complaints/${item.id}`,
      title: item.title,
      owner: item.reporter,
      due: "",
      status: item.status,
      next: item.status === "received" ? "Investigate and assess impact" : item.capaId ? `Linked ${item.capaId}` : "Decide the required action",
      sample: item.sample,
      open: item.status !== "closed",
      mine: item.reporter === actor,
    }));
  }
  return [];
}

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "overdue", label: "Overdue" },
  { id: "mine", label: "Mine" },
  { id: "all", label: "All" },
];

const TITLES: Record<string, string> = {
  events: "Quality Events",
  deviations: "Deviations & Nonconformances",
  capa: "CAPA",
  documents: "Document Control",
  training: "Training & Competency",
  changes: "Change Control",
  audits: "Audits",
  risks: "Risks",
  equipment: "Equipment & Calibration",
  suppliers: "Suppliers",
  complaints: "Complaints",
};

function QualityList({ section }: { section: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const [filter, setFilter] = useView(section);
  const [query, setQuery] = useState("");
  const rows = rowsFor(section, system, actor);
  const day = currentDay();
  const visible = rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    if (needle && !`${row.id} ${row.title} ${row.owner} ${row.next}`.toLowerCase().includes(needle)) return false;
    if (filter === "all") return true;
    if (filter === "mine") return row.mine;
    if (filter === "overdue") return row.open && Boolean(row.due) && row.due < day;
    return row.open;
  });
  return (
    <Shell title={TITLES[section] ?? "Compliance"}>
      <div className="client-home-main">
        <section className="client-card client-projects is-scroll">
          <header>
            <h2>{TITLES[section] ?? section}</h2>
            <label>
              <span className="sr-only">Search records</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label={`Search ${TITLES[section] ?? "records"}`} />
            </label>
          </header>
          <div className="client-pills" role="tablist" aria-label="Saved view">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "is-on" : undefined} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <CreateForm section={section} actor={actor} />
          {visible.length ? (
            <div className="client-table-wrap">
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Owner</th>
                    <th>Next</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={row.href}>
                          <b>{row.id}</b>
                          <small>{row.title}{row.sample ? " · Sample data" : ""}</small>
                        </Link>
                      </td>
                      <td>{row.owner}</td>
                      <td>{row.next}</td>
                      <td>{row.due || "—"}</td>
                      <td><em className={`client-status is-${tone(row.status)}`}>{row.status}</em></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="client-empty">No records in this view. Sample rows are labeled. New records appear here after you sign them.</p>
          )}
        </section>
      </div>
      <Assist system={system} actor={actor} />
    </Shell>
  );
}

function CreateForm({ section, actor }: { section: string; actor: string }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [extra, setExtra] = useState("");
  if (section === "events" || section === "deviations") {
    return (
      <PinForm actor={actor} recordId="new-event" meaning="authorship" label="Report event" onSubmit={() => reportDeviation({ title, description: detail, accessionId: extra, site: "East Lab" }, actor)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>What happened<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        <label>Accession, if one is affected<input value={extra} onChange={(event) => setExtra(event.target.value)} /></label>
      </PinForm>
    );
  }
  if (section === "changes") {
    return (
      <PinForm actor={actor} recordId="new-change" meaning="authorship" label="Propose change" onSubmit={() => proposeChange({ title, description: detail }, actor)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Reason<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
      </PinForm>
    );
  }
  if (section === "complaints") {
    return (
      <PinForm actor={actor} recordId="new-complaint" meaning="authorship" label="Record complaint" onSubmit={() => recordComplaint({ title, detail, accountId: extra, accessionId: "" }, actor)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Detail<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        <label>Client account id<input value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="acc-vertex" /></label>
      </PinForm>
    );
  }
  if (section === "equipment") {
    return (
      <PinForm actor={actor} recordId="new-equipment" meaning="authorship" label="Record failed calibration" onSubmit={() => reportEquipment({ instrumentId: extra || "inst-ftir", title, accessionIds: detail.split(",").map((item) => item.trim()).filter(Boolean) }, actor)}>
        <label>What failed<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Instrument id<input value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="inst-ftir" /></label>
        <label>Affected accessions<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="SCP-20458" /></label>
      </PinForm>
    );
  }
  if (section === "risks") {
    return (
      <PinForm actor={actor} recordId="new-risk" meaning="authorship" label="Register risk" onSubmit={() => registerRisk({ title, hazard: detail, likelihood: 3, impact: 3, owner: actor, reviewOn: extra || "2026-12-01" }, actor)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Hazard<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        <label>Review date<input value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="YYYY-MM-DD" /></label>
      </PinForm>
    );
  }
  if (section === "audits") {
    return (
      <PinForm actor={actor} recordId="new-audit" meaning="authorship" label="Plan audit" onSubmit={() => planAudit({ title, kind: "internal", scope: detail, criteria: extra || "Quality manual", auditor: actor, scheduledOn: "2026-12-15" }, actor)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Scope<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        <label>Criteria<input value={extra} onChange={(event) => setExtra(event.target.value)} /></label>
      </PinForm>
    );
  }
  if (section === "suppliers") {
    return (
      <PinForm actor={actor} recordId="new-supplier" meaning="approval" label="Qualify supplier" onSubmit={() => qualifySupplier({ name: title, service: detail, risk: "medium", reviewOn: extra || "2027-01-15", evaluation: "Evaluation recorded at qualification." }, actor)}>
        <label>Name<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Service<input value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        <label>Review date<input value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="YYYY-MM-DD" /></label>
      </PinForm>
    );
  }
  return null;
}

function Assist({ system, actor }: { system: QualitySystem; actor: string }) {
  const [draft, setDraft] = useState("");
  const navigate = useNavigate();
  const unread = (system.notifications ?? []).filter((item) => !item.read).length;
  return (
    <aside className="client-home-side">
      <section className="client-assist">
        <p>Hi, {greetingName(actor)}</p>
        <h2>What needs a signature?</h2>
        <div className="client-assist-grid">
          <Link to="/app/quality/events"><i className="is-rose" /><span>Events</span><small>{system.deviations.filter((item) => item.status !== "closed").length} open</small></Link>
          <Link to="/app/quality/capa"><i className="is-amber" /><span>CAPA</span><small>{system.capas.filter((item) => item.status !== "closed").length} open</small></Link>
          <Link to="/app/quality/training"><i className="is-mint" /><span>Training</span><small>{(system.training ?? []).filter((item) => item.status === "assigned").length} assigned</small></Link>
          <Link to="/app/quality/metrics"><i className="is-pink" /><span>Review</span><small>{unread} notices</small></Link>
        </div>
        <form
          className="client-assist-ask"
          onSubmit={(event) => {
            event.preventDefault();
            const query = draft.trim().toLowerCase();
            if (!query) return;
            const hit = ["events", "capa", "documents", "audits", "risks", "equipment", "complaints", "training", "changes", "suppliers"]
              .flatMap((section) => rowsFor(section, system, actor))
              .find((row) => `${row.id} ${row.title}`.toLowerCase().includes(query));
            if (hit) navigate(hit.href);
          }}
        >
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search a record id or title" aria-label="Search compliance records" />
          <button type="submit" aria-label="Search compliance">↑</button>
        </form>
        <p className="client-assist-hint">Rows marked sample data shipped with the module. Records you sign are stored for this laboratory. These features do not by themselves certify regulatory compliance.</p>
      </section>
    </aside>
  );
}

function History({ system, ids }: { system: QualitySystem; ids: string[] }) {
  const rows = system.audit.filter((item) => ids.includes(item.recordId)).slice(-8).reverse();
  if (!rows.length) return <p className="client-empty">No audit history yet.</p>;
  return (
    <ul className="rcm-exceptions">
      {rows.map((item) => (
        <li key={item.id}>
          <b>{item.action}</b>
          <span>{item.at} · {item.actor}</span>
          <span>{item.reason}</span>
        </li>
      ))}
    </ul>
  );
}

function Related({ items }: { items: { href: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <p>
      {items.map((item) => (
        <Link key={item.href + item.label} to={item.href} style={{ marginRight: 12 }}>{item.label}</Link>
      ))}
    </p>
  );
}

function Frame({
  title,
  kicker,
  status,
  sample,
  next,
  blocked,
  links,
  history,
  children,
}: {
  title: string;
  kicker: string;
  status: string;
  sample?: boolean;
  next: string;
  blocked?: string;
  links: { href: string; label: string }[];
  history: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Shell title={kicker}>
      <div className="client-home-main">
        <section className="client-card">
          <header>
            <h2>{title}</h2>
            <em className={`client-status is-${tone(status)}`}>{status}</em>
          </header>
          {sample ? <p className="billing-note">Sample data. It is not evidence for a real study.</p> : null}
          <p><strong>Next: </strong>{next}</p>
          {blocked ? <p className="quality-error">{blocked}</p> : null}
          <Related items={links} />
          {children}
          <h2>History</h2>
          {history}
        </section>
      </div>
    </Shell>
  );
}

function DeviationDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = system.deviations.find((item) => item.id === id);
  const [containment, setContainment] = useState("");
  const [investigation, setInvestigation] = useState("");
  const [rootCause, setRootCause] = useState<"method" | "equipment" | "personnel" | "material" | "environment">("equipment");
  const [impact, setImpact] = useState("");
  const [disposition, setDisposition] = useState<"retest" | "reject" | "continue" | "use-as-is">("retest");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [capaTitle, setCapaTitle] = useState("");
  if (!record) return <Shell title="Event"><p className="client-empty">That quality event was not found.</p></Shell>;
  const capa = system.capas.find((item) => item.id === record.capaId);
  const blocked = record.status === "disposition" && record.capaId && capa?.status !== "closed"
    ? `QA close is blocked until ${record.capaId} passes its effectiveness check.`
    : record.status === "disposition" && record.reporter === actor
      ? "You reported this event, so you cannot apply the QA close signature."
      : "";
  const links = [
    record.accessionId ? { href: `/app/samples/${record.accessionId}`, label: record.accessionId } : null,
    record.capaId ? { href: `/app/quality/capa/${record.capaId}`, label: record.capaId } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "reported" ? "Contain the event." : record.status === "contained" ? "Investigate root cause and impact." : record.status === "investigation" ? "Record disposition. Open a CAPA when the cause needs a tracked action." : record.status === "disposition" ? "An independent QA signature closes the event." : "Closed."} blocked={blocked} links={links} history={<History system={system} ids={[record.id, record.capaId ?? ""]} />}>
      <p>{record.description}</p>
      {record.containment ? <p>Containment: {record.containment}</p> : null}
      {record.impact ? <p>Impact: {record.impact}</p> : null}
      {record.status === "reported" ? (
        <PinForm actor={actor} recordId={record.id} meaning="authorship" label="Record containment" onSubmit={() => containDeviation(record.id, actor, containment)}>
          <label>How it was contained<textarea value={containment} onChange={(event) => setContainment(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "contained" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Sign investigation" onSubmit={() => investigateDeviation(record.id, actor, { investigation, rootCause, impact })}>
          <label>Investigation<textarea value={investigation} onChange={(event) => setInvestigation(event.target.value)} /></label>
          <label>
            Root cause
            <select value={rootCause} onChange={(event) => setRootCause(event.target.value as typeof rootCause)}>
              <option value="method">Method</option>
              <option value="equipment">Equipment</option>
              <option value="personnel">Personnel</option>
              <option value="material">Material</option>
              <option value="environment">Environment</option>
            </select>
          </label>
          <label>Impact<textarea value={impact} onChange={(event) => setImpact(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "investigation" ? (
        <>
          <PinForm actor={actor} recordId={record.id} meaning="review" label="Sign disposition" onSubmit={() => disposeDeviation(record.id, actor, { disposition, note })}>
            <label>
              Disposition
              <select value={disposition} onChange={(event) => setDisposition(event.target.value as typeof disposition)}>
                <option value="retest">Retest</option>
                <option value="reject">Reject</option>
                <option value="continue">Continue testing</option>
                <option value="use-as-is">Use as is</option>
              </select>
            </label>
            <label>Disposition note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
          </PinForm>
          <PinForm actor={actor} recordId={record.id} meaning="approval" label="Open CAPA" onSubmit={() => openCapa({ sourceId: record.id, title: capaTitle || `${record.id} corrective action`, rootCause: record.rootCause || "equipment", corrective: note || "Correct the cause", preventive: "Update the procedure", owner: actor, checkOn: "2026-11-15" }, actor)}>
            <label>CAPA title<input value={capaTitle} onChange={(event) => setCapaTitle(event.target.value)} /></label>
          </PinForm>
        </>
      ) : null}
      {record.status === "disposition" ? (
        <PinForm actor={actor} recordId={record.id} meaning="closure" label="QA close" disabled={Boolean(blocked)} onSubmit={() => closeDeviation(record.id, actor, reason)}>
          <label>Close reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </PinForm>
      ) : null}
    </Frame>
  );
}

function CapaDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = system.capas.find((item) => item.id === id);
  const [evidence, setEvidence] = useState("");
  const [result, setResult] = useState<"effective" | "not-effective">("effective");
  const [reason, setReason] = useState("");
  if (!record) return <Shell title="CAPA"><p className="client-empty">That CAPA was not found.</p></Shell>;
  const tooSoon = record.status === "implementation" && currentDay() < record.checkOn;
  const self = record.status === "implementation" && record.implementer === actor;
  const blocked = tooSoon ? `The effectiveness check is scheduled for ${record.checkOn}.` : self ? "You implemented this action, so you cannot judge its effectiveness." : "";
  const sourceHref = record.sourceId.startsWith("DEV") || record.sourceId.startsWith("NCR")
    ? `/app/quality/events/${record.sourceId}`
    : record.sourceId.startsWith("CMP")
      ? `/app/quality/complaints/${record.sourceId}`
      : record.sourceId.startsWith("RSK")
        ? `/app/quality/risks/${record.sourceId}`
        : record.sourceId.startsWith("EQ")
          ? `/app/quality/equipment/${record.sourceId}`
          : record.sourceId.startsWith("FND")
            ? "/app/quality/audits"
            : "";
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "plan" ? "Collect implementation evidence." : record.status === "implementation" ? "An independent check closes the CAPA. Not effective keeps it open." : "Closed. Reopen needs another person and a reason."} blocked={blocked} links={sourceHref ? [{ href: sourceHref, label: record.sourceId }] : []} history={<History system={system} ids={[record.id, record.sourceId]} />}>
      <p>{record.corrective}</p>
      <p>Owner {record.owner}. Check {record.checkOn}.</p>
      {record.failedChecks.length ? <p className="quality-error">Earlier check did not pass: {record.failedChecks.at(-1)}</p> : null}
      {record.status === "plan" ? (
        <PinForm actor={actor} recordId={record.id} meaning="authorship" label="Record evidence" onSubmit={() => implementCapa(record.id, actor, evidence)}>
          <label>Evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "implementation" ? (
        <PinForm actor={actor} recordId={record.id} meaning="closure" label="Check effectiveness" disabled={Boolean(blocked)} onSubmit={() => checkEffectiveness(record.id, actor, { result, evidence })}>
          <label>
            Result
            <select value={result} onChange={(event) => setResult(event.target.value as "effective" | "not-effective")}>
              <option value="effective">Effective</option>
              <option value="not-effective">Not effective</option>
            </select>
          </label>
          <label>Evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "closed" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Reopen CAPA" onSubmit={() => reopenCapa(record.id, actor, reason)}>
          <label>Why it is reopening<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </PinForm>
      ) : null}
    </Frame>
  );
}

function DocumentDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = system.documents.find((item) => item.id === id);
  const [effectiveOn, setEffectiveOn] = useState("2026-10-15");
  const [training, setTraining] = useState("");
  const [assignees, setAssignees] = useState("");
  if (!record) return <Shell title="Document"><p className="client-empty">That document was not found.</p></Shell>;
  const prior = system.documents.filter((item) => item.code === record.code && item.id !== record.id);
  const blocked = record.status === "review" && record.author === actor ? "You authored this version, so you cannot approve it." : record.status === "approved" && currentDay() < record.effectiveOn ? `This version becomes effective on ${record.effectiveOn}.` : "";
  return (
    <Frame title={`${record.code} version ${record.version}`} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "review" ? "An independent approver sets the effective date and who must train." : record.status === "approved" ? "Issue the version once the effective date has arrived." : record.status === "effective" ? "This is the effective version." : record.obsoleteReason || record.status} blocked={blocked} links={record.changeId ? [{ href: `/app/quality/changes/${record.changeId}`, label: record.changeId }] : []} history={<History system={system} ids={[record.id, ...prior.map((item) => item.id)]} />}>
      <p>{record.body}</p>
      {prior.map((item) => <p key={item.id}>{item.id} is {item.status}. {item.obsoleteReason}</p>)}
      {record.status === "review" ? (
        <PinForm actor={actor} recordId={record.id} meaning="approval" label="Approve version" disabled={record.author === actor} onSubmit={() => approveDocument(record.id, actor, { effectiveOn, training, assignees: assignees.split(",").map((item) => item.trim()).filter(Boolean) })}>
          <label>Effective date<input value={effectiveOn} onChange={(event) => setEffectiveOn(event.target.value)} /></label>
          <label>Training note<textarea value={training} onChange={(event) => setTraining(event.target.value)} /></label>
          <label>People who must acknowledge<input value={assignees} onChange={(event) => setAssignees(event.target.value)} placeholder="J. Ortiz, M. Chen" /></label>
        </PinForm>
      ) : null}
      {record.status === "approved" ? (
        <PinForm actor={actor} recordId={record.id} meaning="approval" label="Issue version" disabled={Boolean(blocked)} onSubmit={() => issueDocument(record.id, actor)} />
      ) : null}
    </Frame>
  );
}

function TrainingDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = (system.training ?? []).find((item) => item.id === id);
  if (!record) return <Shell title="Training"><p className="client-empty">That training assignment was not found.</p></Shell>;
  const blocked = record.status === "assigned" && actor !== record.assignee ? `Only ${record.assignee} can acknowledge this assignment.` : "";
  return (
    <Frame title={record.documentId} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "assigned" ? `${record.assignee} reads the effective document and acknowledges it.` : `Acknowledged ${record.completedOn}.`} blocked={blocked} links={[{ href: `/app/quality/documents/${encodeURIComponent(record.documentId)}`, label: record.documentId }]} history={<History system={system} ids={[record.id, record.documentId]} />}>
      <p>Due {record.due}. A missing acknowledgement stays assigned. It is not marked complete automatically.</p>
      {record.status === "assigned" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Acknowledge" disabled={Boolean(blocked)} onSubmit={() => completeTraining(record.id, actor)} />
      ) : null}
    </Frame>
  );
}

function ChangeDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = system.changes.find((item) => item.id === id);
  const [impact, setImpact] = useState("");
  const [code, setCode] = useState("SOP-QA-004");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  if (!record) return <Shell title="Change"><p className="client-empty">That change was not found.</p></Shell>;
  const document = system.documents.find((item) => item.id === record.documentId);
  const openTraining = (system.training ?? []).filter((item) => item.documentId === record.documentId && item.status === "assigned");
  const blocked = record.status === "approved" && record.documentId && document?.status !== "effective"
    ? `${record.documentId} has to be effective before this change can be implemented.`
    : record.status === "approved" && record.proposer === actor
      ? "You proposed this change, so you cannot sign implementation."
      : record.status === "implemented" && openTraining.length
        ? `Close waits on training for ${openTraining.map((item) => item.assignee).join(", ")}.`
        : record.status === "assessment" && record.proposer === actor
          ? "You proposed this change, so you cannot approve it."
          : "";
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "proposed" ? "Assess impact and validation." : record.status === "assessment" ? "An independent approver signs the change." : record.status === "approved" ? "Implement it, after any linked document is effective." : record.status === "implemented" ? "Close after training on the new version is complete." : "Closed."} blocked={blocked} links={record.documentId ? [{ href: `/app/quality/documents/${encodeURIComponent(record.documentId)}`, label: record.documentId }] : []} history={<History system={system} ids={[record.id, record.documentId]} />}>
      <p>{record.description}</p>
      {record.impact ? <p>Impact: {record.impact}</p> : null}
      {record.status === "proposed" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Assess impact" onSubmit={() => assessChange(record.id, actor, { impact, validation: "partial" })}>
          <label>Impact<textarea value={impact} onChange={(event) => setImpact(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "assessment" && !record.documentId ? (
        <PinForm actor={actor} recordId={record.id} meaning="authorship" label="Revise document" onSubmit={() => reviseDocument({ code, title: code, body: body || "Revise the controlled text before this version is effective.", changeId: record.id, docType: "SOP" }, actor)}>
          <label>Document code<input value={code} onChange={(event) => setCode(event.target.value)} /></label>
          <label>Revised body<textarea value={body} onChange={(event) => setBody(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "assessment" ? (
        <PinForm actor={actor} recordId={record.id} meaning="approval" label="Approve change" disabled={record.proposer === actor} onSubmit={() => approveChange(record.id, actor)} />
      ) : null}
      {record.status === "approved" ? (
        <PinForm actor={actor} recordId={record.id} meaning="authorship" label="Implement change" disabled={Boolean(blocked)} onSubmit={() => implementChange(record.id, actor, note)}>
          <label>What was implemented<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "implemented" ? (
        <PinForm actor={actor} recordId={record.id} meaning="closure" label="Close change" disabled={Boolean(blocked)} onSubmit={() => closeChange(record.id, actor, reason)}>
          <label>Verification<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </PinForm>
      ) : null}
    </Frame>
  );
}

function AuditDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = (system.audits ?? []).find((item) => item.id === id);
  const [title, setTitle] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  if (!record) return <Shell title="Audit"><p className="client-empty">That audit was not found.</p></Shell>;
  const findings = (system.findings ?? []).filter((item) => item.auditId === record.id);
  const open = findings.filter((item) => item.status !== "closed");
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "planned" ? "Start the audit." : open.length ? "Close each finding only after its CAPA is verified." : findings.length ? "Close the audit. The person who recorded a finding cannot close it." : "Record a finding and its evidence."} blocked={open.length && record.status === "findings" ? `Close waits on ${open.map((item) => item.id).join(", ")}.` : ""} links={[]} history={<History system={system} ids={[record.id, ...findings.map((item) => item.id)]} />}>
      <p>Scope: {record.scope}</p>
      <p>Criteria: {record.criteria}. Auditor {record.auditor}. Scheduled {record.scheduledOn}.</p>
      {findings.map((item) => (
        <p key={item.id}>
          <Link to={`/app/quality/audits/${record.id}`}>{item.id}</Link> {item.title} · {item.risk} · {item.status}. {item.evidence}
          {item.capaId ? <> · <Link to={`/app/quality/capa/${item.capaId}`}>{item.capaId}</Link></> : null}
        </p>
      ))}
      {record.status === "planned" ? <PinForm actor={actor} recordId={record.id} meaning="review" label="Start audit" onSubmit={() => startAudit(record.id, actor)} /> : null}
      {record.status === "in_progress" || record.status === "findings" ? (
        <PinForm actor={actor} recordId={record.id} meaning="authorship" label="Record finding" onSubmit={() => recordFinding({ auditId: record.id, title, evidence, risk: "high" }, actor)}>
          <label>Finding<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {findings.filter((item) => item.status !== "closed").map((item) => (
        <PinForm key={item.id} actor={actor} recordId={item.id} meaning="closure" label={`Close ${item.id}`} disabled={!item.capaId} onSubmit={() => closeFinding(item.id, actor, reason || "Corrective action verified.")}>
          <label>Verification for {item.id}<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          {!item.capaId ? <p className="quality-error">Link a CAPA from the finding before it can close. Open one below.</p> : null}
        </PinForm>
      ))}
      {findings.some((item) => item.status === "open") ? (
        <PinForm actor={actor} recordId={record.id} meaning="approval" label="Open CAPA for the first open finding" onSubmit={() => {
          const finding = findings.find((item) => item.status === "open" && !item.capaId);
          if (!finding) return "There is no open finding without a CAPA.";
          return openCapa({ sourceId: finding.id, title: finding.title, rootCause: finding.evidence, corrective: "Correct the finding", preventive: "Add the check to the audit checklist", owner: actor, checkOn: "2026-11-20" }, actor);
        }} />
      ) : null}
      {record.status === "findings" && !open.length ? (
        <PinForm actor={actor} recordId={record.id} meaning="closure" label="Close audit" onSubmit={() => closeAudit(record.id, actor, reason || "Findings are closed and traced to their CAPAs.")} />
      ) : null}
    </Frame>
  );
}

function RiskDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = (system.risks ?? []).find((item) => item.id === id);
  const [control, setControl] = useState("");
  const [changeTitle, setChangeTitle] = useState("");
  if (!record) return <Shell title="Risk"><p className="client-empty">That risk was not found.</p></Shell>;
  const config = configOf(system);
  const score = riskScore(record.likelihood, record.impact);
  const change = system.changes.find((item) => item.id === record.changeId);
  const blocked = record.status === "mitigating" && change?.status !== "closed" ? `Residual risk waits until ${record.changeId} is closed.` : "";
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "open" ? "Link a change request as the mitigation." : record.status === "mitigating" ? "Implement and close the change, then reassess." : `Residual score ${riskScore(record.residualLikelihood, record.residualImpact)}.`} blocked={blocked} links={record.changeId ? [{ href: `/app/quality/changes/${record.changeId}`, label: record.changeId }] : []} history={<History system={system} ids={[record.id, record.changeId]} />}>
      <p>{record.hazard}</p>
      <p>Method: {config.methodology}</p>
      <p>Inherent score {score} ({riskBand(score, config)}). Owner {record.owner}. Review {record.reviewOn}.</p>
      {record.status === "open" ? (
        <>
          <PinForm actor={actor} recordId={record.id} meaning="authorship" label="Propose the mitigation change" onSubmit={() => proposeChange({ title: changeTitle || `${record.id} mitigation`, description: control || record.hazard }, actor)}>
            <label>Change title<input value={changeTitle} onChange={(event) => setChangeTitle(event.target.value)} /></label>
            <label>Control<textarea value={control} onChange={(event) => setControl(event.target.value)} /></label>
          </PinForm>
          <PinForm actor={actor} recordId={record.id} meaning="review" label="Link the newest change" onSubmit={() => mitigateRisk(record.id, actor, { control: control || "Control recorded on the change.", changeId: system.changes[0]?.id ?? "" })} />
        </>
      ) : null}
      {record.status === "mitigating" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Reassess residual risk" disabled={Boolean(blocked)} onSubmit={() => reassessRisk(record.id, actor, { likelihood: 2, impact: 2 })} />
      ) : null}
    </Frame>
  );
}

function EquipmentDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = (system.equipment ?? []).find((item) => item.id === id);
  const [impact, setImpact] = useState("");
  const [restriction, setRestriction] = useState("");
  const [note, setNote] = useState("");
  if (!record) return <Shell title="Equipment"><p className="client-empty">That equipment record was not found.</p></Shell>;
  const instrument = findInstrument(record.instrumentId);
  const capa = system.capas.find((item) => item.id === record.capaId);
  const blocked = record.status === "restricted" && record.reporter === actor
    ? "You reported this failure, so you cannot release the equipment."
    : record.status === "restricted" && record.capaId && capa?.status !== "closed"
      ? `Release waits on ${record.capaId}.`
      : "";
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "failed" ? "Record impact and restrict use. Linked accessions stay unchanged." : record.status === "restricted" ? "An independent approval returns it to service." : "Released. Sample results were not changed by this record."} blocked={blocked} links={[
      { href: `/app/instruments/${record.instrumentId}`, label: instrument?.name ?? record.instrumentId },
      ...record.accessionIds.map((item) => ({ href: `/app/samples/${item}`, label: item })),
      ...(record.capaId ? [{ href: `/app/quality/capa/${record.capaId}`, label: record.capaId }] : []),
    ]} history={<History system={system} ids={[record.id, record.capaId]} />}>
      <p>Restriction: {record.restriction || "None yet."}</p>
      {record.impact ? <p>Impact: {record.impact}</p> : null}
      {record.status === "failed" ? (
        <>
          <PinForm actor={actor} recordId={record.id} meaning="review" label="Restrict equipment" onSubmit={() => restrictEquipment(record.id, actor, { impact, restriction })}>
            <label>Impact<textarea value={impact} onChange={(event) => setImpact(event.target.value)} /></label>
            <label>Restriction<textarea value={restriction} onChange={(event) => setRestriction(event.target.value)} /></label>
          </PinForm>
          <PinForm actor={actor} recordId={record.id} meaning="approval" label="Open CAPA" onSubmit={() => openCapa({ sourceId: record.id, title: `${record.id} calibration CAPA`, rootCause: record.title, corrective: "Repair and recalibrate", preventive: "Shorten the calibration interval", owner: actor, checkOn: "2026-11-20" }, actor)} />
        </>
      ) : null}
      {record.status === "restricted" ? (
        <PinForm actor={actor} recordId={record.id} meaning="approval" label="Release to service" disabled={Boolean(blocked)} onSubmit={() => releaseEquipment(record.id, actor, note)}>
          <label>Investigation and release note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </PinForm>
      ) : null}
    </Frame>
  );
}

function SupplierDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = (system.suppliers ?? []).find((item) => item.id === id);
  const [issue, setIssue] = useState("");
  if (!record) return <Shell title="Supplier"><p className="client-empty">That supplier was not found.</p></Shell>;
  return (
    <Frame title={record.name} kicker={record.id} status={record.status} sample={record.sample} next={record.issue ? "Track the linked CAPA." : `Review by ${record.reviewOn}.`} blocked="" links={record.capaId ? [{ href: `/app/quality/capa/${record.capaId}`, label: record.capaId }] : []} history={<History system={system} ids={[record.id]} />}>
      <p>{record.service}. Risk {record.risk}.</p>
      <p>{record.evaluation}</p>
      {record.issue ? <p>Issue: {record.issue}</p> : null}
      {record.status !== "disqualified" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Record an issue" onSubmit={() => supplierIssue(record.id, actor, { issue })}>
          <label>Issue<textarea value={issue} onChange={(event) => setIssue(event.target.value)} /></label>
        </PinForm>
      ) : null}
    </Frame>
  );
}

function ComplaintDetail({ id }: { id: string }) {
  const system = useQuality();
  const actor = qualityActor();
  const record = (system.complaints ?? []).find((item) => item.id === id);
  const [impact, setImpact] = useState("");
  const [reason, setReason] = useState("");
  if (!record) return <Shell title="Complaint"><p className="client-empty">That complaint was not found.</p></Shell>;
  const capa = system.capas.find((item) => item.id === record.capaId);
  const blocked = record.capaId && capa?.status !== "closed"
    ? `Close waits on ${record.capaId}.`
    : record.reporter === actor && record.status !== "received"
      ? "You recorded this complaint, so you cannot close it."
      : "";
  const links = [
    record.accountId ? { href: `/app/connectivity/clients/${record.accountId}`, label: record.accountId } : null,
    record.accessionId ? { href: `/app/samples/${record.accessionId}`, label: record.accessionId } : null,
    record.capaId ? { href: `/app/quality/capa/${record.capaId}`, label: record.capaId } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));
  return (
    <Frame title={record.title} kicker={record.id} status={record.status} sample={record.sample} next={record.status === "received" ? "Investigate and assess impact." : record.status === "closed" ? "Closed." : "Open a CAPA when action is required, then close with an independent signature."} blocked={blocked} links={links} history={<History system={system} ids={[record.id, record.capaId]} />}>
      <p>{record.detail}</p>
      {record.impact ? <p>Impact: {record.impact}</p> : null}
      {record.status === "received" ? (
        <PinForm actor={actor} recordId={record.id} meaning="review" label="Sign investigation" onSubmit={() => investigateComplaint(record.id, actor, { impact })}>
          <label>Impact<textarea value={impact} onChange={(event) => setImpact(event.target.value)} /></label>
        </PinForm>
      ) : null}
      {record.status === "investigation" && !record.capaId ? (
        <PinForm actor={actor} recordId={record.id} meaning="approval" label="Open CAPA" onSubmit={() => openCapa({ sourceId: record.id, title: `${record.id} complaint action`, rootCause: record.impact || record.detail, corrective: "Respond to the client and correct the cause", preventive: "Add the check to intake review", owner: actor, checkOn: "2026-11-20" }, actor)} />
      ) : null}
      {record.status === "investigation" || record.status === "actions" ? (
        <PinForm actor={actor} recordId={record.id} meaning="closure" label="Close complaint" disabled={Boolean(blocked)} onSubmit={() => closeComplaint(record.id, actor, reason)}>
          <label>Closure reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </PinForm>
      ) : null}
    </Frame>
  );
}

function MetricsPage() {
  const system = useQuality();
  const actor = qualityActor();
  const metrics = complianceMetrics(system);
  const [title, setTitle] = useState("");
  const [decision, setDecision] = useState("");
  const [evidence, setEvidence] = useState("");
  const series = paymentBars(system.audit.map((item) => ({ at: item.at, cents: 1 })), 2026, 7);
  const repeats = Object.entries(system.deviations.reduce<Record<string, number>>((counts, item) => {
    const key = item.rootCause || "unclassified";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]);
  return (
    <Shell title="Quality Metrics">
      <div className="client-home-main">
        <div className="client-kpis">
          <StudioLink to="/app/quality/capa"><header><span>Overdue actions</span></header><strong>{metrics.overdueActions}</strong><small>CAPA checks and training past due</small></StudioLink>
          <StudioLink to="/app/quality/events"><header><span>Open events</span></header><strong>{metrics.openEvents}</strong><small>{metrics.highRiskOpen} high-risk items open</small></StudioLink>
          <StudioLink to="/app/quality/training"><header><span>Training gaps</span></header><strong>{metrics.trainingGaps}</strong><small>{metrics.capaEffectiveness === null ? "No closed CAPA yet" : `${metrics.capaEffectiveness}% CAPA effective`}</small></StudioLink>
        </div>
        <section className="client-card client-analytics">
          <header>
            <h2>Signed quality activity</h2>
            <div><b>July 2026</b><small className="client-chart-hint">Ctrl + scroll to zoom</small></div>
          </header>
          <RevenueChart series={series} format="count" />
        </section>
        <section className="client-card">
          <h2>Repeat causes</h2>
          {repeats.map(([cause, count]) => <p key={cause}>{cause}: {count}</p>)}
          <h2>Management review</h2>
          {(system.reviews ?? []).map((item) => (
            <p key={item.id}><b>{item.id}</b> {item.decision} · {item.status} · due {item.due}{item.sample ? " · Sample data" : ""}</p>
          ))}
          <PinForm actor={actor} recordId="new-review" meaning="approval" label="Record decision" onSubmit={() => recordReview({ title, decision, owner: actor, due: "2026-12-15" }, actor)}>
            <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Decision<textarea value={decision} onChange={(event) => setDecision(event.target.value)} /></label>
          </PinForm>
          {(system.reviews ?? []).filter((item) => item.status === "open").map((item) => (
            <PinForm key={item.id} actor={actor} recordId={item.id} meaning="closure" label={`Complete ${item.id}`} disabled={item.signatures.some((signature) => signature.section === "decision" && signature.signer === actor)} onSubmit={() => completeReview(item.id, actor, evidence)}>
              <label>Follow-up evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} /></label>
            </PinForm>
          ))}
        </section>
      </div>
      <Assist system={system} actor={actor} />
    </Shell>
  );
}

function AdminPage() {
  const system = useQuality();
  const actor = qualityActor();
  const current = configOf(system);
  const [config, setConfig] = useState<QualityConfig>(current);
  return (
    <Shell title="Compliance Administration">
      <div className="client-home-main">
        <section className="client-card">
          <h2>Policy for this laboratory</h2>
          <p>Categories, the risk scale, review periods, and separation of duties are stored with the quality records. They are not hardcoded per customer.</p>
          <PinForm actor={actor} recordId="quality-config" meaning="approval" label="Save configuration" onSubmit={() => updateQualityConfig(actor, { ...config, categories: config.categories, severities: config.severities })}>
            <label>Methodology<textarea value={config.methodology} onChange={(event) => setConfig({ ...config, methodology: event.target.value })} /></label>
            <label>Scale (2–5)<input value={String(config.scale)} onChange={(event) => setConfig({ ...config, scale: Number(event.target.value) })} /></label>
            <label>Escalation days<input value={String(config.escalationDays)} onChange={(event) => setConfig({ ...config, escalationDays: Number(event.target.value) })} /></label>
            <label>Document review days<input value={String(config.documentReviewDays)} onChange={(event) => setConfig({ ...config, documentReviewDays: Number(event.target.value) })} /></label>
            <label>Retention days<input value={String(config.retentionDays)} onChange={(event) => setConfig({ ...config, retentionDays: Number(event.target.value) })} /></label>
            <label>Categories<input value={config.categories.join(", ")} onChange={(event) => setConfig({ ...config, categories: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
            <label>Severities<input value={config.severities.join(", ")} onChange={(event) => setConfig({ ...config, severities: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
            <label>Approval policy<textarea value={config.approvalPolicy} onChange={(event) => setConfig({ ...config, approvalPolicy: event.target.value })} /></label>
            <label>
              <input type="checkbox" checked={config.separationOfDuties} onChange={(event) => setConfig({ ...config, separationOfDuties: event.target.checked })} /> Separation of duties
            </label>
          </PinForm>
          <History system={system} ids={["quality-config"]} />
        </section>
      </div>
      <Assist system={system} actor={actor} />
    </Shell>
  );
}

export function ComplianceOverview() {
  const [params] = useSearchParams();
  const system = useQuality();
  const actor = qualityActor();
  const id = params.get("id");
  const type = params.get("type");
  if (id && type === "capa") return <Navigate to={`/app/quality/capa/${id}`} replace />;
  if (id && type === "change") return <Navigate to={`/app/quality/changes/${id}`} replace />;
  if (id && type === "document") return <Navigate to={`/app/quality/documents/${encodeURIComponent(id)}`} replace />;
  if (id) return <Navigate to={`/app/quality/events/${id}`} replace />;
  const metrics = complianceMetrics(system);
  const series = paymentBars(system.audit.map((item) => ({ at: item.at, cents: 1 })), 2026, 7);
  const notices = (system.notifications ?? []).filter((item) => !item.read).slice(-4).reverse();
  return (
    <Shell title="Compliance Overview">
      <div className="client-home-main">
        <div className="client-kpis">
          <StudioLink to="/app/quality/events">
            <header><span>Open events</span><em className={metrics.openEvents ? "is-down" : "is-up"}>{metrics.openEvents ? "Open" : "Clear"}</em></header>
            <strong>{metrics.openEvents}</strong>
            <small>{metrics.highRiskOpen} high-risk items</small>
          </StudioLink>
          <StudioLink to="/app/quality/capa">
            <header><span>Overdue</span><em className={metrics.overdueActions ? "is-down" : "is-up"}>{metrics.overdueActions ? "Due" : "Clear"}</em></header>
            <strong>{metrics.overdueActions}</strong>
            <small>{metrics.upcomingDeadlines} due inside the escalation window</small>
          </StudioLink>
          <StudioLink to="/app/quality/training">
            <header><span>Training gaps</span></header>
            <strong>{metrics.trainingGaps}</strong>
            <small>{metrics.pendingApprovals} approval{metrics.pendingApprovals === 1 ? "" : "s"} waiting · {metrics.calibrationAlerts} calibration alert{metrics.calibrationAlerts === 1 ? "" : "s"}</small>
          </StudioLink>
        </div>
        <section className="client-card client-analytics">
          <header>
            <h2>Quality activity</h2>
            <div>
              <b>July 2026</b>
              <small className="client-chart-hint">Ctrl + scroll to zoom</small>
            </div>
          </header>
          <div className="client-analytics-body">
            <div className="client-analytics-side">
              <blockquote>
                {metrics.capaEffectiveness === null
                  ? "No CAPA has been closed, so effectiveness is not reported as a rate."
                  : `${metrics.capaEffectiveness}% of closed CAPAs were judged effective.`}
                {" "}{metrics.auditReadiness} audit finding{metrics.auditReadiness === 1 ? " remains" : "s remain"} open.
              </blockquote>
              <Link className="client-analysis" to="/app/quality/metrics">Open metrics</Link>
            </div>
            <RevenueChart series={series} format="count" />
          </div>
        </section>
        <section className="client-card client-projects is-scroll">
          <header><h2>Open work</h2></header>
          <div className="client-table-wrap">
            <table className="client-table">
              <thead><tr><th>Record</th><th>Next</th><th>Status</th></tr></thead>
              <tbody>
                {rowsFor("events", system, actor).filter((row) => row.open).concat(rowsFor("capa", system, actor).filter((row) => row.open)).slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    <td><Link to={row.href}><b>{row.id}</b><small>{row.title}{row.sample ? " · Sample data" : ""}</small></Link></td>
                    <td>{row.next}</td>
                    <td><em className={`client-status is-${tone(row.status)}`}>{row.status}</em></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <aside className="client-home-side">
        <section className="client-card client-tasks">
          <header>
            <h2>Notices</h2>
            <button type="button" className="btn btn-secondary" onClick={() => markAllNoticesRead()}>Mark read</button>
          </header>
          {notices.length ? (
            <ul>
              {notices.map((item) => (
                <li key={item.id}><span><b>{item.recordId}</b><small>{item.message}</small></span></li>
              ))}
            </ul>
          ) : <p className="client-empty">No unread notices.</p>}
        </section>
        <Assist system={system} actor={actor} />
      </aside>
    </Shell>
  );
}

export function ComplianceSection() {
  const { section = "", id = "" } = useParams();
  const recordId = decodeURIComponent(id);
  if (section === "metrics") return <MetricsPage />;
  if (section === "admin") return <AdminPage />;
  if (recordId && (section === "events" || section === "deviations")) return <DeviationDetail id={recordId} />;
  if (recordId && section === "capa") return <CapaDetail id={recordId} />;
  if (recordId && section === "documents") return <DocumentDetail id={recordId} />;
  if (recordId && section === "training") return <TrainingDetail id={recordId} />;
  if (recordId && section === "changes") return <ChangeDetail id={recordId} />;
  if (recordId && section === "audits") return <AuditDetail id={recordId} />;
  if (recordId && section === "risks") return <RiskDetail id={recordId} />;
  if (recordId && section === "equipment") return <EquipmentDetail id={recordId} />;
  if (recordId && section === "suppliers") return <SupplierDetail id={recordId} />;
  if (recordId && section === "complaints") return <ComplaintDetail id={recordId} />;
  if (!TITLES[section]) return <Shell title="Compliance"><p className="client-empty">That compliance area was not found.</p></Shell>;
  return <QualityList section={section} />;
}
