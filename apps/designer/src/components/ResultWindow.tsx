import { Fragment, useEffect, useState } from "react";
import { readLimsSession } from "../limsSession";
import { pinState, verifyReviewerPin } from "../reviewerPin";
import { sampleResults, type SampleRecord } from "../samples";

const REASONS = ["Out of limit", "Recheck", "Unexpected"] as const;

type Flag = { reason: (typeof REASONS)[number]; by: string };

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
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draftReason, setDraftReason] = useState<(typeof REASONS)[number] | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  function confirmFlag(key: string) {
    if (!draftReason) {
      setPinError("Choose a reason first.");
      return;
    }
    if (pinState() !== "active") {
      setPinError("Set a reviewer PIN in Settings. A PIN lasts 90 days.");
      return;
    }
    if (!verifyReviewerPin(pin)) {
      setPinError("PIN does not match.");
      return;
    }
    const session = readLimsSession();
    setFlag(key, { reason: draftReason, by: session?.username ?? "M. Chen" });
    setPin("");
    setPinError("");
    setOpenKey(null);
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
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(sampleResults(sample.accessionId) ?? []).map((row) => {
                    const key = flagKey(sample.accessionId, row.analyte);
                    const flag = planted.get(key);
                    const open = openKey === key;
                    return (
                      <Fragment key={row.analyte}>
                        <tr className={flag ? "is-flagged" : ""}>
                          <td>{row.analyte}</td>
                          <td className="lims-mono">{row.result}</td>
                          <td>{row.unit}</td>
                          <td>{row.limit}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-mini"
                              onClick={() => {
                                setOpenKey(open ? null : key);
                                setDraftReason(flag?.reason ?? null);
                                setPin("");
                                setPinError("");
                              }}
                            >
                              {flag ? "Flagged" : "Flag"}
                            </button>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="result-flag-row">
                            <td colSpan={5}>
                              <div className="result-flag-note">
                                <div>
                                  {REASONS.map((reason) => (
                                    <button
                                      key={reason}
                                      type="button"
                                      className={`btn btn-mini${draftReason === reason ? " is-on" : ""}`}
                                      onClick={() => {
                                        setDraftReason(reason);
                                        setPinError("");
                                      }}
                                    >
                                      {reason}
                                    </button>
                                  ))}
                                </div>
                                <label className="result-flag-pin">
                                  PIN
                                  <input
                                    type="password"
                                    inputMode="numeric"
                                    aria-label={`Reviewer PIN for ${row.analyte}`}
                                    value={pin}
                                    onChange={(event) => setPin(event.target.value)}
                                  />
                                </label>
                                <button type="button" className="btn btn-mini" onClick={() => confirmFlag(key)}>
                                  Confirm
                                </button>
                                {flag ? (
                                  <button type="button" className="btn btn-mini" onClick={() => setFlag(key, null)}>
                                    Clear
                                  </button>
                                ) : null}
                                {pinError ? <span className="settings-error">{pinError}</span> : null}
                                {flag ? (
                                  <span>
                                    {flag.reason} · {flag.by}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
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
