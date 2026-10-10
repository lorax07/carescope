import { describe, expect, it } from "vitest";
import { CLIENT_CHAPTERS, REVENUE_CHAPTERS, chapterForPath } from "./moduleChapters";

describe("client and revenue chapters", () => {
  it("keeps revenue to four work areas and adds Inbox beside the client areas", () => {
    expect(CLIENT_CHAPTERS).toHaveLength(5);
    expect(REVENUE_CHAPTERS).toHaveLength(4);
    expect(new Set(CLIENT_CHAPTERS.map((chapter) => chapter.id)).size).toBe(5);
    expect(new Set(REVENUE_CHAPTERS.map((chapter) => chapter.id)).size).toBe(4);
  });

  it("places client pages in the area an account manager would open", () => {
    expect(CLIENT_CHAPTERS.map((chapter) => chapter.label)).toEqual(["Client", "Tasks", "Projects", "Growth Hub", "Inbox"]);
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/clients/acc-helix")?.id).toBe("client");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/contacts")?.id).toBe("client");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/documents")?.id).toBe("client");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/health")?.id).toBe("client");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/tasks")?.id).toBe("tasks");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/inbox")?.id).toBe("inbox");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/communications")?.id).toBe("inbox");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/activities")?.id).toBe("tasks");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/issues")?.id).toBe("tasks");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/opportunities")?.id).toBe("projects");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity/analytics")?.id).toBe("growth");
    expect(chapterForPath(CLIENT_CHAPTERS, "/app/connectivity")).toBeNull();
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
