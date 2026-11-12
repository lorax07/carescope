import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter01 } from "../../components/Filter01";
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
  const fallback = QUEUE_META.find((item) => queues[item.id].length)?.id ?? "review";
  const selected = (requested ? requested.split(",") : [fallback]).filter(isQueue);
  const rows = selected.flatMap((id) => queues[id]);
  const meta = QUEUE_META.find((item) => item.id === selected[0]) ?? QUEUE_META[0];
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
            <button type="button" className={`client-kpi${selected.length === 1 && selected[0] === "denials" ? " is-on" : ""}`} onClick={() => setParams({ queue: "denials" }, { replace: true })}>
              <header>
                <span>Denied</span>
                <em className={denied ? "is-down" : "is-up"}>{denied}</em>
              </header>
              <strong>{denied}</strong>
              <small>Denials and appeals</small>
            </button>
            <button type="button" className={`client-kpi${selected.length === 1 && selected[0] === "unposted" ? " is-on" : ""}`} onClick={() => setParams({ queue: "unposted" }, { replace: true })}>
              <header>
                <span>Unposted</span>
                <em className={unposted ? "is-down" : "is-up"}>{unposted}</em>
              </header>
              <strong>{unposted}</strong>
              <small>Remittances still to post</small>
            </button>
          </div>
          <section className="client-card client-task-board">
            <Filter01
              label="Exceptions"
              options={QUEUE_META.map((item) => ({
                id: item.id,
                label: SHORT[item.id],
                category: item.id === "denials" || item.id === "appeals" ? "Denials" : item.id === "unposted" || item.id === "aging" ? "Cash" : "Claims",
              }))}
              selected={selected}
              onChange={(ids) => setParams({ queue: ids.filter(isQueue).join(",") || fallback }, { replace: true })}
            />
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
