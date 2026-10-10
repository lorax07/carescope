import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ClientCard, OpportunityRecord } from "../../crm";
import type { CrmAccount } from "../../crmAccounts";
import { money } from "../../revenueCycle";

const AVATAR_COLORS = ["#7c6cf0", "#5b8def", "#e07a9a", "#2fbe8f", "#e09a45", "#6d7cff", "#d46b9a", "#3aa0c8"];

export function avatarColor(name: string): string {
  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? "#5b8def";
}

export function greetingName(actor: string): string {
  const parts = actor.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? actor;
  if (first.replace(/\./g, "").length <= 1 && parts[1]) return parts[1];
  return first.replace(/\.$/, "");
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts.length > 1 ? parts.slice(0, 2) : [parts[0]?.slice(0, 2) ?? ""]).map((part) => part[0] ?? "");
  return letters.join("").toUpperCase();
}

export function ClientAvatar({ name, size = 46 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <span className="client-avatar" style={{ width: size, height: size, color, borderColor: color }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function shortDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function paymentBars(events: { at: string; cents: number }[], year: number, month: number): number[] {
  const days = new Date(year, month, 0).getDate();
  const series = Array.from({ length: days }, () => 0);
  for (const event of events) {
    const [date] = event.at.split(" ");
    const [eventYear, eventMonth, eventDay] = (date ?? "").split("-").map(Number);
    if (eventYear === year && eventMonth === month && eventDay >= 1 && eventDay <= days) {
      series[eventDay - 1] = (series[eventDay - 1] ?? 0) + event.cents;
    }
  }
  return series;
}

export function projectTone(stage: string): { label: string; tone: "draft" | "go" | "review" | "done" | "stop" } {
  if (stage === "Won") return { label: "Completed", tone: "done" };
  if (stage === "Lost") return { label: "Canceled", tone: "stop" };
  if (stage === "Negotiation") return { label: "On review", tone: "review" };
  if (stage === "Proposal" || stage === "Qualified") return { label: "In progress", tone: "go" };
  return { label: "Draft", tone: "draft" };
}

export const PROJECT_FILTERS = [
  { id: "priority", label: "Priority" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "canceled", label: "Canceled" },
  { id: "recommended", label: "Recommended" },
] as const;

export type ProjectFilter = (typeof PROJECT_FILTERS)[number]["id"];

export function projectMatches(stage: string, filter: ProjectFilter): boolean {
  if (filter === "priority") return stage === "Negotiation";
  if (filter === "active") return stage === "Proposal" || stage === "Qualified" || stage === "Negotiation";
  if (filter === "completed") return stage === "Won";
  if (filter === "canceled") return stage === "Lost";
  return stage === "Discovery";
}

export const CHART_ZOOM_MIN = 0.6;
export const CHART_ZOOM_MAX = 2.75;
export const CHART_ZOOM_STEP = 0.15;

/** Control or Command plus wheel changes chart zoom. Scroll up zooms in. */
export function nextChartZoom(current: number, deltaY: number, modified: boolean): number {
  if (!modified || deltaY === 0) return current;
  const step = deltaY < 0 ? CHART_ZOOM_STEP : -CHART_ZOOM_STEP;
  const next = Math.round((current + step) * 100) / 100;
  return Math.min(CHART_ZOOM_MAX, Math.max(CHART_ZOOM_MIN, next));
}

export function RevenueChart({ series }: { series: number[] }) {
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const max = Math.max(...series, 1);
  const peak = series.reduce((best, value, index) => (value > (series[best] ?? 0) ? index : best), 0);
  const peakValue = series[peak] ?? 0;
  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => nextChartZoom(current, event.deltaY, true));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);
  return (
    <div
      className="client-chart-scroll"
      ref={scroller}
      tabIndex={0}
      data-chart-zoom={zoom}
      aria-label={`Collected revenue by day. The highest day is day ${peak + 1} at ${money(peakValue)}. Hold Control and scroll up to zoom in, or scroll down to zoom out.`}
    >
      <div className="client-chart-zoom" style={{ zoom }}>
        <div className="client-chart" role="presentation">
          <div className="client-chart-axis">
            {[1, 0.66, 0.33].map((step) => (
              <span key={step}>${Math.round((max * step) / 100).toLocaleString("en-US")}</span>
            ))}
          </div>
          <div className="client-chart-plot">
            {series.map((value, index) => {
              const dots = Math.max(1, Math.round((value / max) * 8));
              const isPeak = index === peak && peakValue > 0;
              return (
                <div key={index} className={`client-chart-col${isPeak ? " is-peak" : ""}`}>
                  {isPeak ? <b>{money(value).replace(/\.00$/, "")}</b> : null}
                  <span>
                    {Array.from({ length: dots }, (_, dot) => (
                      <i key={dot} />
                    ))}
                  </span>
                  {index % 5 === 0 || isPeak ? <small>{isPeak ? `Day ${index + 1}` : index + 1}</small> : <small />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientAssist({ actor, hint }: { actor: string; hint: string }) {
  const [draft, setDraft] = useState("");
  const navigate = useNavigate();
  const first = greetingName(actor);
  return (
    <section className="client-assist">
      <p>Hi, {first}</p>
      <h2>How can I help you?</h2>
      <div className="client-assist-grid">
        <Link to="/app/connectivity/tasks">
          <i className="is-mint" />
          <span>Follow-ups</span>
          <small>Open the tasks that are still due.</small>
        </Link>
        <Link to="/app/connectivity/documents">
          <i className="is-rose" />
          <span>Agreements</span>
          <small>Review contracts on the accounts.</small>
        </Link>
        <Link to="/app/connectivity/opportunities">
          <i className="is-amber" />
          <span>Projects</span>
          <small>See work that is still moving.</small>
        </Link>
        <Link to="/app/connectivity/health">
          <i className="is-pink" />
          <span>Accounts to watch</span>
          <small>Health signals with a next step.</small>
        </Link>
      </div>
      <form
        className="client-assist-ask"
        onSubmit={(event) => {
          event.preventDefault();
          const query = draft.trim();
          if (!query) return;
          navigate(`/app/connectivity/clients?q=${encodeURIComponent(query)}`);
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a client, task, or project" aria-label="Ask about a client" />
        <button type="submit" aria-label="Search clients">↑</button>
      </form>
      <p className="client-assist-hint">{hint}</p>
    </section>
  );
}

export function ProjectTable({
  rows,
  accounts,
  filter,
  onFilter,
  query,
  onQuery,
  scroll = false,
}: {
  rows: OpportunityRecord[];
  accounts: CrmAccount[];
  filter: ProjectFilter;
  onFilter: (filter: ProjectFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  scroll?: boolean;
}) {
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!projectMatches(row.stage, filter)) return false;
      if (!needle) return true;
      return `${row.accountName} ${row.name} ${row.nextAction} ${row.owner}`.toLowerCase().includes(needle);
    });
  }, [filter, query, rows]);
  const counts = PROJECT_FILTERS.map((item) => ({ ...item, count: rows.filter((row) => projectMatches(row.stage, item.id)).length }));

  return (
    <section className={`client-card client-projects${scroll ? " is-scroll" : ""}`}>
      <header>
        <h2>Manage Projects</h2>
        <label>
          <span className="sr-only">Search projects</span>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search" aria-label="Search projects" />
        </label>
      </header>
      <div className="client-pills" role="tablist" aria-label="Project status">
        {counts.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "is-on" : undefined} onClick={() => onFilter(item.id)}>
            {item.label} <em>{item.count}</em>
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Project</th>
                <th>Note</th>
                <th>Due on</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const account = accounts.find((item) => item.id === row.accountId);
                const tone = projectTone(row.stage);
                const person = account?.contact || row.owner;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/app/connectivity/clients/${row.accountId}`}>
                        <ClientAvatar name={person} size={36} />
                        <span>
                          <b>{person}</b>
                          <small>{row.accountName}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <b>{row.name}</b>
                      <small>{row.owner}</small>
                    </td>
                    <td>{row.nextAction ? <span className="client-note" title={row.nextAction} /> : null}</td>
                    <td>{shortDate(row.close)}</td>
                    <td>{row.amount}</td>
                    <td>
                      <em className={`client-status is-${tone.tone}`}>{tone.label}</em>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="client-empty">No projects in this view.</p>
      )}
    </section>
  );
}

export function clientBudget(card: ClientCard): string {
  const open = card.account.opportunities.find((item) => item.stage !== "Won" && item.stage !== "Lost");
  return open?.amount || card.account.revenue;
}

export function SourceBars({
  groups,
  note,
  href = "/app/connectivity/analytics",
  title = "Clients source",
}: {
  groups: { label: string; count: number; tone: string }[];
  note: string;
  href?: string;
  title?: string;
}) {
  const max = Math.max(...groups.map((group) => group.count), 1);
  return (
    <section className="client-card client-source">
      <header>
        <h2>{title}</h2>
        <Link to={href} aria-label="Open source detail">→</Link>
      </header>
      <div className="client-source-bars">
        {groups.map((group) => (
          <div key={group.label}>
            <b>{group.count}</b>
            <span className={group.tone} style={{ height: `${Math.max(18, (group.count / max) * 78)}px` }} />
            <small>{group.label}</small>
          </div>
        ))}
      </div>
      <p>{note}</p>
    </section>
  );
}

export function StudioLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="client-kpi" to={to}>
      {children}
    </Link>
  );
}
