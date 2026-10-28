import { describe, expect, it } from "vitest";
import {
  CORE_PLANS,
  MODULE_OFFERS,
  buildPricingPdf,
  formatMoney,
  isPricingEmail,
  quotePlan,
} from "./pricingQuote";

const decoder = new TextDecoder();

describe("pricing quote", () => {
  it("keeps Starter free in year one and prices support from the $15,000 plan", () => {
    const quote = quotePlan({ coreId: "starter", modules: [], implementation: [], supportId: "priority" });
    expect(quote.lines.core.value).toBe("Year 1 free, then $15,000 / year");
    expect(quote.supportAnnual).toBe(2_250);
    expect(quote.yearOne).toBe(2_250);
    expect(quote.ongoing).toBe(17_250);
    expect(quote.modules.map((offer) => offer.slug)).toEqual(["operations"]);
    expect(quote.lines.totals.map((line) => line.label)).toEqual(["First year", "After the first year", "One time"]);
  });

  it("matches the published $100,000 example for Priority and Premium", () => {
    const priority = quotePlan({
      coreId: "professional",
      modules: ["instruments", "revenue"],
      implementation: ["database", "validation"],
      supportId: "priority",
    });
    expect(priority.supportAnnual).toBe(15_000);
    expect(priority.modulesAnnual).toBe(48_000);
    expect(priority.oneTime).toBe(16_000);
    expect(priority.yearOne).toBe(163_000);
    expect(priority.ongoing).toBe(163_000);
    expect(priority.lines.totals[0]).toEqual({ label: "Annual subscription", value: "$163,000 / year" });

    const premium = quotePlan({ coreId: "professional", modules: ["operations"], implementation: [], supportId: "premium" });
    expect(premium.supportAnnual).toBe(22_000);
    expect(premium.yearOne).toBe(122_000);
  });

  it("leaves Enterprise core and support as a quote and still prices published add-ons", () => {
    const quote = quotePlan({ coreId: "enterprise", modules: ["client"], implementation: ["installation"], supportId: "premium" });
    expect(quote.custom).toBe(true);
    expect(quote.yearOne).toBeNull();
    expect(quote.supportAnnual).toBeNull();
    expect(quote.modulesAnnual).toBe(12_000);
    expect(quote.oneTime).toBe(5_000);
    expect(quote.lines.support.value).toBe("Included in the custom quote");
    expect(quote.lines.totals[0].value).toBe("Custom");
  });

  it("builds one PDF page addressed to the email, using the page prices", () => {
    const quote = quotePlan({
      coreId: "professional",
      modules: ["instruments"],
      implementation: ["database"],
      supportId: "priority",
    });
    const pdf = decoder.decode(buildPricingPdf(quote, "lab@example.com", "October 28, 2026"));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
    expect(pdf).toContain("Prepared for lab@example.com");
    expect(pdf).toContain("October 28, 2026");
    expect(pdf).toContain("$100,000 / year");
    expect(pdf).toContain("$15,000 / year");
    expect(pdf).toContain("$8,000");
    expect(pdf).toContain("Prices on this page");
    expect(pdf).toContain("$100K / year");
    expect(pdf).toContain("+$1,500/mo");
    expect(pdf).toContain("15% of the annual plan");
    const positions = [...pdf.matchAll(/1 0 0 1 [\d.]+ ([\d.]+) Tm/g)].map((match) => Number(match[1]));
    expect(Math.min(...positions)).toBeGreaterThan(36);
    expect(formatMoney(100_000)).toBe("$100,000");
    expect(isPricingEmail("lab@example.com")).toBe(true);
    expect(isPricingEmail("not an email")).toBe(false);
    expect(CORE_PLANS).toHaveLength(8);
    expect(MODULE_OFFERS.map((offer) => offer.slug)).toEqual([
      "operations",
      "instruments",
      "compliance",
      "client",
      "revenue",
      "insights",
    ]);
  });
});
