import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { readLimsSession } from "../../limsSession";
import { nodeType } from "../../connectAutomation/registry";
import { useAutomation } from "../../connectAutomation/runtime";
import { blankDraft } from "../../connectAutomation/store";
import type { Execution, WorkflowDefinition, WorkflowStatus } from "../../connectAutomation/types";
import { ModuleHeader } from "../ModuleHeader";
import { useConnect } from "./connectStore";

const TABS = [
  { to: "/app/connect/workflows", label: "Workflows", key: "workflows" },
  { to: "/app/connect/workflows/history", label: "History", key: "history" },
  { to: "/app/connect/workflows/exceptions", label: "Exceptions", key: "exceptions" },
] as const;

const CATEGORIES = ["Integration", "Results", "Orders", "Files", "Alerts"];

function WorkflowTabs({ current }: { current: string }) {
  return (
    <nav className="subtab01 connect-interface-tabs" role="tablist" aria-label="Workflow pages">
      {TABS.map((tab) => (
        <Link key={tab.key} to={tab.to} role="tab" aria-selected={tab.key === current} className={tab.key === current ? "is-on" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function when(value: string): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} CT`;
}

function triggerLabel(workflow: WorkflowDefinition): string {
  const trigger = workflow.nodes.find((node) => nodeType(node.type)?.category === "trigger");
  return trigger ? nodeType(trigger.type)?.label || trigger.type : "No trigger";
}

function liveRuns(executions: Execution[], lineageId: string): Execution[] {
  return executions.filter((item) => item.lineageId === lineageId && item.mode === "live");
}

export function WorkflowListPage() {
  const { store, engine } = useAutomation();
  const connections = useConnect();
  const connectionIds = connections.interfaces.map((item) => item.id);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<WorkflowStatus | "all">("all");
  const [category, setCategory] = useState("all");
  const [notice, setNotice] = useState("");
  const [confirmRetry, setConfirmRetry] = useState("");
  const workflows = store.list();
  const executions = store.executions();
  const rows = useMemo(() => workflows.filter((workflow) => {
    const haystack = `${workflow.name} ${workflow.description} ${workflow.tags.join(" ")} ${workflow.owner}`.toLowerCase();
    if (query && !haystack.includes(query.trim().toLowerCase())) return false;
    if (status !== "all" && workflow.status !== status) return false;
    if (category !== "all" && workflow.category !== category) return false;
    return true;
  }), [workflows, query, status, category]);

  function changeStatus(workflow: WorkflowDefinition, next: WorkflowStatus) {
    const result = store.setStatus(workflow.id, next, connectionIds);
    const blocking = result.issues.filter((issue) => issue.severity === "error");
    setNotice(blocking.length ? blocking.map((issue) => issue.message).join(" ") : `${workflow.name} is ${result.workflow?.status || next}.`);
  }

  function retry(workflow: WorkflowDefinition, acknowledged: boolean) {
    const failed = executions.find((item) => item.lineageId === workflow.id && item.status === "failed");
    if (!failed) {
      setNotice(`${workflow.name} has no failed run.`);
      return;
    }
    const result = engine.retry(failed.id, acknowledged);
    if ("error" in result && !("id" in result)) {
      setConfirmRetry(failed.id);
      setNotice(result.error);
      return;
    }
    setConfirmRetry("");
    setNotice(`Retried ${workflow.name}. The run is ${"status" in result ? result.status : "updated"}.`);
  }

  return (
    <div className="module-page connect-page">
      <ModuleHeader
        name="workflows"
        title="Workflows"
        subtitle="Automations for the connections in this lab instance. Counts come from saved runs."
        sheet={<WorkflowTabs current="workflows" />}
        action={<Link className="btn btn-primary" to="/app/connect/workflows/new">New workflow</Link>}
      />
      <p className="connect-workflow-note">Schedules run only while this app is open. HTTP nodes are checked here and are not sent. Webhook addresses are not public.</p>
      {notice ? <p className="form-error" role="status">{notice}</p> : null}
      <section className="lims-panel">
        <div className="connect-workflow-filters">
          <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, owner, or tag" /></label>
          <label>Status
            <select value={status} onChange={(event) => setStatus(event.target.value as WorkflowStatus | "all")}>
              <option value="all">All</option>
              {(["draft", "validated", "active", "paused", "archived"] as const).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All</option>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        {rows.length === 0 ? <p>No workflows match. Create one to start from a draft.</p> : (
          <table className="lims-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Live runs</th>
                <th>Failed</th>
                <th>Last live run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((workflow) => {
                const runs = liveRuns(executions, workflow.id);
                const failedRun = runs.find((item) => item.status === "failed");
                const failed = runs.filter((item) => item.status === "failed").length;
                const last = runs[0];
                return (
                  <tr key={workflow.id}>
                    <td>
                      <strong>{workflow.name || "Untitled"}</strong>
                      <div>{workflow.category} · {workflow.owner}{workflow.dirty ? " · unpublished edits" : ""}</div>
                    </td>
                    <td>{workflow.status}{workflow.publishedVersion ? ` · v${workflow.publishedVersion}` : ""}</td>
                    <td>{triggerLabel(workflow)}</td>
                    <td>{runs.length}</td>
                    <td>{failed}</td>
                    <td>{last ? `${last.status} · ${when(last.startedAt)}` : "Never"}</td>
                    <td className="connect-workflow-actions">
                      <Link to={`/app/connect/workflows/${workflow.id}`}>Edit</Link>
                      <button type="button" onClick={() => { const copy = store.duplicate(workflow.id); setNotice(copy ? `Duplicated as ${copy.name}.` : "Could not duplicate."); }}>Duplicate</button>
                      <Link to={`/app/connect/workflows/${workflow.id}#test`}>Test</Link>
                      <button type="button" onClick={() => changeStatus(workflow, "active")}>Activate</button>
                      <button type="button" onClick={() => changeStatus(workflow, "paused")} disabled={workflow.status !== "active"}>Pause</button>
                      <Link to={`/app/connect/workflows/history?workflow=${workflow.id}`}>History</Link>
                      <button type="button" onClick={() => retry(workflow, confirmRetry === failedRun?.id)}>{confirmRetry === failedRun?.id ? "Confirm retry" : "Retry failed"}</button>
                      <button type="button" onClick={() => changeStatus(workflow, "archived")}>Archive</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function WorkflowCreatePage() {
  const { store } = useAutomation();
  const connections = useConnect();
  const navigate = useNavigate();
  const ownerDefault = readLimsSession()?.displayName || readLimsSession()?.username || "lab user";
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [connectionId, setConnectionId] = useState("");
  const [owner, setOwner] = useState(ownerDefault);
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");

  function save() {
    if (!name.trim()) {
      setError("Name is required.");
      setStep(1);
      return;
    }
    const draft = blankDraft(owner.trim() || ownerDefault);
    const created = store.create({
      ...draft,
      name: name.trim(),
      description: description.trim(),
      category,
      connectionId,
      owner: owner.trim() || ownerDefault,
      tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
    });
    navigate(`/app/connect/workflows/${created.id}`);
  }

  return (
    <div className="module-page connect-page">
      <ModuleHeader name="workflows" title="New workflow" subtitle={step === 1 ? "Name the workflow and who owns it." : "Review the draft, then open the designer."} sheet={<WorkflowTabs current="workflows" />} />
      <section className="lims-panel connect-workflow-form">
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {step === 1 ? (
          <>
            <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
            <label>Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Connection
              <select value={connectionId} onChange={(event) => setConnectionId(event.target.value)}>
                <option value="">None yet</option>
                {connections.interfaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Owner<input value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
            <label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="results, cbc" /></label>
            <button type="button" className="btn btn-primary" onClick={() => (name.trim() ? setStep(2) : setError("Name is required."))}>Continue</button>
          </>
        ) : (
          <>
            <p><strong>{name}</strong> · {category} · {owner}</p>
            <p>{description || "No description."}</p>
            <p>Tags: {tags || "none"} · Connection: {connections.interfaces.find((item) => item.id === connectionId)?.name || "none"}</p>
            <div className="connect-workflow-actions">
              <button type="button" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={save}>Save draft and open designer</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function WorkflowHistoryPage() {
  const { store, engine } = useAutomation();
  const [params] = useSearchParams();
  const [workflowId, setWorkflowId] = useState(params.get("workflow") || "all");
  useEffect(() => {
    const next = params.get("workflow");
    if (next) setWorkflowId(next);
  }, [params]);
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const [notice, setNotice] = useState("");
  const [ack, setAck] = useState("");
  const workflows = store.list();
  const rows = store.executions().filter((item) => {
    if (workflowId !== "all" && item.lineageId !== workflowId) return false;
    if (status !== "all" && item.status !== status) return false;
    if (mode !== "all" && item.mode !== mode) return false;
    return true;
  });

  function retry(execution: Execution) {
    const result = engine.retry(execution.id, ack === execution.id);
    if ("error" in result && !("id" in result)) {
      setAck(execution.id);
      setNotice(result.error);
      return;
    }
    setNotice(`Run ${execution.id.slice(0, 8)} is ${"status" in result ? result.status : "updated"}.`);
  }

  return (
    <div className="module-page connect-page">
      <ModuleHeader name="workflows" title="Execution history" subtitle="Each row is a saved run for this lab instance." sheet={<WorkflowTabs current="history" />} />
      {notice ? <p className="form-error" role="status">{notice}</p> : null}
      <section className="lims-panel">
        <div className="connect-workflow-filters">
          <label>Workflow
            <select value={workflowId} onChange={(event) => setWorkflowId(event.target.value)}>
              <option value="all">All</option>
              {workflows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option>
              {["pending", "running", "waiting", "completed", "failed", "cancelled"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Mode
            <select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="all">All</option>
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </label>
        </div>
        {rows.length === 0 ? <p>No runs yet.</p> : rows.map((execution) => {
          const workflow = workflows.find((item) => item.id === execution.lineageId);
          return (
            <details key={execution.id} className="connect-run">
              <summary>
                <strong>{workflow?.name || "Workflow"}</strong> · {execution.mode} · {execution.status} · {when(execution.startedAt)} · {execution.correlationId.slice(0, 8)}
              </summary>
              <p>{execution.error || "No error."} {execution.eventId ? `Event ${execution.eventId.slice(0, 8)}.` : ""}</p>
              <div className="connect-workflow-actions">
                {execution.status === "failed" ? <button type="button" onClick={() => retry(execution)}>{ack === execution.id ? "Confirm retry" : "Retry failed node"}</button> : null}
                {execution.status === "waiting" ? <button type="button" onClick={() => { const result = engine.resume(execution.id); setNotice("error" in result && !("status" in result) ? String(result.error) : "Resumed."); }}>Resume</button> : null}
                {execution.status === "pending" || execution.status === "running" || execution.status === "waiting" ? <button type="button" onClick={() => { const result = engine.cancel(execution.id); setNotice("error" in result && !("status" in result) ? String(result.error) : "Cancelled."); }}>Cancel</button> : null}
              </div>
              <table className="lims-table">
                <thead><tr><th>Node</th><th>Status</th><th>Attempts</th><th>Started</th><th>Error</th><th>Output</th></tr></thead>
                <tbody>
                  {execution.nodes.map((node, index) => (
                    <tr key={`${node.nodeId}-${index}`}>
                      <td>{node.type}</td>
                      <td>{node.status}</td>
                      <td>{node.attempts}</td>
                      <td>{when(node.startedAt)}</td>
                      <td>{node.error || ""}</td>
                      <td><code>{JSON.stringify(node.output)?.slice(0, 180) || ""}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          );
        })}
      </section>
    </div>
  );
}

export function WorkflowExceptionsPage() {
  const { store, engine } = useAutomation();
  const [severity, setSeverity] = useState("all");
  const [state, setState] = useState("open");
  const [assignee, setAssignee] = useState<Record<string, string>>({});
  const [resolution, setResolution] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [ack, setAck] = useState("");
  const audit = store.auditLog();
  const rows = store.exceptions().filter((item) => (severity === "all" || item.severity === severity) && (state === "all" || item.status === state));

  return (
    <div className="module-page connect-page">
      <ModuleHeader name="workflows" title="Exceptions" subtitle="Failed nodes stay here until someone resolves them." sheet={<WorkflowTabs current="exceptions" />} />
      {notice ? <p className="form-error" role="status">{notice}</p> : null}
      <section className="lims-panel">
        <div className="connect-workflow-filters">
          <label>Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>State
            <select value={state} onChange={(event) => setState(event.target.value)}>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
        {rows.length === 0 ? <p>No exceptions in this view.</p> : rows.map((item) => {
          const trail = audit.filter((entry) => entry.target === item.id);
          return (
            <article key={item.id} className="connect-run">
              <header>
                <strong>{item.severity}</strong> · {item.status} · {when(item.createdAt)}
              </header>
              <p>{item.summary}</p>
              <p>Run {item.executionId.slice(0, 8)} · node {item.nodeId.slice(0, 8)}{item.assignee ? ` · ${item.assignee}` : ""}</p>
              <label>Assignee
                <input value={assignee[item.id] ?? item.assignee} onChange={(event) => setAssignee((current) => ({ ...current, [item.id]: event.target.value }))} />
              </label>
              <label>Resolution
                <input value={resolution[item.id] ?? item.resolution} onChange={(event) => setResolution((current) => ({ ...current, [item.id]: event.target.value }))} />
              </label>
              <div className="connect-workflow-actions">
                <button type="button" onClick={() => { store.assignException(item.id, assignee[item.id] ?? item.assignee); setNotice("Assignment saved."); }}>Assign</button>
                <button type="button" onClick={() => { store.resolveException(item.id, resolution[item.id] ?? item.resolution); setNotice("Exception resolved."); }}>Resolve</button>
                <button type="button" onClick={() => {
                  const result = engine.retry(item.executionId, ack === item.id);
                  if ("error" in result && !("id" in result)) {
                    setAck(item.id);
                    setNotice(result.error);
                    return;
                  }
                  setNotice("Retry finished. Check history for the run status.");
                }}>{ack === item.id ? "Confirm retry" : "Retry failed node"}</button>
                <Link to={`/app/connect/workflows/history?workflow=${item.lineageId}`}>History</Link>
              </div>
              {trail.length ? <ul>{trail.map((entry) => <li key={entry.id}>{when(entry.at)} · {entry.actor} · {entry.action} · {entry.detail}</li>)}</ul> : <p>No audit entries yet.</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
