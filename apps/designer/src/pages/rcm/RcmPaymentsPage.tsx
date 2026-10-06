import { formatMoney, postRemittance, rcmCanWrite, useRcm } from "../../rcm";
import { RcmEmpty, RcmShell } from "./RcmShell";

export function RcmPaymentsPage() {
  const { overlay } = useRcm();
  const canWrite = rcmCanWrite();
  return (
    <RcmShell title="Payments" lede="Remittances, ERA/835 posting, and the append-only payment log. Posted amounts are never silently overwritten.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Remittances</h2>
        </div>
        {overlay.remittances.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Check / ERA</th>
                  <th>Payer</th>
                  <th>Received</th>
                  <th>Total</th>
                  <th>Posted</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overlay.remittances.map((item) => (
                  <tr key={item.id}>
                    <td>{item.checkNumber}</td>
                    <td>
                      {item.payerName} · {item.payerId}
                    </td>
                    <td>{item.receivedAt}</td>
                    <td>{formatMoney(item.totalCents)}</td>
                    <td>{formatMoney(item.postedCents)}</td>
                    <td>{item.status}</td>
                    <td>
                      {item.status !== "posted" ? (
                        <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => postRemittance(item.id)}>
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
          <RcmEmpty title="No remittances." detail="Incoming 835 files will list here for posting." />
        )}
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Posted payments</h2>
        </div>
        {overlay.payments.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
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
                    <td>{item.id}</td>
                    <td>{item.claimId}</td>
                    <td>{formatMoney(item.cents)}</td>
                    <td>{item.method}</td>
                    <td>{item.postedBy}</td>
                    <td>{item.at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="No payments posted." detail="Posting from a remittance or a claim writes an immutable payment row." />
        )}
      </section>
    </RcmShell>
  );
}
