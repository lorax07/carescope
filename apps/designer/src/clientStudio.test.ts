import { describe, expect, it } from "vitest";
import { greetingName, nextChartZoom, paymentBars, projectMatches, projectTone } from "./pages/crm/clientStudio";

describe("client studio", () => {
  it("places payments on the day they posted", () => {
    const series = paymentBars(
      [
        { at: "2026-07-22 09:30", cents: 42000 },
        { at: "2026-07-26 09:12", cents: 19800 },
        { at: "2026-06-02 09:00", cents: 500 },
      ],
      2026,
      7,
    );
    expect(series).toHaveLength(31);
    expect(series[21]).toBe(42000);
    expect(series[25]).toBe(19800);
    expect(series[0]).toBe(0);
  });

  it("names project stages the way the board shows them", () => {
    expect(projectTone("Discovery").label).toBe("Draft");
    expect(projectTone("Proposal").label).toBe("In progress");
    expect(projectTone("Negotiation").label).toBe("On review");
    expect(projectTone("Won").label).toBe("Completed");
    expect(projectMatches("Negotiation", "priority")).toBe(true);
    expect(projectMatches("Discovery", "recommended")).toBe(true);
    expect(projectMatches("Won", "active")).toBe(false);
  });

  it("zooms the revenue chart with control and the wheel", () => {
    expect(nextChartZoom(1, -120, true)).toBeGreaterThan(1);
    expect(nextChartZoom(1, 120, true)).toBeLessThan(1);
    expect(nextChartZoom(1, -120, false)).toBe(1);
    expect(nextChartZoom(0.6, 40, true)).toBe(0.6);
    expect(nextChartZoom(2.75, -40, true)).toBe(2.75);
  });

  it("greets a person by the name after an initial", () => {
    expect(greetingName("M. Chen")).toBe("Chen");
    expect(greetingName("Jordan Ellis")).toBe("Jordan");
  });
});
