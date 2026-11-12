import { describe, expect, it } from "vitest";
import { PRIORITY_BOUNCE_MS, priorityBounceDue, priorityTotal } from "./topPriorities";

describe("Top Priorities bounce", () => {
  it("adds the four counts", () => {
    expect(priorityTotal({ followUps: 2, agreements: 1, projects: 4, watch: 3 })).toBe(10);
  });

  it("bounces when the priority count goes up and again after 30 minutes", () => {
    const now = 1_800_000_000_000;
    expect(priorityBounceDue({ total: 0, seen: 0, lastBounceAt: 0, now })).toBe(false);
    expect(priorityBounceDue({ total: 4, seen: 0, lastBounceAt: now, now })).toBe(true);
    expect(priorityBounceDue({ total: 4, seen: 4, lastBounceAt: now, now: now + PRIORITY_BOUNCE_MS - 1 })).toBe(false);
    expect(priorityBounceDue({ total: 4, seen: 4, lastBounceAt: now, now: now + PRIORITY_BOUNCE_MS })).toBe(true);
    expect(priorityBounceDue({ total: 5, seen: 4, lastBounceAt: now, now: now + 1000 })).toBe(true);
  });
});
