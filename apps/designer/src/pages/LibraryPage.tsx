import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LabOperationsEditor } from "../components/LabOperationsEditor";
import { workflowService } from "../platform";

const SYSTEM_WORKFLOWS = [
  {
    id: "sample-intake",
    module: "Sequence Operations",
    name: "Sample Intake & Accessioning",
    description: "Receive electronic orders, document condition, assign accessions, and route samples.",
    stages: ["Order received", "Receipt details", "Accession assigned", "Route to testing"],
    screens: ["Electronic order queue", "Receipt form", "Sample details"],
  },
  {
    id: "instrument-testing",
    module: "Sequence Instruments",
    name: "Instrument Run & Testing",
    description: "Configure samples, method, instrument, solutions, controls, and monitor the current run.",
    stages: ["Select samples", "Configure instrument", "Method & solutions", "Run sequence"],
    screens: ["Start Testing", "Instrument control", "Run sequence"],
  },
  {
    id: "results-release",
    module: "Sequence Operations",
    name: "Results Review & Release",
    description: "Complete testing, review individual or batch results, authorize, and release.",
    stages: ["Test complete", "Peer review", "QA approval", "Release"],
    screens: ["Review queue", "Result review", "Release queue"],
  },
  {
    id: "quality-capa",
    module: "Sequence Compliance",
    name: "Deviation & CAPA",
    description: "Report deviations, contain impact, investigate root cause, implement CAPA, and verify effectiveness.",
    stages: ["Report", "Containment", "Investigation", "CAPA", "QA close"],
    screens: ["Deviation report", "Investigation", "Effectiveness check"],
  },
  {
    id: "instrument-qualification",
    module: "Sequence Instruments",
    name: "Instrument Qualification & Calibration",
    description: "Add instruments, qualify interfaces, schedule calibration, and retain maintenance evidence.",
    stages: ["Identity", "Interface", "Qualification", "Calibration", "In service"],
    screens: ["Instrument identity", "Qualification record", "Calibration evidence"],
  },
  {
    id: "revenue-cycle",
    module: "Sequence Revenue",
    name: "Laboratory Revenue Cycle",
    description: "Create charges from completed testing, resolve exceptions, and route approved billing.",
    stages: ["Charge capture", "Coding", "Exception review", "Approval", "Invoice"],
    screens: ["Charge review", "Exception worklist", "Invoice preview"],
  },
] as const;

export function LibraryPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const workflows = useMemo(() => {
    void tick;
    return workflowService.list();
  }, [tick]);

  const templates = workflows.filter((w) => w.isTemplate);
  const definitions = workflows.filter((w) => !w.isTemplate);

  const createNew = () => {
    const wf = workflowService.create({
      name: "Untitled Workflow",
      description: "Custom laboratory workflow",
    });
    navigate(`/app/workflows/${wf.id}`);
  };

  const useTemplate = (id: string, name: string) => {
    const instance = workflowService.createFromTemplate(id, `${name}`);
    if (instance) navigate(`/app/workflows/${instance.id}`);
  };
  const preview = SYSTEM_WORKFLOWS.find((workflow) => workflow.id === previewId);

  const openSystemWorkflow = (name: string, description: string) => {
    const existing = workflows.find((workflow) => !workflow.isTemplate && workflow.name === name);
    const workflow = existing ?? workflowService.create({ name, description });
    navigate(`/app/workflows/${workflow.id}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="lims-eyebrow">Automation</p>
          <h1>Laboratory workflows</h1>
          <p>
            Configure no-code automations for sample receive, testing, review, CAPA,
            calibration, and CoA release across the LIMS.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={createNew}>
          New workflow
        </button>
      </div>

      <section className="system-workflow-section">
        <div className="workflow-section-heading">
          <div>
            <p className="lims-eyebrow">Already operating</p>
            <h2>System workflows</h2>
            <p>Start with the workflows already represented across installed Sequence modules.</p>
          </div>
          <span className="lims-count">{SYSTEM_WORKFLOWS.length} workflows</span>
        </div>
        <div className="system-workflow-grid">
          {SYSTEM_WORKFLOWS.map((workflow) => (
            <article className="system-workflow-card" key={workflow.id}>
              <div className="system-workflow-card-head">
                <span>{workflow.module}</span>
                <b>{workflow.stages.length} stages</b>
              </div>
              <h3>{workflow.name}</h3>
              <p>{workflow.description}</p>
              <ol>
                {workflow.stages.slice(0, 4).map((stage, index) => <li key={stage}><span>{index + 1}</span>{stage}</li>)}
              </ol>
              <div className="wf-card-actions">
                <button type="button" className="btn btn-primary" onClick={() => openSystemWorkflow(workflow.name, workflow.description)}>Design workflow</button>
                <button type="button" className="btn" onClick={() => setPreviewId(workflow.id)}>Preview screens</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>
        Your workflows
      </h2>
      {definitions.length === 0 ? (
        <div className="empty-state">
          <h2>No workflows yet</h2>
          <p>Start from a template or create a blank canvas.</p>
        </div>
      ) : (
        <div className="grid-cards" style={{ marginBottom: "2rem" }}>
          {definitions.map((wf, i) => (
            <article key={wf.id} className="wf-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="wf-card-meta">
                <span className={`badge badge-${wf.status}`}>{wf.status}</span>
                <span className="badge">v{wf.version}</span>
                <span className="badge">{wf.nodes.length} nodes</span>
              </div>
              <h3>{wf.name}</h3>
              <p>{wf.description || "No description"}</p>
              <div className="wf-card-actions">
                <Link className="btn btn-primary" to={`/app/workflows/${wf.id}`}>
                  Open designer
                </Link>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    workflowService.clone(wf.id);
                    setTick((t) => t + 1);
                  }}
                >
                  Clone
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>
        Templates
      </h2>
      <div className="grid-cards">
        {templates.map((wf, i) => (
          <article key={wf.id} className="wf-card" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="wf-card-meta">
              <span className="badge badge-template">template</span>
              <span className="badge">{wf.nodes.length} nodes</span>
            </div>
            <h3>{wf.name}</h3>
            <p>{wf.description}</p>
            <div className="tag-row">
              {wf.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            <div className="wf-card-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => useTemplate(wf.id, wf.name)}
              >
                Use template
              </button>
              <Link className="btn" to={`/app/workflows/${wf.id}`}>
                Preview
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="workflow-operations-config">
        <div className="workflow-section-heading">
          <div>
            <p className="lims-eyebrow">Operations configuration</p>
            <h2>Workflow UI settings</h2>
          </div>
        </div>
        <LabOperationsEditor />
      </section>

      {preview ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setPreviewId(null)}>
          <div className="lims-modal lims-modal-wide workflow-module-preview" role="dialog" aria-modal="true" aria-labelledby="workflow-preview-title" onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar">
              <div>
                <p className="lims-eyebrow">{preview.module}</p>
                <h2 id="workflow-preview-title">{preview.name}</h2>
              </div>
              <button type="button" className="btn" onClick={() => setPreviewId(null)}>Close</button>
            </div>
            <div className="workflow-preview-layout">
              <aside>
                <b>Workflow stages</b>
                <ol>{preview.stages.map((stage, index) => <li className={index === 0 ? "is-active" : undefined} key={stage}><span>{index + 1}</span>{stage}</li>)}</ol>
              </aside>
              <section className="workflow-screen-preview">
                <div className="workflow-screen-browser">
                  <span /><span /><span />
                  <b>{preview.screens[0]}</b>
                </div>
                <p className="lims-eyebrow">Screen preview</p>
                <h3>{preview.stages[0]}</h3>
                <p>{preview.description}</p>
                <div className="workflow-preview-fields">
                  <label>Assigned role<input value="Laboratory analyst" readOnly /></label>
                  <label>Workflow status<input value={preview.stages[0]} readOnly /></label>
                  <label className="is-wide">Instructions<textarea value={`Complete ${preview.stages[0].toLowerCase()} and continue to ${preview.stages[1]?.toLowerCase() ?? "the next step"}.`} readOnly /></label>
                </div>
                <div className="lims-modal-actions"><button type="button" className="btn">Save draft</button><button type="button" className="btn btn-primary">Continue</button></div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
