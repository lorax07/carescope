import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { captureAccession } from "../../revenueCycle";
import { QUEUE_META, formatMoney, postRemittance, rcmCanWrite, useRcm, type QueueId } from "../../rcm";
import { RcmEmpty, RcmShell } from "./RcmShell";

function isQueue(value: string | null): value is QueueId {
  return QUEUE_META.some((item) => item.id === value);
}

export function RcmQueuesPage() {
  const { queues } = useRcm();
  const [params, setParams] = useSearchParams();
  const requested = params.get("queue");
  const active: QueueId = isQueue(requested)
    ? requested
    : (QUEUE_META.find((item) => queues[item.id].length)?.id ?? "review");
  const rows = queues[active];
  const meta = QUEUE_META.find((item) => item.id === active)!;
  const canWrite = rcmCanWrite();
  const counts = useMemo(
    () => QUEUE_META.map((item) => ({ ...item, count: queues[item.id].length })),
    [queues],
  );

  return (
    <RcmShell title="Work queues" lede="Exception-driven work. Each queue is one operational question, not a dump of the ledger.">
      <section className="lims-panel billing-panel">
        <div className="billing-areas" role="tablist" aria-label="Work queues">
          {counts.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active}
              className={`btn${item.id === active ? " is-on" : ""}`}
              onClick={() => setParams({ queue: item.id }, { replace: true })}
            >
              {item.label} {item.count ? `(${item.count})` : ""}
            </button>
          ))}
        </div>
        <p className="billing-note">{meta.question}</p>
        {active === "capture" ? (
          <p className="billing-note">
            <Link className="lims-linkish" to="/app/billing/capture">
              Open the charge capture workbench
            </Link>{" "}
            for coding, holds, and fee-schedule work on a single accession.
          </p>
        ) : null}
        {rows.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Detail</th>
                  <th>Amount</th>
                  <th>Next action</th>
                  <th>Owner</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td>
                      {row.kind === "claim" ? (
                        <Link className="lims-linkish" to={`/app/billing/claims/${encodeURIComponent(row.id)}`}>
                          {row.title}
                        </Link>
                      ) : (
                        row.title
                      )}
                    </td>
                    <td>{row.detail}</td>
                    <td>{formatMoney(row.amountCents)}</td>
                    <td>{row.nextAction}</td>
                    <td>{row.owner}</td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="This queue is empty." detail="When new exceptions land, they will appear here with an owner and a next action." />
        )}
      </section>
    </RcmShell>
  );
}
