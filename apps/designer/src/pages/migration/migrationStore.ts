import { useSyncExternalStore } from "react";
import { cloneTemplate, type DuplicateDecision, type MigrationState } from "./migrationModel";

let state: MigrationState = cloneTemplate("sunquest");
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState() {
  return state;
}

export function useMigration() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function applyTemplate(templateId: string) {
  state = cloneTemplate(templateId);
  emit();
}

export function markFileLoaded(fileId: string) {
  state = {
    ...state,
    evidenceAt: null,
    files: state.files.map((file) => (file.id === fileId ? { ...file, status: "loaded" } : file)),
  };
  emit();
}

export function setSequenceField(mapId: string, sequenceField: string) {
  state = {
    ...state,
    evidenceAt: null,
    maps: state.maps.map((row) => (row.id === mapId ? { ...row, sequenceField, review: sequenceField ? row.review : false } : row)),
  };
  emit();
}

export function acceptMapping(mapId: string) {
  state = {
    ...state,
    evidenceAt: null,
    maps: state.maps.map((row) => (row.id === mapId && row.sequenceField ? { ...row, review: false } : row)),
  };
  emit();
}

export function resolveIssue(issueId: string) {
  state = {
    ...state,
    evidenceAt: null,
    issues: state.issues.map((issue) => (issue.id === issueId ? { ...issue, resolved: true } : issue)),
  };
  emit();
}

export function decideDuplicate(pairId: string, decision: DuplicateDecision) {
  state = {
    ...state,
    evidenceAt: null,
    duplicates: state.duplicates.map((pair) => (pair.id === pairId ? { ...pair, decision } : pair)),
  };
  emit();
}

export function selectCompare(compareId: string) {
  state = { ...state, compareId };
  emit();
}

export function stampEvidence(generatedAt: string) {
  state = { ...state, evidenceAt: generatedAt };
  emit();
}
