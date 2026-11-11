import { describe, expect, it } from "vitest";
import { bookmarkTarget } from "./bookmarks";

describe("bookmark targets", () => {
  it("names the sample, the client screen, and the operations home", () => {
    const sample = bookmarkTarget("/app/samples/SCP-20460");
    expect(sample).toMatchObject({
      kind: "sample",
      objectId: "SCP-20460",
      title: "SCP-20460",
      path: "/app/samples/SCP-20460",
    });
    expect(bookmarkTarget("/app/ops/home")).toMatchObject({ kind: "screen", title: "Home", path: "/app/ops/home" });
    expect(bookmarkTarget("/app/connectivity/clients")).toMatchObject({ kind: "screen", title: "Accounts", detail: "CRM" });
  });
});