import { useEffect, useState } from "react";
import { currentInstanceId, labIdFromSite, moduleStorageKey, readJson, writeJson } from "./storageScope";

export type InstrumentDoc = {
  name: string;
  date: string;
  detail: string;
};

export type InstrumentRecord = {
  id: string;
  clientId: string;
  labId: string;
  name: string;
  model: string;
  status: "Online" | "Idle" | "Cal due" | "Offline";
  runningSequence: boolean;
  sequenceId: string | null;
  sample: string | null;
  site: string;
  instanceId?: string;
  interfaceType: string;
  validation: InstrumentDoc[];
  calibration: InstrumentDoc[];
  maintenance: InstrumentDoc[];
};

const KEY = "carescope.instruments.added";
const EVENT = "carescope-instruments";

function instrumentsKey(instanceId = currentInstanceId()): string {
  return moduleStorageKey("instrument_integration", "instruments", instanceId);
}

function withInstrumentScope(item: InstrumentRecord, instanceId: string): InstrumentRecord {
  return {
    ...item,
    clientId: item.clientId ?? "client-apex",
    labId: item.labId || labIdFromSite(item.site),
    instanceId: item.instanceId || instanceId,
  };
}

export const SEEDED_INSTRUMENTS: InstrumentRecord[] = [
  {
    id: "inst-hplc",
    clientId: "client-apex",
    labId: "lab-north",
    name: "Agilent 1260 HPLC",
    model: "1260 Infinity II",
    status: "Online",
    runningSequence: true,
    sequenceId: "SEQ-HPLC-20491",
    sample: "SCP-20491",
    site: "North Lab",
    interfaceType: "Bidirectional",
    validation: [
      { name: "IQ", date: "2025-11-02", detail: "Installation qualification signed" },
      { name: "OQ", date: "2025-11-04", detail: "Operational qualification passed" },
      { name: "PQ", date: "2025-11-18", detail: "Performance qualification for assay" },
    ],
    calibration: [{ name: "Wavelength and flow", date: "2026-06-12", detail: "Due 2026-12-12" }],
    maintenance: [{ name: "Pump seal", date: "2026-05-03", detail: "Preventive" }],
  },
  {
    id: "inst-orbitrap",
    clientId: "client-apex",
    labId: "lab-north",
    name: "Thermo Orbitrap Exploris",
    model: "Exploris 120",
    status: "Idle",
    runningSequence: false,
    sequenceId: null,
    sample: null,
    site: "North Lab",
    interfaceType: "Bidirectional",
    validation: [
      { name: "IQ", date: "2025-08-14", detail: "Installed in MS suite" },
      { name: "OQ", date: "2025-08-16", detail: "Mass accuracy within limit" },
    ],
    calibration: [{ name: "Mass calibration", date: "2026-07-01", detail: "Due 2026-08-01" }],
    maintenance: [{ name: "Source clean", date: "2026-06-28", detail: "Routine" }],
  },
  {
    id: "inst-bact",
    clientId: "client-apex",
    labId: "lab-north",
    name: "BioMérieux BacT/ALERT",
    model: "BacT/ALERT 3D",
    status: "Online",
    runningSequence: true,
    sequenceId: "SEQ-BACT-20488",
    sample: "SCP-20488",
    site: "North Lab",
    interfaceType: "Result file",
    validation: [
      { name: "IQ", date: "2024-04-09", detail: "Micro suite install" },
      { name: "PQ", date: "2024-05-02", detail: "Growth promotion challenge" },
    ],
    calibration: [{ name: "Temperature map", date: "2026-03-11", detail: "Due 2027-03-11" }],
    maintenance: [{ name: "Cell module", date: "2026-02-19", detail: "Replaced" }],
  },
  {
    id: "inst-titrando",
    clientId: "client-apex",
    labId: "lab-east",
    name: "Metrohm Titrando 907",
    model: "907 Titrando",
    status: "Cal due",
    runningSequence: false,
    sequenceId: null,
    sample: null,
    site: "East Lab",
    interfaceType: "Serial",
    validation: [{ name: "OQ", date: "2025-01-22", detail: "Burette accuracy" }],
    calibration: [{ name: "Burette", date: "2026-01-26", detail: "Due 2026-07-26" }],
    maintenance: [{ name: "Electrode", date: "2026-01-26", detail: "Replaced" }],
  },
  {
    id: "inst-icp",
    clientId: "client-apex",
    labId: "lab-north",
    name: "Agilent 7900 ICP-MS",
    model: "7900",
    status: "Online",
    runningSequence: true,
    sequenceId: "SEQ-ICP-20471",
    sample: "SCP-20471",
    site: "North Lab",
    interfaceType: "Bidirectional",
    validation: [
      { name: "IQ", date: "2025-09-01", detail: "Metals lab install" },
      { name: "OQ", date: "2025-09-03", detail: "Tune and detection limits" },
    ],
    calibration: [{ name: "Tune report", date: "2026-07-20", detail: "Due 2026-08-20" }],
    maintenance: [{ name: "Cone clean", date: "2026-07-18", detail: "Routine" }],
  },
  {
    id: "inst-ftir",
    clientId: "client-apex",
    labId: "lab-east",
    name: "Thermo Nicolet FTIR",
    model: "iS50",
    status: "Idle",
    runningSequence: false,
    sequenceId: null,
    sample: null,
    site: "East Lab",
    interfaceType: "File drop",
    validation: [{ name: "PQ", date: "2025-06-15", detail: "Polystyrene wavenumber check" }],
    calibration: [{ name: "Wavenumber", date: "2026-06-15", detail: "Due 2026-12-15" }],
    maintenance: [{ name: "Desiccant", date: "2026-04-02", detail: "Replaced" }],
  },
];

function allInstruments(instanceId = currentInstanceId()): InstrumentRecord[] {
  const parsed = readJson<InstrumentRecord[]>(instrumentsKey(instanceId), [KEY]);
  const added = Array.isArray(parsed) ? parsed.map((item) => withInstrumentScope(item, instanceId)) : [];
  return [...SEEDED_INSTRUMENTS.map((item) => withInstrumentScope(item, instanceId)), ...added];
}

export function useInstruments(): InstrumentRecord[] {
  const [rows, setRows] = useState(() => allInstruments());
  useEffect(() => {
    const sync = () => setRows(allInstruments());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return rows;
}

export function findInstrument(id: string): InstrumentRecord | undefined {
  return allInstruments().find((item) => item.id === id);
}

export function addInstrument(input: {
  name: string;
  model: string;
  interfaceType: string;
  site: string;
  clientId?: string;
  labId?: string;
}): InstrumentRecord {
  const instanceId = currentInstanceId();
  const record: InstrumentRecord = {
    id: `inst-${Date.now()}`,
    clientId: input.clientId ?? "client-apex",
    labId: input.labId || labIdFromSite(input.site),
    instanceId,
    name: input.name.trim(),
    model: input.model.trim(),
    status: "Idle",
    runningSequence: false,
    sequenceId: null,
    sample: null,
    site: input.site.trim(),
    interfaceType: input.interfaceType,
    validation: [],
    calibration: [],
    maintenance: [{ name: "Added to Sequence", date: new Date().toISOString().slice(0, 10), detail: "Awaiting qualification" }],
  };
  const existing = readJson<InstrumentRecord[]>(instrumentsKey(instanceId), [KEY]);
  const next = [...(Array.isArray(existing) ? existing : []), record];
  writeJson(instrumentsKey(instanceId), next);
  window.dispatchEvent(new Event(EVENT));
  return record;
}
