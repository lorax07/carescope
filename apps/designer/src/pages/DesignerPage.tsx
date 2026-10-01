import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
  type Edge,
  type NodeTypes,
  type OnConnect,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  SimulationResult,
  ValidationResult,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowTrigger,
} from "@carescope/workflow-core";
import { workflowService } from "../platform";
import { NodePalette } from "../components/NodePalette";
import { PropertiesPanel } from "../components/PropertiesPanel";
import { WorkflowNode as WfNodeView, type WfFlowNode } from "../components/WorkflowNode";

const nodeTypes: NodeTypes = { workflow: WfNodeView };

type WorkflowScreen = {
  id: string;
  name: string;
  title: string;
  description: string;
  fields: string;
  primaryAction: string;
};

function defaultScreens(workflowName: string): WorkflowScreen[] {
  return [
    {
      id: "request",
      name: "Request",
      title: `Start ${workflowName}`,
      description: "Capture the information required to begin this workflow.",
      fields: "Requestor\nPriority\nDescription",
      primaryAction: "Submit",
    },
    {
      id: "review",
      name: "Review",
      title: "Review and confirm",
      description: "Verify the record before routing it to the next workflow stage.",
      fields: "Assigned role\nReview notes\nDecision",
      primaryAction: "Continue",
    },
  ];
}

function readScreens(workflowId: string, workflowName: string): WorkflowScreen[] {
  try {
    const raw = localStorage.getItem(`carescope.workflowScreens.${workflowId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkflowScreen[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // Fall back to useful starter screens.
  }
  return defaultScreens(workflowName);
}

function WorkflowScreenMock({ screen }: { screen: WorkflowScreen }) {
  return (
    <div className="workflow-screen-mock">
      <div className="workflow-screen-browser"><span /><span /><span /><b>{screen.name}</b></div>
      <div className="workflow-screen-mock-body">
        <p className="lims-eyebrow">Workflow task</p>
        <h2>{screen.title}</h2>
        <p>{screen.description}</p>
        <div className="workflow-screen-mock-fields">
          {screen.fields.split("\n").filter(Boolean).map((field) => (
            <label key={field}>{field}<input placeholder={`Enter ${field.toLowerCase()}`} readOnly /></label>
          ))}
        </div>
        <div className="workflow-screen-mock-actions">
          <button type="button" className="btn">Save draft</button>
          <button type="button" className="btn btn-primary">{screen.primaryAction}</button>
        </div>
      </div>
    </div>
  );
}

function toFlowNodes(def: WorkflowDefinition, plugins: ReturnType<typeof workflowService.nodePlugins>): WfFlowNode[] {
  return def.nodes.map((n) => {
    const plugin = plugins.find((p) => p.type === n.type);
    return {
      id: n.id,
      type: "workflow",
      position: n.position,
      data: {
        label: n.label,
        nodeType: n.type,
        description: n.description,
        color: n.style?.color ?? plugin?.color,
        config: n.config,
      },
    };
  });
}

function toFlowEdges(def: WorkflowDefinition): Edge[] {
  return def.edges.map((e) => {
    const color = def.nodes.find((node) => node.id === e.target)?.style?.color ?? "#5a7366";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: { stroke: color },
    };
  });
}

function fromFlow(
  nodes: WfFlowNode[],
  edges: Edge[],
  _base: WorkflowDefinition
): Pick<WorkflowDefinition, "nodes" | "edges"> {
  const wfNodes: WorkflowNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    label: n.data.label,
    description: n.data.description,
    position: n.position,
    config: n.data.config ?? {},
  }));
  const wfEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
  }));
  return { nodes: wfNodes, edges: wfEdges };
}

export function DesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plugins = useMemo(() => workflowService.nodePlugins(), []);
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<WfFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [drawer, setDrawer] = useState<"none" | "validate" | "simulate" | "history">("none");
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [designerMode, setDesignerMode] = useState<"workflow" | "screens">("workflow");
  const [screens, setScreens] = useState<WorkflowScreen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [screenPreviewOpen, setScreenPreviewOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const def = workflowService.get(id);
    if (!def) {
      navigate("/app/workflows");
      return;
    }
    setWorkflow(def);
    setNodes(toFlowNodes(def, plugins));
    setEdges(toFlowEdges(def));
    const savedScreens = readScreens(def.id, def.name);
    setScreens(savedScreens);
    setSelectedScreenId(savedScreens[0]?.id ?? "");
  }, [id, navigate, plugins, setNodes, setEdges]);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  );
  const selectedPlugin = useMemo(
    () => plugins.find((p) => p.type === selected?.data.nodeType),
    [plugins, selected]
  );
  const selectedScreen = screens.find((screen) => screen.id === selectedScreenId) ?? screens[0];

  const persistScreens = (next: WorkflowScreen[]) => {
    if (!workflow) return;
    setScreens(next);
    localStorage.setItem(`carescope.workflowScreens.${workflow.id}`, JSON.stringify(next));
  };

  const updateScreen = (patch: Partial<WorkflowScreen>) => {
    if (!selectedScreen) return;
    persistScreens(screens.map((screen) => screen.id === selectedScreen.id ? { ...screen, ...patch } : screen));
  };

  const addScreen = () => {
    const screen: WorkflowScreen = {
      id: crypto.randomUUID(),
      name: `Screen ${screens.length + 1}`,
      title: "New workflow screen",
      description: "Explain what the user needs to do at this stage.",
      fields: "Field label",
      primaryAction: "Continue",
    };
    persistScreens([...screens, screen]);
    setSelectedScreenId(screen.id);
    setDesignerMode("screens");
  };

  const persistCanvas = useCallback(
    (nextNodes: WfFlowNode[], nextEdges: Edge[], triggers?: WorkflowTrigger[]) => {
      if (!workflow) return;
      const { nodes: n, edges: e } = fromFlow(nextNodes, nextEdges, workflow);
      const updated = workflowService.updateDraft(workflow.id, {
        nodes: n,
        edges: e,
        triggers: triggers ?? workflow.triggers,
        name: workflow.name,
        description: workflow.description,
      });
      if (updated && updated.id !== workflow.id) {
        // published → new draft version
        navigate(`/app/workflows/${updated.id}`, { replace: true });
      } else if (updated) {
        setWorkflow(updated);
      }
    },
    [workflow, navigate]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            markerEnd: { type: MarkerType.ArrowClosed, color: "#5a7366" },
            style: { stroke: "#5a7366" },
          },
          eds
        );
        persistCanvas(nodes, next);
        return next;
      });
    },
    [nodes, persistCanvas, setEdges]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/carescope-node");
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        type: string;
        label: string;
        color?: string;
        description?: string;
      };
      const bounds = (event.target as HTMLElement)
        .closest(".react-flow")
        ?.getBoundingClientRect();
      const position = {
        x: event.clientX - (bounds?.left ?? 0) - 80,
        y: event.clientY - (bounds?.top ?? 0) - 20,
      };
      const newNode: WfFlowNode = {
        id: crypto.randomUUID(),
        type: "workflow",
        position,
        data: {
          label: payload.label,
          nodeType: payload.type,
          description: payload.description,
          color: payload.color,
          config: {},
        },
      };
      setNodes((nds) => {
        const next = nds.concat(newNode);
        persistCanvas(next, edges);
        return next;
      });
      setSelectedId(newNode.id);
    },
    [edges, persistCanvas, setNodes]
  );

  const onChangeNode = (
    nodeId: string,
    patch: { label?: string; description?: string; config?: Record<string, unknown> }
  ) => {
    setNodes((nds) => {
      const next = nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                label: patch.label ?? n.data.label,
                description: patch.description ?? n.data.description,
                config: patch.config ?? n.data.config,
              },
            }
          : n
      );
      persistCanvas(next, edges);
      return next;
    });
  };

  const onDeleteNode = (nodeId: string) => {
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== nodeId);
      setEdges((eds) => {
        const nextEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
        persistCanvas(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
    setSelectedId(null);
  };

  const onChangeTriggers = (triggers: WorkflowTrigger[]) => {
    if (!workflow) return;
    setWorkflow({ ...workflow, triggers });
    persistCanvas(nodes, edges, triggers);
  };

  const handleSave = () => {
    if (!workflow) return;
    setSaving(true);
    persistCanvas(nodes, edges);
    setStatusMsg("Saved");
    setTimeout(() => {
      setSaving(false);
      setStatusMsg("");
    }, 1200);
  };

  const handleValidate = () => {
    if (!workflow) return;
    persistCanvas(nodes, edges);
    const result = workflowService.validate(workflow.id);
    setValidation(result ?? null);
    setDrawer("validate");
  };

  const handlePublish = () => {
    if (!workflow) return;
    persistCanvas(nodes, edges);
    const result = workflowService.publish(workflow.id);
    if (!result.ok) {
      setValidation(result.validation);
      setDrawer("validate");
      setStatusMsg("Publish blocked — fix validation errors");
      return;
    }
    setWorkflow(result.workflow!);
    setValidation(result.validation);
    setStatusMsg("Published");
  };

  const handleSimulate = async () => {
    if (!workflow) return;
    persistCanvas(nodes, edges);
    const result = await workflowService.simulate(workflow.id, {
      variables: { priority: "STAT", result: 1, quantity: 2, reorderLevel: 5 },
      eventPayload: { priority: "STAT" },
      entityData: { priority: "STAT", result: 1 },
    });
    setSimResult(result);
    setDrawer("simulate");
  };

  const handleClone = () => {
    if (!workflow) return;
    const cloned = workflowService.clone(workflow.id);
    if (cloned) navigate(`/app/workflows/${cloned.id}`);
  };

  if (!workflow) {
    return <div className="page">Loading…</div>;
  }

  return (
    <div className={`designer-layout${designerMode === "screens" ? " is-screen-designer" : ""}`}>
      {designerMode === "workflow" ? (
        <NodePalette plugins={plugins} workflowName={workflow.name} />
      ) : (
        <aside className="workflow-screen-list">
          <div className="workflow-designer-sidebar-head">
            <Link to="/app/workflows" className="btn btn-ghost">← Workflows</Link>
            <div><h2>Workflow Designer</h2><p>{workflow.name}</p></div>
          </div>
          <div className="workflow-screen-list-head">
            <div><p className="lims-eyebrow">Workflow UI</p><h2>Screens</h2></div>
            <button type="button" className="btn btn-primary" onClick={addScreen}>Add screen</button>
          </div>
          <div className="workflow-screen-list-items">
            {screens.map((screen, index) => (
              <button type="button" className={selectedScreen?.id === screen.id ? "is-active" : undefined} key={screen.id} onClick={() => setSelectedScreenId(screen.id)}>
                <span>{index + 1}</span><div><b>{screen.name}</b><small>{screen.title}</small></div>
              </button>
            ))}
          </div>
        </aside>
      )}
      <div className="canvas-area">
        <div className="canvas-toolbar">
          <span className={`badge badge-${workflow.status}`}>{workflow.status}</span>
          <span className="badge">v{workflow.version}</span>
          <div className="workflow-designer-mode" role="group" aria-label="Designer mode">
            <button type="button" className={designerMode === "workflow" ? "is-on" : undefined} onClick={() => setDesignerMode("workflow")}>Workflow logic</button>
            <button type="button" className={designerMode === "screens" ? "is-on" : undefined} onClick={() => setDesignerMode("screens")}>Screen design</button>
          </div>
          <span className="spacer" />
          {statusMsg ? <span style={{ color: "var(--accent)", fontSize: "0.75rem" }}>{statusMsg}</span> : null}
          {designerMode === "workflow" ? (
            <>
              <button type="button" className="btn" onClick={handleSave} disabled={saving}>Save</button>
              <button type="button" className="btn" onClick={handleValidate}>Validate</button>
              <button type="button" className="btn" onClick={handleSimulate}>Simulate</button>
              <button type="button" className="btn" onClick={handleClone}>Clone</button>
              <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={workflow.status === "published"}>Publish</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!selectedScreen} onClick={() => setScreenPreviewOpen(true)}>Preview screen</button>
          )}
        </div>
        <div className="canvas-host">
          {designerMode === "workflow" ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={(changes) => onNodesChange(changes)}
              onEdgesChange={(changes) => onEdgesChange(changes)}
              onNodeDragStop={() => persistCanvas(nodes, edges)}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={["Backspace", "Delete"]}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#2a3a32" />
              <Controls />
              <MiniMap nodeColor={(n) => (n.data as WfFlowNode["data"])?.color ?? "#2dd4a8"} maskColor="rgba(15,23,20,0.7)" />
            </ReactFlow>
          ) : selectedScreen ? (
            <div className="workflow-screen-editor">
              <div className="workflow-screen-editor-head"><p className="lims-eyebrow">Screen editor</p><h2>{selectedScreen.name}</h2><span>Changes save automatically</span></div>
              <div className="workflow-screen-editor-fields">
                <label>Screen name<input value={selectedScreen.name} onChange={(event) => updateScreen({ name: event.target.value })} /></label>
                <label>Page title<input value={selectedScreen.title} onChange={(event) => updateScreen({ title: event.target.value })} /></label>
                <label className="is-wide">Instructions<textarea value={selectedScreen.description} onChange={(event) => updateScreen({ description: event.target.value })} /></label>
                <label className="is-wide">Fields <small>One field per line</small><textarea value={selectedScreen.fields} onChange={(event) => updateScreen({ fields: event.target.value })} /></label>
                <label>Primary button<input value={selectedScreen.primaryAction} onChange={(event) => updateScreen({ primaryAction: event.target.value })} /></label>
              </div>
            </div>
          ) : <div className="empty-state"><h2>Add a screen</h2><p>Create the first user-facing screen for this workflow.</p></div>}
        </div>
      </div>
      {designerMode === "workflow" ? (
        <PropertiesPanel selected={selected} plugin={selectedPlugin} triggers={workflow.triggers} onChangeNode={onChangeNode} onChangeTriggers={onChangeTriggers} onDeleteNode={onDeleteNode} />
      ) : (
        <aside className="workflow-live-preview">
          <div className="props-header"><p className="lims-eyebrow">Live preview</p><h2>User screen</h2></div>
          {selectedScreen ? <WorkflowScreenMock screen={selectedScreen} /> : null}
        </aside>
      )}

      {screenPreviewOpen && selectedScreen ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setScreenPreviewOpen(false)}>
          <div className="lims-modal lims-modal-wide workflow-screen-preview-modal" role="dialog" aria-modal="true" aria-label={`${selectedScreen.name} preview`} onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar"><h2>{selectedScreen.name} preview</h2><button type="button" className="btn" onClick={() => setScreenPreviewOpen(false)}>Close preview</button></div>
            <WorkflowScreenMock screen={selectedScreen} />
          </div>
        </div>
      ) : null}

      {drawer !== "none" && (
        <div className="drawer" onClick={() => setDrawer("none")}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>
                {drawer === "validate"
                  ? "Validation"
                  : drawer === "simulate"
                    ? "Simulation"
                    : "History"}
              </h2>
              <button type="button" className="btn btn-ghost" onClick={() => setDrawer("none")}>
                Close
              </button>
            </div>
            <div className="drawer-body">
              {drawer === "validate" && validation && (
                <>
                  <p style={{ marginTop: 0 }}>
                    {validation.valid ? (
                      <span style={{ color: "var(--success)" }}>Workflow is valid and ready to publish.</span>
                    ) : (
                      <span style={{ color: "var(--danger)" }}>
                        {validation.errors.length} error(s) must be fixed.
                      </span>
                    )}
                  </p>
                  <ul className="validation-list">
                    {validation.errors.map((e, i) => (
                      <li key={`e-${i}`} className="error">
                        {e.message}
                      </li>
                    ))}
                    {validation.warnings.map((w, i) => (
                      <li key={`w-${i}`} className="warning">
                        {w.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {drawer === "simulate" && simResult && (
                <>
                  <p style={{ marginTop: 0 }}>
                    Outcome: <strong>{simResult.outcome}</strong> · Path length:{" "}
                    {simResult.path.length}
                  </p>
                  <div className="field">
                    <label>Status</label>
                    <div>{simResult.execution.status}</div>
                  </div>
                  {simResult.logs.map((log) => (
                    <div key={log.id} className={`log-entry ${log.level}`}>
                      <span className="ts">{new Date(log.timestamp).toLocaleTimeString()} </span>
                      [{log.event}] {log.message}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
