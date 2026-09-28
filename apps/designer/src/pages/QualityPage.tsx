import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { pinState, useReviewerPin, verifyReviewerPin } from "../reviewerPin";
import { STATUS_LABEL, useSamples } from "../samples";
import {
  approveDocument,
  CAPA_STAGES,
  CHANGE_STAGES,
  checkEffectiveness,
  closeChange,
  closeDeviation,
  containDeviation,
  DEVIATION_STAGES,
  DISPOSITIONS,
  disposeDeviation,
  DOCUMENT_STAGES,
  documentSectionDigest,
  deviationSectionDigest,
  capaSectionDigest,
  changeSectionDigest,
  implementChange,
  investigateDeviation,
  getQuality,
  issueDocument,
  qualityActor,
  recordKind,
  rejectSignature,
  reportDeviation,
  ROOT_CAUSES,
  SIGNATURE_MEANING,
  signatureIsBound,
  useQuality,
  type Capa,
  type ChangeControl,
  type ControlledDocument,
  type Deviation,
  type Disposition,
  type Effectiveness,
  type QualitySystem,
  type RootCause,
  type Signature,
  type SignatureMeaning,
} from "../qualitySystem";

type QualityType = "deviation" | "capa" | "change" | "document" | "audit";

const TYPES: { id: QualityType; label: string }[] = [
  { id: "deviation", label: "Deviations" },
  { id: "capa", label: "CAPA" },
  { id: "change", label: "Change control" },
  { id: "document", label: "Documents" },
  { id: "audit", label: "Audit trail" },
];

function isType(value: string | null): value is QualityType {
  return TYPES.some((item) => item.id === value);
}

function defaultId(type: QualityType): string {
  if (type === "deviation") return "DEV-118";
  if (type === "capa") return "CAPA-015";
  if (type === "change") return "CC-009";
  if (type === "document") return "SOP-HPLC-12:4";
  return "";
}

function Flow({ steps }: { steps: { label: string; detail: string; state: "done" | "current" | "wait" }[] }) {
  return (
    <ol className="quality-flow">
      {steps.map((step) => (
        <li key={step.label} className={`is-${step.state}`}>
          <b>{step.label}</b>
          <small>{step.detail}</small>
        </li>
      ))}
    </ol>
  );
}

function SignatureList({ signatures, digestFor }: { signatures: Signature[]; digestFor: (section: string) => string }) {
  if (!signatures.length) return null;
  return (
    <ul className="quality-signs">
      {signatures.map((signature) => {
        const bound = signatureIsBound(signature, digestFor(signature.section));
        return (
          <li key={signature.id}>
            <b>{signature.signer}</b>
            <span>{signature.at}</span>
            <p>{SIGNATURE_MEANING[signature.meaning]}</p>
            <small className={bound ? "is-bound" : "is-unbound"}>
              {bound ? `${signature.id} bound to this record` : `${signature.id} does not match the current record`}
            </small>
          </li>
        );
      })}
    </ul>
  );
}

function RecordAudit({ system, id }: { system: QualitySystem; id: string }) {
  const rows = system.audit.filter((event) => event.recordId === id).slice(-8).reverse();
  if (!rows.length) return null;
  return (
    <div className="quality-record-audit">
      <h3>Record audit</h3>
      <ul>
        {rows.map((event) => (
          <li key={event.id}>
            <b>{event.action}</b>
            <span>{event.at} · {event.actor}</span>
            <small>{event.reason}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignForm({
  meaning,
  label,
  actor,
  recordId,
  disabled,
  onSubmit,
  children,
  statement,
}: {
  meaning: SignatureMeaning;
  label: string;
  actor: string;
  recordId: string;
  disabled?: boolean;
  onSubmit: () => string;
  children?: ReactNode;
  statement?: string;
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
      setError("PIN does not match.");
      return;
    }
    setPin("");
    setError(onSubmit());
  }

  return (
    <form className="quality-sign" onSubmit={submit}>
      {children}
      <p>{statement ?? SIGNATURE_MEANING[meaning]}</p>
      <p className="quality-legal">
        Signing as {actor}. This electronic signature is the legally binding equivalent of your handwritten signature.
      </p>
      <label>
        Reviewer PIN
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Reviewer PIN"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
      </label>
      {error ? <p className="quality-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {label}
      </button>
    </form>
  );
}

function stageState(index: number, current: number): "done" | "current" | "wait" {
  if (index < current) return "done";
  if (index === current) return "current";
  return "wait";
}

function DeviationCase({ record, actor, system }: { record: Deviation; actor: string; system: QualitySystem }) {
  const samples = useSamples();
  const sample = samples.find((item) => item.accessionId === record.accessionId);
  const [containment, setContainment] = useState("");
  const [investigation, setInvestigation] = useState("");
  const [rootCause, setRootCause] = useState<RootCause>("equipment");
  const [impact, setImpact] = useState("");
  const [disposition, setDisposition] = useState<Disposition>("retest");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [, setParams] = useSearchParams();
  const current = DEVIATION_STAGES.findIndex((stage) => stage.id === record.status);
  const investigator = record.signatures.find((signature) => signature.section === "investigation")?.signer ?? "";
  const disposer = record.signatures.find((signature) => signature.section === "disposition")?.signer ?? "";
  const closeBlock = samePerson(actor, record.reporter)
    ? "You reported this event, so you cannot apply the QA close signature."
    : investigator && samePerson(actor, investigator)
      ? "You signed the investigation, so you cannot apply the QA close signature."
      : disposer && samePerson(actor, disposer)
        ? "You signed the disposition, so you cannot apply the QA close signature."
        : "";

  function go(stage: string) {
    setParams({ type: "deviation", id: record.id, stage });
  }

  return (
    <div>
      <div className="lims-panel-head">
        <h2>{record.id}</h2>
        <span className="lims-badge warn">{record.kind === "nonconformance" ? "Nonconformance" : "Deviation"}</span>
      </div>
      <p className="quality-title">{record.title}</p>
      <dl className="account-facts">
        <div><dt>Reporter</dt><dd>{record.reporter}</dd></div>
        <div><dt>Site</dt><dd>{record.site}</dd></div>
        <div>
          <dt>Accession</dt>
          <dd>
            {record.accessionId ? <Link to={`/app/samples/${record.accessionId}`}>{record.accessionId}</Link> : "None linked"}
          </dd>
        </div>
        <div>
          <dt>Laboratory</dt>
          <dd>{sample ? `${STATUS_LABEL[sample.status]} · ${sample.custody}` : "No sample on the bench"}</dd>
        </div>
      </dl>
      <p className="quality-copy">{record.description}</p>
      <Flow
        steps={[
          { label: "Reported", detail: record.reporter, state: stageState(0, current) },
          { label: "Contained", detail: record.containment || "Record how the event was contained.", state: stageState(1, current) },
          { label: "Investigation", detail: record.investigation || "Root cause and impact.", state: stageState(2, current) },
          { label: "Disposition", detail: record.dispositionNote || "What happens to the work.", state: stageState(3, current) },
          { label: "QA close", detail: record.closeReason || "An independent quality signature.", state: stageState(4, current) },
        ]}
      />
      {record.status === "reported" ? (
        <SignForm meaning="authorship" label="Sign containment" actor={actor} recordId={record.id} disabled={!containment.trim()} onSubmit={() => {
          const error = containDeviation(record.id, actor, containment);
          if (!error) go("contained");
          return error;
        }}>
          <label>
            Containment
            <textarea aria-label="Containment" value={containment} onChange={(event) => setContainment(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      {record.status === "contained" ? (
        <SignForm meaning="review" label="Sign investigation" actor={actor} recordId={record.id} disabled={!investigation.trim() || !impact.trim()} onSubmit={() => {
          const error = investigateDeviation(record.id, actor, { investigation, rootCause, impact });
          if (!error) go("investigation");
          return error;
        }}>
          <label>
            Investigation
            <textarea aria-label="Investigation" value={investigation} onChange={(event) => setInvestigation(event.target.value)} />
          </label>
          <label>
            Root cause
            <select aria-label="Root cause" value={rootCause} onChange={(event) => setRootCause(event.target.value as RootCause)}>
              {ROOT_CAUSES.map((cause) => <option key={cause.id} value={cause.id}>{cause.label}</option>)}
            </select>
          </label>
          <label>
            Impact
            <textarea aria-label="Impact" value={impact} onChange={(event) => setImpact(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      {record.status === "investigation" ? (
        <SignForm meaning="review" label="Sign disposition" actor={actor} recordId={record.id} disabled={!note.trim()} onSubmit={() => {
          const error = disposeDeviation(record.id, actor, { disposition, note });
          if (!error) go("disposition");
          return error;
        }}>
          <label>
            Disposition
            <select aria-label="Disposition" value={disposition} onChange={(event) => setDisposition(event.target.value as Disposition)}>
              {DISPOSITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Disposition note
            <textarea aria-label="Disposition note" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      {record.status === "disposition" ? (
        <SignForm meaning="closure" label="Sign QA close" actor={actor} recordId={record.id} disabled={!reason.trim() || Boolean(closeBlock)} onSubmit={() => {
          const error = closeDeviation(record.id, actor, reason);
          if (!error) go("closed");
          return error;
        }}>
          {closeBlock ? <p className="quality-error">{closeBlock}</p> : <p>QA close has to be someone other than the reporter, the investigator, and the disposition signer.</p>}
          <label>
            Close reason
            <textarea aria-label="Close reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      {record.accessionId && record.status !== "closed" ? (
        <p className="quality-copy">Closing this record does not release {record.accessionId}. The laboratory hold stays in Sequence Operations.</p>
      ) : null}
      <SignatureList signatures={record.signatures} digestFor={(section) => deviationSectionDigest(record, section)} />
      <RecordAudit system={system} id={record.id} />
    </div>
  );
}

function ReportCase({ actor }: { actor: string }) {
  const samples = useSamples();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessionId, setAccessionId] = useState("");
  const [site, setSite] = useState("East Lab");
  const [, setParams] = useSearchParams();
  return (
    <div>
      <div className="lims-panel-head"><h2>Report a deviation</h2></div>
      <SignForm meaning="authorship" label="Report and sign" actor={actor} recordId="NEW" disabled={!title.trim() || !description.trim()} onSubmit={() => {
        const error = reportDeviation({ title, description, accessionId, site }, actor);
        if (!error) {
          const created = getQuality().deviations[0]?.id ?? "";
          setParams({ type: "deviation", stage: "reported", id: created });
        }
        return error;
      }}>
        <label>
          Title
          <input aria-label="Deviation title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Description
          <textarea aria-label="Deviation description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Accession
          <select aria-label="Linked accession" value={accessionId} onChange={(event) => setAccessionId(event.target.value)}>
            <option value="">None</option>
            {samples.map((sample) => <option key={sample.accessionId} value={sample.accessionId}>{sample.accessionId}</option>)}
          </select>
        </label>
        <label>
          Site
          <input aria-label="Site" value={site} onChange={(event) => setSite(event.target.value)} />
        </label>
      </SignForm>
    </div>
  );
}

function CapaCase({ record, actor, system }: { record: Capa; actor: string; system: QualitySystem }) {
  const [result, setResult] = useState<Effectiveness>("effective");
  const [evidence, setEvidence] = useState("");
  const [, setParams] = useSearchParams();
  const current = CAPA_STAGES.findIndex((stage) => stage.id === record.status);
  const blocked = samePerson(actor, record.implementer) ? "You implemented this CAPA, so you cannot judge its effectiveness." : "";
  return (
    <div>
      <div className="lims-panel-head">
        <h2>{record.id}</h2>
        <Link to={`/app/quality?type=deviation&id=${record.sourceId}`}>Source {record.sourceId}</Link>
      </div>
      <p className="quality-title">{record.title}</p>
      <dl className="account-facts">
        <div><dt>Owner</dt><dd>{record.owner}</dd></div>
        <div><dt>Check on</dt><dd>{record.checkOn}</dd></div>
        <div><dt>Implementer</dt><dd>{record.implementer}</dd></div>
      </dl>
      <Flow
        steps={[
          { label: "Plan", detail: record.corrective, state: stageState(0, current) },
          { label: "Implementation", detail: record.implementationEvidence || "Evidence of the actions.", state: stageState(1, current) },
          { label: "Effectiveness", detail: record.effectivenessEvidence || record.failedChecks.at(-1) || `Independent check on or after ${record.checkOn}.`, state: stageState(2, current) },
        ]}
      />
      <p className="quality-copy">{record.preventive}</p>
      {record.failedChecks.length ? (
        <p className="quality-error">Earlier check did not pass: {record.failedChecks.at(-1)}</p>
      ) : null}
      {record.status === "implementation" ? (
        <SignForm meaning="closure" label={result === "effective" ? "Sign effectiveness and close" : "Record ineffective check"} actor={actor} recordId={record.id} disabled={!evidence.trim() || Boolean(blocked)} onSubmit={() => {
          const error = checkEffectiveness(record.id, actor, { result, evidence });
          if (!error && result === "effective") setParams({ type: "capa", id: record.id, stage: "closed" });
          return error;
        }}>
          {blocked ? <p className="quality-error">{blocked}</p> : <p>The effectiveness check has to be someone other than the implementer, on or after {record.checkOn}.</p>}
          <label>
            Result
            <select aria-label="Effectiveness result" value={result} onChange={(event) => setResult(event.target.value as Effectiveness)}>
              <option value="effective">Effective</option>
              <option value="not-effective">Not effective</option>
            </select>
          </label>
          <label>
            Evidence
            <textarea aria-label="Effectiveness evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      <SignatureList signatures={record.signatures} digestFor={(section) => capaSectionDigest(record, section)} />
      <RecordAudit system={system} id={record.id} />
    </div>
  );
}

function ChangeCase({ record, actor, system }: { record: ChangeControl; actor: string; system: QualitySystem }) {
  const document = system.documents.find((item) => item.id === record.documentId);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [, setParams] = useSearchParams();
  const current = CHANGE_STAGES.findIndex((stage) => stage.id === record.status);
  const implementBlock = samePerson(actor, record.proposer) ? "You proposed this change, so you cannot sign its implementation." : "";
  const closeBlock = samePerson(actor, record.implementer)
    ? "You implemented this change, so you cannot close it."
    : samePerson(actor, record.proposer)
      ? "You proposed this change, so you cannot close it."
      : "";
  return (
    <div>
      <div className="lims-panel-head">
        <h2>{record.id}</h2>
        <button type="button" className="btn" onClick={() => setParams({ type: "document", id: record.documentId, stage: document?.status ?? "review" })}>
          {record.documentId}
        </button>
      </div>
      <p className="quality-title">{record.title}</p>
      <dl className="account-facts">
        <div><dt>Proposer</dt><dd>{record.proposer}</dd></div>
        <div><dt>Validation</dt><dd>{record.validation || "Not assessed"}</dd></div>
        <div><dt>Document</dt><dd>{document ? `${document.status}` : "Missing"}</dd></div>
      </dl>
      <p className="quality-copy">{record.description} {record.impact}</p>
      <Flow
        steps={[
          { label: "Proposed", detail: record.proposer, state: stageState(0, current) },
          { label: "Impact", detail: record.validation ? `${record.validation} validation` : "Assessment", state: stageState(1, current) },
          { label: "QA approval", detail: record.signatures.find((signature) => signature.section === "approval")?.signer ?? "Waiting for QA", state: stageState(2, current) },
          { label: "Implementation", detail: record.implementationNote || "After the document is effective.", state: stageState(3, current) },
          { label: "Closed", detail: record.closeReason || "Someone other than the implementer verifies it.", state: stageState(4, current) },
        ]}
      />
      {record.status === "approved" ? (
        <SignForm meaning="authorship" label="Sign implementation" actor={actor} recordId={record.id} disabled={!note.trim() || Boolean(implementBlock) || document?.status !== "effective"} onSubmit={() => {
          const error = implementChange(record.id, actor, note);
          if (!error) setParams({ type: "change", id: record.id, stage: "implemented" });
          return error;
        }}>
          {document?.status !== "effective" ? <p className="quality-error">{record.documentId} has to be effective before this change can be implemented.</p> : null}
          {implementBlock ? <p className="quality-error">{implementBlock}</p> : null}
          <label>
            Implementation note
            <textarea aria-label="Implementation note" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      {record.status === "implemented" ? (
        <SignForm meaning="closure" label="Sign change closure" actor={actor} recordId={record.id} disabled={!reason.trim() || Boolean(closeBlock)} onSubmit={() => {
          const error = closeChange(record.id, actor, reason);
          if (!error) setParams({ type: "change", id: record.id, stage: "closed" });
          return error;
        }}>
          {closeBlock ? <p className="quality-error">{closeBlock}</p> : <p>Closure has to be someone other than the proposer and the implementer.</p>}
          <label>
            Verification
            <textarea aria-label="Change verification" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      <SignatureList signatures={record.signatures} digestFor={(section) => changeSectionDigest(record, section)} />
      <RecordAudit system={system} id={record.id} />
    </div>
  );
}

function DocumentCase({ record, actor, system }: { record: ControlledDocument; actor: string; system: QualitySystem }) {
  const [effectiveOn, setEffectiveOn] = useState("2026-08-01");
  const [training, setTraining] = useState("");
  const [, setParams] = useSearchParams();
  const current = DOCUMENT_STAGES.findIndex((stage) => stage.id === record.status);
  const authorBlock = samePerson(actor, record.author) ? "You authored this document, so you cannot approve it." : "";
  const prior = system.documents.find((item) => item.code === record.code && item.status === "effective" && item.id !== record.id);
  return (
    <div>
      <div className="lims-panel-head">
        <h2>{record.code} v{record.version}</h2>
        <span className="lims-badge info">{record.docType}</span>
      </div>
      <p className="quality-title">{record.title}</p>
      <dl className="account-facts">
        <div><dt>Author</dt><dd>{record.author}</dd></div>
        <div><dt>Effective</dt><dd>{record.effectiveOn || "Not set"}</dd></div>
        <div><dt>Change</dt><dd>{record.changeId || "None"}</dd></div>
      </dl>
      <p className="quality-copy">{record.body}</p>
      <Flow
        steps={[
          { label: "Draft", detail: record.author, state: stageState(0, current) },
          { label: "In review", detail: "Waiting for someone other than the author.", state: stageState(1, current) },
          { label: "Approved", detail: record.training || "Training is part of the approval.", state: stageState(2, current) },
          { label: "Effective", detail: record.effectiveOn || "Issued on the effective date.", state: stageState(3, current) },
        ]}
      />
      {record.status === "obsolete" ? <p className="quality-copy">{record.obsoleteReason}</p> : null}
      {record.status === "review" ? (
        <SignForm meaning="approval" label="Sign approval" actor={actor} recordId={record.id} disabled={!training.trim() || Boolean(authorBlock)} onSubmit={() => {
          const error = approveDocument(record.id, actor, { effectiveOn, training });
          if (!error) setParams({ type: "document", id: record.id, stage: "approved" });
          return error;
        }}>
          {authorBlock ? <p className="quality-error">{authorBlock}</p> : null}
          <label>
            Effective date
            <input aria-label="Effective date" value={effectiveOn} onChange={(event) => setEffectiveOn(event.target.value)} />
          </label>
          <label>
            Training record
            <textarea aria-label="Training record" value={training} onChange={(event) => setTraining(event.target.value)} />
          </label>
        </SignForm>
      ) : null}
      {record.status === "approved" ? (
        <SignForm meaning="approval" label="Issue for use" actor={actor} recordId={record.id} statement="Your PIN confirms you are issuing this approved version. The approval signature stays bound to the record." onSubmit={() => {
          const error = issueDocument(record.id, actor);
          if (!error) setParams({ type: "document", id: record.id, stage: "effective" });
          return error;
        }}>
          <p>
            Issuing confirms the approval signature still matches this version.
            {prior ? ` ${prior.id} will be obsoleted and kept.` : ""}
          </p>
        </SignForm>
      ) : null}
      <SignatureList signatures={record.signatures} digestFor={(section) => documentSectionDigest(record, section)} />
      <RecordAudit system={system} id={record.id} />
    </div>
  );
}

function samePerson(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function QualityPage() {
  const system = useQuality();
  const actor = qualityActor();
  const pin = useReviewerPin();
  const [params, setParams] = useSearchParams();
  const typeParam = params.get("type");
  const type: QualityType = isType(typeParam) ? typeParam : "deviation";
  const idParam = params.get("id");
  const requested = idParam === null ? defaultId(type) : idParam;
  const stageParam = params.get("stage");
  const openDeviations = system.deviations.filter((record) => record.status !== "closed").length;
  const openCapa = system.capas.filter((record) => record.status !== "closed").length;
  const pendingDocs = system.documents.filter((record) => record.status === "review" || record.status === "approved").length;
  const overdue = system.capas.filter((record) => record.status === "implementation").length;

  function openType(next: QualityType) {
    if (next === "audit") {
      setParams({ type: next });
      return;
    }
    setParams({ type: next, id: defaultId(next) });
  }

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">This is a quality and Compliance module</p>
          <h1>Sequence Compliance</h1>
          <p className="lims-page-lede">
            Deviations, CAPA, change control, and documents move through signed steps. The audit trail keeps every signature and every rejected attempt.
          </p>
        </div>
      </div>
      {pin !== "active" ? (
        <p className="quality-error quality-pin">Electronic signatures need a reviewer PIN. Open Settings and set one. A PIN lasts 90 days.</p>
      ) : null}
      <div className="lims-kpi-row">
        <div className="lims-kpi">
          <span>Open events</span>
          <strong>{openDeviations}</strong>
          <small>Deviations and nonconformances</small>
        </div>
        <div className={`lims-kpi${overdue ? " accent" : ""}`}>
          <span>Open CAPA</span>
          <strong>{openCapa}</strong>
          <small>Effectiveness still open</small>
        </div>
        <div className="lims-kpi">
          <span>Documents</span>
          <strong>{pendingDocs}</strong>
          <small>In review or approved</small>
        </div>
        <div className="lims-kpi">
          <span>Signing as</span>
          <strong className="quality-actor">{actor}</strong>
          <small>Signatures use this name</small>
        </div>
      </div>
      <div className="quality-types" role="tablist" aria-label="Compliance workflows">
        {TYPES.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={item.id === type} className={`btn${item.id === type ? " is-on" : ""}`} onClick={() => openType(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {type === "audit" ? <AuditTable system={system} onOpen={(id) => {
        const kind = recordKind(system, id);
        if (kind) setParams({ type: kind, id });
      }} /> : null}
      {type === "deviation" ? (
        <Workflow
          stages={DEVIATION_STAGES}
          records={system.deviations}
          selectedId={requested}
          stageId={stageParam}
          onSelect={(id, stage) => setParams({ type, id, stage })}
          extra={<button type="button" className="btn" onClick={() => setParams({ type, id: "new", stage: "reported" })}>Report deviation</button>}
          case={requested === "new" ? <ReportCase actor={actor} /> : renderDeviation(system, requested, actor)}
        />
      ) : null}
      {type === "capa" ? (
        <Workflow
          stages={CAPA_STAGES}
          records={system.capas}
          selectedId={requested}
          stageId={stageParam}
          onSelect={(id, stage) => setParams({ type, id, stage })}
          case={renderCapa(system, requested, actor)}
        />
      ) : null}
      {type === "change" ? (
        <Workflow
          stages={CHANGE_STAGES}
          records={system.changes}
          selectedId={requested}
          stageId={stageParam}
          onSelect={(id, stage) => setParams({ type, id, stage })}
          case={renderChange(system, requested, actor)}
        />
      ) : null}
      {type === "document" ? (
        <Workflow
          stages={DOCUMENT_STAGES}
          records={system.documents}
          selectedId={requested}
          stageId={stageParam}
          onSelect={(id, stage) => setParams({ type, id, stage })}
          case={renderDocument(system, requested, actor)}
        />
      ) : null}
    </div>
  );
}

function renderDeviation(system: QualitySystem, id: string, actor: string) {
  const record = system.deviations.find((item) => item.id === id);
  return record ? <DeviationCase key={record.id} record={record} actor={actor} system={system} /> : <p className="quality-copy">Select a quality event.</p>;
}

function renderCapa(system: QualitySystem, id: string, actor: string) {
  const record = system.capas.find((item) => item.id === id);
  return record ? <CapaCase key={record.id} record={record} actor={actor} system={system} /> : <p className="quality-copy">Select a CAPA.</p>;
}

function renderChange(system: QualitySystem, id: string, actor: string) {
  const record = system.changes.find((item) => item.id === id);
  return record ? <ChangeCase key={record.id} record={record} actor={actor} system={system} /> : <p className="quality-copy">Select a change.</p>;
}

function renderDocument(system: QualitySystem, id: string, actor: string) {
  const record = system.documents.find((item) => item.id === id);
  return record ? <DocumentCase key={record.id} record={record} actor={actor} system={system} /> : <p className="quality-copy">Select a document.</p>;
}

function Workflow<T extends { id: string; title: string; status: string }>({
  stages,
  records,
  selectedId,
  stageId,
  onSelect,
  case: caseNode,
  extra,
}: {
  stages: { id: string; label: string }[];
  records: T[];
  selectedId: string;
  stageId?: string | null;
  onSelect: (id: string, stage: string) => void;
  case: ReactNode;
  extra?: ReactNode;
}) {
  const selected = records.find((record) => record.id === selectedId);
  const stage = stages.some((item) => item.id === stageId) ? stageId! : selected?.status ?? stages[0]?.id ?? "";
  const rows = records.filter((record) => record.status === stage);
  return (
    <div>
      <div className="quality-stages" role="tablist" aria-label="Workflow stage">
        {stages.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === stage}
            className={`btn${item.id === stage ? " is-on" : ""}`}
            onClick={() => {
              const first = records.find((record) => record.status === item.id);
              onSelect(first?.id ?? "", item.id);
            }}
          >
            {item.label} ({records.filter((record) => record.status === item.id).length})
          </button>
        ))}
        {extra}
      </div>
      <div className="quality-workbench">
        <section className="lims-panel">
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((record) => (
                  <tr key={record.id} className={record.id === selectedId ? "is-selected" : undefined} onClick={() => onSelect(record.id, record.status)}>
                    <td className="lims-mono">{record.id}</td>
                    <td>{record.title}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr><td colSpan={2}>No records in this stage.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        <section className="lims-panel quality-case">{caseNode}</section>
      </div>
    </div>
  );
}

function AuditTable({ system, onOpen }: { system: QualitySystem; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const rows = [...system.audit].reverse().filter((event) => {
    const haystack = `${event.recordId} ${event.actor} ${event.action} ${event.reason}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  return (
    <section className="lims-panel">
      <div className="lims-panel-head">
        <h2>Audit trail</h2>
        <input aria-label="Search audit trail" value={query} placeholder="Search records, people, actions" onChange={(event) => setQuery(event.target.value)} />
      </div>
      <p className="quality-copy">This trail is append-only. Sequence Compliance does not delete quality records or audit events.</p>
      <div className="lims-table-wrap">
        <table className="lims-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Record</th>
              <th>Action</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id}>
                <td>{event.at}</td>
                <td>{event.actor}</td>
                <td>
                  <button type="button" className="lims-linkish" onClick={() => onOpen(event.recordId)}>{event.recordId}</button>
                </td>
                <td>{event.action}</td>
                <td>{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
