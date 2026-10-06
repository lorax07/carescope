import type { SampleCondition } from "../samples";
import { CONDITION_LABEL } from "../samples";
import type { WorkflowStage } from "../workflowStages";

const ICON = {
  viewBox: "0 0 16 16",
  width: 12,
  height: 12,
  "aria-hidden": true,
} as const;

function StageGlyph({ stage, filled }: { stage: WorkflowStage; filled: boolean }) {
  const color = filled ? stage.color : "#c5cdd8";
  const common = {
    ...ICON,
    fill: filled ? color : "none",
    stroke: color,
    strokeWidth: filled ? 1.2 : 1.45,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (stage.icon === "inbox") {
    return (
      <svg {...common}>
        <path d="M2.2 8.4 3.6 3.8h8.8L13.8 8.4v3.4H2.2V8.4Z" />
        <path d="M2.3 8.5h3.1l.8 1.6h3.6l.8-1.6h3.1" />
      </svg>
    );
  }
  if (stage.icon === "tag") {
    return (
      <svg {...common}>
        <path d="M2.4 8.4 8.3 2.5h5.2v5.2L7.6 13.6 2.4 8.4Z" />
        <circle cx="11" cy="5" r="0.9" fill={filled ? "#fff" : color} stroke="none" />
      </svg>
    );
  }
  if (stage.icon === "flask" || stage.icon === "beaker") {
    return (
      <svg {...common}>
        <path d="M6 2h4M6.6 2v3.4L3.8 12.2A2 2 0 0 0 5.6 15h4.8a2 2 0 0 0 1.8-2.8L9.4 5.4V2" />
        {filled ? <path d="M5.1 10.8h5.8" /> : null}
      </svg>
    );
  }
  if (stage.icon === "activity") {
    return (
      <svg {...common}>
        <path d="M2 8h2.4l1.4-3.2 2.4 6.4L10.2 8H14" />
      </svg>
    );
  }
  if (stage.icon === "eye") {
    return (
      <svg {...common}>
        <path d="M1.8 8c1.6-3 3.8-4.6 6.2-4.6S12.6 5 14.2 8c-1.6 3-3.8 4.6-6.2 4.6S3.4 11 1.8 8Z" />
        <circle cx="8" cy="8" r="1.7" fill={filled ? "#fff" : "none"} />
      </svg>
    );
  }
  if (stage.icon === "check") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6" />
        <path d="m5.2 8.2 1.9 1.9 3.7-3.8" stroke={filled ? "#fff" : color} />
      </svg>
    );
  }
  if (stage.icon === "flag") {
    return (
      <svg {...common}>
        <path d="M4 2.5v11" />
        <path d="M4 3.2h7.2L9.6 6.2 11.2 9H4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 2.2 13.8 8 8 13.8 2.2 8 8 2.2Z" />
    </svg>
  );
}

export function StageConditionCell({
  status,
  condition = "normal",
  stages,
}: {
  status: string;
  condition?: SampleCondition;
  stages: WorkflowStage[];
}) {
  const current = status;
  return (
    <span className="stage-condition">
      <span className="stage-condition-icons" aria-label={stages.find((stage) => stage.id === current)?.label ?? current}>
        {stages.map((stage) => (
          <span
            key={stage.id}
            className={`stage-condition-icon${stage.id === current ? " is-current" : ""}`}
            title={stage.label}
          >
            <StageGlyph stage={stage} filled={stage.id === current} />
          </span>
        ))}
      </span>
      <span className={`stage-condition-text is-${condition}`}>{CONDITION_LABEL[condition]}</span>
    </span>
  );
}
