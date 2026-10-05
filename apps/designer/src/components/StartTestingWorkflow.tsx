import { useState } from "react";
import { useInstruments } from "../instruments";
import { testNames, type SampleRecord } from "../samples";

const STEPS = ["Samples", "Instrument", "Method & solutions", "Review"] as const;

export function StartTestingWorkflow({
  pool,
  onClose,
  onTab,
}: {
  pool: SampleRecord[];
  onClose?: () => void;
  onTab?: () => void;
}) {
  const instruments = useInstruments();
  const [step, setStep] = useState(0);
  const [sampleIds, setSampleIds] = useState<string[]>([]);
  const [instrumentId, setInstrumentId] = useState("");
  const [method, setMethod] = useState("");
  const [mobilePhase, setMobilePhase] = useState("");
  const [solution, setSolution] = useState("");
  const [column, setColumn] = useState("");
  const [flowRate, setFlowRate] = useState("1.00");
  const [temperature, setTemperature] = useState("30");
  const instrument = instruments.find((item) => item.id === instrumentId);
  const integrated = Boolean(instrument && instrument.interfaceType !== "Manual" && instrument.interfaceType !== "File drop");
  const chosen = pool.filter((sample) => sampleIds.includes(sample.accessionId));
  const availableMethods = [...new Set(chosen.flatMap(testNames))];
  const canContinue =
    step === 0 ? sampleIds.length > 0 :
    step === 1 ? Boolean(instrumentId) :
    step === 2 ? Boolean(method && mobilePhase && solution) :
    true;

  function toggleSample(id: string) {
    setSampleIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="start-testing-workflow">
      <div className="lims-panel-head">
        <div>
          <p className="lims-eyebrow">Chemist workflow</p>
          <h2>Start Testing</h2>
        </div>
        <div className="start-testing-head-actions">
          {onTab ? <button type="button" className="btn" onClick={onTab}>Tab workflow</button> : null}
          {onClose ? <button type="button" className="btn" onClick={onClose}>Close</button> : null}
        </div>
      </div>

      <ol className="testing-workflow-steps">
        {STEPS.map((label, index) => (
          <li key={label} className={index < step ? "is-done" : index === step ? "is-current" : ""}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>

      <div className="start-testing-body">
        {step === 0 ? (
          <section>
            <h3>Select samples</h3>
            <p>Choose the samples that belong on this run sequence.</p>
            <ul className="lims-list testing-sample-picker">
              {pool.map((sample) => (
                <li key={sample.accessionId}>
                  <input type="checkbox" checked={sampleIds.includes(sample.accessionId)} onChange={() => toggleSample(sample.accessionId)} />
                  <div><b>{sample.accessionId}</b><small>{sample.client} · {sample.tests} · {sample.priority}</small></div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {step === 1 ? (
          <section>
            <h3>Choose an instrument</h3>
            <div className="testing-form-grid">
              <label>Instrument<select value={instrumentId} onChange={(event) => setInstrumentId(event.target.value)}><option value="">Select instrument</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.site} · {item.status}</option>)}</select></label>
              <label>Run type<select><option>Sample analysis</option><option>System suitability</option><option>Calibration</option></select></label>
            </div>
            {instrument ? <p className="testing-instrument-note">{instrument.model} · {instrument.interfaceType} · {integrated ? "Integrated control available" : "Manual instrument"}</p> : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <h3>Method, mobile phase and controls</h3>
            <div className="testing-form-grid">
              <label>Method<input list="testing-methods" value={method} onChange={(event) => setMethod(event.target.value)} /><datalist id="testing-methods">{availableMethods.map((name) => <option key={name} value={name} />)}</datalist></label>
              <label>Column / consumable<input value={column} onChange={(event) => setColumn(event.target.value)} placeholder="C18, vial lot, bottle type…" /></label>
              <label>Mobile phase<input value={mobilePhase} onChange={(event) => setMobilePhase(event.target.value)} placeholder="Composition and lot" /></label>
              <label>Standard / solution<input value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Standard, control or solution lot" /></label>
              <label>Flow rate<input value={flowRate} onChange={(event) => setFlowRate(event.target.value)} /></label>
              <label>Temperature<input value={temperature} onChange={(event) => setTemperature(event.target.value)} /></label>
            </div>
            {integrated ? (
              <div className="instrument-control is-setup">
                <div><span>Connection</span><b>Ready</b></div>
                <div><span>Flow setpoint</span><b>{flowRate} mL/min</b></div>
                <div><span>Temperature</span><b>{temperature} °C</b></div>
                <button type="button" className="btn btn-primary">Open instrument control panel</button>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <h3>Review run sequence</h3>
            <dl className="run-facts">
              <div><dt>Samples</dt><dd>{chosen.map((sample) => sample.accessionId).join(", ")}</dd></div>
              <div><dt>Instrument</dt><dd>{instrument?.name}</dd></div>
              <div><dt>Method</dt><dd>{method}</dd></div>
              <div><dt>Mobile phase</dt><dd>{mobilePhase}</dd></div>
              <div><dt>Standard / solution</dt><dd>{solution}</dd></div>
              <div><dt>Column / consumable</dt><dd>{column || "Not entered"}</dd></div>
            </dl>
          </section>
        ) : null}
      </div>

      <div className="start-testing-actions">
        <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}>Continue</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onClose}>Start testing</button>
        )}
      </div>
    </div>
  );
}
