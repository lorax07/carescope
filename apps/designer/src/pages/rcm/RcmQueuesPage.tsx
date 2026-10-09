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
    <RcmShell title="Exceptions" lede="Each row is one reason money is stuck. Open the question, then work the records.">
      <section className="lims-panel billing-panel exception-desk">
        <ul className="exception-menu" aria-label="Exception queues">
          {counts.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === active ? "is-on" : undefined}
                aria-current={item.id === active ? "true" : undefined}
                onClick={() => setParams({ queue: item.id }, { replace: true })}
              >
                <strong>{item.label}</strong>
                <span>{item.question}</span>
                <em>{item.count}</em>
              </button>
            </li>
          ))}
        </ul>
        <div>
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
        </div>
      </section>
    </RcmShell>
  );
}
