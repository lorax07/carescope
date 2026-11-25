import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CATEGORY_LABEL, NODE_TYPES, nodeType, type NodeCategory } from "../../connectAutomation/registry";
import { isExecution } from "../../connectAutomation/engine";
import { useAutomation } from "../../connectAutomation/runtime";
import type { FlowEdge, FlowNode, WorkflowDefinition } from "../../connectAutomation/types";
import { blockingIssues, validateWorkflow } from "../../connectAutomation/validate";
import { ModuleHeader } from "../ModuleHeader";
import { useConnect } from "./connectStore";

type ConnectData = { label: string; kind: string; handles: string[]; invalid: boolean };
type ConnectFlowNode = Node<ConnectData, "connect">;

const FIXTURES = [
  { id: "cbc", label: "CBC JSON", text: '{\n  "code": "CBC",\n  "specimen": "SERUM"\n}' },
  { id: "oru", label: "HL7 ORU text", text: "MSH|^~\\&|LAB|SEQUENCE\nOBX|1|NM|GLU||96|mg/dL" },
];

function sourceHandles(node: FlowNode): string[] {
  const def = nodeType(node.type);
  if (def?.handles?.length) return def.handles;
  if (node.type === "logic.switch") {
    const cases = String(node.config["cases"] || "").split(",").map((item) => item.trim()).filter(Boolean);
    return [...cases, "default"];
  }
  return ["default"];
}

function ConnectNode({ data, selected }: NodeProps<ConnectFlowNode>) {
  return (
    <div className={`connect-flow-node${selected ? " is-selected" : ""}${data.invalid ? " is-invalid" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <small>{nodeType(data.kind)?.label || data.kind}</small>
      <strong>{data.label}</strong>
      {data.handles.map((handle, index) => (
        <Handle key={handle} id={handle} type="source" position={Position.Right} style={{ top: 18 + index * 16 }} />
      ))}
    </div>
  );
}

const nodeTypes = { connect: ConnectNode };

function layout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const rank = new Map<string, number>();
  const queue = nodes.filter((node) => node.type.startsWith("trigger.")).map((node) => node.id);
  queue.forEach((id) => rank.set(id, 0));
  let guard = 0;
  while (queue.length && guard < nodes.length * 8) {
    const id = queue.shift();
    guard += 1;
    if (!id) continue;
    const nextRank = (rank.get(id) ?? 0) + 1;
    for (const edge of edges.filter((item) => item.source === id)) {
      if ((rank.get(edge.target) ?? -1) >= nextRank) continue;
      rank.set(edge.target, nextRank);
      queue.push(edge.target);
    }
  }
  const columns = new Map<number, string[]>();
  for (const node of nodes) {
    const column = rank.get(node.id) ?? 0;
    columns.set(column, [...(columns.get(column) ?? []), node.id]);
  }
  return nodes.map((node) => {
    const column = rank.get(node.id) ?? 0;
    const index = (columns.get(column) ?? []).indexOf(node.id);
    return { ...node, position: { x: 48 + column * 260, y: 48 + index * 130 } };
  });
}

function snapshotOf(workflow: Pick<WorkflowDefinition, "name" | "description" | "category" | "connectionId" | "owner" | "tags" | "nodes" | "edges">): string {
  return JSON.stringify({
    name: workflow.name,
    description: workflow.description,
    category: workflow.category,
    connectionId: workflow.connectionId,
    owner: workflow.owner,
    tags: workflow.tags,
    nodes: workflow.nodes,
    edges: workflow.edges,
  });
}

function parseSample(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed) as unknown;
  return { text: trimmed };
}

export function WorkflowDesignerPage() {
  return (
    <ReactFlowProvider>
      <DesignerBody />
    </ReactFlowProvider>
  );
}

function DesignerBody() {
  const { workflowId = "" } = useParams();
  const { store, engine } = useAutomation();
  const connections = useConnect();
  const connectionIds = connections.interfaces.map((item) => item.id);
  const flow = useReactFlow();
  const stored = store.get(workflowId);
  const [draft, setDraft] = useState<WorkflowDefinition | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [sample, setSample] = useState(FIXTURES[0].text);
  const [live, setLive] = useState(false);
  const [runText, setRunText] = useState("");
  const dragRecorded = useRef(false);
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const saved = useRef("");
  const loaded = useRef("");

  useEffect(() => {
    const workflow = store.get(workflowId);
    if (!workflow) {
      setDraft(null);
      return;
    }
    if (loaded.current === workflowId) return;
    loaded.current = workflowId;
    setDraft(workflow);
    saved.current = snapshotOf(workflow);
    past.current = [];
    future.current = [];
    setSelectedId(workflow.nodes[0]?.id || "");
    if (window.location.hash === "#test") setNotice("Test uses this draft and does not write to a connection unless you authorize a live transmission.");
  }, [store, workflowId]);

  useEffect(() => {
    if (!draft) return;
    const body = snapshotOf(draft);
    if (body === saved.current) return;
    setSaveState("Saving…");
    const timer = window.setTimeout(() => {
      const updated = store.saveDraft(draft.id, {
        name: draft.name,
        description: draft.description,
        category: draft.category,
        connectionId: draft.connectionId,
        owner: draft.owner,
        tags: draft.tags,
        nodes: draft.nodes,
        edges: draft.edges,
      });
      saved.current = snapshotOf(updated || draft);
      setSaveState(updated ? "Saved" : "Not saved");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, store]);

  const issues = useMemo(() => (draft ? validateWorkflow(draft, connectionIds) : []), [draft, connectionIds]);
  const selected = draft?.nodes.find((node) => node.id === selectedId) || null;
  const versions = stored ? store.versions(stored.id) : [];
  const flowNodes = useMemo<ConnectFlowNode[]>(() => (draft ? draft.nodes.map((node) => ({
    id: node.id,
    type: "connect",
    position: node.position,
    data: {
      label: node.label,
      kind: node.type,
      handles: sourceHandles(node),
      invalid: issues.some((issue) => issue.nodeId === node.id && issue.severity === "error"),
    },
  })) : []), [draft, issues]);
  const flowEdges = draft?.edges.map((edge) => ({ ...edge, label: edge.sourceHandle && edge.sourceHandle !== "default" ? edge.sourceHandle : undefined })) ?? [];

  function commit(recipe: (current: WorkflowDefinition) => WorkflowDefinition, record = true) {
    setDraft((current) => {
      if (!current) return current;
      if (record) {
        past.current = [...past.current, snapshotOf(current)].slice(-40);
        future.current = [];
      }
      return recipe(current);
    });
  }

  function updateDraft(patch: Partial<WorkflowDefinition>) {
    commit((current) => ({ ...current, ...patch }));
  }

  function updateNode(nodeId: string, patch: Partial<FlowNode>, record = true) {
    commit((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch, config: patch.config || node.config, position: patch.position || node.position } : node)),
    }), record);
  }

  function addNode(type: string, position = { x: 240, y: 120 }) {
    const def = nodeType(type);
    if (!def || !draft) return;
    if (def.category === "trigger" && draft.nodes.some((node) => nodeType(node.type)?.category === "trigger")) {
      setNotice("Replace the existing trigger instead of adding a second one.");
      return;
    }
    const node: FlowNode = { id: crypto.randomUUID(), type, label: def.label, position, config: {} };
    commit((current) => {
      const spot = current.nodes.length;
      const placed = position.x === 240 && position.y === 120 ? { x: 80 + spot * 220, y: 80 } : position;
      const placedNode = { ...node, position: placed };
      let upstream = current.nodes.find((item) => nodeType(item.type)?.category === "trigger");
      const seen = new Set<string>();
      while (upstream && !seen.has(upstream.id)) {
        seen.add(upstream.id);
        const nextEdge = current.edges.find((edge) => edge.source === upstream?.id);
        const nextNode = nextEdge ? current.nodes.find((item) => item.id === nextEdge.target) : undefined;
        if (!nextNode) break;
        upstream = nextNode;
      }
      const handle = upstream ? nodeType(upstream.type)?.handles?.[0] || "default" : "";
      const edge: FlowEdge | null = upstream ? { id: crypto.randomUUID(), source: upstream.id, target: placedNode.id, sourceHandle: handle } : null;
      return { ...current, nodes: [...current.nodes, placedNode], edges: edge ? [...current.edges, edge] : current.edges };
    });
    setSelectedId(node.id);
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const edge: FlowEdge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || undefined,
    };
    commit((current) => ({ ...current, edges: [...current.edges, edge] }));
  }

  function undo() {
    const previous = past.current.pop();
    if (!previous) return;
    setDraft((current) => {
      if (!current) return current;
      future.current.push(snapshotOf(current));
      return { ...current, ...JSON.parse(previous) as WorkflowDefinition };
    });
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    setDraft((current) => {
      if (!current) return current;
      past.current.push(snapshotOf(current));
      return { ...current, ...JSON.parse(next) as WorkflowDefinition };
    });
  }

  function removeSelected() {
    if (!selected) return;
    const selectedNodeId = selected.id;
    commit((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    }));
    setSelectedId("");
  }

  function duplicateSelected() {
    if (!selected || nodeType(selected.type)?.category === "trigger") return;
    const copy: FlowNode = { ...selected, id: crypto.randomUUID(), label: `${selected.label} copy`, position: { x: selected.position.x + 32, y: selected.position.y + 32 }, config: { ...selected.config } };
    commit((current) => ({ ...current, nodes: [...current.nodes, copy] }));
    setSelectedId(copy.id);
  }

  function activate() {
    if (!draft) return;
    persist(draft);
    const result = store.setStatus(draft.id, "active", connectionIds);
    const errors = result.issues.filter((issue) => issue.severity === "error");
    setNotice(errors.length ? errors.map((issue) => issue.message).join(" ") : `Published version ${result.workflow?.publishedVersion}. Live runs use that version.`);
  }

  function persist(current: WorkflowDefinition) {
    const updated = store.saveDraft(current.id, {
      name: current.name,
      description: current.description,
      category: current.category,
      connectionId: current.connectionId,
      owner: current.owner,
      tags: current.tags,
      nodes: current.nodes,
      edges: current.edges,
    });
    saved.current = snapshotOf(updated || current);
    setSaveState(updated ? "Saved" : "Not saved");
  }

  function run(scope: "workflow" | "node") {
    if (!draft) return;
    persist(draft);
    let input: unknown;
    try {
      input = parseSample(sample);
    } catch {
      setRunText("The sample is not valid JSON. Use JSON or plain text.");
      return;
    }
    if (live && !window.confirm("This test can write to the selected connection. Continue?")) return;
    const result = scope === "node" && selected
      ? engine.testNode(draft.id, selected.id, input)
      : engine.test(draft.id, input, live);
    if (!isExecution(result)) {
      setRunText(result.error);
      return;
    }
    const lines = result.nodes.map((node) => `${node.type} · ${node.status}${node.error ? ` · ${node.error}` : ""} · ${JSON.stringify(node.output)?.slice(0, 160) || ""}`);
    setRunText([`${result.status} · ${result.correlationId}`, ...lines].join("\n"));
  }

  if (!draft) {
    return (
      <div className="module-page connect-page">
        <ModuleHeader name="workflows" title="Workflow" subtitle="This workflow is not in the current lab instance." />
        <p><Link to="/app/connect/workflows">Back to workflows</Link></p>
      </div>
    );
  }

  const palette = NODE_TYPES.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const grouped = (["trigger", "action", "logic", "data"] as NodeCategory[]).map((category) => ({ category, items: palette.filter((item) => item.category === category) }));

  return (
    <div className="module-page connect-page">
      <ModuleHeader
        name="workflows"
        title={draft.name || "Untitled workflow"}
        subtitle={`${stored?.status || draft.status}${stored?.publishedVersion ? ` · published v${stored.publishedVersion}` : ""}${stored?.dirty ? " · unpublished edits" : ""} · ${saveState}`}
        action={<Link className="btn" to="/app/connect/workflows">All workflows</Link>}
      />
      {notice ? <p className="form-error" role="status">{notice}</p> : null}
      <div className="connect-designer">
        <aside className="lims-panel connect-palette" aria-label="Node palette">
          <label>Find a node<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          {grouped.map((group) => group.items.length ? (
            <div key={group.category}>
              <h2>{CATEGORY_LABEL[group.category]}</h2>
              <ul>
                {group.items.map((item) => (
                  <li key={item.type}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("application/connect-node", item.type)}
                      onClick={() => addNode(item.type)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null)}
        </aside>
        <div className="connect-canvas">
          <div className="connect-workflow-actions">
            <span>{draft.nodes.length} nodes · {draft.edges.length} {draft.edges.length === 1 ? "connection" : "connections"}</span>
            <button type="button" onClick={undo}>Undo</button>
            <button type="button" onClick={redo}>Redo</button>
            <button type="button" onClick={() => updateDraft({ nodes: layout(draft.nodes, draft.edges) })}>Auto-layout</button>
            <button type="button" onClick={duplicateSelected} disabled={!selected}>Duplicate</button>
            <button type="button" onClick={removeSelected} disabled={!selected}>Delete</button>
            <button type="button" className="btn btn-primary" onClick={activate} disabled={blockingIssues(issues).length > 0}>Activate</button>
            <button type="button" onClick={() => { const result = store.setStatus(draft.id, "paused", connectionIds); setNotice(result.workflow ? `Status is ${result.workflow.status}.` : "Could not pause."); }} disabled={stored?.status !== "active"}>Pause</button>
            <button type="button" onClick={() => { const result = store.setStatus(draft.id, "validated", connectionIds); setNotice(result.issues.some((issue) => issue.severity === "error") ? result.issues.map((issue) => issue.message).join(" ") : "Marked validated."); }}>Mark validated</button>
          </div>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => {
              const moves = changes.filter((change) => change.type === "position" && change.position);
              if (moves.length) {
                const dragging = moves.some((change) => change.type === "position" && change.dragging);
                const record = dragging && !dragRecorded.current;
                dragRecorded.current = dragging;
                commit((current) => ({
                  ...current,
                  nodes: current.nodes.map((node) => {
                    const move = moves.find((change) => change.type === "position" && change.id === node.id && change.position);
                    return move && move.type === "position" && move.position ? { ...node, position: move.position } : node;
                  }),
                }), record);
              }
              for (const change of changes) if (change.type === "select" && change.selected) setSelectedId(change.id);
            }}
            onConnect={onConnect}
            onNodeClick={(_event, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId("")}
            fitView
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const type = event.dataTransfer.getData("application/connect-node");
              if (!type) return;
              addNode(type, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
            }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="lims-panel connect-config" aria-label="Node configuration">
          <h2>Workflow</h2>
          <label>Name<input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} /></label>
          <label>Description<textarea value={draft.description} rows={2} onChange={(event) => updateDraft({ description: event.target.value })} /></label>
          <label>Category<input value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} /></label>
          <label>Owner<input value={draft.owner} onChange={(event) => updateDraft({ owner: event.target.value })} /></label>
          <label>Tags<input value={draft.tags.join(", ")} onChange={(event) => updateDraft({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
          <h2>Validation</h2>
          {issues.length === 0 ? <p>No issues.</p> : (
            <ul className="connect-issues">
              {issues.map((issue, index) => <li key={`${issue.code}-${index}`} className={issue.severity}>{issue.severity}: {issue.message}</li>)}
            </ul>
          )}
          {selected ? <NodeConfig node={selected} interfaces={connections.interfaces.map((item) => ({ id: item.id, name: item.name }))} onChange={(config) => updateNode(selected.id, { config })} onLabel={(label) => updateNode(selected.id, { label })} /> : <p>Select a node to configure it.</p>}
          <h2>Test</h2>
          <label>Sample
            <select onChange={(event) => setSample(FIXTURES.find((item) => item.id === event.target.value)?.text || sample)}>
              {FIXTURES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <textarea value={sample} rows={6} onChange={(event) => setSample(event.target.value)} aria-label="Sample payload" />
          <label className="connect-check">File
            <input type="file" accept=".json,.txt,.hl7,text/plain,application/json" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 200_000) {
                setRunText("That file is over 200 KB.");
                return;
              }
              file.text().then((text) => setSample(text)).catch(() => setRunText("Could not read that file."));
            }} />
          </label>
          <label className="connect-check"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} /> Authorize a live transmission test</label>
          <div className="connect-workflow-actions">
            <button type="button" onClick={() => run("workflow")}>Test workflow</button>
            <button type="button" onClick={() => run("node")} disabled={!selected}>Test node</button>
          </div>
          {runText ? <pre className="connect-run-output">{runText}</pre> : null}
          <h2>Versions</h2>
          {versions.length === 0 ? <p>Nothing published yet.</p> : (
            <ul>
              {versions.map((version) => (
                <li key={version.id}>
                  v{version.number} · {version.publishedBy}
                  <button type="button" onClick={() => {
                    const result = store.rollback(draft.id, version.number, connectionIds);
                    const next = store.get(draft.id);
                    if (next) {
                      setDraft(next);
                      saved.current = snapshotOf(next);
                    }
                    setNotice(result.workflow ? `Published v${result.workflow.publishedVersion} from v${version.number}.` : result.issues.map((issue) => issue.message).join(" "));
                  }}>Publish again</button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function NodeConfig({
  node,
  interfaces,
  onChange,
  onLabel,
}: {
  node: FlowNode;
  interfaces: { id: string; name: string }[];
  onChange: (config: Record<string, unknown>) => void;
  onLabel: (label: string) => void;
}) {
  const def = nodeType(node.type);
  if (!def) return <p>Unknown node.</p>;
  return (
    <div>
      <h2>{def.label}</h2>
      <p>{def.description}</p>
      <label>Label<input value={node.label} onChange={(event) => onLabel(event.target.value)} /></label>
      {def.fields.map((field) => {
        const value = node.config[field.name];
        if (field.kind === "mappings") return <MappingEditor key={field.name} value={value} onChange={(mappings) => onChange({ ...node.config, mappings })} />;
        if (field.kind === "condition") return <ConditionEditor key={field.name} value={value} onChange={(condition) => onChange({ ...node.config, condition })} />;
        if (field.kind === "connection") {
          return (
            <label key={field.name}>{field.label}
              <select value={String(value || "")} onChange={(event) => onChange({ ...node.config, [field.name]: event.target.value })}>
                <option value="">Select a connection</option>
                {interfaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          );
        }
        if (field.kind === "select") {
          return (
            <label key={field.name}>{field.label}
              <select value={String(value || "")} onChange={(event) => onChange({ ...node.config, [field.name]: event.target.value })}>
                <option value="">Select</option>
                {(field.options || []).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          );
        }
        if (field.kind === "checkbox") {
          return <label key={field.name} className="connect-check"><input type="checkbox" checked={value === true} onChange={(event) => onChange({ ...node.config, [field.name]: event.target.checked })} /> {field.label}</label>;
        }
        if (field.kind === "textarea") {
          return <label key={field.name}>{field.label}<textarea value={String(value || "")} rows={3} onChange={(event) => onChange({ ...node.config, [field.name]: event.target.value })} /></label>;
        }
        return (
          <label key={field.name}>{field.label}
            <input type={field.kind === "number" ? "number" : "text"} value={String(value ?? "")} onChange={(event) => onChange({ ...node.config, [field.name]: field.kind === "number" ? Number(event.target.value) : event.target.value })} />
            {field.help ? <small>{field.help}</small> : null}
          </label>
        );
      })}
    </div>
  );
}

type MappingRow = { from?: string; to?: string; type?: string; fallback?: string; when?: string };

function MappingEditor({ value, onChange }: { value: unknown; onChange: (rows: MappingRow[]) => void }) {
  const rows = Array.isArray(value) ? value as MappingRow[] : [];
  function edit(index: number, patch: Partial<MappingRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }
  return (
    <fieldset>
      <legend>Field mappings</legend>
      {rows.map((row, index) => (
        <div key={index} className="connect-map-row">
          <input aria-label="Source path" value={row.from || ""} placeholder="code" onChange={(event) => edit(index, { from: event.target.value })} />
          <input aria-label="Destination field" value={row.to || ""} placeholder="testCode" onChange={(event) => edit(index, { to: event.target.value })} />
          <select aria-label="Data type" value={row.type || "string"} onChange={(event) => edit(index, { type: event.target.value })}>
            {["string", "number", "boolean"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input aria-label="Default" value={row.fallback || ""} placeholder="Default" onChange={(event) => edit(index, { fallback: event.target.value })} />
          <input aria-label="Only when path has a value" value={row.when || ""} placeholder="Only when" onChange={(event) => edit(index, { when: event.target.value })} />
          <button type="button" onClick={() => onChange(rows.filter((_row, rowIndex) => rowIndex !== index))}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { from: "", to: "", type: "string", fallback: "", when: "" }])}>Add mapping</button>
    </fieldset>
  );
}

type Clause = { path?: string; cmp?: string; value?: string };
type Group = { join?: string; clauses?: Clause[] };

function ConditionEditor({ value, onChange }: { value: unknown; onChange: (group: Group) => void }) {
  const group: Group = value && typeof value === "object" ? value as Group : { join: "and", clauses: [] };
  const clauses = group.clauses || [];
  function edit(index: number, patch: Partial<Clause>) {
    onChange({ ...group, clauses: clauses.map((clause, clauseIndex) => (clauseIndex === index ? { ...clause, ...patch } : clause)) });
  }
  return (
    <fieldset>
      <legend>Condition</legend>
      <label>Join
        <select value={group.join || "and"} onChange={(event) => onChange({ ...group, join: event.target.value })}>
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      </label>
      {clauses.map((clause, index) => (
        <div key={index} className="connect-map-row">
          <input aria-label="Field path" value={clause.path || ""} placeholder="code" onChange={(event) => edit(index, { path: event.target.value })} />
          <select aria-label="Comparison" value={clause.cmp || "eq"} onChange={(event) => edit(index, { cmp: event.target.value })}>
            {["eq", "neq", "contains", "gt", "lt", "exists"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input aria-label="Comparison value" value={clause.value || ""} onChange={(event) => edit(index, { value: event.target.value })} />
          <button type="button" onClick={() => onChange({ ...group, clauses: clauses.filter((_clause, clauseIndex) => clauseIndex !== index) })}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...group, clauses: [...clauses, { path: "", cmp: "eq", value: "" }] })}>Add comparison</button>
    </fieldset>
  );
}
