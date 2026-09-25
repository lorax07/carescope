import { Link, useParams } from "react-router-dom";
import { findSample, STATUS_LABEL, type SampleRecord } from "../samples";
import { useSectionTabs } from "../sectionTabs";

export function SampleDetailBody({ sample, withTabs = false }: { sample: SampleRecord; withTabs?: boolean }) {
  const sectionTabs = useSectionTabs();
  return (
    <div className="lims-page">
      <div className="sample-tab-row">
        <Link className="btn sample-back" to="/app/ops/home">
          Back to Home
        </Link>
        {withTabs ? (
          <div className="lims-tabs lims-tabs-inline" role="tablist" aria-label="Screens for this section">
            {sectionTabs.tabs.map((tab) => (
              <div key={tab.id} className={`lims-tab${sectionTabs.activeId === tab.id ? " active" : ""}`}>
                <button type="button" role="tab" aria-selected={sectionTabs.activeId === tab.id} onClick={() => sectionTabs.select(tab.id)}>
                  {tab.title}
                </button>
                <button type="button" className="lims-tab-close" aria-label={`Close ${tab.title}`} onClick={() => sectionTabs.close(tab.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <p className="lims-eyebrow">Sample</p>
      <div className="lims-page-header">
        <div>
          <h1>{sample.sampleId}</h1>
          <p className="lims-page-lede">
            {sample.client} · {sample.tests}
          </p>
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
