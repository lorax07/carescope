import { useState } from "react";
import { testNames, type SampleRecord } from "../samples";

export function CreateBatchDialog({
  pool,
  fromSelection,
  onCreate,
  onClose,
}: {
  pool: SampleRecord[];
  fromSelection: boolean;
  onCreate: (samples: SampleRecord[]) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"confirm" | "test" | "samples">(fromSelection ? "confirm" : "test");
  const [test, setTest] = useState("");
  const tests = [...new Set(pool.flatMap(testNames))].sort();
  const matched = test ? pool.filter((sample) => testNames(sample).includes(test)) : [];

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="lims-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lims-panel-head">
          <h2 id="batch-dialog-title">Create a batch</h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="lims-modal-body">
          {step === "confirm" ? (
            <>
              <p>Create a batch from the {pool.length} selected sample{pool.length === 1 ? "" : "s"}?</p>
              <div className="lims-modal-actions">
                <button type="button" className="btn" onClick={onClose}>
                  No
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep("test")}>
                  Yes
                </button>
              </div>
            </>
          ) : null}
          {step === "test" ? (
            <>
              <p>Which test should this batch run?</p>
              <label className="lims-test-filter">
                Test
                <select aria-label="Batch test" value={test} onChange={(event) => setTest(event.target.value)}>
                  <option value="">Select a test</option>
                  {tests.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lims-modal-actions">
                <button type="button" className="btn btn-primary" disabled={!test} onClick={() => setStep("samples")}>
                  Show samples
                </button>
              </div>
            </>
          ) : null}
          {step === "samples" ? (
            <>
              <p>Samples on this list that include {test}.</p>
              <ul className="lims-list">
                {matched.length === 0 ? (
                  <li>No samples include {test}.</li>
                ) : (
                  matched.map((sample) => (
                    <li key={sample.accessionId}>
                      <div>
                        <b>{sample.accessionId}</b>
                        <small>
                          {sample.client} · {sample.tests}
                        </small>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="lims-modal-actions">
                <button type="button" className="btn btn-primary" disabled={matched.length === 0} onClick={() => onCreate(matched)}>
                  Create batch
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
