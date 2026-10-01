import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { SampleDetailBody } from "./SampleDetailPage";
import { SectionTabStrip, useSectionTabs } from "../sectionTabs";
import { AccountLink } from "../components/AccountTable";
import { ElectronicOrdersDialog } from "../components/ElectronicOrdersDialog";
import { ReceiptFormDialog } from "../components/ReceiptFormDialog";
import { LogSampleDialog } from "../components/ReceiveSampleDialog";
import { ResultWindow } from "../components/ResultWindow";
import { StartTestingWorkflow } from "../components/StartTestingWorkflow";
import { CURRENT_RUNS } from "../testingRuns";
import { buttonStyle, priorityRank, useLabOperations, type LabMenuView, type SampleColumnId } from "../labOperations";
import { isSampleFlagged, reasonsForSample, useResultFlags } from "../resultFlags";
import {
  approveSamples,
  isResulted,
  reviewStatus,
  STATUS_LABEL,
  testNames,
  useReviewApprovals,
  useSamples,
  type SampleRecord,
} from "../samples";

type QuickFilter = "all" | "stat" | "testing" | "review" | "hold" | `priority:${string}`;
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
  if (filter.startsWith("priority:")) return sample.priority === filter.slice("priority:".length);
  if (filter === "stat") return sample.priority === "STAT";
  if (filter === "testing") return sample.status === "testing";
  if (filter === "review") return sample.status === "review" || sample.status === "approval";
  return sample.status === "hold";
}

function wildcardMatch(text: string, query: string): boolean {
  const cleaned = query.trim();
  if (!cleaned) return true;
  const escaped = cleaned.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(escaped, "i").test(text);
}

function SearchableFilter({
  label,
  options = [],
  selected = [],
  query,
  open = false,
  onOpenChange,
  onToggle,
  onClear,
  onActivate,
  onQuery,
  sortDirection = "asc",
  onSortDirection,
  active = false,
}: {
  label: string;
  options?: string[];
  selected?: string[];
  query: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onToggle?: (value: string) => void;
  onClear?: () => void;
  onActivate?: () => void;
  onQuery: (value: string) => void;
  sortDirection?: "asc" | "desc";
  onSortDirection?: (direction: "asc" | "desc") => void;
  active?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) onOpenChange?.(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, onOpenChange]);
  const matching = options
    .filter((option) => wildcardMatch(option, query))
    .sort((a, b) => sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a));
  const displayLabel = selected.length === 0 ? label : selected.length === 1 ? selected[0] : `${label} (${selected.length})`;

  return (
    <div className="sample-search-filter" ref={filterRef}>
      {editing ? (
        <input
          ref={inputRef}
          value={query}
          aria-label={`${label} wildcard search`}
          placeholder={`${label} wildcard search`}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter") setEditing(false);
          }}
          onBlur={() => window.setTimeout(() => setEditing(false), 120)}
        />
      ) : (
        <button
          type="button"
          className={`lims-filter filter-trigger${active || selected.length || query ? " active" : ""}`}
          aria-expanded={options.length ? open : undefined}
          title={`Double-click to wildcard search ${label.toLowerCase()}`}
          onClick={() => options.length ? onOpenChange?.(!open) : onActivate?.()}
          onDoubleClick={() => {
            onOpenChange?.(false);
            setEditing(true);
          }}
        >
          <span>{query ? `${label}: ${query}` : displayLabel}</span>
          {options.length ? (
            <svg className={`filter-chevron${open ? " is-open" : ""}`} viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 6 4 4 4-4" />
            </svg>
          ) : null}
        </button>
      )}
      {open ? (
        <div className="sample-filter-menu" role="listbox" aria-label={label} aria-multiselectable="true">
          <div className="sample-filter-menu-head">
            <span>{selected.length ? `${selected.length} selected` : `All ${label.toLowerCase()}`}</span>
            <button
              type="button"
              className="sample-filter-sort"
              aria-label={`Sort ${label.toLowerCase()} ${sortDirection === "asc" ? "descending" : "ascending"}`}
              title={`Sort ${sortDirection === "asc" ? "Z–A" : "A–Z"}`}
              onClick={() => onSortDirection?.(sortDirection === "asc" ? "desc" : "asc")}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d={sortDirection === "asc" ? "M8 12V4m0 0L5 7m3-3 3 3" : "M8 4v8m0 0 3-3m-3 3-3-3"} />
              </svg>
              {sortDirection === "asc" ? "A–Z" : "Z–A"}
            </button>
          </div>
          <button className="sample-filter-clear" type="button" onClick={() => { onClear?.(); onQuery(""); }}>
            Clear selection
          </button>
          {matching.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={selected.includes(option)}
              className={selected.includes(option) ? "is-selected" : undefined}
              key={option}
              onClick={() => onToggle?.(option)}
            >
              <span className="filter-option-check" aria-hidden="true">
                {selected.includes(option) ? <svg viewBox="0 0 12 12"><path d="m2.2 6.2 2.3 2.3 5.3-5.3" /></svg> : null}
              </span>
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type SampleView = Exclude<LabMenuView, "overview">;

const VIEW_COPY: Record<SampleView, { eyebrow: string; title: string; lede: string }> = {
  home: {
    eyebrow: "Sequence Operations",
    title: "Home",
    lede: "Receive, prioritize, and move samples. The list follows the priority order set in Workflow design.",
  },
  testing: {
    eyebrow: "Sequence Operations",
    title: "Testing",
    lede: "Samples currently in testing.",
  },
  review: {
    eyebrow: "Sequence Operations",
    title: "Review",
    lede: "Samples with results, ready for review. Complete Review opens the results, then authorize them.",
  },
  release: {
    eyebrow: "Sequence Operations",
    title: "Release",
    lede: "Samples released from the laboratory.",
  },
};

function matchesView(sample: SampleRecord, status: SampleRecord["status"], view: SampleView): boolean {
  if (view === "home") return true;
  if (view === "testing") return status === "testing";
  if (view === "review") return status === "review" && isResulted(sample);
  return status === "approval" || status === "released";
}

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

function cell(
  sample: SampleRecord,
  id: SampleColumnId,
  status = sample.status,
  onOpen?: (sample: SampleRecord) => void,
  onReceipt?: (sample: SampleRecord) => void,
) {
  if (id === "accessionId") {
    return (
      <button type="button" className="lims-mono lims-linkish accession-link" onClick={() => onOpen?.(sample)}>
        {sample.accessionId}
      </button>
    );
  }
  if (id === "orderId") {
    return (
      <span className="order-id-cell">
        <span className="lims-mono">{sample.orderId}</span>
        <button
          type="button"
          className="receipt-folder"
          aria-label={`Scanned paperwork for ${sample.orderId}`}
          onClick={() => onReceipt?.(sample)}
        >
          <FolderIcon />
        </button>
      </span>
    );
  }
  if (id === "received") return <span className="lims-mono muted">{sample.received}</span>;
  if (id === "client") return <AccountLink name={sample.client} />;
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
  const sectionTabs = useSectionTabs();
  const samples = useSamples();
  const [openSample, setOpenSample] = useState<SampleRecord | null>(null);
  const [receiptSample, setReceiptSample] = useState<SampleRecord | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("individual");
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [resultWindow, setResultWindow] = useState<{ samples: SampleRecord[]; authorize: boolean } | null>(null);
  const [testFilters, setTestFilters] = useState<string[]>([]);
  const [testQuery, setTestQuery] = useState("");
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [rowQuery, setRowQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<"tests" | "clients" | null>(null);
  const [tableSort, setTableSort] = useState<{ field: "tests" | "clients"; direction: "asc" | "desc" } | null>(null);
  const [testingOpen, setTestingOpen] = useState(false);
  const copy = VIEW_COPY[view];
  const title = menu.find((item) => item.view === view)?.label || copy.title;
  const visible = columns.filter((column) => column.enabled && column.label.trim());
  const contextRows = samples.filter((sample) => {
    const status = reviewStatus(sample, approved);
    return matchesView(sample, status, view);
  });
  const testOptions = [...new Set(contextRows.flatMap(testNames))].sort();
  const clientOptions = [...new Set(contextRows.map((sample) => sample.client))].sort();
  const rows = contextRows
    .filter((sample) => matchesQuickFilter(sample, filter))
    .filter((sample) => testFilters.length === 0 || testFilters.some((test) => testNames(sample).includes(test)))
    .filter((sample) => wildcardMatch(testNames(sample).join(" "), testQuery))
    .filter((sample) => clientFilters.length === 0 || clientFilters.includes(sample.client))
    .filter((sample) => wildcardMatch(sample.client, clientQuery))
    .filter((sample) => wildcardMatch(Object.values(sample).join(" "), rowQuery))
    .sort((a, b) => {
      if (!tableSort) return priorityRank(a.priority, priorities) - priorityRank(b.priority, priorities);
      const aValue = tableSort.field === "tests" ? a.tests : a.client;
      const bValue = tableSort.field === "tests" ? b.tests : b.client;
      return aValue.localeCompare(bValue) * (tableSort.direction === "asc" ? 1 : -1);
    });
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

  function toggleFilterValue(value: string, setter: Dispatch<SetStateAction<string[]>>) {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function resetTableFilters() {
    setFilter("all");
    setReviewFilter("individual");
    setTestFilters([]);
    setClientFilters([]);
    setTestQuery("");
    setClientQuery("");
    setRowQuery("");
    setOpenFilter(null);
    setTableSort(null);
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
    if (id === "receive") setReceiveOpen(true);
    if (id === "logSample") setLogOpen(true);
    if (id === "createBatch") {
      setTestingOpen(true);
    }
    if (id === "completeReview" && approveTarget.length > 0) {
      setResultWindow({ samples: approveTarget, authorize: true });
    }
  }

  const open = samples.filter((sample) => sample.status !== "released").sort(
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
  const quickFilters =
    view === "release"
      ? [{ id: "all" as QuickFilter, label: "Ready for Release" }, ...priorities.map((priority) => ({ id: `priority:${priority}` as QuickFilter, label: priority }))]
      : view === "testing"
        ? [{ id: "all" as QuickFilter, label: "In Testing" }]
        : view === "home"
          ? QUICK_FILTERS
          : [];
  const statusSearchLabel = view === "release" ? "Ready for Release" : view === "testing" ? "In Testing" : view === "review" ? "In Review" : "All open";

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">{copy.eyebrow}</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">{copy.lede}</p>
        </div>
        <div className="lims-header-side">
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
              {view === "testing" && button.id === "createBatch" ? "Start Testing" : button.label}
            </button>
          ))}
          </div>
        </div>
      </div>
      <SectionTabStrip mainLabel={title} />

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
                        <button type="button" className="instrument-link" onClick={() => setOpenSample(sample)}>
                          {sample.accessionId}
                        </button>
                      </b>
                      <small>
                        <AccountLink name={sample.client} /> · {sample.tests}
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
        <SearchableFilter
          label="Tests"
          options={testOptions}
          selected={testFilters}
          query={testQuery}
          open={openFilter === "tests"}
          onOpenChange={(open) => setOpenFilter(open ? "tests" : null)}
          onToggle={(value) => toggleFilterValue(value, setTestFilters)}
          onClear={() => setTestFilters([])}
          onQuery={setTestQuery}
          sortDirection={tableSort?.field === "tests" ? tableSort.direction : "asc"}
          onSortDirection={(direction) => setTableSort({ field: "tests", direction })}
        />
        <SearchableFilter
          label="Clients"
          options={clientOptions}
          selected={clientFilters}
          query={clientQuery}
          open={openFilter === "clients"}
          onOpenChange={(open) => setOpenFilter(open ? "clients" : null)}
          onToggle={(value) => toggleFilterValue(value, setClientFilters)}
          onClear={() => setClientFilters([])}
          onQuery={setClientQuery}
          sortDirection={tableSort?.field === "clients" ? tableSort.direction : "asc"}
          onSortDirection={(direction) => setTableSort({ field: "clients", direction })}
        />
        {view === "review" ? (
          <SearchableFilter label="In Review" query={rowQuery} onQuery={setRowQuery} onActivate={resetTableFilters} active />
        ) : null}
        {view !== "review" ? (
          <SearchableFilter label={statusSearchLabel} query={rowQuery} onQuery={setRowQuery} onActivate={resetTableFilters} active={filter === "all"} />
        ) : null}
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
          : quickFilters.filter((item) => item.id !== "all").map((item) => (
              <button
                key={item.id}
                type="button"
                className={`lims-filter${filter === item.id ? " active" : ""}`}
                aria-pressed={filter === item.id}
                onClick={() => {
                  setOpenFilter(null);
                  setFilter(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
      </div>

      {view === "testing" ? (
        <section className="lims-panel current-runs-panel">
          <div className="lims-panel-head">
            <div>
              <p className="lims-eyebrow">Live instrument work</p>
              <h2>Current run sequences <span className="lims-count">{CURRENT_RUNS.length}</span></h2>
            </div>
          </div>
          <div className="current-run-list">
            {CURRENT_RUNS.map((run) => (
              <button
                type="button"
                key={run.id}
                onClick={() => sectionTabs.pin({ kind: "run", recordId: run.id, title: run.id })}
              >
                <span className="run-live-dot" aria-hidden="true" />
                <b>{run.id}</b>
                <span>{run.method}</span>
                <span>{run.sampleIds.length} sample{run.sampleIds.length === 1 ? "" : "s"}</span>
                <strong>{run.steps[run.currentStep]}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
                              <td key={column.id}>{cell(sample, column.id, reviewStatus(sample, approved), setOpenSample, setReceiptSample)}</td>
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
                          <td key={column.id}>{cell(sample, column.id, reviewStatus(sample, approved), setOpenSample, setReceiptSample)}</td>
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

      {receiveOpen ? (
        <ElectronicOrdersDialog
          onClose={() => setReceiveOpen(false)}
          onReceived={(received) => {
            setReceiveOpen(false);
            setOpenSample(received.at(-1) ?? null);
          }}
        />
      ) : null}

      {logOpen ? (
        <LogSampleDialog
          onClose={() => setLogOpen(false)}
          onLogged={(sample) => {
            setLogOpen(false);
            setOpenSample(sample);
          }}
        />
      ) : null}

      {receiptSample ? <ReceiptFormDialog sample={receiptSample} onClose={() => setReceiptSample(null)} /> : null}

      {openSample ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setOpenSample(null)}>
          <div className="lims-modal lims-modal-wide" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="lims-dialog-bar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  sectionTabs.pin({ kind: "sample", recordId: openSample.accessionId, title: openSample.accessionId });
                  setOpenSample(null);
                }}
              >
                Tab screen
              </button>
              <button type="button" className="btn" onClick={() => setOpenSample(null)}>
                Close
              </button>
            </div>
            <SampleDetailBody sample={openSample} />
          </div>
        </div>
      ) : null}

      {testingOpen ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setTestingOpen(false)}>
          <div className="lims-modal lims-modal-wide start-testing-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <StartTestingWorkflow
              pool={samples.filter((sample) => sample.status === "received" || sample.status === "testing")}
              onClose={() => setTestingOpen(false)}
              onTab={() => {
                sectionTabs.pin({ kind: "testing", recordId: "new", title: "Start Testing" });
                setTestingOpen(false);
              }}
            />
          </div>
        </div>
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
