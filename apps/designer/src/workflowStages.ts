import { useEffect, useState } from "react";
import { currentInstanceId, currentLabId as sessionLabId, moduleStorageKey, readJson, writeJson } from "./storageScope";

export type StageIconId = "inbox" | "tag" | "flask" | "activity" | "eye" | "check" | "beaker" | "flag" | "diamond";

export type WorkflowStage = {
  id: string;
  label: string;
  color: string;
  icon: StageIconId;
};

export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  { id: "received", label: "Received", color: "#6b7280", icon: "inbox" },
  { id: "accessioning", label: "Accessioning", color: "#111111", icon: "tag" },
  { id: "processing", label: "Processing", color: "#7c3aed", icon: "flask" },
  { id: "testing", label: "Testing", color: "#1b6ef3", icon: "activity" },
  { id: "review", label: "Review", color: "#eab308", icon: "eye" },
  { id: "released", label: "Released", color: "#16a34a", icon: "check" },
];

export const STAGE_ICON_OPTIONS: { id: StageIconId; label: string }[] = [
  { id: "inbox", label: "Received" },
  { id: "tag", label: "Accessioning" },
  { id: "flask", label: "Processing" },
  { id: "activity", label: "Testing" },
  { id: "eye", label: "Review" },
  { id: "check", label: "Released" },
  { id: "beaker", label: "Lab" },
  { id: "flag", label: "Hold" },
  { id: "diamond", label: "Custom" },
];

const STORE = "carescope.workflowStages.v1";
const EVENT = "carescope-workflow-stages";
const DEFAULT_LAB = "default";

function stagesKey(instanceId = currentInstanceId()): string {
  return moduleStorageKey("lab_operations", "workflow_stages", instanceId);
}

type StageMap = Record<string, WorkflowStage[]>;

function isHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

function isIcon(value: string): value is StageIconId {
  return STAGE_ICON_OPTIONS.some((item) => item.id === value);
}

export function currentLabId(): string {
  return sessionLabId() || DEFAULT_LAB;
}

function readMap(): StageMap {
  const parsed = readJson<StageMap>(stagesKey(), [STORE]);
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function normalizeStages(saved: WorkflowStage[] | undefined): WorkflowStage[] {
  const incoming = Array.isArray(saved) ? saved : [];
  const cleaned = incoming
    .filter((stage) => stage && typeof stage.id === "string" && stage.id.trim())
    .map((stage, index) => ({
      id: stage.id.trim(),
      label: stage.label?.trim() || `Stage ${index + 1}`,
      color: isHex(stage.color) ? stage.color : "#6b7280",
      icon: isIcon(stage.icon) ? stage.icon : "diamond",
    }));
  const seen = new Set<string>();
  const unique = cleaned.filter((stage) => {
    if (seen.has(stage.id)) return false;
    seen.add(stage.id);
    return true;
  });
  return unique.length ? unique : DEFAULT_WORKFLOW_STAGES;
}

export function readWorkflowStages(labId = currentLabId()): WorkflowStage[] {
  const map = readMap();
  return normalizeStages(map[labId] ?? (labId === DEFAULT_LAB ? undefined : map[DEFAULT_LAB]));
}

export function saveWorkflowStages(stages: WorkflowStage[], labId = currentLabId() || DEFAULT_LAB): void {
  const map = readMap();
  map[labId] = normalizeStages(stages);
  writeJson(stagesKey(), map);
  window.dispatchEvent(new Event(EVENT));
}

export function addWorkflowStage(labId = currentLabId()): WorkflowStage {
  const stages = readWorkflowStages(labId);
  const id = `stage-${Date.now().toString(36)}`;
  const stage: WorkflowStage = {
    id,
    label: "New stage",
    color: "#64748b",
    icon: "diamond",
  };
  saveWorkflowStages([...stages, stage], labId);
  return stage;
}

export function useWorkflowStages(labId?: string): WorkflowStage[] {
  const target = labId ?? currentLabId();
  const [stages, setStages] = useState(() => readWorkflowStages(target));
  useEffect(() => {
    const sync = () => setStages(readWorkflowStages(target));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [target]);
  return stages;
}

export function stageById(stages: WorkflowStage[], id: string): WorkflowStage | undefined {
  return stages.find((stage) => stage.id === id);
}
