import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ADAPTERS,
  INSTRUMENT_API_EXAMPLES,
  INSTRUMENT_API_VERSION,
  acquireSequence,
  authorizeSequence,
  createSequence,
  decimateForDisplay,
  instrumentReadiness,
  reprocessRun,
  registerSimulatedHplc,
  usePlatform,
  validateSequence,
  type Peak,
  type RawPoint,
} from "../../instrumentPlatform";
import { useSamples } from "../../samples";
import { InstrumentChrome } from "./InstrumentChrome";

function failure(result: { ok: false; message: string } | { ok: true }): string {
  return result.ok ? "" : result.message;
}

export function InstrumentQueuePage() {
  const platform = usePlatform();
  const samples = useSamples();
  const [instrumentId, setInstrumentId] = useState(platform.instruments[0]?.id ?? "");
  const [name, setName] = useState("Assay sequence");
  const [sampleId, setSampleId] = useState(samples[0]?.accessionId ?? "");
  const [role, setRole] = useState<"blank" | "standard" | "control" | "sample">("sample");
  const [lines, setLines] = useState<Array<{ role: "blank" | "standard" | "control" | "sample"; sampleId: string; name: string; injections: number }>>([]);
  const [sequenceId, setSequenceId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function addLine() {
    if (!sampleId.trim()) return;
    setLines((current) => [...current, { role, sampleId: sampleId.trim(), name: sampleId.trim(), injections: 1 }]);
  }

  function draft() {
    const result = createSequence({ name, instrumentId, lines });
    setError(failure(result));
    if (result.ok) {
      setSequenceId(result.value.id);
      setMessage(`Draft ${result.value.id} saved. It is not submitted.`);
    }
  }

  function validate() {
    const result = validateSequence(sequenceId);
    setError(failure(result));
    if (result.ok) setMessage(`${result.value.id} validated against sample identifiers and method versions.`);
  }

  function authorize() {
    const result = authorizeSequence(sequenceId);
    setError(failure(result));
    if (result.ok) setMessage(`${result.value.id} authorized by ${result.value.authorizedBy}.`);
  }

  function acquire() {
    const result = acquireSequence(sequenceId, `${sequenceId}-acquire`);
    setError(failure(result));
    if (result.ok) setMessage(`${result.value.id} completed in the simulator. Confirmed at ${result.value.confirmedAt}.`);
  }

  return (
    <InstrumentChrome title="Run queue" lede="A run is submitted only after validation, authorization, and an adapter that can acquire.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Sequence</h2>
        </div>
        <div className="instrument-fields">
          <label>
            Instrument
            <select aria-label="Queue instrument" value={instrumentId} onChange={(event) => setInstrumentId(event.target.value)}>
              <option value="">Select</option>
              {platform.instruments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.simulated ? "(simulator)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input aria-label="Sequence name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Injection
            <select aria-label="Injection role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="blank">Blank</option>
              <option value="standard">Standard</option>
              <option value="control">Control</option>
              <option value="sample">Sample</option>
            </select>
          </label>
          <label>
            Sample
            <input aria-label="Injection sample" list="queue-samples" value={sampleId} onChange={(event) => setSampleId(event.target.value)} />
            <datalist id="queue-samples">
              {samples.slice(0, 20).map((sample) => (
                <option key={sample.accessionId} value={sample.accessionId} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="instrument-workflow-actions">
          <button type="button" className="btn" onClick={addLine}>Add injection</button>
          <button type="button" className="btn" onClick={draft} disabled={!lines.length || !instrumentId}>Save draft</button>
          <button type="button" className="btn" onClick={validate} disabled={!sequenceId}>Validate</button>
          <button type="button" className="btn" onClick={authorize} disabled={!sequenceId}>Authorize</button>
          <button type="button" className="btn btn-primary" onClick={acquire} disabled={!sequenceId}>Submit to simulator</button>
        </div>
        {error ? <p className="settings-error">{error}</p> : null}
        {message ? <p className="billing-note">{message}</p> : null}
        {lines.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr><th>#</th><th>Role</th><th>Sample</th></tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={`${line.sampleId}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{line.role}</td>
                    <td>{line.sampleId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="billing-note">No injections yet. Register a simulated HPLC from the registry before submitting.</p>}
      </section>
    </InstrumentChrome>
  );
}

export function InstrumentAcquirePage() {
  const platform = usePlatform();
  return (
    <InstrumentChrome title="Acquisition" lede="Progress appears after the adapter confirms the run. Nothing here is inferred from a connected network port.">
      <section className="lims-panel">
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr><th>Run</th><th>State</th><th>Source</th><th>Confirmed</th><th></th></tr>
            </thead>
            <tbody>
              {platform.runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.id}</td>
                  <td>{run.state}</td>
                  <td>{run.simulated ? "Simulator" : "Adapter"}</td>
                  <td>{run.confirmedAt || "Not confirmed"}</td>
                  <td>{run.state === "complete" ? <Link to={`/app/instruments/review/${run.id}`}>Review</Link> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {platform.runs.length === 0 ? <p className="billing-note">No acquisition has been confirmed.</p> : null}
      </section>
    </InstrumentChrome>
  );
}

function ChromatogramPlot({
  points,
  peaks,
  selected,
  onSelect,
}: {
  points: RawPoint[];
  peaks: Peak[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const shown = useMemo(() => decimateForDisplay(points, 400), [points]);
  const maxY = Math.max(...shown.map((point) => point.y), 1);
  const width = 760;
  const height = 280;
  const pad = 36;
  const xOf = (t: number) => pad + (t / 10) * (width - pad * 2);
  const yOf = (y: number) => height - pad - (y / (maxY * 1.08)) * (height - pad * 2);
  const path = shown.map((point, index) => `${index ? "L" : "M"}${xOf(point.t).toFixed(1)},${yOf(point.y).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chromatogram" role="img" aria-label="Chromatogram">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} />
      <text x={width / 2} y={height - 8} textAnchor="middle">Minutes</text>
      <text x={14} y={20}>Signal</text>
      <path d={path} fill="none" stroke="#1b6ef3" strokeWidth="1.6" />
      {peaks.map((peak) => (
        <g key={peak.id} onClick={() => onSelect(peak.id)}>
          <line x1={xOf(peak.apex)} y1={yOf(peak.height + 5)} x2={xOf(peak.apex)} y2={height - pad} stroke={selected === peak.id ? "#111" : "#94a3b8"} />
          <text x={xOf(peak.apex)} y={yOf(peak.height + 5) - 6} textAnchor="middle">{peak.rt}</text>
        </g>
      ))}
    </svg>
  );
}

export function InstrumentReviewPage() {
  const platform = usePlatform();
  const { runId = "" } = useParams();
  const run = platform.runs.find((item) => item.id === runId) ?? platform.runs.find((item) => item.state === "complete");
  const latest = run?.processing[run.processing.length - 1];
  const [selected, setSelected] = useState("");
  const [bounds, setBounds] = useState({ start: "4", end: "5" });
  const [error, setError] = useState("");
  const peak = latest?.peaks.find((item) => item.id === selected) ?? latest?.peaks[0];

  function manual() {
    if (!run) return;
    const result = reprocessRun(run.id, { start: Number(bounds.start), end: Number(bounds.end) });
    setError(failure(result));
  }

  if (!run?.raw || !latest) {
    return (
      <InstrumentChrome title="Review" lede="Chromatograms are drawn from stored points, or from an explicitly simulated acquisition.">
        <p className="billing-note">No completed raw data is stored yet. Submit a simulator sequence from the queue.</p>
        <ul className="lims-list">
          {platform.runs.map((item) => (
            <li key={item.id}><Link to={`/app/instruments/review/${item.id}`}>{item.id}</Link> · {item.state}</li>
          ))}
        </ul>
      </InstrumentChrome>
    );
  }

  return (
    <InstrumentChrome title={run.id} lede={run.simulated ? "Simulated chromatogram. The trace is not from a physical detector." : "Acquired chromatogram."}>
      <p className="billing-note">
        Displaying {decimateForDisplay(run.raw.points, 400).length} of {run.raw.points.length} stored points. Checksum {run.raw.checksum}. Processing {latest.algorithm} version {latest.version}. Instrument method {run.instrumentMethodId}.
      </p>
      <section className="lims-panel chromatogram-panel">
        <ChromatogramPlot points={run.raw.points} peaks={latest.peaks} selected={peak?.id ?? ""} onSelect={setSelected} />
      </section>
      <section className="lims-panel">
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr><th>Peak</th><th>RT</th><th>Start</th><th>End</th><th>Area</th><th>Height</th></tr>
            </thead>
            <tbody>
              {latest.peaks.map((item) => (
                <tr key={item.id} className={item.id === peak?.id ? "is-selected" : undefined} onClick={() => setSelected(item.id)}>
                  <td>{item.id}</td>
                  <td>{item.rt}</td>
                  <td>{item.start}</td>
                  <td>{item.end}</td>
                  <td>{item.area}</td>
                  <td>{item.height}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="instrument-fields">
          <label>
            Manual start
            <input aria-label="Manual start" value={bounds.start} onChange={(event) => setBounds({ ...bounds, start: event.target.value })} />
          </label>
          <label>
            Manual end
            <input aria-label="Manual end" value={bounds.end} onChange={(event) => setBounds({ ...bounds, end: event.target.value })} />
          </label>
          <button type="button" className="btn" onClick={manual}>Reprocess range</button>
        </div>
        {error ? <p className="settings-error">{error}</p> : null}
        <p className="billing-note">{run.processing.length} processing version{run.processing.length === 1 ? "" : "s"} kept.</p>
        <pre className="instrument-report">{run.report}</pre>
        <ul className="lims-list">
          {run.events.map((event) => (
            <li key={event.id}><b>{event.action}</b> <small>{event.at} · {event.actor} · {event.detail}</small></li>
          ))}
        </ul>
      </section>
    </InstrumentChrome>
  );
}

export function InstrumentApiNote() {
  const platform = usePlatform();
  const [message, setMessage] = useState("");

  function register() {
    const result = registerSimulatedHplc();
    setMessage(result.ok ? `${result.value.name} registered on the local simulator gateway. It is not a physical instrument.` : result.message);
  }

  return (
    <section className="lims-panel billing-panel">
      <div className="lims-panel-head">
        <h2>Instrument API {INSTRUMENT_API_VERSION}</h2>
        <button type="button" className="btn btn-primary" onClick={register}>Register simulated HPLC</button>
      </div>
      <p className="billing-note">
        The contract is in-process and versioned. Instrument control ports are not published to the internet. A file-drop adapter can receive data and cannot start a run. Pause and resume are unsupported on the simulator.
      </p>
      {message ? <p className="billing-note">{message}</p> : null}
      <div className="lims-table-wrap">
        <table className="lims-table">
          <thead><tr><th>Call</th><th>Example</th></tr></thead>
          <tbody>
            {Object.entries(INSTRUMENT_API_EXAMPLES).map(([name, example]) => (
              <tr key={name}>
                <td>{example.method} {example.path}</td>
                <td><code>{JSON.stringify("body" in example ? example.body : {})}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lims-table-wrap">
        <table className="lims-table">
          <thead><tr><th>Adapter</th><th>Capabilities</th><th>Limitation</th></tr></thead>
          <tbody>
            {ADAPTERS.map((adapter) => (
              <tr key={adapter.id}>
                <td>{adapter.id} {adapter.simulated ? "· simulator" : ""}</td>
                <td>{adapter.capabilities.join(", ")}</td>
                <td>{adapter.limitation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {platform.instruments.length ? (
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead><tr><th>Registered</th><th>Connection</th><th>Ready</th><th>Why</th></tr></thead>
            <tbody>
              {platform.instruments.map((item) => {
                const status = instrumentReadiness(item);
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{status.connected ? "Connected" : "Offline"}</td>
                    <td>{status.ready ? "Ready" : "Not ready"}</td>
                    <td>{status.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {platform.gateways.map((gateway) => (
        <p key={gateway.id} className="billing-note">{gateway.name}: {gateway.online ? "online" : "offline"}. {gateway.note}</p>
      ))}
    </section>
  );
}
