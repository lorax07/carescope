import type { SampleRecord } from "../samples";

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "lims-mono" : undefined}>{value}</dd>
    </div>
  );
}

export function ReceiptFormDialog({ sample, onClose }: { sample: SampleRecord; onClose: () => void }) {
  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="lims-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lims-dialog-bar">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="receipt-form">
          <p className="lims-eyebrow">Attached at receipt</p>
          <h2 id="receipt-form-title">Sample receipt</h2>
          <p className="receipt-form-lede">
            {sample.accessionId} · {sample.orderId}
          </p>
          <dl className="sample-detail-fields">
            <Field label="Accession ID" value={sample.accessionId} mono />
            <Field label="Order ID" value={sample.orderId} mono />
            <Field label="Received" value={sample.received} mono />
            <Field label="Client" value={sample.client} />
            <Field label="Matrix" value={sample.matrix} />
            <Field label="Tests" value={sample.tests} />
            <Field label="Priority" value={sample.priority} />
            <Field label="Site" value={sample.site} />
            <Field label="Custody" value={sample.custody} />
          </dl>
        </div>
      </div>
    </div>
  );
}
