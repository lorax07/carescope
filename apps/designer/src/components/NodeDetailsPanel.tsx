import { useEffect, useMemo, useState } from "react";
import type { Edge } from "@xyflow/react";
import type { WfFlowNode } from "./WorkflowNode";

export type NodeConnectionType = "Trigger" | "Decision tree" | "End";

export type DecisionChoice = {
  operator: string;
  value: string;
  outcome: string;
};

export type NewNodeConnection = {
  source: string;
  target: string;
  connectionType: NodeConnectionType;
  triggerAction?: string;
  decisions?: DecisionChoice[];
};

const TRIGGER_ACTIONS = [
  "Update Status",
  "Assign / Route",
  "Create Task",
  "Send Notification",
  "Perform Test",
  "Calculate Result",
  "Release Result",
  "Move Specimen",
  "Create Aliquot",
  "Send Integration",
] as const;

const OPERATORS = ["If", "If not", "When", "Unless"] as const;
const VALUES = ["Result", "Status", "Priority", "Test", "Client", "Instrument", "Location", "Assignee"] as const;
const OUTCOMES = ["Then continue", "Then route", "Then stop", "Then notify", "Then review"] as const;

function emptyDecision(): DecisionChoice {
  return { operator: "If", value: "Result", outcome: "Then continue" };
}

export function NodeDetailsPanel({
  selected,
  nodes,
  edges,
  initialTab = "details",
  onChangeNode,
  onAddConnection,
  onDeleteConnection,
}: {
  selected: WfFlowNode | null;
  nodes: WfFlowNode[];
  edges: Edge[];
  initialTab?: "details" | "connections";
  onChangeNode: (id: string, patch: { label?: string; description?: string; config?: Record<string, unknown> }) => void;
  onAddConnection: (connection: NewNodeConnection) => void;
  onDeleteConnection: (edgeId: string) => void;
}) {
  const [tab, setTab] = useState<"details" | "connections">(initialTab);
  const [connectionType, setConnectionType] = useState<NodeConnectionType>("Trigger");
  const [triggerAction, setTriggerAction] = useState<(typeof TRIGGER_ACTIONS)[number]>("Update Status");
  const [targetId, setTargetId] = useState("");
  const [decisionCount, setDecisionCount] = useState(2);
  const [decisions, setDecisions] = useState<DecisionChoice[]>([emptyDecision(), emptyDecision()]);

  useEffect(() => {
    setTab(initialTab);
    setTargetId("");
  }, [initialTab, selected?.id]);

  useEffect(() => {
    setDecisions((current) => Array.from({ length: decisionCount }, (_, index) => current[index] ?? emptyDecision()));
  }, [decisionCount]);

  const relatedEdges = useMemo(
    () => selected ? edges.filter((edge) => edge.source === selected.id || edge.target === selected.id) : [],
    [edges, selected]
  );

  const availableTargets = nodes.filter((node) => node.id !== selected?.id);

  return (
    <aside className="node-details-sidebar">
      <div className="node-sidebar-tabs" role="tablist" aria-label="Node editor">
        <button type="button" role="tab" aria-selected={tab === "details"} className={tab === "details" ? "is-active" : undefined} onClick={() => setTab("details")}>Node details</button>
        <button type="button" role="tab" aria-selected={tab === "connections"} className={tab === "connections" ? "is-active" : undefined} onClick={() => setTab("connections")}>Connections</button>
      </div>

      {!selected ? (
        <div className="node-sidebar-empty">
          <span className="node-sidebar-empty-mark">⌁</span>
          <h2>Choose a workflow node</h2>
          <p>Double-click a node to inspect its details and connections.</p>
        </div>
      ) : tab === "details" ? (
        <div className="node-sidebar-body">
          <div className="node-sidebar-heading"><span style={{ background: selected.data.color ?? "#1b6ef3" }} /><div><p>Selected node</p><h2>{selected.data.label}</h2></div></div>
          <label>Node name<input value={selected.data.label} onChange={(event) => onChangeNode(selected.id, { label: event.target.value })} /></label>
          <label>Node type<input value={selected.data.nodeType.replace(/_/g, " ")} disabled /></label>
          <label>Description<textarea value={selected.data.description ?? ""} onChange={(event) => onChangeNode(selected.id, { description: event.target.value })} /></label>
          <div className="node-detail-summary"><span>Incoming <b>{relatedEdges.filter((edge) => edge.target === selected.id).length}</b></span><span>Outgoing <b>{relatedEdges.filter((edge) => edge.source === selected.id).length}</b></span></div>
        </div>
      ) : (
        <div className="node-sidebar-body">
          <div className="node-sidebar-heading"><span style={{ background: selected.data.color ?? "#1b6ef3" }} /><div><p>Build one connection</p><h2>{selected.data.label}</h2></div></div>
          <label>From node<select value={selected.id} disabled><option value={selected.id}>{selected.data.label}</option></select></label>
          <label>Connection type<select value={connectionType} onChange={(event) => setConnectionType(event.target.value as NodeConnectionType)}><option>Trigger</option><option>Decision tree</option><option>End</option></select></label>

          {connectionType === "Trigger" ? (
            <label>Trigger action<select value={triggerAction} onChange={(event) => setTriggerAction(event.target.value as (typeof TRIGGER_ACTIONS)[number])}>{TRIGGER_ACTIONS.map((action) => <option key={action}>{action}</option>)}</select></label>
          ) : null}

          {connectionType === "Decision tree" ? (
            <div className="decision-builder">
              <label>Number of decisions<input type="number" min={1} max={8} value={decisionCount} onChange={(event) => setDecisionCount(Math.min(8, Math.max(1, Number(event.target.value))))} /></label>
              {decisions.map((decision, index) => (
                <fieldset key={index}>
                  <legend>Decision {index + 1}</legend>
                  <select aria-label={`Decision ${index + 1} operator`} value={decision.operator} onChange={(event) => setDecisions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, operator: event.target.value } : item))}>{OPERATORS.map((item) => <option key={item}>{item}</option>)}</select>
                  <select aria-label={`Decision ${index + 1} value`} value={decision.value} onChange={(event) => setDecisions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}>{VALUES.map((item) => <option key={item}>{item}</option>)}</select>
                  <select aria-label={`Decision ${index + 1} outcome`} value={decision.outcome} onChange={(event) => setDecisions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, outcome: event.target.value } : item))}>{OUTCOMES.map((item) => <option key={item}>{item}</option>)}</select>
                </fieldset>
              ))}
            </div>
          ) : null}

          <label>To node<select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Select destination node</option>{availableTargets.map((node) => <option key={node.id} value={node.id}>{node.data.label}</option>)}</select></label>
          <button type="button" className="btn btn-primary node-add-connection" disabled={!targetId} onClick={() => {
            onAddConnection({
              source: selected.id,
              target: targetId,
              connectionType,
              triggerAction: connectionType === "Trigger" ? triggerAction : undefined,
              decisions: connectionType === "Decision tree" ? decisions : undefined,
            });
            setTargetId("");
          }}>Add connection</button>

          <div className="node-connection-list">
            <div><p>Connected lines</p><span>{relatedEdges.length}</span></div>
            {relatedEdges.map((edge) => {
              const outbound = edge.source === selected.id;
              const other = nodes.find((node) => node.id === (outbound ? edge.target : edge.source));
              return <article key={edge.id}><span>{outbound ? "→" : "←"}</span><div><b>{other?.data.label ?? "Unknown node"}</b><small>{typeof edge.label === "string" ? edge.label : "Trigger"}</small></div><button type="button" aria-label={`Remove connection with ${other?.data.label ?? "node"}`} onClick={() => onDeleteConnection(edge.id)}>×</button></article>;
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
