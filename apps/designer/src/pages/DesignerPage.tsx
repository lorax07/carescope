import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
  ConnectionLineType,
  type Connection,
  type Edge,
  type NodeTypes,
  type OnConnect,
  type ReactFlowInstance,
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
import { NodeDetailsPanel, type NewNodeConnection, type NodeConnectionType } from "../components/NodeDetailsPanel";
import { WorkflowNode as WfNodeView, type WfFlowNode } from "../components/WorkflowNode";
import { RoutedEdge, WorkflowRoutesContext } from "../components/RoutedEdge";
import { autoArrange, measureRoutes, rerouteMoved, routeWorkflow, type LayoutNode } from "../workflowLayout";

const nodeTypes: NodeTypes = { workflow: WfNodeView };
const edgeTypes = { routed: RoutedEdge };

function flowBox(node: WfFlowNode): LayoutNode {
  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? 210,
    height: node.measured?.height ?? node.height ?? 96,
    layer: node.data.nodeType === "start" ? "FIRST" : node.data.nodeType === "end" ? "LAST" : undefined,
  };
}

type WorkflowScreen = {
  id: string;
  name: string;
  title: string;
  description: string;
  fields: string;
  primaryAction: string;
};

type DesignerHistoryEntry = {
  nodes: WfFlowNode[];
  edges: Edge[];
  screens: WorkflowScreen[];
  label: string;
  timestamp: number;
};

type DesignerHistory = {
  entries: DesignerHistoryEntry[];
  index: number;
};

type SavedWorkflowSnapshot = DesignerHistoryEntry & {
  id: string;
  triggers: WorkflowTrigger[];
};

function readSavedSnapshots(workflowId: string): SavedWorkflowSnapshot[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(`carescope.workflowSaves.${workflowId}`) ?? "[]") as SavedWorkflowSnapshot[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function cloneNodes(nodes: WfFlowNode[]): WfFlowNode[] {
  return nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data, config: { ...(node.data.config ?? {}) } },
  }));
}

function cloneEdges(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    style: edge.style ? { ...edge.style } : undefined,
    markerEnd: typeof edge.markerEnd === "object" ? { ...edge.markerEnd } : edge.markerEnd,
  }));
}

function cloneScreens(screens: WorkflowScreen[]): WorkflowScreen[] {
  return screens.map((screen) => ({ ...screen }));
}

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
      type: "routed",
      data: {
        connectionType: e.edgeType === "conditional" ? "Decision tree" : e.label === "End" ? "End" : "Trigger",
        condition: e.condition,
      },
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
    style: _base.nodes.find((node) => node.id === n.id)?.style,
  }));
  const wfEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
    edgeType: (e.data?.connectionType === "Decision tree" ? "conditional" : "default") as "conditional" | "default",
    condition: typeof e.data?.condition === "string" ? e.data.condition : undefined,
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
  const [nodePanelTab, setNodePanelTab] = useState<"details" | "connections">("details");
  const [pendingConnection, setPendingConnection] = useState<{ source: string; type: NodeConnectionType } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [drawer, setDrawer] = useState<"none" | "validate" | "simulate" | "history">("none");
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [designerMode, setDesignerMode] = useState<"workflow" | "screens">("workflow");
  const [screens, setScreens] = useState<WorkflowScreen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [screenPreviewOpen, setScreenPreviewOpen] = useState(false);
  const [designerHistory, setDesignerHistory] = useState<DesignerHistory>({ entries: [], index: -1 });
  const [historyMenu, setHistoryMenu] = useState<"undo" | "redo" | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<SavedWorkflowSnapshot[]>([]);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [restoreSave, setRestoreSave] = useState<SavedWorkflowSnapshot | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationVariables, setSimulationVariables] = useState('{\n  "priority": "STAT",\n  "result": 1\n}');
  const [simulationError, setSimulationError] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [nodeDragging, setNodeDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [pinnedRoutes, setPinnedRoutes] = useState<Record<string, { x: number; y: number }[]> | null>(null);
  const layoutGuard = useRef("");
  const flowRef = useRef<ReactFlowInstance<WfFlowNode, Edge> | null>(null);

  useEffect(() => {
    if (!id) return;
    const def = workflowService.get(id);
    if (!def) {
      navigate("/app/workflows");
      return;
    }
    setWorkflow(def);
    setPinnedRoutes(null);
    setNodes(toFlowNodes(def, plugins));
    setEdges(toFlowEdges(def));
    const savedScreens = readScreens(def.id, def.name);
    setScreens(savedScreens);
    setSelectedScreenId(savedScreens[0]?.id ?? "");
    setSavedSnapshots(readSavedSnapshots(def.id));
    setCloneName(`${def.name} copy`);
    setIsDirty(false);
    setDesignerHistory({
      entries: [{
        nodes: cloneNodes(toFlowNodes(def, plugins)),
        edges: cloneEdges(toFlowEdges(def)),
        screens: cloneScreens(savedScreens),
        label: "Workflow opened",
        timestamp: Date.now(),
      }],
      index: 0,
    });
  }, [id, navigate, plugins, setNodes, setEdges]);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  );
  const layoutEdges = useMemo(
    () => edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    [edges]
  );
  const layoutNodes = useMemo(() => nodes.map(flowBox), [nodes]);
  const routing = useMemo(() => {
    if (pinnedRoutes && !nodeDragging) return { routes: pinnedRoutes, crossings: 0, throughNodes: 0 };
    if (pinnedRoutes && nodeDragging && draggedNodeId) {
      return rerouteMoved(layoutNodes, layoutEdges, pinnedRoutes, draggedNodeId, { thorough: false });
    }
    return routeWorkflow(layoutNodes, layoutEdges, { avoidCrossings: !nodeDragging });
  }, [draggedNodeId, layoutEdges, layoutNodes, nodeDragging, pinnedRoutes]);
  const selectedScreen = screens.find((screen) => screen.id === selectedScreenId) ?? screens[0];

  const recordHistory = (
    nextNodes: WfFlowNode[],
    nextEdges: Edge[],
    nextScreens: WorkflowScreen[],
    label: string,
    coalesce = false,
  ) => {
    const now = Date.now();
    setIsDirty(true);
    const entry: DesignerHistoryEntry = {
      nodes: cloneNodes(nextNodes),
      edges: cloneEdges(nextEdges),
      screens: cloneScreens(nextScreens),
      label,
      timestamp: now,
    };
    setDesignerHistory((current) => {
      const active = current.entries.slice(0, current.index + 1);
      const last = active.at(-1);
      const next =
        coalesce && last && last.label === label && now - last.timestamp < 900
          ? [...active.slice(0, -1), entry]
          : [...active, entry];
      const limited = next.slice(-6);
      return { entries: limited, index: limited.length - 1 };
    });
  };

  const persistScreens = (next: WorkflowScreen[], label: string, coalesce = false) => {
    if (!workflow) return;
    setScreens(next);
    localStorage.setItem(`carescope.workflowScreens.${workflow.id}`, JSON.stringify(next));
    recordHistory(nodes, edges, next, label, coalesce);
  };

  const updateScreen = (patch: Partial<WorkflowScreen>) => {
    if (!selectedScreen) return;
    const field = Object.keys(patch)[0];
    const fieldLabel = field === "name"
      ? "screen name"
      : field === "title"
        ? "page title"
        : field === "description"
          ? "screen instructions"
          : field === "fields"
            ? "screen fields"
            : "primary action";
    persistScreens(
      screens.map((screen) => screen.id === selectedScreen.id ? { ...screen, ...patch } : screen),
      `Edited ${fieldLabel}`,
      true,
    );
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
    persistScreens([...screens, screen], `Added screen: ${screen.name}`);
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

  useEffect(() => {
    if (!workflow || nodes.length < 2) return;
    const sameGraph =
      nodes.length === workflow.nodes.length &&
      nodes.every((node) => workflow.nodes.some((item) => item.id === node.id));
    if (!sameGraph) return;
    if (layoutGuard.current === workflow.id) return;
    const boxes = nodes.map(flowBox);
    const links = edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
    let cancelled = false;
    void autoArrange(boxes, links).then((arranged) => {
      if (cancelled) return;
      layoutGuard.current = workflow.id;
      const nextNodes = nodes.map((node) =>
        arranged.positions[node.id] ? { ...node, position: { ...arranged.positions[node.id] } } : node
      );
      setPinnedRoutes(arranged.routes);
      setNodes(nextNodes);
      persistCanvas(nextNodes, edges);
      recordHistory(nextNodes, edges, screens, "Auto arranged workflow");
      setStatusMsg("Arranged the workflow from its connections");
      window.setTimeout(() => flowRef.current?.fitView({ padding: 0.22, duration: 180 }), 40);
    });
    return () => {
      cancelled = true;
    };
  }, [edges, nodes, persistCanvas, screens, setNodes, workflow]);

  const saveCurrentSnapshot = useCallback((label = "Saved workflow") => {
    if (!workflow) return;
    persistCanvas(nodes, edges);
    localStorage.setItem(`carescope.workflowScreens.${workflow.id}`, JSON.stringify(screens));
    const snapshot: SavedWorkflowSnapshot = {
      id: crypto.randomUUID(),
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges),
      screens: cloneScreens(screens),
      triggers: workflow.triggers.map((trigger) => ({ ...trigger })),
      label,
      timestamp: Date.now(),
    };
    const next = [snapshot, ...readSavedSnapshots(workflow.id)].slice(0, 10);
    localStorage.setItem(`carescope.workflowSaves.${workflow.id}`, JSON.stringify(next));
    setSavedSnapshots(next);
    setIsDirty(false);
    return snapshot;
  }, [edges, nodes, persistCanvas, screens, workflow]);

  useEffect(() => {
    if (!workflow || !isDirty) return;
    const saveBeforeClose = () => {
      const snapshot: SavedWorkflowSnapshot = {
        id: crypto.randomUUID(),
        nodes: cloneNodes(nodes),
        edges: cloneEdges(edges),
        screens: cloneScreens(screens),
        triggers: workflow.triggers.map((trigger) => ({ ...trigger })),
        label: "Automatic save",
        timestamp: Date.now(),
      };
      const next = [snapshot, ...readSavedSnapshots(workflow.id)].slice(0, 10);
      localStorage.setItem(`carescope.workflowSaves.${workflow.id}`, JSON.stringify(next));
      localStorage.setItem(`carescope.workflowScreens.${workflow.id}`, JSON.stringify(screens));
    };
    window.addEventListener("beforeunload", saveBeforeClose);
    return () => window.removeEventListener("beforeunload", saveBeforeClose);
  }, [edges, isDirty, nodes, screens, workflow]);

  const confirmRestoreSave = () => {
    if (!restoreSave || !workflow) return;
    saveCurrentSnapshot("Automatic save before restore");
    const restoredNodes = cloneNodes(restoreSave.nodes);
    const restoredEdges = cloneEdges(restoreSave.edges);
    const restoredScreens = cloneScreens(restoreSave.screens);
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setScreens(restoredScreens);
    localStorage.setItem(`carescope.workflowScreens.${workflow.id}`, JSON.stringify(restoredScreens));
    persistCanvas(restoredNodes, restoredEdges, restoreSave.triggers);
    setDesignerHistory({
      entries: [{ ...restoreSave, nodes: restoredNodes, edges: restoredEdges, screens: restoredScreens }],
      index: 0,
    });
    setSelectedId(null);
    setSelectedScreenId(restoredScreens[0]?.id ?? "");
    setStatusMsg(`Restored save from ${new Date(restoreSave.timestamp).toLocaleString()}`);
    setRestoreSave(null);
    setSaveMenuOpen(false);
    setIsDirty(false);
  };

  const restoreHistory = useCallback((index: number) => {
    const entry = designerHistory.entries[index];
    if (!entry || !workflow) return;
    const restoredNodes = cloneNodes(entry.nodes);
    const restoredEdges = cloneEdges(entry.edges);
    const restoredScreens = cloneScreens(entry.screens);
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setScreens(restoredScreens);
    localStorage.setItem(`carescope.workflowScreens.${workflow.id}`, JSON.stringify(restoredScreens));
    persistCanvas(restoredNodes, restoredEdges);
    setDesignerHistory((current) => ({ ...current, index }));
    setSelectedId((current) => restoredNodes.some((node) => node.id === current) ? current : null);
    setSelectedScreenId((current) => restoredScreens.some((screen) => screen.id === current) ? current : (restoredScreens[0]?.id ?? ""));
    setStatusMsg(index < designerHistory.index ? `Undid to: ${entry.label}` : `Redid: ${entry.label}`);
  }, [designerHistory, persistCanvas, setEdges, setNodes, workflow]);

  const undoHistory = useCallback(() => {
    if (designerHistory.index > 0) restoreHistory(designerHistory.index - 1);
  }, [designerHistory.index, restoreHistory]);

  const redoHistory = useCallback(() => {
    if (designerHistory.index < designerHistory.entries.length - 1) {
      restoreHistory(designerHistory.index + 1);
    }
  }, [designerHistory, restoreHistory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable ||
        !(event.metaKey || event.ctrlKey)
      ) return;
      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redoHistory();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoHistory();
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoHistory();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redoHistory, undoHistory]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            type: "routed",
            label: "Trigger",
            data: { connectionType: "Trigger" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#5a7366" },
            style: { stroke: "#5a7366" },
          },
          eds
        );
        persistCanvas(nodes, next);
        setPinnedRoutes(null);
        recordHistory(nodes, next, screens, "Connected workflow stages");
        return next;
      });
    },
    [nodes, persistCanvas, screens, setEdges]
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
        recordHistory(next, edges, screens, `Added node: ${newNode.data.label}`);
        return next;
      });
      setSelectedId(newNode.id);
    },
    [edges, persistCanvas, screens, setNodes]
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
      recordHistory(next, edges, screens, "Edited workflow stage", true);
      return next;
    });
  };

  const addNodeConnection = (connection: NewNodeConnection) => {
    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode || connection.source === connection.target) return;
    const label =
      connection.connectionType === "Trigger"
        ? connection.triggerAction ?? "Update Status"
        : connection.connectionType === "Decision tree"
          ? `Decision tree · ${connection.decisions?.length ?? 1}`
          : "End";
    const nextEdge: Edge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      type: "routed",
      label,
      data: {
        connectionType: connection.connectionType,
        triggerAction: connection.triggerAction,
        condition: connection.decisions ? JSON.stringify(connection.decisions) : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: targetNode.data.color ?? "#5a7366" },
      style: { stroke: targetNode.data.color ?? "#5a7366" },
    };
    const nextEdges = [...edges, nextEdge];
    setEdges(nextEdges);
    setPinnedRoutes(null);
    persistCanvas(nodes, nextEdges);
    recordHistory(nodes, nextEdges, screens, `${connection.connectionType} connection: ${sourceNode.data.label} → ${targetNode.data.label}`);
    setPendingConnection(null);
    setNodeContextMenu(null);
    setStatusMsg(`Connected ${sourceNode.data.label} to ${targetNode.data.label}`);
  };

  const deleteNodeConnection = (edgeId: string) => {
    const nextEdges = edges.filter((edge) => edge.id !== edgeId);
    setEdges(nextEdges);
    setPinnedRoutes(null);
    persistCanvas(nodes, nextEdges);
    recordHistory(nodes, nextEdges, screens, "Removed node connection");
  };

  const applyArrangement = (nextNodes: WfFlowNode[], label: string) => {
    setNodes(nextNodes);
    persistCanvas(nextNodes, edges);
    recordHistory(nextNodes, edges, screens, label);
  };

  const handleAutoArrange = () => {
    if (!workflow) return;
    const boxes = nodes.map(flowBox);
    const links = edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
    void autoArrange(boxes, links).then((arranged) => {
      const nextNodes = nodes.map((node) =>
        arranged.positions[node.id] ? { ...node, position: { ...arranged.positions[node.id] } } : node
      );
      layoutGuard.current = workflow.id;
      setPinnedRoutes(arranged.routes);
      applyArrangement(nextNodes, "Auto arranged workflow");
      setStatusMsg("Auto arranged the workflow");
      window.setTimeout(() => flowRef.current?.fitView({ padding: 0.22, duration: 180 }), 40);
    });
  };

  const handleCleanUp = () => {
    const boxes = nodes.map(flowBox);
    const links = edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
    const report = routeWorkflow(boxes, links);
    const current = pinnedRoutes ? measureRoutes(boxes, links, pinnedRoutes) : null;
    const improved = !current || report.crossings < current.crossings || (report.crossings === current.crossings && report.throughNodes < current.throughNodes);
    if (improved) setPinnedRoutes(report.routes);
    const shown = improved ? report : current ?? report;
    setNodeDragging(false);
    if (shown.crossings === 0 && shown.throughNodes === 0) {
      setStatusMsg(improved ? "Cleaned up connections" : "Connections are clear");
      return;
    }
    setStatusMsg(
      shown.throughNodes === 0
        ? `Cleaned up connections · ${shown.crossings} crossing${shown.crossings === 1 ? "" : "s"} remain`
        : `Rerouted connections around the stages`
    );
  };

  const handleSave = () => {
    if (!workflow) return;
    setSaving(true);
    saveCurrentSnapshot("Manual save");
    setStatusMsg("Saved");
    setTimeout(() => {
      setSaving(false);
      setStatusMsg("");
    }, 1200);
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
    setSimulationRunning(true);
    persistCanvas(nodes, edges);
    try {
      setSimulationError("");
      const variables = JSON.parse(simulationVariables) as Record<string, unknown>;
      const result = await workflowService.simulate(workflow.id, {
        variables,
        eventPayload: variables,
        entityData: variables,
      });
      setSimResult(result);
    } catch {
      setSimulationError("Enter valid JSON simulation data before running.");
    } finally {
      setSimulationRunning(false);
    }
  };

  const handleClone = () => {
    if (!workflow || !cloneName.trim()) return;
    const cloned = workflowService.clone(workflow.id, cloneName.trim());
    if (cloned) {
      localStorage.setItem(`carescope.workflowScreens.${cloned.id}`, JSON.stringify(cloneScreens(screens)));
      setCloneOpen(false);
      navigate(`/app/workflows/${cloned.id}`);
    }
  };

  const canUndo = designerHistory.index > 0;
  const canRedo = designerHistory.index >= 0 && designerHistory.index < designerHistory.entries.length - 1;
  const previousHistory = designerHistory.entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ index }) => index < designerHistory.index)
    .reverse()
    .slice(0, 5);
  const redoHistoryEntries = designerHistory.entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ index }) => index > designerHistory.index)
    .slice(0, 5);

  if (!workflow) {
    return <div className="page">Loading…</div>;
  }

  return (
    <div className={`designer-layout${designerMode === "screens" ? " is-screen-designer" : ""}`}>
      {designerMode === "workflow" ? (
        <NodeDetailsPanel
          selected={selected}
          nodes={nodes}
          edges={edges}
          initialTab={nodePanelTab}
          onChangeNode={onChangeNode}
          onAddConnection={addNodeConnection}
          onDeleteConnection={deleteNodeConnection}
        />
      ) : (
        <aside className="workflow-screen-list">
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
          <div className="workflow-toolbar-brand"><Link to="/app/workflows" aria-label="Back to workflows">←</Link><div><span>Workflow Designer</span><b>{workflow.name}</b></div></div>
          <div className="workflow-designer-mode" role="group" aria-label="Designer mode">
            <button type="button" className={designerMode === "workflow" ? "is-on" : undefined} onClick={() => setDesignerMode("workflow")}>Workflow logic</button>
            <button type="button" className={designerMode === "screens" ? "is-on" : undefined} onClick={() => setDesignerMode("screens")}>Screen design</button>
          </div>
          <div className="workflow-history-controls" role="group" aria-label="Workflow edit history">
            <div className="designer-split-control">
              <button type="button" className="btn" onClick={undoHistory} disabled={!canUndo} title="Undo (Ctrl/Command + Z)">↶ Undo</button>
              <button type="button" className="btn split-chevron" aria-label="Show undo history" disabled={!previousHistory.length} onClick={() => setHistoryMenu((current) => current === "undo" ? null : "undo")}>⌄</button>
              {historyMenu === "undo" ? (
                <div className="designer-action-menu">
                  <b>Undo to</b>
                  {previousHistory.map(({ entry, index }) => <button type="button" key={`${entry.timestamp}-${index}`} onClick={() => { restoreHistory(index); setHistoryMenu(null); }}><span>{entry.label}</span><small>{new Date(entry.timestamp).toLocaleTimeString()}</small></button>)}
                </div>
              ) : null}
            </div>
            <div className="designer-split-control">
              <button type="button" className="btn" onClick={redoHistory} disabled={!canRedo} title="Redo (Ctrl/Command + Shift + Z)">↷ Redo</button>
              <button type="button" className="btn split-chevron" aria-label="Show redo history" disabled={!redoHistoryEntries.length} onClick={() => setHistoryMenu((current) => current === "redo" ? null : "redo")}>⌄</button>
              {historyMenu === "redo" ? (
                <div className="designer-action-menu">
                  <b>Redo to</b>
                  {redoHistoryEntries.map(({ entry, index }) => <button type="button" key={`${entry.timestamp}-${index}`} onClick={() => { restoreHistory(index); setHistoryMenu(null); }}><span>{entry.label}</span><small>{new Date(entry.timestamp).toLocaleTimeString()}</small></button>)}
                </div>
              ) : null}
            </div>
          </div>
          <span className="spacer" />
          {statusMsg ? <span style={{ color: "var(--accent)", fontSize: "0.75rem" }}>{statusMsg}</span> : null}
          {designerMode === "workflow" ? (
            <>
              <div className="designer-split-control save-control">
                <button type="button" className="btn" onClick={handleSave} disabled={saving}>Save</button>
                <button type="button" className="btn split-chevron" aria-label="Show recent saves" onClick={() => setSaveMenuOpen((open) => !open)}>⌄</button>
                {saveMenuOpen ? (
                  <div className="designer-action-menu save-menu">
                    <b>Recent saves</b>
                    {savedSnapshots.length ? savedSnapshots.map((snapshot) => (
                      <button type="button" key={snapshot.id} onClick={() => setRestoreSave(snapshot)}>
                        <span>{snapshot.label}</span><small>{new Date(snapshot.timestamp).toLocaleString()}</small>
                      </button>
                    )) : <p>No saved versions yet</p>}
                  </div>
                ) : null}
              </div>
              <button type="button" className="btn" onClick={handleAutoArrange}>Auto Arrange</button>
              <button type="button" className="btn" onClick={handleCleanUp}>Clean Up Connections</button>
              <button type="button" className="btn" onClick={() => { setSimResult(null); setSimulateOpen(true); }}>Simulate</button>
              <button type="button" className="btn" onClick={() => { setCloneName(`${workflow.name} copy`); setCloneOpen(true); }}>Clone</button>
              <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={workflow.status === "published"}>Publish</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!selectedScreen} onClick={() => setScreenPreviewOpen(true)}>Preview screen</button>
          )}
        </div>
        <div className="canvas-host">
          {designerMode === "workflow" ? (
            <WorkflowRoutesContext.Provider value={routing.routes}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onInit={(instance) => { flowRef.current = instance; }}
              onNodesChange={(changes) => onNodesChange(changes)}
              onEdgesChange={(changes) => onEdgesChange(changes)}
              onNodeDragStart={(_, draggedNode) => {
                setDraggedNodeId(draggedNode.id);
                setNodeDragging(true);
              }}
              onNodeDragStop={(_, draggedNode) => {
                setNodeDragging(false);
                setDraggedNodeId(null);
                const next = nodes.map((node) => node.id === draggedNode.id ? { ...node, position: { ...draggedNode.position } } : node);
                const links = edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
                const boxes = next.map(flowBox);
                setNodes(next);
                const affected = pinnedRoutes
                  ? rerouteMoved(boxes, links, pinnedRoutes, draggedNode.id, { thorough: true })
                  : routeWorkflow(boxes, links);
                const full = affected.crossings > 0 ? routeWorkflow(boxes, links) : affected;
                setPinnedRoutes(full.crossings < affected.crossings ? full.routes : affected.routes);
                persistCanvas(next, edges);
                recordHistory(next, edges, screens, `Moved node: ${(draggedNode.data as WfFlowNode["data"]).label}`);
              }}
              onDelete={({ nodes: deletedNodes, edges: deletedEdges }) => {
                const deletedNodeIds = new Set(deletedNodes.map((node) => node.id));
                const deletedEdgeIds = new Set(deletedEdges.map((edge) => edge.id));
                const nextNodes = nodes.filter((node) => !deletedNodeIds.has(node.id));
                const nextEdges = edges.filter((edge) =>
                  !deletedEdgeIds.has(edge.id) &&
                  !deletedNodeIds.has(edge.source) &&
                  !deletedNodeIds.has(edge.target)
                );
                persistCanvas(nextNodes, nextEdges);
                recordHistory(
                  nextNodes,
                  nextEdges,
                  screens,
                  deletedNodes.length ? `Deleted ${deletedNodes.length} workflow stage${deletedNodes.length === 1 ? "" : "s"}` : "Deleted workflow connection"
                );
              }}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeDoubleClick={(_, node) => {
                setSelectedId(node.id);
                setNodePanelTab("details");
                setNodeContextMenu(null);
              }}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setSelectedId(node.id);
                setNodePanelTab("connections");
                setNodeContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
              }}
              onNodeClick={(_, node) => {
                if (pendingConnection && pendingConnection.source !== node.id) {
                  addNodeConnection({ source: pendingConnection.source, target: node.id, connectionType: pendingConnection.type });
                }
              }}
              onPaneClick={() => setNodeContextMenu(null)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: "routed" }}
              connectionLineType={ConnectionLineType.Step}
              fitView
              deleteKeyCode={["Backspace", "Delete"]}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#2a3a32" />
              <Controls />
              <MiniMap nodeColor={(n) => (n.data as WfFlowNode["data"])?.color ?? "#2dd4a8"} maskColor="rgba(15,23,20,0.7)" />
            </ReactFlow>
            </WorkflowRoutesContext.Provider>
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

      {nodeContextMenu ? (
        <div className="node-context-menu" style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}>
          <p>Add node connection</p>
          {(["Trigger", "Decision tree", "End"] as NodeConnectionType[]).map((type) => (
            <button type="button" key={type} onClick={() => {
              setPendingConnection({ source: nodeContextMenu.nodeId, type });
              setNodeContextMenu(null);
              setStatusMsg(`Select the destination node for the ${type.toLowerCase()} connection`);
            }}>{type}<span>→</span></button>
          ))}
        </div>
      ) : null}

      {pendingConnection ? <div className="connection-mode-banner"><span>Connection mode</span>Select the destination node<button type="button" onClick={() => setPendingConnection(null)}>Cancel</button></div> : null}

      {screenPreviewOpen && selectedScreen ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setScreenPreviewOpen(false)}>
          <div className="lims-modal lims-modal-wide workflow-screen-preview-modal" role="dialog" aria-modal="true" aria-label={`${selectedScreen.name} preview`} onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar"><h2>{selectedScreen.name} preview</h2><button type="button" className="btn" onClick={() => setScreenPreviewOpen(false)}>Close preview</button></div>
            <WorkflowScreenMock screen={selectedScreen} />
          </div>
        </div>
      ) : null}

      {simulateOpen ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setSimulateOpen(false)}>
          <div className="lims-modal lims-modal-wide workflow-simulation-dialog" role="dialog" aria-modal="true" aria-labelledby="simulate-workflow-title" onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar"><div><p className="lims-eyebrow">Test workflow</p><h2 id="simulate-workflow-title">Simulate {workflow.name}</h2></div><button type="button" className="btn" onClick={() => setSimulateOpen(false)}>Close</button></div>
            <div className="workflow-simulation-body">
              <section>
                <h3>Simulation data</h3>
                <p>Enter representative workflow variables as JSON. The simulation does not change production records.</p>
                <label className="simulation-json-field">Variables<textarea value={simulationVariables} onChange={(event) => setSimulationVariables(event.target.value)} spellCheck={false} /></label>
                {simulationError ? <p className="workflow-preview-notice is-error" role="alert">{simulationError}</p> : null}
                <button type="button" className="btn btn-primary" onClick={handleSimulate} disabled={simulationRunning}>{simulationRunning ? "Running…" : "Run simulation"}</button>
              </section>
              <section className="simulation-results">
                <h3>Simulation result</h3>
                {simResult ? (
                  <>
                    <div className="simulation-summary"><span>Outcome <b>{simResult.outcome}</b></span><span>Path <b>{simResult.path.length} stages</b></span><span>Status <b>{simResult.execution.status}</b></span></div>
                    <div className="simulation-log">
                      {simResult.logs.map((log) => <div key={log.id} className={`log-entry ${log.level}`}><span className="ts">{new Date(log.timestamp).toLocaleTimeString()} </span>[{log.event}] {log.message}</div>)}
                    </div>
                  </>
                ) : <div className="empty-state"><h2>Ready to simulate</h2><p>Run the workflow to inspect its path, outcome, and execution log.</p></div>}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {cloneOpen ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setCloneOpen(false)}>
          <div className="lims-modal workflow-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clone-workflow-title" onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar"><div><p className="lims-eyebrow">Clone entire workflow</p><h2 id="clone-workflow-title">Create a workflow copy</h2></div><button type="button" className="btn" onClick={() => setCloneOpen(false)}>Close</button></div>
            <div className="workflow-confirm-body">
              <p>This copies every node, branch, trigger, and screen from <b>{workflow.name}</b>. The copy will appear in the same module section.</p>
              <label>New workflow name<input value={cloneName} onChange={(event) => setCloneName(event.target.value)} autoFocus /></label>
              <div className="lims-modal-actions"><button type="button" className="btn" onClick={() => setCloneOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" disabled={!cloneName.trim()} onClick={handleClone}>Clone workflow</button></div>
            </div>
          </div>
        </div>
      ) : null}

      {restoreSave ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setRestoreSave(null)}>
          <div className="lims-modal workflow-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="restore-save-title" onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar"><div><p className="lims-eyebrow">Restore saved workflow</p><h2 id="restore-save-title">Return to a previous save?</h2></div><button type="button" className="btn" onClick={() => setRestoreSave(null)}>Close</button></div>
            <div className="workflow-confirm-body">
              <p>You are about to return to <b>{restoreSave.label}</b> from {new Date(restoreSave.timestamp).toLocaleString()}.</p>
              <p>Your current workflow will be saved automatically with a timestamp before the previous save is restored.</p>
              <div className="lims-modal-actions"><button type="button" className="btn" onClick={() => setRestoreSave(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={confirmRestoreSave}>Save current and restore</button></div>
            </div>
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
