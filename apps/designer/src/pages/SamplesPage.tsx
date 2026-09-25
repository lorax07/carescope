import { useState } from "react";
import { Link } from "react-router-dom";
import { CreateBatchDialog } from "../components/CreateBatchDialog";
import { ResultWindow } from "../components/ResultWindow";
import { buttonStyle, priorityRank, useLabOperations, type LabMenuView, type SampleColumnId } from "../labOperations";
import { isSampleFlagged, reasonsForSample, useResultFlags } from "../resultFlags";
import {
  approveSamples,
  assignBatch,
  isResulted,
  reviewStatus,
  SAMPLES,
  STATUS_LABEL,
  testNames,
  useReviewApprovals,
  type SampleRecord,
} from "../samples";

type QuickFilter = "all" | "stat" | "testing" | "review" | "hold";
type ReviewFilter = "individual" | "batch";

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
    lede: "Samples with results, ready for review. Complete Review opens the results, then authorize them.",
  },
  release: {
    eyebrow: "Lab operations",
    title: "Release",
    lede: "Samples released from the laboratory.",
  },
};

function matchesView(sample: SampleRecord, status: SampleRecord["status"], view: SampleView): boolean {
  if (view === "home") return true;
  if (view === "testing") return status === "testing";
  if (view === "review") return status === "review" && isResulted(sample);
  return status === "released";
}

function cell(sample: SampleRecord, id: SampleColumnId, status = sample.status) {
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
    return <span className={`lims-status ${status}`}>{STATUS_LABEL[status]}</span>;
  }
  if (id === "custody") return sample.custody;
  return sample.site;
}

export function SamplesPage({ view = "home" }: { view?: SampleView }) {
  const { priorities, menu, columns, buttons } = useLabOperations();
  const approved = useReviewApprovals();
  const planted = useResultFlags();
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("individual");
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [resultWindow, setResultWindow] = useState<{ samples: SampleRecord[]; authorize: boolean } | null>(null);
  const [testFilter, setTestFilter] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchFromSelection, setBatchFromSelection] = useState(false);
  const copy = VIEW_COPY[view];
  const title = menu.find((item) => item.view === view)?.label || copy.title;
  const visible = columns.filter((column) => column.enabled && column.label.trim());
  const contextRows = SAMPLES.filter((sample) => {
    const status = reviewStatus(sample, approved);
    return matchesView(sample, status, view);
  });
  const testOptions = [...new Set(contextRows.flatMap(testNames))].sort();
  const rows = contextRows
    .filter((sample) => view === "review" || matchesQuickFilter(sample, filter))
    .filter((sample) => !testFilter || testNames(sample).includes(testFilter))
    .sort((a, b) => priorityRank(a.priority, priorities) - priorityRank(b.priority, priorities));
  const reviewRows =
    reviewFilter === "individual" ? rows.filter((sample) => !sample.batchId) : rows.filter((sample) => sample.batchId);
  const batches = [...new Set(reviewRows.map((sample) => sample.batchId).filter(Boolean))] as string[];
  const listed = view === "review" ? reviewRows : rows;
  const approveTarget = view === "review" ? listed.filter((sample) => checked.has(sample.accessionId)) : [];
  const allListedChecked = listed.length > 0 && listed.every((sample) => checked.has(sample.accessionId));

  function toggleChecked(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMany(ids: string[], on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
  const pageButtons = buttons.filter((button) => button.enabled && button.views.includes(view) && button.id !== "viewResults");
  const viewResultsButton = buttons.find((button) => button.id === "viewResults");

  function resultButton(sample: SampleRecord) {
    if (!isResulted(sample) || !viewResultsButton?.enabled) return null;
    return (
      <button
        type="button"
        className="btn btn-mini"
        style={buttonStyle(viewResultsButton.color)}
        onClick={() => setResultWindow({ samples: [sample], authorize: true })}
      >
        {viewResultsButton.label}
      </button>
    );
  }

  function runButton(id: string) {
    if (id === "createBatch") {
      setBatchFromSelection(listed.some((sample) => checked.has(sample.accessionId)));
      setBatchOpen(true);
    }
    if (id === "completeReview" && approveTarget.length > 0) {
      setResultWindow({ samples: approveTarget, authorize: true });
    }
  }

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
          {pageButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              className="btn"
              style={buttonStyle(button.color)}
              disabled={button.id === "completeReview" && approveTarget.length === 0}
              onClick={() => runButton(button.id)}
            >
              {button.label}
            </button>
          ))}
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
                    <input
                      type="checkbox"
                      className="lims-row-check"
                      aria-label={`Select ${sample.accessionId}`}
                      checked={checked.has(sample.accessionId)}
                      onChange={() => toggleChecked(sample.accessionId)}
                    />
                    <div>
                      <b>
                        <Link to={`/app/samples/${sample.accessionId}`}>{sample.accessionId}</Link>
                      </b>
                      <small>
                        {sample.client} · {sample.tests}
                      </small>
                    </div>
                    {resultButton(sample)}
                    <span className="lims-badge">{sample.site}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      <div className="lims-filter-bar" role="toolbar" aria-label="Quick filters">
        <label className="lims-test-filter">
          Tests
          <select aria-label="Tests" value={testFilter} onChange={(event) => setTestFilter(event.target.value)}>
            <option value="">All tests</option>
            {testOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {view === "review"
          ? (["individual", "batch"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`lims-filter${reviewFilter === item ? " active" : ""}`}
                aria-pressed={reviewFilter === item}
                onClick={() => setReviewFilter(item)}
              >
                {item === "individual" ? "Individual" : "Batch"}
              </button>
            ))
          : QUICK_FILTERS.map((item) => (
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
                <th className="lims-check">
                  <input
                    type="checkbox"
                    aria-label="Select all samples"
                    checked={allListedChecked}
                    onChange={() => toggleMany(listed.map((sample) => sample.accessionId), !allListedChecked)}
                  />
                </th>
                {view === "review" && reviewFilter === "batch" ? <th>Batch</th> : null}
                {visible.map((column) => (
                  <th key={column.id}>{column.label}</th>
                ))}
                {view === "review" ? <th>Flag</th> : null}
                <th />
              </tr>
            </thead>
            <tbody>
              {view === "review" && reviewFilter === "batch"
                ? batches.length === 0
                  ? (
                    <tr>
                      <td className="lims-empty" colSpan={(visible.length || 1) + 3}>
                        No batches are ready for review.
                      </td>
                    </tr>
                  )
                  : batches.map((batchId) =>
                      reviewRows
                        .filter((sample) => sample.batchId === batchId)
                        .map((sample, index, group) => (
                          <tr
                            key={sample.accessionId}
                            className={`${checked.has(sample.accessionId) ? "is-selected" : ""} ${
                              isSampleFlagged(sample.accessionId, planted) ? "is-flagged" : ""
                            }`}
                          >
                            <td className="lims-check">
                              <input
                                type="checkbox"
                                aria-label={`Select ${sample.accessionId}`}
                                checked={checked.has(sample.accessionId)}
                                onChange={() => toggleChecked(sample.accessionId)}
                              />
                            </td>
                            {index === 0 ? (
                              <td className="lims-batch" rowSpan={group.length}>
                                <input
                                  type="checkbox"
                                  aria-label={`Select batch ${batchId}`}
                                  checked={group.every((item) => checked.has(item.accessionId))}
                                  onChange={() =>
                                    toggleMany(
                                      group.map((item) => item.accessionId),
                                      !group.every((item) => checked.has(item.accessionId))
                                    )
                                  }
                                />
                                {batchId}
                              </td>
                            ) : null}
                            {visible.map((column) => (
                              <td key={column.id}>{cell(sample, column.id, reviewStatus(sample, approved))}</td>
                            ))}
                            <td>{reasonsForSample(sample.accessionId, planted).join(", ")}</td>
                            <td>{resultButton(sample)}</td>
                          </tr>
                        ))
                    )
                : (view === "review" ? reviewRows : rows).length === 0
                  ? (
                    <tr>
                      <td className="lims-empty" colSpan={(visible.length || 1) + 2}>
                        {view === "review" ? "No individual samples are ready for review." : "No samples match this filter."}
                      </td>
                    </tr>
                  )
                  : (view === "review" ? reviewRows : rows).map((sample) => (
                      <tr
                        key={sample.accessionId}
                        className={`${checked.has(sample.accessionId) ? "is-selected" : ""} ${
                          view === "review" && isSampleFlagged(sample.accessionId, planted) ? "is-flagged" : ""
                        }`}
                      >
                        <td className="lims-check">
                          <input
                            type="checkbox"
                            aria-label={`Select ${sample.accessionId}`}
                            checked={checked.has(sample.accessionId)}
                            onChange={() => toggleChecked(sample.accessionId)}
                          />
                        </td>
                        {visible.map((column) => (
                          <td key={column.id}>{cell(sample, column.id, reviewStatus(sample, approved))}</td>
                        ))}
                        {view === "review" ? (
                          <td>{reasonsForSample(sample.accessionId, planted).join(", ")}</td>
                        ) : null}
                        <td>{resultButton(sample)}</td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
      </section>

      {batchOpen ? (
        <CreateBatchDialog
          fromSelection={batchFromSelection}
          pool={
            batchFromSelection ? listed.filter((sample) => checked.has(sample.accessionId)) : listed
          }
          onClose={() => setBatchOpen(false)}
          onCreate={(samples) => {
            assignBatch(samples.map((sample) => sample.accessionId));
            setBatchOpen(false);
          }}
        />
      ) : null}

      {resultWindow ? (
        <ResultWindow
          samples={resultWindow.samples}
          authorize={resultWindow.authorize}
          onAuthorize={() => {
            const ids = resultWindow.samples
              .map((sample) => sample.accessionId)
              .filter((id) => !isSampleFlagged(id, planted));
            approveSamples(ids);
            toggleMany(ids, false);
            setResultWindow(null);
          }}
          onClose={() => setResultWindow(null)}
        />
      ) : null}

      <p className="lims-footnote">
        Sample events can trigger CareScope workflows —{" "}
        <Link to="/app/workflows">configure automations</Link> for receive, assign, review, and
        CoA release.
      </p>
    </div>
  );
}
