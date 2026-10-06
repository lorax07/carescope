import { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatMoney, useRcm } from "../../rcm";
import { RcmEmpty, RcmShell } from "./RcmShell";

type Slice = { key: string; billed: number; paid: number; balance: number; denied: number; count: number };

function tally(rows: { key: string; billed: number; paid: number; balance: number; denied: boolean }[]): Slice[] {
  const map = new Map<string, Slice>();
  for (const row of rows) {
    const current = map.get(row.key) ?? { key: row.key, billed: 0, paid: 0, balance: 0, denied: 0, count: 0 };
    current.billed += row.billed;
    current.paid += row.paid;
    current.balance += row.balance;
    current.denied += row.denied ? 1 : 0;
    current.count += 1;
    map.set(row.key, current);
  }
  return [...map.values()].sort((a, b) => b.balance - a.balance || b.billed - a.billed);
}

function Rate({ value }: { value: number }) {
  return (
    <div className="rcm-bar" aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function RcmAnalyticsPage() {
  const { claims, overlay, metrics } = useRcm();
  const payers = useMemo(
    () =>
      tally(
        claims.map((claim) => ({
          key: claim.payerName,
          billed: claim.billedCents,
          paid: claim.paidCents,
          balance: claim.balanceCents,
          denied: claim.workflow === "denied" || claim.workflow === "appealed",
        })),
      ),
    [claims],
  );
  const clients = useMemo(
    () =>
      tally(
        claims.map((claim) => ({
          key: claim.accountName,
          billed: claim.billedCents,
          paid: claim.paidCents,
          balance: claim.balanceCents,
          denied: claim.workflow === "denied" || claim.workflow === "appealed",
        })),
      ),
    [claims],
  );
  const tests = useMemo(
    () =>
      tally(
        claims.flatMap((claim) =>
          claim.lines.map((line) => ({
            key: `${line.test} · ${line.cpt}`,
            billed: line.amountCents,
            paid: line.paidCents,
            balance: Math.max(0, line.amountCents - line.paidCents - line.writeOffCents),
            denied: line.status === "denied",
          })),
        ),
      ),
    [claims],
  );
  const causes = useMemo(() => {
    const map = new Map<string, { count: number; cents: number }>();
    for (const denial of overlay.denials) {
      const key = denial.rootCause || "Unassigned";
      const current = map.get(key) ?? { count: 0, cents: 0 };
      current.count += 1;
      current.cents += denial.impactCents;
      map.set(key, current);
    }
    return [...map.entries()].sort((a, b) => b[1].cents - a[1].cents);
  }, [overlay.denials]);

  return (
    <RcmShell title="Revenue analytics" lede="Patterns across payers, clients, and procedures. Every rate here is the same ledger the work queues use.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Performance</h2>
        </div>
        <div className="rcm-metric-grid is-compact">
          <Link className="rcm-metric" to="/app/billing/claims">
            <small>Clean claim rate</small>
            <strong>{metrics.cleanRate}%</strong>
            <Rate value={metrics.cleanRate} />
          </Link>
          <Link className="rcm-metric" to="/app/billing/denials">
            <small>Denial rate</small>
            <strong>{metrics.denialRate}%</strong>
            <Rate value={metrics.denialRate} />
          </Link>
          <Link className="rcm-metric" to="/app/billing/payments">
            <small>Collection rate</small>
            <strong>{metrics.collectionRate}%</strong>
            <Rate value={metrics.collectionRate} />
          </Link>
          <Link className="rcm-metric" to="/app/billing/ar">
            <small>Days in A/R</small>
            <strong>{metrics.daysInAr}</strong>
            <span>Average age of open balances</span>
          </Link>
        </div>
      </section>
      <div className="rcm-split">
        <SliceTable title="Payer performance" href="/app/billing/ar" rows={payers} empty="No payer activity on the ledger yet." />
        <SliceTable title="Client performance" href="/app/billing/ar" rows={clients} empty="No client balances to compare." />
      </div>
      <div className="rcm-split">
        <SliceTable title="Test and procedure" href="/app/billing/claims" rows={tests} empty="Capture charges to see procedure yield." />
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Denial root cause</h2>
            <Link to="/app/billing/denials">Denials</Link>
          </div>
          {causes.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Cause</th>
                    <th>Count</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {causes.map(([label, stats]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{stats.count}</td>
                      <td>{formatMoney(stats.cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <RcmEmpty title="No root causes assigned." detail="Tag denials so recurrence is visible here." />
          )}
        </section>
      </div>
    </RcmShell>
  );
}

function SliceTable({ title, href, rows, empty }: { title: string; href: string; rows: Slice[]; empty: string }) {
  return (
    <section className="lims-panel billing-panel">
      <div className="lims-panel-head">
        <h2>{title}</h2>
        <Link to={href}>Open</Link>
      </div>
      {rows.length ? (
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Claims</th>
                <th>Collected</th>
                <th>Balance</th>
                <th>Denied</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row) => (
                <tr key={row.key}>
                  <td>{row.key}</td>
                  <td>{row.count}</td>
                  <td>{formatMoney(row.paid)}</td>
                  <td>{formatMoney(row.balance)}</td>
                  <td>{row.denied}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <RcmEmpty title={empty} detail="" />
      )}
    </section>
  );
}
