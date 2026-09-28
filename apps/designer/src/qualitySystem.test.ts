import { describe, expect, it } from "vitest";
import {
  applyApproveDocument,
  applyCheckEffectiveness,
  applyCloseChange,
  applyCloseDeviation,
  applyContainDeviation,
  applyDisposeDeviation,
  applyImplementChange,
  applyInvestigateDeviation,
  applyIssueDocument,
  applyReportDeviation,
  documentSectionDigest,
  seedQuality,
  signatureIsBound,
} from "./qualitySystem";

const TODAY = new Date(2026, 8, 28, 15, 0, 0);

describe("quality system", () => {
  it("refuses an author approval and issues only after the effective date", () => {
    const system = seedQuality();
    const authored = applyApproveDocument(system, "SOP-HPLC-12:4", "L. Okonkwo", {
      effectiveOn: "2026-08-01",
      training: "HPLC analysts trained 2026-09-20.",
    }, TODAY);
    expect(authored.ok).toBe(false);
    expect(system.documents.find((item) => item.id === "SOP-HPLC-12:4")?.status).toBe("review");
    expect(system.audit.at(-1)?.action).toBe("Signature rejected");

    expect(applyApproveDocument(system, "SOP-HPLC-12:4", "M. Chen", {
      effectiveOn: "2026-10-01",
      training: "HPLC analysts trained 2026-09-20.",
    }, TODAY).ok).toBe(true);
    const early = applyIssueDocument(system, "SOP-HPLC-12:4", "M. Chen", TODAY);
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.error).toContain("2026-10-01");
  });

  it("issues a bound version and obsoletes the previous effective method", () => {
    const system = seedQuality();
    expect(applyApproveDocument(system, "SOP-HPLC-12:4", "M. Chen", {
      effectiveOn: "2026-08-01",
      training: "M. Chen and J. Ortiz trained on 2026-09-20.",
    }, TODAY).ok).toBe(true);
    const revision = system.documents.find((item) => item.id === "SOP-HPLC-12:4");
    const approval = revision?.signatures.find((signature) => signature.section === "approval");
    expect(approval && revision && signatureIsBound(approval, documentSectionDigest(revision, "approval"))).toBe(true);
    if (revision) revision.body = "Unapproved text";
    const tampered = applyIssueDocument(system, "SOP-HPLC-12:4", "M. Chen", TODAY);
    expect(tampered.ok).toBe(false);

    const again = seedQuality();
    applyApproveDocument(again, "SOP-HPLC-12:4", "M. Chen", {
      effectiveOn: "2026-08-01",
      training: "M. Chen and J. Ortiz trained on 2026-09-20.",
    }, TODAY);
    expect(applyIssueDocument(again, "SOP-HPLC-12:4", "M. Chen", TODAY).ok).toBe(true);
    expect(again.documents.find((item) => item.id === "SOP-HPLC-12:4")?.status).toBe("effective");
    expect(again.documents.find((item) => item.id === "SOP-HPLC-12:3")?.status).toBe("obsolete");
    expect(again.audit.some((event) => event.recordId === "SOP-HPLC-12:3" && event.action === "Obsoleted")).toBe(true);
  });

  it("requires an independent QA signature to close a deviation", () => {
    const system = seedQuality();
    expect(applyCloseDeviation(system, "DEV-118", "J. Ortiz", "Looks fine.", TODAY).ok).toBe(false);
    expect(applyCloseDeviation(system, "DEV-118", "A. Patel", "I investigated it.", TODAY).ok).toBe(false);
    expect(system.deviations.find((item) => item.id === "DEV-118")?.status).toBe("disposition");
    expect(applyCloseDeviation(system, "DEV-118", "M. Chen", "Retest is authorized. The in-process run stays unreported.", TODAY).ok).toBe(true);
    expect(system.deviations.find((item) => item.id === "DEV-118")?.status).toBe("closed");
    const contained = applyContainDeviation(system, "DEV-118", "M. Chen", "Moved again.", TODAY);
    expect(contained.ok).toBe(false);
  });

  it("requires a justification to use a result as is", () => {
    const system = seedQuality();
    applyContainDeviation(system, "NCR-042", "M. Chen", "Both receipts are quarantined at intake.", TODAY);
    applyInvestigateDeviation(system, "NCR-042", "A. Patel", {
      investigation: "Labels were applied to the wrong receipt during courier intake.",
      rootCause: "personnel",
      impact: "No accession was created.",
    }, TODAY);
    const missing = applyDisposeDeviation(system, "NCR-042", "A. Patel", { disposition: "use-as-is", note: "" }, TODAY);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toContain("justification");
  });

  it("holds a CAPA open until an independent effectiveness check passes", () => {
    const system = seedQuality();
    const early = applyCheckEffectiveness(system, "CAPA-015", "M. Chen", { result: "effective", evidence: "Too soon." }, new Date(2026, 8, 1));
    expect(early.ok).toBe(false);
    const self = applyCheckEffectiveness(system, "CAPA-015", "A. Ruiz", { result: "effective", evidence: "I say it worked." }, TODAY);
    expect(self.ok).toBe(false);
    expect(applyCheckEffectiveness(system, "CAPA-015", "M. Chen", { result: "not-effective", evidence: "One analyst missed the alarm step." }, TODAY).ok).toBe(true);
    expect(system.capas.find((item) => item.id === "CAPA-015")?.status).toBe("implementation");
    expect(system.capas.find((item) => item.id === "CAPA-015")?.failedChecks).toHaveLength(1);
    expect(applyCheckEffectiveness(system, "CAPA-015", "M. Chen", { result: "effective", evidence: "A second challenge on 2026-09-22 passed." }, TODAY).ok).toBe(true);
    expect(system.capas.find((item) => item.id === "CAPA-015")?.status).toBe("closed");
  });

  it("blocks change implementation until the controlled document is effective", () => {
    const system = seedQuality();
    const blocked = applyImplementChange(system, "CC-009", "M. Chen", "Version 4 is in the method binder.", TODAY);
    expect(blocked.ok).toBe(false);
    applyApproveDocument(system, "SOP-HPLC-12:4", "M. Chen", {
      effectiveOn: "2026-08-01",
      training: "M. Chen and J. Ortiz trained on 2026-09-20.",
    }, TODAY);
    applyIssueDocument(system, "SOP-HPLC-12:4", "M. Chen", TODAY);
    expect(applyImplementChange(system, "CC-009", "L. Okonkwo", "I wrote it.", TODAY).ok).toBe(false);
    expect(applyImplementChange(system, "CC-009", "M. Chen", "Version 4 is effective and the method binder was updated.", TODAY).ok).toBe(true);
    const closed = applyCloseChange(system, "CC-009", "M. Chen", "I also implemented it.", TODAY);
    expect(closed.ok).toBe(false);
    expect(system.changes.find((item) => item.id === "CC-009")?.status).toBe("implemented");
    expect(system.audit.filter((event) => event.action === "Signature rejected").length).toBeGreaterThan(0);
  });

  it("keeps every new report in the audit trail", () => {
    const system = seedQuality();
    const before = system.audit.length;
    expect(applyReportDeviation(system, {
      title: "Balance check failed",
      description: "The daily check was outside the tolerance.",
      accessionId: "SCP-20496",
      site: "North Lab",
    }, "M. Chen", TODAY).ok).toBe(true);
    expect(system.deviations[0]?.id).toBe("DEV-119");
    expect(system.audit.length).toBeGreaterThan(before);
    expect(system.audit.at(-1)?.action).toBe("Deviation reported");
  });
});
