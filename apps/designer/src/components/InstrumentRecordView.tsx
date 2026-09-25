import type { InstrumentDoc, InstrumentRecord } from "../instruments";

function DocList({ title, docs }: { title: string; docs: InstrumentDoc[] }) {
  return (
    <section>
      <h3>{title}</h3>
      {docs.length === 0 ? (
        <p>None on file yet.</p>
      ) : (
        <ul className="lims-list">
          {docs.map((doc) => (
            <li key={`${title}-${doc.name}-${doc.date}`}>
              <div>
                <b>{doc.name}</b>
                <small>
                  {doc.date} · {doc.detail}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InstrumentRecordView({
  instrument,
  onOpenWindow,
}: {
  instrument: InstrumentRecord;
  onOpenWindow?: () => void;
}) {
  return (
    <div className="instrument-record">
      <div className="lims-panel-head">
        <div>
          <h2 id="instrument-record-title">{instrument.name}</h2>
          <p>
            {instrument.model} · {instrument.site} · {instrument.interfaceType}
          </p>
        </div>
        {onOpenWindow ? (
          <button type="button" className="btn" onClick={onOpenWindow}>
            Open in new window
          </button>
        ) : null}
      </div>
      <div className="instrument-record-body">
        <p>
          Status {instrument.status}.{" "}
          {instrument.runningSequence
            ? `Running sequence ${instrument.sequenceId}${instrument.sample ? ` for ${instrument.sample}` : ""}.`
            : "Not running a sequence."}
        </p>
        <DocList title="Validation documents" docs={instrument.validation} />
        <DocList title="Calibration documents" docs={instrument.calibration} />
        <DocList title="Maintenance" docs={instrument.maintenance} />
      </div>
    </div>
  );
}
