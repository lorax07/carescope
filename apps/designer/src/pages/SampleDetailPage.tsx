import { Link, useParams } from "react-router-dom";
import { findSample, STATUS_LABEL, type SampleRecord } from "../samples";

export function SampleDetailBody({ sample }: { sample: SampleRecord }) {
  return (
    <div className="lims-page">
      <Link className="btn sample-back" to="/app/ops/home">
        Back to Home
      </Link>
      <p className="lims-eyebrow">Sample</p>
      <div className="lims-page-header">
        <div>
          <h1>{sample.accessionId}</h1>
          <p className="lims-page-lede">
            {sample.client} · {sample.tests}
          </p>
        </div>
      </div>

      <div className="sample-detail-grid">
        <section className="lims-panel sample-detail-panel">
          <div className="lims-panel-head">
            <h2>For laboratory staff</h2>
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
              <dt>Received</dt>
              <dd className="lims-mono">{sample.received}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{sample.client}</dd>
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
              <dt>Status</dt>
              <dd>{STATUS_LABEL[sample.status]}</dd>
            </div>
            <div>
              <dt>Custody</dt>
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
            <h2>Account record</h2>
          </div>
          <dl className="sample-detail-fields">
            <div>
              <dt>Sample ID</dt>
              <dd className="lims-mono">{sample.sampleId}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{sample.accountName}</dd>
            </div>
            <div>
              <dt>How it is assigned</dt>
              <dd>
                Sample ID counts samples logged on this account. North Lab and East Lab share
                the same sequence.
              </dd>
            </div>
          </dl>
        </section>
      </div>
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
