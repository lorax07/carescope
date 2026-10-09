import { beforeEach, describe, expect, it } from "vitest";
import {
  acquireSequence,
  authorizeSequence,
  checksumPoints,
  createSequence,
  decimateForDisplay,
  integrateSignal,
  instrumentReadiness,
  registerSimulatedHplc,
  reprocessRun,
  setGatewayOnline,
  stopRun,
  supports,
  syntheticChromatogram,
  validateSequence,
  ADAPTERS,
  INSTRUMENT_API_VERSION,
} from "./instrumentPlatform";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

describe("sequence instrument platform", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { value: memoryStore(), configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: memoryStore(), configurable: true });
  });

  it("negotiates capabilities and refuses control the adapter does not offer", () => {
    expect(INSTRUMENT_API_VERSION).toBe("1.0.0");
    expect(supports("sequence.simulator.hplc", "acquire")).toBe(true);
    expect(supports("sequence.simulator.hplc", "pause")).toBe(false);
    expect(supports("sequence.filedrop", "acquire")).toBe(false);
    expect(ADAPTERS.find((item) => item.id === "sequence.simulator.hplc")?.simulated).toBe(true);
  });

  it("keeps connection separate from readiness", () => {
    const registered = registerSimulatedHplc();
    if (!registered.ok) throw new Error(registered.message);
    expect(instrumentReadiness(registered.value)).toMatchObject({ connected: true, ready: true });
    setGatewayOnline(false);
    expect(instrumentReadiness(registered.value).ready).toBe(false);
    expect(instrumentReadiness(registered.value).connected).toBe(true);
    setGatewayOnline(true);
  });

  it("runs a simulated acquisition through raw data, peaks, reprocess, and report", () => {
    const registered = registerSimulatedHplc({ name: "Bench HPLC simulator" });
    if (!registered.ok) throw new Error(registered.message);
    const drafted = createSequence({
      name: "Assay set",
      instrumentId: registered.value.id,
      lines: [
        { role: "blank", sampleId: "BLK-1", name: "Blank", injections: 1 },
        { role: "standard", sampleId: "STD-1", name: "Standard", injections: 1 },
        { role: "sample", sampleId: "SCP-20491", name: "Sample", injections: 1 },
      ],
    });
    if (!drafted.ok) throw new Error(drafted.message);
    expect(validateSequence(drafted.value.id).ok).toBe(true);
    const early = acquireSequence(drafted.value.id, "key-1");
    expect(early.ok).toBe(false);
    expect(authorizeSequence(drafted.value.id, "M. Chen").ok).toBe(true);

    const acquired = acquireSequence(drafted.value.id, "key-1", "M. Chen");
    if (!acquired.ok) throw new Error(acquired.message);
    const run = acquired.value;
    expect(run.simulated).toBe(true);
    expect(run.state).toBe("complete");
    expect(run.confirmedAt).not.toBe("");
    expect(run.raw).not.toBeNull();
    if (!run.raw) return;
    expect(run.raw.points.length).toBeGreaterThan(100);
    expect(run.raw.checksum).toBe(checksumPoints(run.raw.points));
    expect(decimateForDisplay(run.raw.points, 50).length).toBeLessThan(run.raw.points.length);
    const times = run.processing[0].peaks.map((peak) => peak.rt);
    expect(times).toEqual([2.1, 4.4, 6.8]);
    expect(run.report).toContain("SIMULATED INSTRUMENT");
    expect(run.report).toContain(run.raw?.checksum);
    expect(run.events.some((event) => event.action === "Acquisition confirmed")).toBe(true);

    const again = acquireSequence(drafted.value.id, "key-1");
    expect(again.ok && again.value.id).toBe(run.id);

    const edited = reprocessRun(run.id, { start: 4, end: 5 });
    if (!edited.ok) throw new Error(edited.message);
    expect(edited.value.processing).toHaveLength(2);
    expect(edited.value.processing[0].peaks).toHaveLength(3);
    expect(edited.value.processing[1].manual).toBe(true);
    expect(edited.value.processing[1].peaks).toHaveLength(1);
    expect(stopRun(run.id).code).toBe("conflict");
  });

  it("does not submit while the gateway is offline", () => {
    const registered = registerSimulatedHplc();
    if (!registered.ok) throw new Error(registered.message);
    const drafted = createSequence({
      name: "Held",
      instrumentId: registered.value.id,
      lines: [{ role: "sample", sampleId: "SCP-1", name: "Sample", injections: 1 }],
    });
    if (!drafted.ok) throw new Error(drafted.message);
    validateSequence(drafted.value.id);
    authorizeSequence(drafted.value.id, "M. Chen");
    setGatewayOnline(false);
    const blocked = acquireSequence(drafted.value.id, "key-offline");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe("not_ready");
      expect(blocked.retryable).toBe(true);
    }
  });

  it("integrates the synthetic signal with the documented algorithm", () => {
    const peaks = integrateSignal(syntheticChromatogram());
    expect(peaks.map((peak) => peak.rt)).toEqual([2.1, 4.4, 6.8]);
    expect(peaks.every((peak) => peak.area > 0 && peak.height > 8)).toBe(true);
  });
});
