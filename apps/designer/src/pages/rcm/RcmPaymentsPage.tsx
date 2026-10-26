import { Link } from "react-router-dom";
import { formatMoney, postRemittance, rcmCanWrite, useRcm } from "../../rcm";
import { ClientAvatar, shortDate } from "../crm/clientStudio";
import { RcmEmpty, RcmShell } from "./RcmShell";
import { RevenueAssist } from "./revenueStudio";

export function RcmPaymentsPage() {
  const { overlay, metrics, actor } = useRcm();
  const canWrite = rcmCanWrite();
  const unposted = overlay.remittances.filter((item) => item.status !== "posted");
  const posted = overlay.payments.reduce((sum, item) => sum + item.cents, 0);

  return (
    <RcmShell studio title="Cash" lede="Remittances and the append-only payment log.">
      <div className="client-home">
        <div className="client-home-main">
          <header className="client-board-head">
            <h1>Cash</h1>
          </header>
          <div className="client-board-links">
            <Link to="/app/billing/denials">Denials</Link>
            <Link to="/app/billing/ar">Receivables</Link>
            <Link to="/app/billing/queues?queue=unposted">Unposted</Link>
          </div>
          <div className="client-kpis">
            <div className="client-kpi">
              <header>
                <span>Collected</span>
                <em className="is-up">{metrics.collectionRate}%</em>
              </header>
              <strong>{formatMoney(metrics.payments)}</strong>
              <small>On the claim ledger</small>
            </div>
            <div className="client-kpi">
              <header>
                <span>Posted</span>
                <em className="is-up">{overlay.payments.length}</em>
              </header>
              <strong>{formatMoney(posted)}</strong>
              <small>Append-only payment log</small>
            </div>
            <div className="client-kpi">
              <header>
                <span>Unposted</span>
                <em className={unposted.length ? "is-down" : "is-up"}>{unposted.length}</em>
              </header>
              <strong>{unposted.length}</strong>
              <small>Remittances still open</small>
            </div>
          </div>
          <section className="client-card client-projects is-scroll">
            <header>
              <h2>Remittances</h2>
            </header>
            {overlay.remittances.length ? (
              <div className="client-table-wrap">
                <table className="client-table">
                  <thead>
                    <tr>
                      <th>Payer</th>
                      <th>Check</th>
                      <th>Received</th>
                      <th>Total</th>
                      <th>Posted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlay.remittances.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="client-person-inline">
                            <ClientAvatar name={item.payerName} size={36} />
                            <span>
                              <b>{item.payerName}</b>
                              <small>{item.payerId}</small>
                            </span>
                          </span>
                        </td>
                        <td>{item.checkNumber}</td>
                        <td>{shortDate(item.receivedAt)}</td>
                        <td>{formatMoney(item.totalCents)}</td>
                        <td>{formatMoney(item.postedCents)}</td>
                        <td>
                          {item.status !== "posted" ? (
                            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => postRemittance(item.id)}>
                              Post
                            </button>
                          ) : (
                            <em className="client-status is-done">Posted</em>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <RcmEmpty title="No remittances." detail="Incoming 835 files will list here for posting." />
            )}
          </section>
          <section className="client-card client-projects is-scroll">
            <header>
              <h2>Posted payments</h2>
            </header>
            {overlay.payments.length ? (
              <div className="client-table-wrap">
                <table className="client-table">
                  <thead>
                    <tr>
                      <th>Payment</th>
                      <th>Claim</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Posted by</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlay.payments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <b>{item.id}</b>
                        </td>
                        <td>
                          <Link to={`/app/billing/claims/${encodeURIComponent(item.claimId)}`}>{item.claimId}</Link>
                        </td>
                        <td>{formatMoney(item.cents)}</td>
                        <td>{item.method}</td>
                        <td>{item.postedBy}</td>
                        <td>{shortDate(item.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <RcmEmpty title="No payments posted." detail="Post a remittance to append a payment." />
            )}
          </section>
        </div>
        <aside className="client-home-side">
          <RevenueAssist actor={actor} hint="Posted amounts stay on the log. A later adjustment is a new payment, not a rewrite." />
        </aside>
      </div>
    </RcmShell>
  );
}