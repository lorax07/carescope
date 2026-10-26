import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { captureAccession } from "../../revenueCycle";
import { QUEUE_META, formatMoney, postRemittance, rcmCanWrite, useRcm, type QueueId } from "../../rcm";
import { RcmEmpty, RcmShell } from "./RcmShell";
import { RevenueAssist } from "./revenueStudio";

const SHORT: Record<QueueId, string> = {
  review: "Review",
  capture: "Capture",
  missing: "Missing",
  ready: "Ready",
  rejected: "Rejected",
  denials: "Denied",
  appeals: "Appeals",
  eligibility: "Eligibility",
  authorization: "Auth",
  unposted: "Unposted",
  aging: "Aging",
};

function isQueue(value: string | null): value is QueueId {
  return QUEUE_META.some((item) => item.id === value);
}

export function RcmQueuesPage() {
  const { queues, actor } = useRcm();
  const [params, setParams] = useSearchParams();
  const requested = params.get("queue");
  const active: QueueId = isQueue(requested) ? requested : (QUEUE_META.find((item) => queues[item.id].length)?.id ?? "review");
  const rows = queues[active];
  const meta = QUEUE_META.find((item) => item.id === active)!;
  const canWrite = rcmCanWrite();
  const counts = useMemo(() => QUEUE_META.map((item) => ({ ...item, count: queues[item.id].length })), [queues]);
  const open = counts.reduce((sum, item) => sum + item.count, 0);
  const denied = queues.denials.length + queues.appeals.length;
  const unposted = queues.unposted.length;

  return (
    <RcmShell studio title="Exceptions" lede="Each row is one reason money is stuck.">
      <div className="client-home">
        <div className="client-home-main">
          <header className="client-board-head">
            <h1>Exceptions</h1>
          </header>
          <div className="client-board-links">
            <Link to="/app/billing/capture">Charge capture</Link>
            <Link to="/app/billing/denials">Denials</Link>
            <Link to="/app/billing/ar">Receivables</Link>
          </div>
          <div className="client-kpis">
            <button type="button" className="client-kpi" onClick={() => setParams({}, { replace: true })}>
              <header>
                <span>Open</span>
                <em className="is-up">{open}</em>
              </header>
              <strong>{open}</strong>
              <small>Across every queue</small>
            </button>
            <button type="button" className={`client-kpi${active === "denials" ? " is-on" : ""}`} onClick={() => setParams({ queue: "denials" }, { replace: true })}>
              <header>
                <span>Denied</span>
                <em className={denied ? "is-down" : "is-up"}>{denied}</em>
              </header>
              <strong>{denied}</strong>
              <small>Denials and appeals</small>
            </button>
            <button type="button" className={`client-kpi${active === "unposted" ? " is-on" : ""}`} onClick={() => setParams({ queue: "unposted" }, { replace: true })}>
              <header>
                <span>Unposted</span>
                <em className={unposted ? "is-down" : "is-up"}>{unposted}</em>
              </header>
              <strong>{unposted}</strong>
              <small>Remittances still to post</small>
            </button>
          </div>
          <section className="client-card client-task-board">
            <div className="client-pills" role="tablist" aria-label="Exception queues">
              {counts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === active}
                  className={item.id === active ? "is-on" : undefined}
                  onClick={() => setParams({ queue: item.id }, { replace: true })}
                >
                  {SHORT[item.id]} <em>{item.count}</em>
                </button>
              ))}
            </div>
            <p className="client-empty">{meta.question}</p>
            {rows.length ? (
              <ul>
                {rows.map((row) => (
                  <li key={`${row.kind}-${row.id}`}>
                    <span className={`client-task-mark${row.kind === "remittance" ? " is-low" : " is-high"}`} />
                    <div>
                      <b>
                        {row.kind === "claim" ? <Link to={`/app/billing/claims/${encodeURIComponent(row.id)}`}>{row.title}</Link> : row.title}
                      </b>
                      <small>
                        {formatMoney(row.amountCents)} · {row.owner}
                      </small>
                      <em>{row.detail || row.nextAction}</em>
                    </div>
                    <div className="client-task-actions">
                      {row.kind === "accession" ? (
                        <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => captureAccession(row.id)}>
                          Capture
                        </button>
                      ) : null}
                      {row.kind === "remittance" ? (
                        <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => postRemittance(row.id)}>
                          Post
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <RcmEmpty title="This queue is empty." detail="When new exceptions land, they will appear here with an owner and a next action." />
            )}
          </section>
        </div>
        <aside className="client-home-side">
          <RevenueAssist actor={actor} hint="Capture and Post stay on the queue. A posted remittance is never overwritten." />
        </aside>
      </div>
    </RcmShell>
  );
}
