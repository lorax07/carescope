import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { BOOKMARK_LIMIT, resetBookmarks } from "../src/bookmarks.js";

const sample = (n: number) => ({
  kind: "sample",
  objectId: `SCP-${n}`,
  title: `Sample SCP-${n}`,
  detail: "Aether Pharma",
  path: `/app/samples/SCP-${n}`,
});

describe("bookmarks", () => {
  beforeEach(() => {
    resetBookmarks();
  });

  it("keeps bookmarks for the signed-in user and rejects the eleventh", async () => {
    const app = createApp();
    for (let n = 1; n <= BOOKMARK_LIMIT; n += 1) {
      const res = await request(app).post("/api/v1/bookmarks").set("x-user-id", "m.chen").send(sample(n));
      expect(res.status).toBe(201);
      expect(res.body.title).toBe(`Sample SCP-${n}`);
    }

    const blocked = await request(app).post("/api/v1/bookmarks").set("x-user-id", "m.chen").send(sample(11));
    expect(blocked.status).toBe(409);
    expect(blocked.body.limit).toBe(10);

    const listed = await request(app).get("/api/v1/bookmarks").set("x-user-id", "m.chen");
    expect(listed.status).toBe(200);
    expect(listed.body.bookmarks).toHaveLength(10);
    expect(listed.body.bookmarks.map((item: { objectId: string }) => item.objectId)).not.toContain("SCP-11");

    const other = await request(app).post("/api/v1/bookmarks").set("x-user-id", "a.lopez").send(sample(11));
    expect(other.status).toBe(201);
  });

  it("does not count a bookmark that is already saved", async () => {
    const app = createApp();
    const first = await request(app).post("/api/v1/bookmarks").set("x-user-id", "m.chen").send(sample(1));
    const again = await request(app).post("/api/v1/bookmarks").set("x-user-id", "m.chen").send(sample(1));
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    const listed = await request(app).get("/api/v1/bookmarks").set("x-user-id", "m.chen");
    expect(listed.body.bookmarks).toHaveLength(1);
  });

  it("removes a bookmark and frees the slot", async () => {
    const app = createApp();
    const created = await request(app).post("/api/v1/bookmarks").set("x-user-id", "m.chen").send(sample(1));
    const removed = await request(app).delete(`/api/v1/bookmarks/${created.body.id}`).set("x-user-id", "m.chen");
    expect(removed.status).toBe(204);
    const missing = await request(app).delete(`/api/v1/bookmarks/${created.body.id}`).set("x-user-id", "m.chen");
    expect(missing.status).toBe(404);
    const listed = await request(app).get("/api/v1/bookmarks").set("x-user-id", "m.chen");
    expect(listed.body.bookmarks).toHaveLength(0);
  });

  it("rejects a path outside the app", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/bookmarks").send({ ...sample(1), path: "/pricing" });
    expect(res.status).toBe(400);
  });
});
