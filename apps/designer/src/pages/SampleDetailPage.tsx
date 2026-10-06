import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AccountLink } from "../components/AccountTable";
import { ReceiptFormDialog } from "../components/ReceiptFormDialog";
import { findSample, CONDITION_LABEL, STATUS_LABEL, isOnHold, type SampleRecord } from "../samples";

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.5 6.5A2.5 2.5 0 0 1 6 4h4.1a2 2 0 0 1 1.4.6l1.2 1.2H18A2.5 2.5 0 0 1 20.5 8.3v9.2A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5v-11z"
      />
    </svg>
  );
}

type CustodyEvent = {
  title: string;
  detail: string;
  actor: string;
  minutes: number;
};

function eventTime(received: string, minutes: number): string {
  const parsed = new Date(received.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return received;
  parsed.setMinutes(parsed.getMinutes() + minutes);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function custodyEvents(sample: SampleRecord): CustodyEvent[] {
  const rank = { received: 0, accessioning: 0, processing: 0, testing: 1, review: 2, released: 4 }[sample.status] ?? 0;
  const events: CustodyEvent[] = [
    {
      title: "Sample logged",
      detail: `Electronic or manual order verified at ${sample.site}`,
      actor: "M. Chen",
      minutes: 0,
    },
  ];
  if (rank >= 1) {
    events.push({
      title: "Testing started",
      detail: `Sample assigned for ${sample.tests}`,
      actor: "J. Patel",
      minutes: 40,
    });
  }
  if (rank >= 2) {
    events.push(
      {
        title: "Testing complete",
        detail: "Results and instrument records attached",
        actor: "J. Patel",
        minutes: 120,
      },
      {
        title: "Review started",
        detail: "Results routed for peer review",
        actor: "A. Rivera",
        minutes: 135,
      },
    );
  }
  if (rank >= 4) {
    events.push({
      title: "Review complete",
      detail: "Peer review completed and routed to QA",
      actor: "A. Rivera",
      minutes: 210,
    });
  }
  if (rank >= 4) {
    events.push({
      title: "Sample released",
      detail: "Final result and certificate released",
      actor: "M. Chen",
      minutes: 260,
    });
  }
  if (isOnHold(sample)) {
    events.push({
      title: "Sample placed on hold",
      detail: sample.custody,
      actor: "R. Alvarez",
      minutes: 25,
    });
  }
  const movementMinute = rank >= 4 ? 270 : rank >= 3 ? 200 : rank >= 2 ? 125 : rank >= 1 ? 30 : 15;
  events.push({
    title: "Location updated",
    detail: `${sample.site} · ${sample.custody}`,
    actor: rank >= 2 ? "A. Rivera" : "R. Alvarez",
    minutes: movementMinute,
  });
  return events.sort((a, b) => a.minutes - b.minutes);
}

export function SampleDetailBody({
  sample,
  showBack = true,
  showTitle = true,
}: {
  sample: SampleRecord;
  showBack?: boolean;
  showTitle?: boolean;
}) {
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const events = custodyEvents(sample);
  return (
    <div className="lims-page">
      {showBack ? (
        <div className="sample-tab-row">
          <Link className="btn sample-back" to="/app/ops/home">Back to Home</Link>
        </div>
      ) : null}
      <div className="lims-page-header">
        <div>
          {showTitle ? <h1>Sample Details</h1> : null}
          <p className="lims-page-lede">{sample.client} · {sample.tests}</p>
        </div>
      </div>

      <div className="sample-detail-grid">
        <section className="lims-panel sample-detail-panel">
          <div className="lims-panel-head">
            <h2>Sample details</h2>
          </div>
          <dl className="sample-detail-fields">
            <div>
              <dt>Accession ID</dt>
              <dd className="lims-mono">{sample.accessionId}</dd>
            </div>
            <div>
              <dt>Order ID</dt>
              <dd className="lims-mono">{sample.orderId}</dd>
            </div>
            <div>
              <dt>Sample attachment</dt>
              <dd>
                <button
                  type="button"
                  className="receipt-folder"
                  aria-label={`Scanned paperwork for ${sample.orderId}`}
                  onClick={() => setAttachmentOpen(true)}
                >
                  <FolderIcon />
                </button>
              </dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd className="lims-mono">{sample.received}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>
                <AccountLink name={sample.client} />
              </dd>
            </div>
            <div>
              <dt>Matrix</dt>
              <dd>{sample.matrix}</dd>
            </div>
            <div>
              <dt>Tests</dt>
              <dd>{sample.tests}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{sample.priority}</dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{STATUS_LABEL[sample.status]}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{CONDITION_LABEL[sample.condition]}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{sample.custody}</dd>
            </div>
            <div>
              <dt>Site</dt>
              <dd>{sample.site}</dd>
            </div>
          </dl>
        </section>

        <section className="lims-panel sample-detail-panel sample-account-panel">
          <div className="lims-panel-head">
            <h2>Sample metadata</h2>
          </div>
          <dl className="sample-detail-fields">
            <div>
              <dt>Sample ID</dt>
              <dd className="lims-mono">{sample.sampleId}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd className="lims-mono">{sample.accountId}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{sample.accountName}</dd>
            </div>
            <div>
              <dt>Batch ID</dt>
              <dd className="lims-mono">{sample.batchId ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="lims-panel sample-detail-panel chain-of-custody-panel">
          <div className="lims-panel-head">
            <div>
              <h2>Chain of custody</h2>
              <p>Chronological sample activity, location changes, and responsible personnel.</p>
            </div>
          </div>
          <ol className="custody-timeline">
            {events.map((event) => (
              <li key={`${event.title}-${event.minutes}`}>
                <span className="custody-marker" aria-hidden="true" />
                <div>
                  <b>{event.title}</b>
                  <p>{event.detail}</p>
                </div>
                <div className="custody-event-meta">
                  <time>{eventTime(sample.received, event.minutes)}</time>
                  <span>{event.actor}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {attachmentOpen ? <ReceiptFormDialog sample={sample} onClose={() => setAttachmentOpen(false)} /> : null}
    </div>
  );
}

export function SampleDetailPage() {
  const { accessionId = "" } = useParams();
  const sample = findSample(decodeURIComponent(accessionId));

  if (!sample) {
    return (
      <div className="lims-page">
        <p className="lims-eyebrow">Sample</p>
        <h1>Sample not found</h1>
        <p>
          <Link to="/app/ops/home">Back to Home</Link>
        </p>
      </div>
    );
  }

  return <SampleDetailBody sample={sample} />;
}
