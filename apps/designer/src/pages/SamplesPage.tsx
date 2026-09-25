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

type SampleView = Exclude<LabMenuView, "overview">;

const VIEW_COPY: Record<SampleView, { eyebrow: string; title: string; lede: string }> = {
  home: {
    eyebrow: "Lab operations",
    title: "Home",
    lede: "Receive, prioritize, and move samples. The list follows the priority order set in Workflow design.",
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

function matchesView(status: SampleRecord["status"], view: SampleView): boolean {
  if (view === "home") return true;
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

export function SamplesPage({ view = "home" }: { view?: SampleView }) {
  const { priorities, menu, columns } = useLabOperations();
  const [filter, setFilter] = useState<QuickFilter>("all");
  const copy = VIEW_COPY[view];
  const title = menu.find((item) => item.view === view)?.label || copy.title;
  const visible = columns.filter((column) => column.enabled && column.label.trim());
  const rows = SAMPLES.filter(
    (sample) => matchesView(sample.status, view) && matchesQuickFilter(sample, filter)
  ).sort((a, b) => priorityRank(a.priority, priorities) - priorityRank(b.priority, priorities));
  const open = SAMPLES.filter((sample) => sample.status !== "released").sort(
    (a, b) => priorityRank(a.priority, priorities) - priorityRank(b.priority, priorities)
  );
  const workQueues = [
    {
      title: "Waiting to start",
      hint: "Received and still at intake",
      rows: open.filter((sample) => sample.status === "received"),
    },
    {
      title: "STAT on the floor",
      hint: "Highest priority still open",
      rows: open.filter((sample) => sample.priority === "STAT"),
    },
    {
      title: "Blocked",
      hint: "On hold until custody or the deviation clears",
      rows: open.filter((sample) => sample.status === "hold"),
    },
  ];

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

      {view === "home" ? (
        <div className="sample-work-grid">
          {workQueues.map((queue) => (
            <section key={queue.title} className="lims-panel">
              <div className="lims-panel-head">
                <h2>
                  {queue.title} <span className="lims-count">{queue.rows.length}</span>
                </h2>
              </div>
              <p className="sample-work-hint">{queue.hint}</p>
              <ul className="lims-list">
                {queue.rows.map((sample) => (
                  <li key={sample.accessionId}>
                    <div>
                      <b>
                        <Link to={`/app/samples/${sample.accessionId}`}>{sample.accessionId}</Link>
                      </b>
                      <small>
                        {sample.client} · {sample.tests}
                      </small>
                    </div>
                    <span className="lims-badge">{sample.site}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

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
