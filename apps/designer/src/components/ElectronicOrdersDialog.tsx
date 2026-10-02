import { useState } from "react";
import { logSample, SAMPLE_ACCOUNT, useSamples, type SampleRecord } from "../samples";

type ElectronicOrder = {
  orderId: string;
  client: string;
  submitted: string;
  matrix: string;
  tests: string;
  priority: SampleRecord["priority"];
  requestedSite: string;
};

const ELECTRONIC_ORDERS: ElectronicOrder[] = [
  { orderId: "ORD-44128", client: "Aether Pharma", submitted: "2026-09-30 16:42", matrix: "Finished product", tests: "HPLC Assay, Appearance", priority: "STAT", requestedSite: "North Lab" },
  { orderId: "ORD-44131", client: "Helix Biologics", submitted: "2026-09-30 17:18", matrix: "Cell culture supernatant", tests: "Potency ELISA, Bioburden", priority: "Rush", requestedSite: "North Lab" },
  { orderId: "ORD-44134", client: "Vertex Materials", submitted: "2026-10-01 07:06", matrix: "Polymer resin", tests: "Identity FTIR", priority: "Routine", requestedSite: "East Lab" },
  { orderId: "ORD-44136", client: "Northwind Foods", submitted: "2026-10-01 08:21", matrix: "Raw ingredient", tests: "Microbial Limits, Salmonella", priority: "Routine", requestedSite: "North Lab" },
];

const STEPS = ["Electronic orders", "Receipt details", "Confirm"] as const;

export function ElectronicOrdersDialog({
  onClose,
  onReceived,
}: {
  onClose: () => void;
  onReceived: (samples: SampleRecord[]) => void;
}) {
  const samples = useSamples();
  const available = ELECTRONIC_ORDERS.filter((order) => !samples.some((sample) => sample.orderId === order.orderId));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [site, setSite] = useState("North Lab");
  const [condition, setCondition] = useState("Acceptable — no visible damage");
  const [temperature, setTemperature] = useState("Ambient");
  const [sealVerified, setSealVerified] = useState(true);
  const chosen = available.filter((order) => selected.includes(order.orderId));

  function toggle(orderId: string) {
    setSelected((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  }

  function receive() {
    const received = chosen.map((order) => logSample({
      accountId: SAMPLE_ACCOUNT.id,
      accountName: SAMPLE_ACCOUNT.name,
      orderId: order.orderId,
      client: order.client,
      matrix: order.matrix,
      tests: order.tests,
      priority: order.priority,
      site: chosen.length === 1 ? site : order.requestedSite,
    }));
    onReceived(received);
  }

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="lims-modal lims-modal-wide electronic-orders-modal" role="dialog" aria-modal="true" aria-labelledby="electronic-orders-title" onClick={(event) => event.stopPropagation()}>
        <div className="lims-panel-head">
          <div>
            <p className="lims-eyebrow">Electronic intake</p>
            <h2 id="electronic-orders-title">Receive samples</h2>
            <p className="receipt-form-lede">Match delivered samples to orders submitted through the client portal or integration.</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>

        <ol className="testing-workflow-steps intake-workflow-steps">
          {STEPS.map((label, index) => (
            <li key={label} className={index < step ? "is-done" : index === step ? "is-current" : ""}>
              <span>{index + 1}</span>{label}
            </li>
          ))}
        </ol>

        <div className="electronic-orders-body">
          {step === 0 ? (
            <section>
              <div className="electronic-orders-heading">
                <div><h3>Awaiting receipt</h3><p>Select every electronic order represented in this delivery.</p></div>
                <span className="lims-count">{available.length} pending</span>
              </div>
              <div className="electronic-order-list">
                {available.length === 0 ? <p className="lims-empty">No electronic orders are awaiting receipt.</p> : available.map((order) => (
                  <label key={order.orderId} className={selected.includes(order.orderId) ? "is-selected" : undefined}>
                    <input type="checkbox" checked={selected.includes(order.orderId)} onChange={() => toggle(order.orderId)} />
                    <span><b>{order.orderId}</b><small>Submitted {order.submitted}</small></span>
                    <span><b>{order.client}</b><small>{order.matrix}</small></span>
                    <span><b>{order.tests}</b><small>{order.requestedSite}</small></span>
                    <span className={`lims-badge ${order.priority === "STAT" ? "danger" : order.priority === "Rush" ? "warn" : ""}`}>{order.priority}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section>
              <h3>Document receipt</h3>
              <p>Record the delivery condition before assigning accession IDs.</p>
              <div className="receive-fields">
                <label>Receiving lab<select value={site} onChange={(event) => setSite(event.target.value)}><option>North Lab</option><option>East Lab</option></select></label>
                <label>Sample condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>Acceptable — no visible damage</option><option>Damaged — deviation required</option><option>Insufficient quantity</option><option>Temperature excursion</option></select></label>
                <label>Temperature on receipt<select value={temperature} onChange={(event) => setTemperature(event.target.value)}><option>Ambient</option><option>2–8 °C</option><option>Frozen ≤ -20 °C</option><option>Record measured value</option></select></label>
                <label className="receipt-check"><input type="checkbox" checked={sealVerified} onChange={(event) => setSealVerified(event.target.checked)} /> Container seals and labels verified</label>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h3>Confirm receipt</h3>
              <dl className="run-facts">
                <div><dt>Orders</dt><dd>{chosen.map((order) => order.orderId).join(", ")}</dd></div>
                <div><dt>Samples</dt><dd>{chosen.length} accession ID{chosen.length === 1 ? "" : "s"} will be assigned</dd></div>
                <div><dt>Receiving lab</dt><dd>{site}</dd></div>
                <div><dt>Condition</dt><dd>{condition}</dd></div>
                <div><dt>Temperature</dt><dd>{temperature}</dd></div>
                <div><dt>Seal verification</dt><dd>{sealVerified ? "Verified" : "Not verified"}</dd></div>
              </dl>
            </section>
          ) : null}
        </div>

        <div className="lims-modal-actions">
          <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" disabled={step === 0 ? chosen.length === 0 : !sealVerified} onClick={() => setStep((current) => current + 1)}>Continue</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={receive}>Receive {chosen.length} sample{chosen.length === 1 ? "" : "s"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
