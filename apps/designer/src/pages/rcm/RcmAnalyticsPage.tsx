import { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatMoney, useRcm } from "../../rcm";
import { SourceBars } from "../crm/clientStudio";
import { RcmEmpty, RcmShell } from "./RcmShell";
import { RevenueAssist } from "./revenueStudio";

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
  const { claims, overlay, metrics, actor } = useRcm();
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

  const routes = [
    { label: "Insurance", count: claims.filter((claim) => claim.route === "837P").length, tone: "is-mint" },
    { label: "Client", count: claims.filter((claim) => claim.route === "Invoice").length, tone: "is-rose" },
    { label: "Self-pay", count: claims.filter((claim) => claim.route === "Statement").length, tone: "is-lilac" },
  ];
  const quiet = [...routes].sort((a, b) => a.count - b.count)[0];

  return (
    <RcmShell studio title="Performance" lede="Patterns across payers, clients, and procedures.">
      <div className="client-home">
        <div className="client-home-main">
          <header className="client-board-head">
            <h1>Performance</h1>
          </header>
          <div className="client-kpis">
            <Link className="client-kpi" to="/app/billing/claims">
              <header>
                <span>Clean claims</span>
                <em className="is-up">{metrics.cleanRate}%</em>
              </header>
              <strong>{metrics.cleanRate}%</strong>
              <Rate value={metrics.cleanRate} />
            </Link>
            <Link className="client-kpi" to="/app/billing/denials">
              <header>
                <span>Denial rate</span>
                <em className={metrics.denialRate ? "is-down" : "is-up"}>{metrics.denialRate}%</em>
              </header>
              <strong>{metrics.denialRate}%</strong>
              <Rate value={metrics.denialRate} />
            </Link>
            <Link className="client-kpi" to="/app/billing/payments">
              <header>
                <span>Collection rate</span>
                <em className={metrics.collectionRate >= 50 ? "is-up" : "is-down"}>{metrics.collectionRate}%</em>
              </header>
              <strong>{metrics.collectionRate}%</strong>
              <small>{metrics.daysInAr} days in A/R</small>
            </Link>
          </div>
          <SliceTable title="Payer performance" href="/app/billing/ar" rows={payers} empty="No payer activity on the ledger yet." />
          <SliceTable title="Client performance" href="/app/billing/claims" rows={clients} empty="No client balances to compare." />
          <SliceTable title="Test and procedure" href="/app/billing/claims" rows={tests} empty="Capture charges to see procedure yield." />
        </div>
        <aside className="client-home-side">
          <SourceBars href="/app/billing/claims" title="Claim source" groups={routes} note={quiet ? `${quiet.label} is the quietest route on the book.` : "Routes appear as claims are captured."} />
          <section className="client-card client-projects is-scroll">
            <header>
              <h2>Denial root cause</h2>
              <Link to="/app/billing/denials">Denials</Link>
            </header>
            {causes.length ? (
              <div className="client-table-wrap">
                <table className="client-table">
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
          <RevenueAssist actor={actor} hint="Rates use the same ledger as the work queues." />
        </aside>
      </div>
    </RcmShell>
  );
}

function SliceTable({ title, href, rows, empty }: { title: string; href: string; rows: Slice[]; empty: string }) {
  return (
    <section className="client-card client-projects is-scroll">
      <header>
        <h2>{title}</h2>
        <Link to={href}>Open</Link>
      </header>
      {rows.length ? (
        <div className="client-table-wrap">
          <table className="client-table">
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
              {rows.map((row) => (
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
