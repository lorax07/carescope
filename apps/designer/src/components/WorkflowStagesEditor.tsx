import { useRef } from "react";
import {
  addWorkflowStage,
  saveWorkflowStages,
  useWorkflowStages,
  type StageIconId,
  type WorkflowStage,
  STAGE_ICON_OPTIONS,
} from "../workflowStages";

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function WorkflowStagesEditor({ labId }: { labId?: string }) {
  const stages = useWorkflowStages(labId);
  const drag = useRef<number | null>(null);

  function update(next: WorkflowStage[]) {
    saveWorkflowStages(next, labId);
  }

  function patch(id: string, changes: Partial<WorkflowStage>) {
    update(stages.map((stage) => (stage.id === id ? { ...stage, ...changes } : stage)));
  }

  return (
    <section className="workflow-stages-editor">
      <p>
        These stages apply to Sequence Operations and every module added to this laboratory. Add a
        stage, set its color, and drag to set the order the sample list uses.
      </p>
      <ol className="lab-ops-drag workflow-stage-list" onDragOver={(event) => event.preventDefault()}>
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            draggable
            onDragStart={() => {
              drag.current = index;
            }}
            onDrop={() => {
              if (drag.current == null) return;
              update(move(stages, drag.current, index));
              drag.current = null;
            }}
          >
            <span aria-hidden="true">⋮⋮</span>
            <input
              aria-label={`${stage.label} name`}
              value={stage.label}
              onChange={(event) => patch(stage.id, { label: event.target.value })}
            />
            <select
              aria-label={`${stage.label} icon`}
              value={stage.icon}
              onChange={(event) => patch(stage.id, { icon: event.target.value as StageIconId })}
            >
              {STAGE_ICON_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="color"
              aria-label={`${stage.label} color`}
              value={stage.color}
              onChange={(event) => patch(stage.id, { color: event.target.value })}
            />
            <button
              type="button"
              className="btn"
              disabled={stages.length < 2}
              onClick={() => update(stages.filter((item) => item.id !== stage.id))}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" onClick={() => addWorkflowStage(labId)}>
        Add stage
      </button>
    </section>
  );
}
