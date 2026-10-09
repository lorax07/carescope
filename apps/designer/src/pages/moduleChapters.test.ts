import { describe, expect, it } from "vitest";
import { CLIENT_CHAPTERS, REVENUE_CHAPTERS, chapterForPath } from "./moduleChapters";

describe("client and revenue chapters", () => {
  it("keeps each module to four work areas", () => {
    expect(CLIENT_CHAPTERS).toHaveLength(4);
    expect(REVENUE_CHAPTERS).toHaveLength(4);
    expect(new Set(CLIENT_CHAPTERS.map((chapter) => chapter.id)).size).toBe(4);
    expect(new Set(REVENUE_CHAPTERS.map((chapter) => chapter.id)).size).toBe(4);
  });

  it("places client pages in the area an account manager would open", () => {
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/clients/acc-helix")?.id).toBe("accounts");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/contacts")?.id).toBe("accounts");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/documents")?.id).toBe("accounts");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/health")?.id).toBe("accounts");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/tasks")?.id).toBe("follow-up");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/communications")?.id).toBe("follow-up");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/activities")?.id).toBe("follow-up");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/issues")?.id).toBe("service");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/opportunities")?.id).toBe("pipeline");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity")).toBeNull();
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/analytics")).toBeNull();
  });

  it("places revenue pages in the area a billing lead would open", () => {
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/claims/CLM-1")?.id).toBe("claims");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/capture")?.id).toBe("claims");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/queues")?.id).toBe("exceptions");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/payments")?.id).toBe("cash");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/denials")?.id).toBe("cash");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/ar")?.id).toBe("cash");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/analytics")?.id).toBe("performance");
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing")).toBeNull();
    expect(chapterForPath(REVENUE_CHAPTERS, "/app/billing/config")).toBeNull();
  });
});
