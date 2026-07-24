import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type WfNodeData = {
  label: string;
  nodeType: string;
  description?: string;
  color?: string;
  config?: Record<string, unknown>;
};

export type WfFlowNode = Node<WfNodeData, "workflow">;

function WorkflowNodeComponent({ data, selected }: NodeProps<WfFlowNode>) {
  return (
    <div className={`wf-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} style={{ background: "#5a7366" }} />
      <div className="wf-node-header">
        <span
          className="wf-node-dot"
          style={{ background: data.color ?? "#2dd4a8" }}
        />
        <span className="wf-node-type">{data.nodeType.replace(/_/g, " ")}</span>
      </div>
      <div className="wf-node-body">
        <div className="wf-node-label">{data.label}</div>
        {data.description ? (
          <div className="wf-node-desc">{data.description}</div>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#2dd4a8" }} />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
