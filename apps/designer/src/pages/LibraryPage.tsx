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
    stages: ["Electronic order selected", "Receipt condition verified", "Accession assigned", "Location recorded", "Route to testing"],
    screens: ["Electronic order queue", "Receipt details", "Accession confirmation", "Sample details", "Testing route"],
  },
  {
    id: "instrument-testing",
    module: "Sequence Instruments",
    name: "Instrument Run & Testing",
    description: "Configure samples, method, instrument, solutions, controls, and monitor the current run.",
    stages: ["Select samples", "Configure instrument", "Method & solutions", "Review setup", "Run sequence"],
    screens: ["Select samples", "Instrument setup", "Method & solutions", "Review run", "Live run sequence"],
  },
  {
    id: "results-release",
    module: "Sequence Operations",
    name: "Results Review & Release",
    description: "Complete testing, review individual or batch results, authorize, and release.",
    stages: ["Testing complete", "Individual or batch review", "Result authorization", "QA approval", "Release"],
    screens: ["In Review queue", "Result review", "Batch review", "Authorization", "Ready for Release"],
  },
  {
    id: "quality-capa",
    module: "Sequence Compliance",
    name: "Deviation & CAPA",
    description: "Report deviations, contain impact, investigate root cause, implement CAPA, and verify effectiveness.",
    stages: ["Report", "Containment", "Investigation", "CAPA", "QA close"],
    screens: ["Deviation report", "Containment", "Investigation", "CAPA plan", "Effectiveness check"],
  },
  {
    id: "instrument-qualification",
    module: "Sequence Instruments",
    name: "Instrument Qualification & Calibration",
    description: "Add instruments, qualify interfaces, schedule calibration, and retain maintenance evidence.",
    stages: ["Identity", "Interface", "Qualification", "Calibration", "In service"],
    screens: ["Instrument identity", "Interface setup", "Qualification record", "Calibration evidence", "Instrument record"],
  },
  {
    id: "revenue-cycle",
    module: "Sequence Revenue",
    name: "Laboratory Revenue Cycle",
    description: "Create charges from completed testing, resolve exceptions, and route approved billing.",
    stages: ["Charge capture", "Coding", "Exception review", "Approval", "Invoice"],
    screens: ["Charge review", "Coding", "Exception worklist", "Approval", "Invoice preview"],
  },
  {
    id: "client-environment",
    module: "Sequence Client",
    name: "Client & Lab Environment Setup",
    description: "Create a client, configure laboratories and environments, assign modules, and promote an installation.",
    stages: ["Create client", "Add laboratory", "Configure environment", "Assign modules", "Promote"],
    screens: ["Client details", "Laboratory setup", "Environment configuration", "Module assignment", "Promotion review"],
  },
  {
    id: "insight-escalation",
    module: "Sequence Insights",
    name: "Operational Insight Escalation",
    description: "Detect an operational signal, assemble supporting records, assign an owner, and track resolution.",
    stages: ["Signal detected", "Evidence assembled", "Owner assigned", "Action tracked", "Resolved"],
    screens: ["Insight alert", "Evidence review", "Assignment", "Action plan", "Resolution"],
  },
] as const;

export function LibraryPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewScreenIndex, setPreviewScreenIndex] = useState(0);
  const [previewNotice, setPreviewNotice] = useState("");
  const [templatePrompt, setTemplatePrompt] = useState<{ id: string; name: string } | null>(null);
  const [templateBranch, setTemplateBranch] = useState<"new" | "current" | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState("");
  const [connectNodeId, setConnectNodeId] = useState("");
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

  const preview = SYSTEM_WORKFLOWS.find((workflow) => workflow.id === previewId);
  const previewScreen = preview?.screens[previewScreenIndex] ?? preview?.screens[0];
  const selectedCurrentWorkflow = definitions.find((workflow) => workflow.id === currentWorkflowId);

  const openSystemWorkflow = (systemWorkflow: (typeof SYSTEM_WORKFLOWS)[number]) => {
    const existing = workflows.find((workflow) => !workflow.isTemplate && workflow.name === systemWorkflow.name);
    const created = existing ?? workflowService.create({ name: systemWorkflow.name, description: systemWorkflow.description });
    const stageNodes = systemWorkflow.stages.map((stage, index) => ({
      id: crypto.randomUUID(),
      type: /review/i.test(stage) ? "review" : /approval|authorization|promote/i.test(stage) ? "approval" : "task",
      label: stage,
      description: `${stage} in the ${systemWorkflow.name} workflow`,
      position: { x: 300 + index * 230, y: 220 },
      config: /review/i.test(stage) ? { reviewerRole: "reviewer" } : { instructions: stage, autoComplete: false },
    }));
    const start = { id: crypto.randomUUID(), type: "start", label: "Start", position: { x: 60, y: 220 }, config: {} };
    const end = { id: crypto.randomUUID(), type: "end", label: "Complete", position: { x: 300 + stageNodes.length * 230, y: 220 }, config: { outcome: "success" } };
    const nodes = [start, ...stageNodes, end];
    const updated = workflowService.updateDraft(created.id, {
      name: systemWorkflow.name,
      description: systemWorkflow.description,
      nodes,
      edges: nodes.slice(0, -1).map((node, index) => ({ id: crypto.randomUUID(), source: node.id, target: nodes[index + 1]!.id })),
      tags: [systemWorkflow.module, "system-workflow"],
    }) ?? created;
    const screens = systemWorkflow.screens.map((screen, index) => ({
      id: `${systemWorkflow.id}-${index}`,
      name: screen,
      title: systemWorkflow.stages[index] ?? screen,
      description: `${screen} for ${systemWorkflow.description.charAt(0).toLowerCase()}${systemWorkflow.description.slice(1)}`,
      fields: screen.includes("Review") ? "Assigned reviewer\nReview notes\nDecision" : screen.includes("Instrument") ? "Instrument\nMethod\nOperating parameters" : "Owner\nStatus\nNotes",
      primaryAction: index === systemWorkflow.screens.length - 1 ? "Complete" : "Continue",
    }));
    localStorage.setItem(`carescope.workflowScreens.${updated.id}`, JSON.stringify(screens));
    navigate(`/app/workflows/${updated.id}`);
  };

  const openPreview = (id: string) => {
    setPreviewId(id);
    setPreviewScreenIndex(0);
    setPreviewNotice("");
  };

  const closeTemplatePrompt = () => {
    setTemplatePrompt(null);
    setTemplateBranch(null);
    setCurrentWorkflowId("");
    setConnectNodeId("");
  };

  const createFromSelectedTemplate = () => {
    if (!templatePrompt) return;
    const instance = workflowService.createFromTemplate(templatePrompt.id, templatePrompt.name);
    if (instance) navigate(`/app/workflows/${instance.id}`);
  };

  const addTemplateToCurrent = () => {
    if (!templatePrompt || !currentWorkflowId || !connectNodeId) return;
    const updated = workflowService.addTemplateBranch(currentWorkflowId, templatePrompt.id, connectNodeId);
    if (updated) navigate(`/app/workflows/${updated.id}`);
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
        <div className="system-workflow-modules">
          {[...new Set(SYSTEM_WORKFLOWS.map((workflow) => workflow.module))].map((module) => (
            <section className="system-workflow-module" key={module}>
              <div className="system-workflow-module-head">
                <h3>{module}</h3>
                <span>{SYSTEM_WORKFLOWS.filter((workflow) => workflow.module === module).length} workflow{SYSTEM_WORKFLOWS.filter((workflow) => workflow.module === module).length === 1 ? "" : "s"}</span>
              </div>
              <div className="system-workflow-grid">
                {SYSTEM_WORKFLOWS.filter((workflow) => workflow.module === module).map((workflow) => (
                  <article className="system-workflow-card" key={workflow.id}>
                    <div className="system-workflow-card-head"><span>Built in application</span><b>{workflow.stages.length} stages</b></div>
                    <h3>{workflow.name}</h3>
                    <p>{workflow.description}</p>
                    <ol>
                      {workflow.stages.map((stage, index) => <li key={stage}><span>{index + 1}</span>{stage}</li>)}
                    </ol>
                    <div className="wf-card-actions">
                      <button type="button" className="btn btn-primary" onClick={() => openSystemWorkflow(workflow)}>View workflows</button>
                      <button type="button" className="btn" onClick={() => openPreview(workflow.id)}>Preview screens</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
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
                onClick={() => {
                  setTemplatePrompt({ id: wf.id, name: wf.name });
                  setTemplateBranch(null);
                  setCurrentWorkflowId("");
                  setConnectNodeId("");
                }}
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
                <ol>{preview.stages.map((stage, index) => <li className={index === previewScreenIndex ? "is-active" : undefined} key={stage}><span>{index + 1}</span>{stage}</li>)}</ol>
                <b className="workflow-preview-screen-label">Screens</b>
                <div className="workflow-preview-screen-list">
                  {preview.screens.map((screen, index) => (
                    <button type="button" className={index === previewScreenIndex ? "is-active" : undefined} key={screen} onClick={() => { setPreviewScreenIndex(index); setPreviewNotice(""); }}>
                      <span>{index + 1}</span>{screen}
                    </button>
                  ))}
                </div>
              </aside>
              <section className="workflow-screen-preview">
                <div className="workflow-screen-browser">
                  <span /><span /><span />
                  <b>{previewScreen}</b>
                </div>
                <p className="lims-eyebrow">Screen preview</p>
                <h3>{preview.stages[previewScreenIndex] ?? previewScreen}</h3>
                <p>{preview.description}</p>
                <div className="workflow-preview-fields" key={previewScreen}>
                  <label>Assigned role<input defaultValue={previewScreen?.includes("Review") ? "Laboratory reviewer" : "Laboratory analyst"} /></label>
                  <label>Workflow status<input defaultValue={preview.stages[previewScreenIndex] ?? previewScreen} /></label>
                  <label className="is-wide">Instructions<textarea defaultValue={`Complete ${(preview.stages[previewScreenIndex] ?? previewScreen ?? "").toLowerCase()} and continue to ${(preview.stages[previewScreenIndex + 1] ?? "the next step").toLowerCase()}.`} /></label>
                </div>
                {previewNotice ? <p className="workflow-preview-notice" role="status">{previewNotice}</p> : null}
                <div className="lims-modal-actions">
                  <button type="button" className="btn" disabled={previewScreenIndex === 0} onClick={() => setPreviewScreenIndex((index) => Math.max(0, index - 1))}>Back</button>
                  <button type="button" className="btn" onClick={() => setPreviewNotice(`${previewScreen} draft saved`)}>Save draft</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (previewScreenIndex < preview.screens.length - 1) {
                        setPreviewScreenIndex((index) => index + 1);
                        setPreviewNotice("");
                      } else {
                        setPreviewNotice("Preview complete");
                      }
                    }}
                  >
                    {previewScreenIndex === preview.screens.length - 1 ? "Complete preview" : "Continue"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {templatePrompt ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={closeTemplatePrompt}>
          <div className="lims-modal lims-modal-wide template-path-dialog" role="dialog" aria-modal="true" aria-labelledby="template-path-title" onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar"><h2 id="template-path-title">Use {templatePrompt.name}</h2><button type="button" className="btn" onClick={closeTemplatePrompt}>Close</button></div>
            <div className="template-path-body">
              <p>Choose how this template should enter your workflow library.</p>
              <div className="template-path-options">
                <button type="button" className={templateBranch === "new" ? "is-selected" : undefined} onClick={() => { setTemplateBranch("new"); setCurrentWorkflowId(""); setConnectNodeId(""); }}>
                  <span>01</span><div><b>New Workflow</b><small>Build a brand-new editable workflow from this template.</small></div>
                </button>
                <button type="button" className={templateBranch === "current" ? "is-selected" : undefined} onClick={() => setTemplateBranch("current")}>
                  <span>02</span><div><b>Add to Current workflow</b><small>Add the template as a branch on an existing workflow.</small></div>
                </button>
              </div>
              {templateBranch === "new" ? (
                <section className="template-branch-panel">
                  <p className="lims-eyebrow">New workflow branch</p>
                  <h3>Create from {templatePrompt.name}</h3>
                  <p>A new draft will include every node, condition, and screen from the template.</p>
                  <button type="button" className="btn btn-primary" onClick={createFromSelectedTemplate}>Create New Workflow</button>
                </section>
              ) : null}
              {templateBranch === "current" ? (
                <section className="template-branch-panel">
                  <p className="lims-eyebrow">Current workflow branch</p>
                  <h3>Select the workflow and connection branch</h3>
                  <div className="template-branch-fields">
                    <label>Current workflow<select value={currentWorkflowId} onChange={(event) => { setCurrentWorkflowId(event.target.value); setConnectNodeId(""); }}><option value="">Select workflow</option>{definitions.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name} · v{workflow.version}</option>)}</select></label>
                    <label>Connect template after<select value={connectNodeId} disabled={!selectedCurrentWorkflow} onChange={(event) => setConnectNodeId(event.target.value)}><option value="">Select branch</option>{selectedCurrentWorkflow?.nodes.filter((node) => node.type !== "end").map((node) => <option key={node.id} value={node.id}>{node.label} · {node.type}</option>)}</select></label>
                  </div>
                  <p className="template-branch-hint">{connectNodeId ? "Branch selected. The template can now be added and edited in the designer." : "Select a branch connection before opening the designer."}</p>
                  <button type="button" className="btn btn-primary" disabled={!currentWorkflowId || !connectNodeId} onClick={addTemplateToCurrent}>Add to Current workflow</button>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
