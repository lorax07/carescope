/** Stand-in counts until priority rules are defined. */
export const PRIORITY_BOUNCE_MS = 30 * 60 * 1000;

export type PriorityCounts = {
  followUps: number;
  agreements: number;
  projects: number;
  watch: number;
};

export function priorityTotal(counts: PriorityCounts): number {
  return counts.followUps + counts.agreements + counts.projects + counts.watch;
}

/** Bounce when a new priority appears, and again every 30 minutes while any remain. */
export function priorityBounceDue(input: { total: number; seen: number; lastBounceAt: number; now: number }): boolean {
  if (input.total <= 0) return false;
  if (input.total > input.seen) return true;
  return input.now - input.lastBounceAt >= PRIORITY_BOUNCE_MS;
}
