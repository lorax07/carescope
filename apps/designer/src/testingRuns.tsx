import { findInstrument } from "./instruments";
import { findSample } from "./samples";

export type RunSequence = {
  id: string;
  instrumentId: string;
  sampleIds: string[];
  method: string;
  mobilePhase: string;
  solution: string;
  column: string;
  operator: string;
  startedAt: string;
  currentStep: number;
  steps: string[];
  audit: string[];
};

export const CURRENT_RUNS: RunSequence[] = [
  {
    id: "SEQ-HPLC-20491",
    instrumentId: "inst-hplc",
    sampleIds: ["SCP-20491", "SCP-20485"],
    method: "HPLC Assay and Impurities v4.2",
    mobilePhase: "60:40 phosphate buffer / acetonitrile",
    solution: "System suitability and working standard WS-8821",
    column: "C18, 150 × 4.6 mm, 5 µm",
    operator: "M. Chen",
    startedAt: "2026-07-25 08:34",
    currentStep: 3,
    steps: ["Prime", "Equilibrate", "System suitability", "Sample injections", "Wash", "Complete"],
    audit: ["08:34 Sequence started by M. Chen", "08:38 Pump pressure stable", "08:51 System suitability injection 3 of 6"],
  },
  {
    id: "SEQ-BACT-20488",
    instrumentId: "inst-bact",
    sampleIds: ["SCP-20488", "SCP-20494"],
    method: "Microbial Limits v7",
    mobilePhase: "Not applicable",
    solution: "Growth promotion controls GPT-0725",
    column: "BacT/ALERT FA Plus bottles",
    operator: "A. Rivera",
    startedAt: "2026-07-25 07:56",
    currentStep: 2,
    steps: ["Load", "Incubate", "Monitor", "Confirm", "Complete"],
    audit: ["07:56 Bottles loaded", "08:01 Incubator verified at 35 °C", "08:02 Continuous monitoring enabled"],
  },
  {
    id: "SEQ-ICP-20471",
    instrumentId: "inst-icp",
    sampleIds: ["SCP-20471"],
    method: "Heavy Metals ICP-MS v3.6",
    mobilePhase: "2% nitric acid carrier",
    solution: "Internal standard mix IS-2407",
    column: "Nickel sampler and skimmer cones",
    operator: "J. Patel",
    startedAt: "2026-07-24 15:22",
    currentStep: 4,
    steps: ["Tune", "Calibration", "Blank", "Samples", "QC check", "Complete"],
    audit: ["15:22 Tune passed", "15:37 Calibration R² 0.9998", "15:49 Sample acquisition started"],
  },
];

export function findRunSequence(id: string): RunSequence | undefined {
  return CURRENT_RUNS.find((run) => run.id === id);
}

export function RunSequenceView({ run }: { run: RunSequence }) {
  const instrument = findInstrument(run.instrumentId);
  const samples = run.sampleIds.map(findSample).filter(Boolean);
  const integrated = instrument && instrument.interfaceType !== "Manual";

  return (
    <div className="lims-page run-sequence-view">
      <div className="run-sequence-heading">
        <div>
          <p className="lims-eyebrow">Current run sequence</p>
          <h1>{run.id}</h1>
          <p className="lims-page-lede">{run.method} · {run.operator} · started {run.startedAt}</p>
        </div>
        <span className="lims-status testing">In testing</span>
      </div>

      <ol className="run-stepper" aria-label="Instrument progress">
        {run.steps.map((step, index) => (
          <li key={step} className={index < run.currentStep ? "is-done" : index === run.currentStep ? "is-current" : ""}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="run-detail-grid">
        <section className="lims-panel">
          <div className="lims-panel-head"><h2>Instrument</h2></div>
          <dl className="run-facts">
            <div><dt>Name</dt><dd>{instrument?.name ?? "Unknown"}</dd></div>
            <div><dt>Model</dt><dd>{instrument?.model ?? "—"}</dd></div>
            <div><dt>Lab</dt><dd>{instrument?.site ?? "—"}</dd></div>
            <div><dt>Interface</dt><dd>{instrument?.interfaceType ?? "—"}</dd></div>
          </dl>
          {integrated ? (
            <div className="instrument-control">
              <div><span>Flow</span><b>1.00 mL/min</b></div>
              <div><span>Pressure</span><b>128 bar</b></div>
              <div><span>Temperature</span><b>30.0 °C</b></div>
              <button type="button" className="btn btn-primary">Open instrument control panel</button>
            </div>
          ) : null}
        </section>

        <section className="lims-panel">
          <div className="lims-panel-head"><h2>Method and solutions</h2></div>
          <dl className="run-facts">
            <div><dt>Method</dt><dd>{run.method}</dd></div>
            <div><dt>Mobile phase</dt><dd>{run.mobilePhase}</dd></div>
            <div><dt>Solution</dt><dd>{run.solution}</dd></div>
            <div><dt>Column / consumable</dt><dd>{run.column}</dd></div>
          </dl>
        </section>

        <section className="lims-panel">
          <div className="lims-panel-head"><h2>Samples involved</h2></div>
          <ul className="lims-list">
            {samples.map((sample) => sample ? <li key={sample.accessionId}><b>{sample.accessionId}</b><small>{sample.client} · {sample.tests}</small></li> : null)}
          </ul>
        </section>

        <section className="lims-panel">
          <div className="lims-panel-head"><h2>Audit information</h2></div>
          <ul className="run-audit">{run.audit.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
