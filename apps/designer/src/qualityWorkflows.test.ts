import { describe, expect, it } from "vitest";
import {
  applyApproveChange,
  applyApproveDocument,
  applyAssessChange,
  applyCheckEffectiveness,
  applyCloseAudit,
  applyCloseChange,
  applyCloseComplaint,
  applyCloseDeviation,
  applyCloseFinding,
  applyCompleteTraining,
  applyContainDeviation,
  applyDisposeDeviation,
  applyImplementCapa,
  applyImplementChange,
  applyInvestigateComplaint,
  applyInvestigateDeviation,
  applyIssueDocument,
  applyMitigateRisk,
  applyOpenCapa,
  applyPlanAudit,
  applyProposeChange,
  applyReassessRisk,
  applyRecordFinding,
  applyRegisterRisk,
  applyReleaseEquipment,
  applyReportDeviation,
  applyRestrictEquipment,
  applyReviseDocument,
  applyStartAudit,
  applyUpdateConfig,
  complianceMetrics,
  qualityRecordKey,
  riskBand,
  seedQuality,
  DEFAULT_QUALITY_CONFIG,
} from "./qualitySystem";

const TODAY = new Date(2026, 8, 28, 15, 0, 0);

function expectOk(result: { ok: boolean; error?: string }) {
  expect(result.ok, result.ok ? "" : result.error).toBe(true);
}

describe("compliance workflows", () => {
  it("runs a quality event through CAPA, evidence, effectiveness, and close", () => {
    const system = seedQuality();
    expectOk(applyReportDeviation(system, { title: "Balance check failed", description: "The daily check was outside tolerance.", accessionId: "SCP-20496", site: "North Lab" }, "M. Chen", TODAY));
    const id = system.deviations[0]!.id;
    expectOk(applyContainDeviation(system, id, "M. Chen", "Balance removed from use.", TODAY));
    const again = applyContainDeviation(system, id, "M. Chen", "Balance removed from use.", TODAY);
    expect(again.ok).toBe(false);
    const notices = system.notifications?.length ?? 0;
    expect(applyContainDeviation(system, id, "M. Chen", "Tried again.", TODAY).ok).toBe(false);
    expect(system.notifications?.length).toBe(notices);
    expectOk(applyInvestigateDeviation(system, id, "A. Patel", { investigation: "The check weight had drifted.", rootCause: "equipment", impact: "No result used the balance." }, TODAY));
    expect(applyOpenCapa(system, { sourceId: id, title: "Balance service", rootCause: "Drift", corrective: "Service the balance", preventive: "Add a weekly weight", owner: "A. Ruiz", checkOn: "2026-09-20" }, "M. Chen", TODAY).ok).toBe(true);
    const capaId = system.deviations.find((item) => item.id === id)?.capaId ?? "";
    expect(applyImplementCapa(system, capaId, "A. Ruiz", "", TODAY).ok).toBe(false);
    expectOk(applyImplementCapa(system, capaId, "A. Ruiz", "Service ticket closed and the check passed.", TODAY));
    expect(applyCheckEffectiveness(system, capaId, "A. Ruiz", { result: "effective", evidence: "I checked my own work." }, TODAY).ok).toBe(false);
    expectOk(applyCheckEffectiveness(system, capaId, "M. Chen", { result: "not-effective", evidence: "The next check still failed." }, TODAY));
    expect(system.capas.find((item) => item.id === capaId)?.status).toBe("implementation");
    expectOk(applyCheckEffectiveness(system, capaId, "M. Chen", { result: "effective", evidence: "A later check on 2026-09-22 passed." }, TODAY));
    expectOk(applyDisposeDeviation(system, id, "A. Patel", { disposition: "retest", note: "Repeat the batch that used the balance." }, TODAY));
    expect(applyCloseDeviation(system, id, "J. Ortiz", "Too soon", new Date(2026, 8, 1)).ok).toBe(true);
    expect(system.deviations.find((item) => item.id === id)?.status).toBe("closed");
  });

  it("refuses to close an event while its CAPA is still open", () => {
    const system = seedQuality();
    applyReportDeviation(system, { title: "Label tear", description: "A label tore at intake.", accessionId: "", site: "East Lab" }, "S. Patel", TODAY);
    const id = system.deviations[0]!.id;
    applyContainDeviation(system, id, "S. Patel", "Receipt quarantined.", TODAY);
    applyInvestigateDeviation(system, id, "A. Patel", { investigation: "The printer jammed.", rootCause: "equipment", impact: "No accession was created." }, TODAY);
    applyOpenCapa(system, { sourceId: id, title: "Printer jam", rootCause: "Jam", corrective: "Replace the roller", preventive: "Spare rollers on the bench", owner: "A. Ruiz", checkOn: "2026-09-01" }, "M. Chen", TODAY);
    applyDisposeDeviation(system, id, "A. Patel", { disposition: "reject", note: "Reprint is not possible. Reject the receipt." }, TODAY);
    const blocked = applyCloseDeviation(system, id, "Jonah Park", "Looks done.", TODAY);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toContain("effectiveness");
    expect(system.deviations.find((item) => item.id === id)?.status).toBe("disposition");
  });

  it("revises an SOP, trains on the new version, and keeps the prior version", () => {
    const system = seedQuality();
    expectOk(applyProposeChange(system, { title: "Clarify alarm response", description: "Name the on-call steps." }, "A. Patel", TODAY));
    const changeId = system.changes[0]!.id;
    expectOk(applyAssessChange(system, changeId, "A. Patel", { impact: "Analysts follow the new steps.", validation: "none" }, TODAY));
    expectOk(applyReviseDocument(system, { code: "SOP-QA-004", title: "Deviation, nonconformance, and CAPA handling", body: "Contain the event, investigate, and acknowledge the revision before use.", changeId }, "A. Patel", TODAY));
    const documentId = system.changes.find((item) => item.id === changeId)?.documentId ?? "";
    expect(documentId).toBe("SOP-QA-004:3");
    expect(applyApproveChange(system, changeId, "A. Patel", TODAY).ok).toBe(false);
    expectOk(applyApproveChange(system, changeId, "Jonah Park", TODAY));
    expectOk(applyApproveDocument(system, documentId, "M. Chen", { effectiveOn: "2026-09-01", training: "J. Ortiz assigned.", assignees: ["J. Ortiz"] }, TODAY));
    expectOk(applyIssueDocument(system, documentId, "M. Chen", TODAY));
    expect(system.documents.find((item) => item.id === "SOP-QA-004:2")?.status).toBe("obsolete");
    expect(system.documents.find((item) => item.id === documentId)?.status).toBe("effective");
    const assignment = system.training?.find((item) => item.documentId === documentId && item.assignee === "J. Ortiz");
    expect(assignment?.status).toBe("assigned");
    expectOk(applyImplementChange(system, changeId, "Jonah Park", "Version 3 is in the binder.", TODAY));
    const waiting = applyCloseChange(system, changeId, "M. Chen", "Training is done.", TODAY);
    expect(waiting.ok).toBe(false);
    if (!waiting.ok) expect(waiting.error).toContain("training");
    expect(applyCompleteTraining(system, assignment!.id, "M. Chen", TODAY).ok).toBe(false);
    expectOk(applyCompleteTraining(system, assignment!.id, "J. Ortiz", TODAY));
    expect(applyCompleteTraining(system, assignment!.id, "J. Ortiz", TODAY).ok).toBe(false);
    expectOk(applyCloseChange(system, changeId, "M. Chen", "Version 3 is effective and J. Ortiz acknowledged it.", TODAY));
    expect(system.changes.find((item) => item.id === changeId)?.status).toBe("closed");
  });

  it("closes an audit only after the finding CAPA is verified", () => {
    const system = seedQuality();
    expectOk(applyPlanAudit(system, { title: "Label control", kind: "internal", scope: "Intake labels", criteria: "SOP-QA-004", auditor: "M. Chen", scheduledOn: "2026-10-02" }, "A. Ruiz", TODAY));
    const auditId = system.audits![0]!.id;
    expectOk(applyStartAudit(system, auditId, "A. Ruiz", TODAY));
    expect(applyRecordFinding(system, { auditId, title: "Blank label", evidence: "", risk: "high" }, "Jonah Park", TODAY).ok).toBe(false);
    expectOk(applyRecordFinding(system, { auditId, title: "Blank label stock", evidence: "Two blank labels were in the released drawer.", risk: "high" }, "Jonah Park", TODAY));
    const findingId = system.findings![0]!.id;
    expect(applyCloseFinding(system, findingId, "M. Chen", "Fixed.", TODAY).ok).toBe(false);
    expectOk(applyOpenCapa(system, { sourceId: findingId, title: "Label stock", rootCause: "Released drawer", corrective: "Quarantine blank stock", preventive: "Daily drawer check", owner: "A. Ruiz", checkOn: "2026-09-01" }, "A. Patel", TODAY));
    const capaId = system.findings!.find((item) => item.id === findingId)?.capaId ?? "";
    expectOk(applyImplementCapa(system, capaId, "A. Ruiz", "Drawer checked and blank stock removed.", TODAY));
    expectOk(applyCheckEffectiveness(system, capaId, "M. Chen", { result: "effective", evidence: "The next day's check found no blank labels." }, TODAY));
    expect(applyCloseFinding(system, findingId, "Jonah Park", "Verified.", TODAY).ok).toBe(false);
    expectOk(applyCloseFinding(system, findingId, "M. Chen", "The drawer check is in the file.", TODAY));
    expect(applyCloseAudit(system, auditId, "Jonah Park", "Done.", TODAY).ok).toBe(false);
    expectOk(applyCloseAudit(system, auditId, "A. Patel", "The finding and CAPA are closed.", TODAY));
    expect(system.audits!.find((item) => item.id === auditId)?.status).toBe("closed");
  });

  it("restricts failed equipment and releases it only after an independent approval", () => {
    const system = seedQuality();
    const early = applyReleaseEquipment(system, "EQ-221", "M. Chen", "Looks fine.", TODAY);
    expect(early.ok).toBe(false);
    expectOk(applyRestrictEquipment(system, "EQ-221", "A. Patel", { impact: "Identity FTIR for SCP-20458 stays unreported.", restriction: "Do not use inst-ftir until it is recalibrated." }, TODAY));
    expectOk(applyOpenCapa(system, { sourceId: "EQ-221", title: "FTIR calibration", rootCause: "Out of tolerance", corrective: "Recalibrate", preventive: "Add a mid-week check", owner: "A. Ruiz", checkOn: "2026-09-01" }, "A. Patel", TODAY));
    const capaId = system.equipment!.find((item) => item.id === "EQ-221")?.capaId ?? "";
    const blocked = applyReleaseEquipment(system, "EQ-221", "M. Chen", "Recalibrated.", TODAY);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toContain(capaId);
    expectOk(applyImplementCapa(system, capaId, "A. Ruiz", "Calibration certificate filed.", TODAY));
    expectOk(applyCheckEffectiveness(system, capaId, "M. Chen", { result: "effective", evidence: "The repeat check was inside tolerance." }, TODAY));
    expect(applyReleaseEquipment(system, "EQ-221", "J. Ortiz", "I reported it.", TODAY).ok).toBe(false);
    expectOk(applyReleaseEquipment(system, "EQ-221", "M. Chen", "Independent review. The instrument can return to service. Linked accessions were not altered.", TODAY));
    expect(system.equipment!.find((item) => item.id === "EQ-221")).toMatchObject({ status: "released", accessionIds: ["SCP-20458"] });
  });

  it("closes a complaint only after impact and any linked CAPA are complete", () => {
    const system = seedQuality();
    expect(applyCloseComplaint(system, "CMP-008", "M. Chen", "No action.", TODAY).ok).toBe(false);
    expectOk(applyInvestigateComplaint(system, "CMP-008", "A. Patel", { impact: "The result is on hold with DEV-118. No report was issued." }, TODAY));
    expect(applyCloseComplaint(system, "CMP-008", "S. Patel", "I took the call.", TODAY).ok).toBe(false);
    expectOk(applyOpenCapa(system, { sourceId: "CMP-008", title: "Client status update", rootCause: "Hold not explained", corrective: "Call the client", preventive: "Status note at intake", owner: "A. Ruiz", checkOn: "2026-09-01" }, "A. Patel", TODAY));
    const capaId = system.complaints!.find((item) => item.id === "CMP-008")?.capaId ?? "";
    expect(applyCloseComplaint(system, "CMP-008", "M. Chen", "Called.", TODAY).ok).toBe(false);
    expectOk(applyImplementCapa(system, capaId, "A. Ruiz", "Client call logged.", TODAY));
    expectOk(applyCheckEffectiveness(system, capaId, "Jonah Park", { result: "effective", evidence: "The client confirmed the hold was explained." }, TODAY));
    expectOk(applyCloseComplaint(system, "CMP-008", "M. Chen", "The client was told the result stays on hold.", TODAY));
    expect(system.complaints!.find((item) => item.id === "CMP-008")?.status).toBe("closed");
  });

  it("reassesses residual risk only after the linked change is closed", () => {
    const system = seedQuality();
    expect(applyRegisterRisk(system, { title: "Missed weight", hazard: "A drifted check weight can pass a balance.", likelihood: 5, impact: 4, owner: "A. Ruiz", reviewOn: "2026-10-01" }, "A. Ruiz", TODAY).ok).toBe(true);
    const riskId = system.risks![0]!.id;
    expect(riskBand(5 * 4)).toBe("high");
    expectOk(applyProposeChange(system, { title: "Weekly weight check", description: "Add the check to the balance SOP." }, "A. Patel", TODAY));
    const changeId = system.changes[0]!.id;
    expect(applyReassessRisk(system, riskId, "M. Chen", { likelihood: 2, impact: 2 }, TODAY).ok).toBe(false);
    expectOk(applyMitigateRisk(system, riskId, "Jonah Park", { control: "Weekly check weight.", changeId }, TODAY));
    expect(applyReassessRisk(system, riskId, "M. Chen", { likelihood: 2, impact: 2 }, TODAY).ok).toBe(false);
    expectOk(applyAssessChange(system, changeId, "A. Patel", { impact: "Analysts run one extra check.", validation: "none" }, TODAY));
    expectOk(applyApproveChange(system, changeId, "M. Chen", TODAY));
    expectOk(applyImplementChange(system, changeId, "Jonah Park", "The weekly check is on the bench sheet.", TODAY));
    expectOk(applyCloseChange(system, changeId, "A. Ruiz", "The sheet was used on the next shift.", TODAY));
    expect(applyReassessRisk(system, riskId, "Jonah Park", { likelihood: 2, impact: 2 }, TODAY).ok).toBe(false);
    expectOk(applyReassessRisk(system, riskId, "M. Chen", { likelihood: 2, impact: 2 }, TODAY));
    expect(system.risks!.find((item) => item.id === riskId)?.status).toBe("reassessed");
  });

  it("keeps laboratories on separate storage keys and derives metrics from records", () => {
    expect(qualityRecordKey("lab-a")).not.toBe(qualityRecordKey("lab-b"));
    const north = seedQuality("lab-north");
    const east = seedQuality("lab-east");
    applyReportDeviation(north, { title: "North only", description: "A north event.", accessionId: "", site: "North Lab" }, "M. Chen", TODAY);
    expect(east.deviations.some((item) => item.title === "North only")).toBe(false);
    expect(north.instanceId).toBe("lab-north");
    const metrics = complianceMetrics(seedQuality(), TODAY);
    expect(metrics.openEvents).toBeGreaterThan(0);
    expect(metrics.trainingGaps).toBeGreaterThan(0);
    expect(metrics.overdueActions).toBeGreaterThan(0);
    expect(metrics.capaEffectiveness).toBeNull();
    const configured = seedQuality();
    expectOk(applyUpdateConfig(configured, "Jonah Park", { ...DEFAULT_QUALITY_CONFIG, separationOfDuties: false, escalationDays: 3 }, TODAY));
    expect(configured.config?.separationOfDuties).toBe(false);
    expect(configured.audit.at(-1)?.action).toBe("Configuration updated");
    expect(configured.audit.at(-1)?.reason).toContain("Before");
  });
});
