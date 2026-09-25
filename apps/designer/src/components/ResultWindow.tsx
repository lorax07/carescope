import { useEffect, useState } from "react";
import { sampleResults, type SampleRecord } from "../samples";

const REASONS = ["Out of limit", "Recheck", "Unexpected"] as const;

type Flag = { reason: (typeof REASONS)[number] };

const flags = new Map<string, Flag>();
const listeners = new Set<() => void>();

function flagKey(accessionId: string, analyte: string) {
  return `${accessionId}:${analyte}`;
}

function useFlags(): Map<string, Flag> {
  const [current, setCurrent] = useState(() => new Map(flags));
  useEffect(() => {
    const sync = () => setCurrent(new Map(flags));
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return current;
}

function setFlag(key: string, flag: Flag | null) {
  if (flag) flags.set(key, flag);
  else flags.delete(key);
  listeners.forEach((listener) => listener());
}

export function ResultWindow({
  samples,
  authorize,
  onAuthorize,
  onClose,
}: {
  samples: SampleRecord[];
  authorize: boolean;
  onAuthorize: () => void;
  onClose: () => void;
}) {
  const planted = useFlags();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  function plant(key: string) {
    setPending(key);
    setArmed(false);
  }

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="lims-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-window-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lims-panel-head">
          <h2 id="result-window-title">Results</h2>
          <button
            type="button"
            className={`result-flag-token${armed ? " is-armed" : ""}`}
            draggable
            aria-pressed={armed}
            aria-label="Flag a result. Drag onto a result, or select this and then the result."
            onClick={() => setArmed((value) => !value)}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", "flag");
              event.dataTransfer.effectAllowed = "copy";
            }}
          >
            Flag
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="result-flag-hint">Drag the flag onto a result, or select the flag and then the result.</p>
        <div className="lims-modal-body">
          {samples.map((sample) => (
            <section key={sample.accessionId}>
              <h3>
                {sample.accessionId}
                {sample.batchId ? ` · ${sample.batchId}` : ""}
              </h3>
              <p>
                {sample.client} · {sample.tests}
              </p>
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Analyte</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {(sampleResults(sample.accessionId) ?? []).map((row) => {
                    const key = flagKey(sample.accessionId, row.analyte);
                    const flag = planted.get(key);
                    return (
                      <tr
                        key={row.analyte}
                        className={flag ? "is-flagged" : armed ? "is-flag-target" : ""}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          plant(key);
                        }}
                        onClick={() => {
                          if (armed) plant(key);
                        }}
                      >
                        <td>
                          {flag ? <span className="result-flag-mark">Flag</span> : null}
                          {row.analyte}
                        </td>
                        <td className="lims-mono">{row.result}</td>
                        <td>{row.unit}</td>
                        <td>{row.limit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(sampleResults(sample.accessionId) ?? []).map((row) => {
                const key = flagKey(sample.accessionId, row.analyte);
                if (pending !== key && !planted.get(key)) return null;
                const flag = planted.get(key);
                return (
                  <div key={key} className="result-flag-note">
                    <b>
                      {row.analyte}
                      {flag ? ` · ${flag.reason}` : ""}
                    </b>
                    <div>
                      {REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          className={`btn btn-mini${flag?.reason === reason ? " is-on" : ""}`}
                          onClick={() => setFlag(key, { reason })}
                        >
                          {reason}
                        </button>
                      ))}
                      {flag ? (
                        <button type="button" className="btn btn-mini" onClick={() => setFlag(key, null)}>
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        {authorize ? (
          <div className="lims-modal-actions">
            <button type="button" className="btn btn-primary" onClick={onAuthorize}>
              Authorize
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
