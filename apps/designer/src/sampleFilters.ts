import type { SampleCondition, SampleRecord } from "./samples";

export type QuickFilter = "all" | `stage:${string}` | `priority:${string}`;

export function matchesQuickFilter(sample: SampleRecord, filter: QuickFilter): boolean {
  if (filter === "all") return true;
  if (filter.startsWith("priority:")) return sample.priority === filter.slice("priority:".length);
  if (filter.startsWith("stage:")) return sample.status === filter.slice("stage:".length);
  return true;
}

export function matchesConditionFilter(sample: SampleRecord, selected: SampleCondition[]): boolean {
  return selected.length === 0 || selected.includes(sample.condition);
}
