import { useEffect, useState } from "react";
import { readLimsSession } from "./limsSession";
import { currentInstanceId, currentLabId, labIdFromSite, moduleStorageKey, readJson, writeJson } from "./storageScope";

/** In-process Sequence Instrument API. Control ports are not exposed on the public internet. */
export const INSTRUMENT_API_VERSION = "1.0.0";

export const INSTRUMENT_API_EXAMPLES = {
  register: {
    method: "POST",
    path: "/instrument/v1/instruments",
    body: { adapterId: "sequence.simulator.hplc", name: "Simulated HPLC", site: "North Lab" },
  },
  capabilities: { method: "GET", path: "/instrument/v1/instruments/{id}/capabilities" },
  submit: {
    method: "POST",
    path: "/instrument/v1/runs",
    body: { sequenceId: "SEQ-1", instrumentId: "inst-sim", idempotencyKey: "run-1" },
  },
  acquire: { method: "POST", path: "/instrument/v1/runs/{id}/acquire" },
} as const;

export type Capability = "discover" | "health" | "acquire" | "stop" | "pause" | "resume" | "raw_transfer" | "spectra";

export type ApiFailure = {
  ok: false;
  status: 400 | 404 | 409 | 422 | 501;
  code: "validation" | "unsupported" | "not_found" | "not_ready" | "conflict";
  message: string;
  retryable: boolean;
};

export type ApiOk<T> = { ok: true; value: T };

export type AdapterManifest = {
  id: string;
  vendor: string;
  version: string;
  simulated: boolean;
  capabilities: Capability[];
  limitation: string;
};

export const ADAPTERS: AdapterManifest[] = [
  {
    id: "sequence.simulator.hplc",
    vendor: "Sequence",
    version: "1.0.0",
    simulated: true,
    capabilities: ["discover", "health", "acquire", "stop", "raw_transfer"],
    limitation: "Synthetic UV chromatograms only. Pause, resume, and spectral detectors are unsupported. Not a vendor driver.",
  },
  {
    id: "sequence.filedrop",
    vendor: "Sequence",
    version: "1.0.0",
    simulated: false,
    capabilities: ["raw_transfer"],
    limitation: "Accepts a transferred file. Does not start, stop, or control the instrument.",
  },
];

export type GatewayRecord = {
  id: string;
  name: string;
  site: string;
  online: boolean;
  buffered: number;
  lastSeen: string;
  note: string;
};

export type PlatformInstrument = {
  id: string;
  instanceId: string;
  labId: string;
  name: string;
  vendor: string;
  model: string;
  serial: string;
  instrumentType: "hplc";
  site: string;
  gatewayId: string;
  adapterId: string;
  adapterVersion: string;
  simulated: boolean;
  connection: "connected" | "offline";
  qualification: "current" | "expired";
  busy: boolean;
  lastSeen: string;
};

export type MethodKind = "instrument" | "processing" | "report";

export type MethodVersion = {
  id: string;
  kind: MethodKind;
  code: string;
  version: number;
  name: string;
  body: string;
  checksum: string;
  status: "approved";
};

export type InjectionRole = "blank" | "standard" | "control" | "sample";

export type SequenceLine = {
  id: string;
  position: number;
  role: InjectionRole;
  sampleId: string;
  name: string;
  injections: number;
};

export type SampleSequence = {
  id: string;
  instanceId: string;
  labId: string;
  name: string;
  instrumentId: string;
  instrumentMethodId: string;
  processingMethodId: string;
  lines: SequenceLine[];
  validatedAt: string;
  authorizedBy: string;
};

export type RunState =
  | "draft"
  | "validated"
  | "authorized"
  | "submitted"
  | "acquiring"
  | "transferring"
  | "complete"
  | "failed"
  | "cancelled";

export type RawPoint = { t: number; y: number };

export type RawChromatogram = {
  detector: string;
  points: RawPoint[];
  checksum: string;
  simulated: boolean;
};

export type Peak = {
  id: string;
  start: number;
  apex: number;
  end: number;
  rt: number;
  area: number;
  height: number;
};

export type ProcessingVersion = {
  version: number;
  algorithm: "sequence.integrate.v1";
  parentVersion: number | null;
  manual: boolean;
  createdAt: string;
  peaks: Peak[];
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  entityId: string;
  action: string;
  detail: string;
};

export type AcquisitionRun = {
  id: string;
  idempotencyKey: string;
  instanceId: string;
  labId: string;
  sequenceId: string;
  instrumentId: string;
  instrumentMethodId: string;
  processingMethodId: string;
  state: RunState;
  simulated: boolean;
  actor: string;
  submittedAt: string;
  confirmedAt: string;
  error: string;
  raw: RawChromatogram | null;
  processing: ProcessingVersion[];
  report: string;
  events: AuditEvent[];
};

type PlatformState = {
  version: 1;
  gateways: GatewayRecord[];
  instruments: PlatformInstrument[];
  methods: MethodVersion[];
  sequences: SampleSequence[];
  runs: AcquisitionRun[];
  audit: AuditEvent[];
  next: number;
};

const listeners = new Set<() => void>();

function fail(status: ApiFailure["status"], code: ApiFailure["code"], message: string, retryable = false): ApiFailure {
  return { ok: false, status, code, message, retryable };
}

function ok<T>(value: T): ApiOk<T> {
  return { ok: true, value };
}

export function checksumText(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function checksumPoints(points: RawPoint[]): string {
  return checksumText(points.map((point) => `${point.t},${point.y}`).join(";"));
}

function stamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function actorName(): string {
  return readLimsSession()?.username || "M. Chen";
}

function storageKey(instanceId = currentInstanceId()): string {
  return moduleStorageKey("instrument_integration", "platform", instanceId);
}

function seedMethods(): MethodVersion[] {
  const instrumentBody = "UV 254 nm. Flow 1.0 mL/min. 10 min. Column C18 150 × 4.6 mm.";
  const processingBody = "sequence.integrate.v1. Rolling-minimum baseline, threshold 8, trapezoidal area. Not a vendor integration algorithm.";
  const reportBody = "Sequence chromatogram report. Includes method versions, checksum, and processing version.";
  return [
    { id: "im-hplc-1", kind: "instrument", code: "IM-HPLC", version: 1, name: "HPLC UV 254 assay", body: instrumentBody, checksum: checksumText(instrumentBody), status: "approved" },
    { id: "pm-int-1", kind: "processing", code: "PM-INT", version: 1, name: "Sequence integrate v1", body: processingBody, checksum: checksumText(processingBody), status: "approved" },
    { id: "rm-chr-1", kind: "report", code: "RM-CHR", version: 1, name: "Chromatogram report", body: reportBody, checksum: checksumText(reportBody), status: "approved" },
  ];
}

function emptyState(): PlatformState {
  return {
    version: 1,
    gateways: [
      {
        id: "gw-sim-local",
        name: "Local simulator gateway",
        site: "North Lab",
        online: true,
        buffered: 0,
        lastSeen: stamp(),
        note: "Stays on the laboratory workstation. It does not publish instrument control ports.",
      },
    ],
    instruments: [],
    methods: seedMethods(),
    sequences: [],
    runs: [],
    audit: [],
    next: 1,
  };
}

const cache = new Map<string, PlatformState>();

function load(instanceId = currentInstanceId()): PlatformState {
  const cached = cache.get(instanceId);
  if (cached) return cached;
  const parsed = readJson<PlatformState>(storageKey(instanceId));
  const state = parsed?.version === 1 && Array.isArray(parsed.runs) ? parsed : emptyState();
  cache.set(instanceId, state);
  return state;
}

function save(state: PlatformState) {
  const instanceId = currentInstanceId();
  cache.set(instanceId, state);
  writeJson(storageKey(instanceId), state);
  listeners.forEach((listener) => listener());
}

function audit(state: PlatformState, entityId: string, action: string, detail: string, actor = actorName()): AuditEvent {
  const event: AuditEvent = { id: `AUD-${state.next++}`, at: stamp(), actor, entityId, action, detail };
  state.audit = [event, ...state.audit].slice(0, 400);
  return event;
}

export function adapterById(id: string): AdapterManifest | undefined {
  return ADAPTERS.find((item) => item.id === id);
}

export function supports(adapterId: string, capability: Capability): boolean {
  return Boolean(adapterById(adapterId)?.capabilities.includes(capability));
}

/** Synthetic UV trace with three known peaks. Original points are stored in full. */
export function syntheticChromatogram(): RawPoint[] {
  const peaks = [
    { rt: 2.1, height: 40, width: 0.08 },
    { rt: 4.4, height: 120, width: 0.12 },
    { rt: 6.8, height: 70, width: 0.1 },
  ];
  const points: RawPoint[] = [];
  for (let index = 0; index <= 1000; index += 1) {
    const t = Math.round(index) / 100;
    let y = 5 + 0.15 * t;
    for (const peak of peaks) {
      const z = (t - peak.rt) / peak.width;
      y += peak.height * Math.exp(-0.5 * z * z);
    }
    points.push({ t, y: Math.round(y * 1000) / 1000 });
  }
  return points;
}

export function decimateForDisplay(points: RawPoint[], max = 400): RawPoint[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const shown = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (shown[shown.length - 1] !== last) shown.push(last);
  return shown;
}

/**
 * sequence.integrate.v1
 * Baseline is a rolling minimum. Peaks are contiguous regions above a fixed threshold.
 * Area is the trapezoid of the baseline-corrected signal. This is not a vendor algorithm.
 */
export function integrateSignal(points: RawPoint[], manual?: { start: number; end: number }): Peak[] {
  const window = 40;
  const baseline = points.map((_, index) => {
    const from = Math.max(0, index - window);
    const to = Math.min(points.length, index + window + 1);
    let min = points[index].y;
    for (let cursor = from; cursor < to; cursor += 1) min = Math.min(min, points[cursor].y);
    return min;
  });
  const corrected = points.map((point, index) => point.y - baseline[index]);
  const regions: Array<{ start: number; end: number }> = [];
  if (manual) {
    regions.push(manual);
  } else {
    let open = -1;
    corrected.forEach((value, index) => {
      if (value > 8 && open < 0) open = index;
      if ((value <= 8 || index === corrected.length - 1) && open >= 0) {
        regions.push({ start: points[open].t, end: points[index].t });
        open = -1;
      }
    });
  }
  return regions.flatMap((region, index) => {
    const slice = points
      .map((point, pointIndex) => ({ point, corrected: corrected[pointIndex] }))
      .filter((item) => item.point.t >= region.start && item.point.t <= region.end);
    if (slice.length < 2) return [];
    let apex = slice[0];
    let area = 0;
    for (let cursor = 1; cursor < slice.length; cursor += 1) {
      if (slice[cursor].corrected > apex.corrected) apex = slice[cursor];
      const dt = slice[cursor].point.t - slice[cursor - 1].point.t;
      area += ((slice[cursor - 1].corrected + slice[cursor].corrected) / 2) * dt;
    }
    if (!manual && apex.corrected < 8) return [];
    return [{
      id: `PK-${index + 1}`,
      start: slice[0].point.t,
      apex: apex.point.t,
      end: slice[slice.length - 1].point.t,
      rt: apex.point.t,
      area: Math.round(area * 100) / 100,
      height: Math.round(apex.corrected * 100) / 100,
    }];
  });
}

function ready(instrument: PlatformInstrument, gateway: GatewayRecord | undefined): ApiFailure | null {
  if (!gateway?.online) return fail(409, "not_ready", "The local gateway is offline. The run was not submitted.", true);
  if (instrument.connection !== "connected") return fail(409, "not_ready", "The instrument is not connected. Connectivity is separate from readiness.");
  if (instrument.qualification === "expired") return fail(409, "not_ready", "Qualification is expired. The instrument is connected but not ready to run.");
  if (instrument.busy) return fail(409, "conflict", "This instrument already has an open acquisition.");
  return null;
}

export function getPlatform(): PlatformState {
  return load();
}

export function usePlatform(): PlatformState {
  const [state, setState] = useState(load);
  useEffect(() => {
    const sync = () => setState(load());
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return state;
}

export function registerSimulatedHplc(input?: { name?: string; site?: string }): ApiOk<PlatformInstrument> | ApiFailure {
  const state = structuredClone(load());
  const site = input?.site?.trim() || "North Lab";
  const id = `inst-sim-${state.next++}`;
  const instrument: PlatformInstrument = {
    id,
    instanceId: currentInstanceId(),
    labId: currentLabId() || labIdFromSite(site),
    name: input?.name?.trim() || "Simulated HPLC",
    vendor: "Sequence",
    model: "Simulator HPLC UV",
    serial: `SIM-${id.slice(-4).toUpperCase()}`,
    instrumentType: "hplc",
    site,
    gatewayId: "gw-sim-local",
    adapterId: "sequence.simulator.hplc",
    adapterVersion: "1.0.0",
    simulated: true,
    connection: "connected",
    qualification: "current",
    busy: false,
    lastSeen: stamp(),
  };
  state.instruments.push(instrument);
  audit(state, id, "Instrument registered", "Simulator adapter sequence.simulator.hplc. No physical instrument was contacted.");
  save(state);
  return ok(instrument);
}

export function setGatewayOnline(online: boolean): void {
  const state = structuredClone(load());
  const gateway = state.gateways[0];
  if (!gateway) return;
  gateway.online = online;
  gateway.lastSeen = stamp();
  audit(state, gateway.id, online ? "Gateway online" : "Gateway offline", gateway.note);
  save(state);
}

export function createSequence(input: {
  name: string;
  instrumentId: string;
  lines: Array<Omit<SequenceLine, "id" | "position"> & { position?: number }>;
}): ApiOk<SampleSequence> | ApiFailure {
  if (!input.name.trim()) return fail(400, "validation", "A sequence name is required.");
  if (!input.lines.length) return fail(400, "validation", "Add at least one injection.");
  const state = structuredClone(load());
  const instrument = state.instruments.find((item) => item.id === input.instrumentId);
  if (!instrument) return fail(404, "not_found", "Register an instrument before building a sequence.");
  const sequence: SampleSequence = {
    id: `SEQ-${state.next++}`,
    instanceId: currentInstanceId(),
    labId: instrument.labId,
    name: input.name.trim(),
    instrumentId: instrument.id,
    instrumentMethodId: "im-hplc-1",
    processingMethodId: "pm-int-1",
    lines: input.lines.map((line, index) => ({
      id: `LN-${index + 1}`,
      position: index + 1,
      role: line.role,
      sampleId: line.sampleId.trim(),
      name: line.name.trim() || line.sampleId.trim(),
      injections: Math.max(1, line.injections || 1),
    })),
    validatedAt: "",
    authorizedBy: "",
  };
  state.sequences.push(sequence);
  audit(state, sequence.id, "Sequence drafted", `${sequence.lines.length} injections on ${instrument.name}.`);
  save(state);
  return ok(sequence);
}

export function validateSequence(sequenceId: string): ApiOk<SampleSequence> | ApiFailure {
  const state = structuredClone(load());
  const sequence = state.sequences.find((item) => item.id === sequenceId);
  if (!sequence) return fail(404, "not_found", "Sequence not found.");
  if (sequence.lines.some((line) => !line.sampleId)) return fail(400, "validation", "Every injection needs a sample identifier.");
  const roles = new Set(sequence.lines.map((line) => line.role));
  if (!roles.has("sample")) return fail(400, "validation", "The sequence needs at least one sample injection.");
  sequence.validatedAt = stamp();
  audit(state, sequence.id, "Sequence validated", "Sample identifiers and method versions were checked.");
  save(state);
  return ok(sequence);
}

export function authorizeSequence(sequenceId: string, actor = actorName()): ApiOk<SampleSequence> | ApiFailure {
  if (!actor.trim()) return fail(400, "validation", "An operator is required to authorize a run.");
  const state = structuredClone(load());
  const sequence = state.sequences.find((item) => item.id === sequenceId);
  if (!sequence) return fail(404, "not_found", "Sequence not found.");
  if (!sequence.validatedAt) return fail(409, "conflict", "Validate the sequence before authorization.");
  sequence.authorizedBy = actor;
  audit(state, sequence.id, "Run authorized", actor, actor);
  save(state);
  return ok(sequence);
}

export function acquireSequence(sequenceId: string, idempotencyKey: string, actor = actorName()): ApiOk<AcquisitionRun> | ApiFailure {
  if (!idempotencyKey.trim()) return fail(400, "validation", "An idempotency key is required.");
  const existing = load().runs.find((run) => run.idempotencyKey === idempotencyKey);
  if (existing?.state === "complete") return ok(existing);
  if (existing) return fail(409, "conflict", `Run ${existing.id} is already ${existing.state}.`);

  const state = structuredClone(load());
  const sequence = state.sequences.find((item) => item.id === sequenceId);
  if (!sequence) return fail(404, "not_found", "Sequence not found.");
  if (!sequence.authorizedBy) return fail(409, "conflict", "Authorize the sequence before acquisition.");
  const instrument = state.instruments.find((item) => item.id === sequence.instrumentId);
  if (!instrument) return fail(404, "not_found", "Instrument not found.");
  const adapter = adapterById(instrument.adapterId);
  if (!adapter) return fail(422, "unsupported", "No adapter is registered for this instrument.");
  if (!adapter.capabilities.includes("acquire")) {
    return fail(422, "unsupported", `${adapter.id} cannot start an acquisition. ${adapter.limitation}`);
  }
  const gateway = state.gateways.find((item) => item.id === instrument.gatewayId);
  const blocked = ready(instrument, gateway);
  if (blocked) return blocked;

  const run: AcquisitionRun = {
    id: `RUN-${state.next++}`,
    idempotencyKey,
    instanceId: instrument.instanceId,
    labId: instrument.labId,
    sequenceId: sequence.id,
    instrumentId: instrument.id,
    instrumentMethodId: sequence.instrumentMethodId,
    processingMethodId: sequence.processingMethodId,
    state: "submitted",
    simulated: adapter.simulated,
    actor,
    submittedAt: stamp(),
    confirmedAt: "",
    error: "",
    raw: null,
    processing: [],
    report: "",
    events: [],
  };
  const note = (action: string, detail: string) => {
    const event = audit(state, run.id, action, detail, actor);
    run.events.push(event);
  };
  note("Submitted", "Waiting for the acquisition service to accept the run.");
  instrument.busy = true;
  const points = syntheticChromatogram();
  const raw: RawChromatogram = {
    detector: "UV 254 nm",
    points,
    checksum: checksumPoints(points),
    simulated: true,
  };
  run.state = "acquiring";
  run.confirmedAt = stamp();
  note("Acquisition confirmed", "Simulator adapter accepted the run and generated a synthetic chromatogram.");
  run.raw = raw;
  run.state = "transferring";
  note("Raw data stored", `Checksum ${raw.checksum}. ${points.length} points. Display copies are not a substitute.`);
  run.processing = [{
    version: 1,
    algorithm: "sequence.integrate.v1",
    parentVersion: null,
    manual: false,
    createdAt: stamp(),
    peaks: integrateSignal(points),
  }];
  run.state = "complete";
  instrument.busy = false;
  instrument.lastSeen = stamp();
  note("Acquisition complete", `${run.processing[0].peaks.length} peaks from sequence.integrate.v1.`);
  run.report = renderReport(state, run);
  note("Report generated", "Report uses the stored raw checksum and processing version 1.");
  state.runs.push(run);
  save(state);
  return ok(run);
}

export function reprocessRun(runId: string, manual?: { start: number; end: number }): ApiOk<AcquisitionRun> | ApiFailure {
  const state = structuredClone(load());
  const run = state.runs.find((item) => item.id === runId);
  if (!run?.raw) return fail(404, "not_found", "Completed raw data is required before reprocessing.");
  const previous = run.processing[run.processing.length - 1];
  const next: ProcessingVersion = {
    version: (previous?.version ?? 0) + 1,
    algorithm: "sequence.integrate.v1",
    parentVersion: previous?.version ?? null,
    manual: Boolean(manual),
    createdAt: stamp(),
    peaks: integrateSignal(run.raw.points, manual),
  };
  run.processing.push(next);
  run.report = renderReport(state, run);
  audit(state, run.id, manual ? "Manual integration" : "Reprocessed", `Processing version ${next.version}. Version ${previous?.version ?? 0} was kept.`);
  save(state);
  return ok(run);
}

export function stopRun(runId: string): ApiFailure {
  const run = load().runs.find((item) => item.id === runId);
  if (!run) return fail(404, "not_found", "Run not found.");
  if (run.state === "complete") return fail(409, "conflict", "The acquisition already completed.");
  return fail(422, "unsupported", "The simulator finishes a run in one step, so pause and mid-run stop are unsupported.");
}

function renderReport(state: PlatformState, run: AcquisitionRun): string {
  const instrument = state.instruments.find((item) => item.id === run.instrumentId);
  const latest = run.processing[run.processing.length - 1];
  const lines = [
    "Sequence chromatogram report",
    run.simulated ? "SIMULATED INSTRUMENT — not acquired from hardware." : "Hardware acquisition",
    `Run ${run.id}`,
    `Instrument ${instrument?.name ?? run.instrumentId} · adapter ${instrument?.adapterId ?? "unknown"} ${instrument?.adapterVersion ?? ""}`,
    `Instrument method ${run.instrumentMethodId}`,
    `Processing method ${run.processingMethodId}`,
    `Algorithm ${latest?.algorithm ?? "none"} version ${latest?.version ?? 0}`,
    `Raw checksum ${run.raw?.checksum ?? "missing"} · ${run.raw?.points.length ?? 0} points · ${run.raw?.detector ?? ""}`,
    "Peaks:",
    ...(latest?.peaks.map((peak) => `${peak.id} RT ${peak.rt} min · area ${peak.area} · height ${peak.height}`) ?? ["None"]),
  ];
  return lines.join("\n");
}

export function instrumentReadiness(instrument: PlatformInstrument): { connected: boolean; ready: boolean; reason: string } {
  const gateway = load().gateways.find((item) => item.id === instrument.gatewayId);
  if (instrument.connection !== "connected") return { connected: false, ready: false, reason: "Not connected." };
  if (!gateway?.online) return { connected: true, ready: false, reason: "Connected, but the local gateway is offline." };
  if (instrument.qualification === "expired") return { connected: true, ready: false, reason: "Connected, but qualification is expired." };
  if (instrument.busy) return { connected: true, ready: false, reason: "Connected and qualified, but an acquisition is open." };
  if (!supports(instrument.adapterId, "acquire")) return { connected: true, ready: false, reason: "Connected. This adapter cannot start a run." };
  return { connected: true, ready: true, reason: instrument.simulated ? "Ready in the simulator." : "Ready." };
}
