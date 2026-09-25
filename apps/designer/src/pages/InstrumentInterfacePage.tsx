import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSectionTabs } from "../sectionTabs";
import { InstrumentRecordView } from "../components/InstrumentRecordView";
import { addInstrument, findInstrument, useInstruments, type InstrumentRecord } from "../instruments";

const STEPS = ["Identity", "Interface", "Place"] as const;

function SequenceMark({ instrument }: { instrument: InstrumentRecord }) {
  return (
    <span className={`seq-mark${instrument.runningSequence ? " is-running" : ""}`}>
      <i />
      {instrument.runningSequence ? instrument.sequenceId : "Idle"}
    </span>
  );
}

export function InstrumentInterfacePage() {
  const sectionTabs = useSectionTabs();
  const instruments = useInstruments();
  const [openId, setOpenId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ name: "", model: "", interfaceType: "Bidirectional", site: "North Lab" });
  const [error, setError] = useState("");
  const open = instruments.find((item) => item.id === openId);

  function saveInstrument() {
    if (!draft.name.trim() || !draft.model.trim()) {
      setError("Name and model are required.");
      return;
    }
    const created = addInstrument(draft);
    setDraft({ name: "", model: "", interfaceType: "Bidirectional", site: "North Lab" });
    setStep(0);
    setError("");
    setOpenId(created.id);
  }

  function openTab(instrument: InstrumentRecord) {
    sectionTabs.pin({ kind: "instrument", recordId: instrument.id, title: instrument.name });
    setOpenId(null);
  }

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Equipment</p>
          <h1>Instrument Interface</h1>
          <p className="lims-page-lede">Integrated instruments, their status, and whether a sequence is running.</p>
        </div>
      </div>

      <section className="lims-panel instrument-workflow">
        <div className="lims-panel-head">
          <h2>Add an instrument</h2>
        </div>
        <ol className="instrument-steps">
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? "is-current" : ""}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        {step === 0 ? (
          <div className="instrument-fields">
            <label>
              Name
              <input aria-label="Instrument name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label>
              Model
              <input aria-label="Instrument model" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
            </label>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="instrument-fields">
            <label>
              Interface
              <select aria-label="Interface type" value={draft.interfaceType} onChange={(event) => setDraft({ ...draft, interfaceType: event.target.value })}>
                <option>Bidirectional</option>
                <option>Result file</option>
                <option>File drop</option>
                <option>Serial</option>
              </select>
            </label>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="instrument-fields">
            <label>
              Site
              <select aria-label="Instrument site" value={draft.site} onChange={(event) => setDraft({ ...draft, site: event.target.value })}>
                <option>North Lab</option>
                <option>East Lab</option>
              </select>
            </label>
          </div>
        ) : null}
        {error ? <p className="settings-error">{error}</p> : null}
        <div className="instrument-workflow-actions">
          {step > 0 ? (
            <button type="button" className="btn" onClick={() => setStep((value) => value - 1)}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep((value) => value + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={saveInstrument}>
              Add instrument
            </button>
          )}
        </div>
      </section>

      <section className="lims-panel">
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Status</th>
                <th>Sequence</th>
                <th>Site</th>
                <th>Interface</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((instrument) => (
                <tr key={instrument.id}>
                  <td>
                    <button type="button" className="instrument-link" onClick={() => setOpenId(instrument.id)}>
                      {instrument.name}
                    </button>
                  </td>
                  <td>
                    <span className={`lims-badge ${instrument.status === "Cal due" ? "warn" : instrument.status === "Online" ? "info" : ""}`}>
                      {instrument.status}
                    </span>
                  </td>
                  <td>
                    <SequenceMark instrument={instrument} />
                  </td>
                  <td>{instrument.site}</td>
                  <td>{instrument.interfaceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setOpenId(null)}>
          <div className="lims-modal" role="dialog" aria-modal="true" aria-labelledby="instrument-record-title" onClick={(event) => event.stopPropagation()}>
            <InstrumentRecordView instrument={open} onOpenWindow={() => openTab(open)} />
            <div className="lims-modal-actions">
              <button type="button" className="btn" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function InstrumentRecordPage() {
  const { instrumentId = "" } = useParams();
  const instrument = findInstrument(instrumentId);
  if (!instrument) {
    return (
      <div className="lims-page">
        <h1>Instrument not found</h1>
      </div>
    );
  }
  return (
    <div className="lims-page">
      <section className="lims-panel">
        <InstrumentRecordView instrument={instrument} />
      </section>
    </div>
  );
}
