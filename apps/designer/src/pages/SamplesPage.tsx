import { useState } from "react";
import { Link } from "react-router-dom";
import { priorityRank, useLabOperations, type LabMenuView, type SampleColumnId } from "../labOperations";
import { SAMPLES, STATUS_LABEL, type SampleRecord } from "../samples";

type QuickFilter = "all" | "stat" | "testing" | "review" | "hold";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "All open" },
  { id: "stat", label: "STAT" },
  { id: "testing", label: "In testing" },
  { id: "review", label: "Review" },
  { id: "hold", label: "On hold" },
];

function matchesQuickFilter(sample: SampleRecord, filter: QuickFilter): boolean {
  if (filter === "all") return true;
  if (filter === "stat") return sample.priority === "STAT";
  if (filter === "testing") return sample.status === "testing";
  if (filter === "review") return sample.status === "review" || sample.status === "approval";
  return sample.status === "hold";
}

const VIEW_COPY: Record<LabMenuView, { eyebrow: string; title: string; lede: string }> = {
  home: {
    eyebrow: "Lab operations",
    title: "Home",
    lede: "Samples in the laboratory, listed from the highest priority set in Workflow design.",
  },
  accession: {
    eyebrow: "Lab operations",
    title: "Accession",
    lede: "Samples waiting to be received into the laboratory.",
  },
  testing: {
    eyebrow: "Lab operations",
    title: "Testing",
    lede: "Samples currently in testing.",
  },
  review: {
    eyebrow: "Lab operations",
    title: "Review",
    lede: "Samples in peer review or QA approval.",
  },
  release: {
    eyebrow: "Lab operations",
    title: "Release",
    lede: "Samples released from the laboratory.",
  },
};

function matchesView(status: SampleRecord["status"], view: LabMenuView): boolean {
  if (view === "home") return true;
  if (view === "accession") return status === "received";
  if (view === "testing") return status === "testing";
  if (view === "review") return status === "review" || status === "approval";
  return status === "released";
}

function cell(sample: SampleRecord, id: SampleColumnId) {
  if (id === "accessionId") {
    return (
      <Link className="lims-mono lims-linkish" to={`/app/samples/${sample.accessionId}`}>
        {sample.accessionId}
      </Link>
    );
  }
  if (id === "orderId") return <span className="lims-mono">{sample.orderId}</span>;
  if (id === "received") return <span className="lims-mono muted">{sample.received}</span>;
  if (id === "client") return sample.client;
  if (id === "matrix") return sample.matrix;
  if (id === "tests") return sample.tests;
  if (id === "priority") {
    return (
      <span
        className={`lims-badge ${
          sample.priority === "STAT" ? "danger" : sample.priority === "Rush" ? "warn" : ""
        }`}
      >
        {sample.priority}
      </span>
    );
  }
  if (id === "status") {
    return <span className={`lims-status ${sample.status}`}>{STATUS_LABEL[sample.status]}</span>;
  }
  if (id === "custody") return sample.custody;
  return sample.site;
}

export function SamplesPage({ view = "home" }: { view?: LabMenuView }) {
  const { priorities, menu, columns } = useLabOperations();
  const [filter, setFilter] = useState<QuickFilter>("all");
  const copy = VIEW_COPY[view];
  const title = menu.find((item) => item.view === view)?.label || copy.title;
  const visible = columns.filter((column) => column.enabled && column.label.trim());
  const rows = SAMPLES.filter(
    (sample) => matchesView(sample.status, view) && matchesQuickFilter(sample, filter)
  ).sort((a, b) => priorityRank(a.priority, priorities) - priorityRank(b.priority, priorities));

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">{copy.eyebrow}</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">{copy.lede}</p>
        </div>
        <div className="lims-page-actions">
          <button type="button" className="btn">
            Scan barcode
          </button>
          <button type="button" className="btn btn-primary">
            Receive sample
          </button>
        </div>
      </div>

      <div className="lims-filter-bar" role="toolbar" aria-label="Quick filters">
        {QUICK_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`lims-filter${filter === item.id ? " active" : ""}`}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="lims-panel">
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                {visible.map((column) => (
                  <th key={column.id}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="lims-empty" colSpan={visible.length || 1}>
                    No samples match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((sample) => (
                  <tr key={sample.accessionId}>
                    {visible.map((column) => (
                      <td key={column.id}>{cell(sample, column.id)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="lims-footnote">
        Sample events can trigger CareScope workflows —{" "}
        <Link to="/app/workflows">configure automations</Link> for receive, assign, review, and
        CoA release.
      </p>
    </div>
  );
}
