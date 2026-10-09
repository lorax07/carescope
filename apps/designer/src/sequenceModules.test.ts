import { describe, expect, it } from "vitest";
import { pathToModuleSlug, pathToNavGroup, sectionToModuleSlug } from "./sequenceModules";

describe("sequence module nav mapping", () => {
  it("maps lab sections to landing-page module slugs", () => {
    expect(sectionToModuleSlug("overview")).toBe("operations");
    expect(sectionToModuleSlug("testing")).toBe("operations");
    expect(sectionToModuleSlug("instruments")).toBe("instruments");
    expect(sectionToModuleSlug("quality")).toBe("compliance");
    expect(sectionToModuleSlug("connectivity")).toBe("client");
    expect(sectionToModuleSlug("billing")).toBe("revenue");
    expect(sectionToModuleSlug("insights")).toBe("insights");
    expect(sectionToModuleSlug("design")).toBeNull();
  });

  it("opens the parent group for nested app routes", () => {
    expect(pathToNavGroup("/app")).toBe("operations");
    expect(pathToNavGroup("/app/ops/testing")).toBe("operations");
    expect(pathToNavGroup("/app/connectivity/clients")).toBe("connectivity");
    expect(pathToNavGroup("/app/billing/claims")).toBe("billing");
    expect(pathToNavGroup("/app/instruments")).toBe("instruments");
    expect(pathToNavGroup("/app/instruments/queue")).toBe("instruments");
  });

  it("maps parent routes onto landing module marks", () => {
    expect(pathToModuleSlug("/app")).toBe("operations");
    expect(pathToModuleSlug("/app/connectivity")).toBe("client");
    expect(pathToModuleSlug("/app/billing")).toBe("revenue");
    expect(pathToModuleSlug("/app/design")).toBeNull();
  });
});
