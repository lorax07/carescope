import { sampleResults, type SampleRecord } from "../samples";

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
                  </tr>
                </thead>
                <tbody>
                  {(sampleResults(sample.accessionId) ?? []).map((row) => (
                    <tr key={row.analyte}>
                      <td>{row.analyte}</td>
                      <td className="lims-mono">{row.result}</td>
                      <td>{row.unit}</td>
                      <td>{row.limit}</td>
                    </tr>
                  ))}
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
