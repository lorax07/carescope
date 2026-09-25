import { useState, type FormEvent } from "react";
import { logSample, nextSampleId, SAMPLE_ACCOUNT, useSamples, type SampleRecord } from "../samples";

const SITES = ["North Lab", "East Lab"] as const;

export function ReceiveSampleDialog({
  onClose,
  onLogged,
}: {
  onClose: () => void;
  onLogged: (sample: SampleRecord) => void;
}) {
  useSamples();
  const nextId = nextSampleId(SAMPLE_ACCOUNT.id);
  const [orderId, setOrderId] = useState("");
  const [client, setClient] = useState("");
  const [matrix, setMatrix] = useState("");
  const [tests, setTests] = useState("");
  const [priority, setPriority] = useState<SampleRecord["priority"]>("Routine");
  const [site, setSite] = useState<(typeof SITES)[number]>("North Lab");
  const ready = orderId.trim() && client.trim() && tests.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    const sample = logSample({
      accountId: SAMPLE_ACCOUNT.id,
      accountName: SAMPLE_ACCOUNT.name,
      orderId: orderId.trim(),
      client: client.trim(),
      matrix: matrix.trim() || "—",
      tests: tests.trim(),
      priority,
      site,
    });
    onLogged(sample);
  }

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="lims-modal" role="dialog" aria-modal="true" aria-labelledby="receive-sample-title" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="receipt-form">
            <p className="lims-eyebrow">Log a sample</p>
            <h2 id="receive-sample-title">Receive sample</h2>
            <p className="receipt-form-lede">
              Sample ID {nextId} is next for {SAMPLE_ACCOUNT.name}. North Lab and East Lab share this sequence.
            </p>
            <div className="receive-fields">
              <label>
                Order ID
                <input aria-label="Order ID" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
              </label>
              <label>
                Client
                <input aria-label="Client" value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
              <label>
                Matrix
                <input aria-label="Matrix" value={matrix} onChange={(event) => setMatrix(event.target.value)} />
              </label>
              <label>
                Tests
                <input aria-label="Tests" value={tests} onChange={(event) => setTests(event.target.value)} />
              </label>
              <label>
                Priority
                <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as SampleRecord["priority"])}>
                  <option>Routine</option>
                  <option>Rush</option>
                  <option>STAT</option>
                </select>
              </label>
              <label>
                Site
                <select aria-label="Site" value={site} onChange={(event) => setSite(event.target.value as (typeof SITES)[number])}>
                  {SITES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="lims-modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!ready}>
              Log sample
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
