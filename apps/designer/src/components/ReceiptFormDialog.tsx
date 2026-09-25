import { useEffect, useState } from "react";
import { receiptPdfUrl } from "../receiptPdf";
import type { SampleRecord } from "../samples";

export function ReceiptFormDialog({ sample, onClose }: { sample: SampleRecord; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const next = receiptPdfUrl(sample);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [sample]);

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="lims-modal lims-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lims-dialog-bar">
          <h2 id="receipt-form-title">Scanned paperwork</h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        {url ? (
          <iframe className="receipt-pdf" title={`Scanned paperwork for ${sample.orderId}`} src={url} />
        ) : null}
      </div>
    </div>
  );
}
