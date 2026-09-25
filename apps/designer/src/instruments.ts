import { useEffect, useState } from "react";

export type InstrumentDoc = {
  name: string;
  date: string;
  detail: string;
};

export type InstrumentRecord = {
  id: string;
  name: string;
  model: string;
  status: "Online" | "Idle" | "Cal due" | "Offline";
  runningSequence: boolean;
  sequenceId: string | null;
  sample: string | null;
  site: string;
  interfaceType: string;
  validation: InstrumentDoc[];
  calibration: InstrumentDoc[];
  maintenance: InstrumentDoc[];
};

const KEY = "carescope.instruments.added";
const EVENT = "carescope-instruments";

export const SEEDED_INSTRUMENTS: InstrumentRecord[] = [
  {
    id: "inst-hplc",
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

function readAdded(): InstrumentRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InstrumentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useInstruments(): InstrumentRecord[] {
  const [added, setAdded] = useState(readAdded);
  useEffect(() => {
    const sync = () => setAdded(readAdded());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [...SEEDED_INSTRUMENTS, ...added];
}

export function findInstrument(id: string): InstrumentRecord | undefined {
  return [...SEEDED_INSTRUMENTS, ...readAdded()].find((item) => item.id === id);
}

export function addInstrument(input: {
  name: string;
  model: string;
  interfaceType: string;
  site: string;
}): InstrumentRecord {
  const record: InstrumentRecord = {
    id: `inst-${Date.now()}`,
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
  const next = [...readAdded(), record];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return record;
}
