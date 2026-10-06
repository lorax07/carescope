import { Link } from "react-router-dom";
import { formatMoney, useRcm } from "../../rcm";
import { QUEUE_META } from "../../rcm/types";
import { RcmEmpty, RcmShell } from "./RcmShell";

export function RcmOverviewPage() {
  const { metrics, queues, claims, canWrite } = useRcm();
  const cards = [
    { label: "Total A/R", value: formatMoney(metrics.ar), to: "/app/billing/ar", hint: "Open receivable" },
    { label: "Revenue at risk", value: formatMoney(metrics.atRisk), to: "/app/billing/denials", hint: "Denials plus 91+ aging" },
    { label: "Days in A/R", value: String(metrics.daysInAr), to: "/app/billing/ar", hint: "Average age of open balances" },
    { label: "Clean claim rate", value: `${metrics.cleanRate}%`, to: "/app/billing/claims", hint: "Submitted without scrubbing errors" },
    { label: "Denial rate", value: `${metrics.denialRate}%`, to: "/app/billing/denials", hint: "Denied among submitted" },
    { label: "Collection rate", value: `${metrics.collectionRate}%`, to: "/app/billing/payments", hint: "Collected versus billed" },
    { label: "Claims awaiting submit", value: String(metrics.awaiting), to: "/app/billing/queues?queue=ready", hint: "Ready and in review" },
    { label: "Submitted", value: String(metrics.submitted), to: "/app/billing/claims?workflow=submitted", hint: "In flight with payers" },
    { label: "Denied", value: String(metrics.denied), to: "/app/billing/denials", hint: "Need recovery work" },
    { label: "Payments received", value: formatMoney(metrics.payments), to: "/app/billing/payments", hint: "Posted to the ledger" },
    { label: "Patient responsibility", value: formatMoney(metrics.patient), to: "/app/billing/ar?route=Statement", hint: "Self-pay balances" },
    { label: "Open work", value: String(metrics.openQueues), to: "/app/billing/queues", hint: "Items across every queue" },
  ];
  const attention = QUEUE_META.map((meta) => ({ ...meta, count: queues[meta.id].length }))
    .filter((item) => item.count)
    .slice(0, 6);
  const risky = claims.filter((claim) => claim.balanceCents > 0 && (claim.workflow === "denied" || claim.ageDays >= 90)).slice(0, 6);

  return (
    <RcmShell
      title="Revenue overview"
      lede="What needs attention, what money is at risk, and the next action on the laboratory ledger."
    >
      {!canWrite ? <p className="billing-note">You can review revenue. Posting and claim changes need a billing role.</p> : null}
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Performance</h2>
        </div>
        <div className="rcm-metric-grid">
          {cards.map((card) => (
            <Link key={card.label} className="rcm-metric" to={card.to}>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              <span>{card.hint}</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Work that needs someone</h2>
            <Link to="/app/billing/queues">Open queues</Link>
          </div>
          {attention.length ? (
            <ul className="rcm-attention">
              {attention.map((item) => (
                <li key={item.id}>
                  <Link to={`/app/billing/queues?queue=${item.id}`}>
                    <b>{item.label}</b>
                    <span>{item.question}</span>
                  </Link>
                  <em>{item.count}</em>
                </li>
              ))}
            </ul>
          ) : (
            <RcmEmpty title="Queues are clear." detail="New accessions will appear here when they are ready to bill." />
          )}
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Money at risk</h2>
            <Link to="/app/billing/ar">Open A/R</Link>
          </div>
          {risky.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Account</th>
                    <th>Why</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {risky.map((claim) => (
                    <tr key={claim.id}>
                      <td>
                        <Link className="lims-linkish" to={`/app/billing/claims/${encodeURIComponent(claim.id)}`}>
                          {claim.id}
                        </Link>
                      </td>
                      <td>{claim.accountName}</td>
                      <td>{claim.workflow === "denied" ? "Denial" : `${claim.ageDays} days`}</td>
                      <td>{formatMoney(claim.balanceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <RcmEmpty title="No high-risk balances." detail="Denied and 90-day accounts will list here." />
          )}
        </section>
      </div>
    </RcmShell>
  );
}
