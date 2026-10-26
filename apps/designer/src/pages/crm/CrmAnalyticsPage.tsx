import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCrm } from "../../crm";
import { money } from "../../revenueCycle";
import { CrmEmpty, CrmShell } from "./CrmShell";
import { SourceBars } from "./clientStudio";

export function CrmAnalyticsPage() {
  const { cards, overlay, opportunities, accounts } = useCrm();
  const byHealth = useMemo(() => {
    const tally = new Map<string, number>();
    for (const card of cards) tally.set(card.health, (tally.get(card.health) ?? 0) + 1);
    return [...tally.entries()];
  }, [cards]);
  const byOwner = useMemo(() => {
    const tally = new Map<string, { clients: number; ar: number; issues: number }>();
    for (const card of cards) {
      const current = tally.get(card.account.owner) ?? { clients: 0, ar: 0, issues: 0 };
      current.clients += 1;
      current.ar += card.arCents;
      current.issues += card.openIssues;
      tally.set(card.account.owner, current);
    }
    return [...tally.entries()].sort((a, b) => b[1].ar - a[1].ar);
  }, [cards]);
  const openPipeline = opportunities.filter((item) => item.stage !== "Won" && item.stage !== "Lost");
  const tests = useMemo(() => {
    const tally = new Map<string, number>();
    for (const card of cards) {
      /* volume proxy: open work + collected presence */
      tally.set(card.account.industry, (tally.get(card.account.industry) ?? 0) + card.openWork + (card.collectedCents > 0 ? 1 : 0));
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  }, [cards]);

  return (
    <CrmShell title="Growth Hub" lede="Where the client book is concentrated, and which sources can still grow.">
      <SourceBars
        groups={["Client", "Insurance", "Self-pay"].map((label, index) => ({
          label,
          count: accounts.filter((account) => account.billTo === label).length,
          tone: ["is-rose", "is-mint", "is-lilac"][index] ?? "is-mint",
        }))}
        note="Source is the bill-to on the account: the client, an insurance payer, or self-pay."
      />
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Health mix</h2>
        </div>
        <div className="rcm-metric-grid is-compact">
          {byHealth.map(([label, count]) => (
            <Link key={label} className="rcm-metric" to={`/app/connectivity/clients?health=${encodeURIComponent(label)}`}>
              <small>{label}</small>
              <strong>{count}</strong>
            </Link>
          ))}
          <Link className="rcm-metric" to="/app/connectivity/issues">
            <small>Open issues</small>
            <strong>{overlay.issues.filter((item) => item.status !== "resolved").length}</strong>
          </Link>
          <Link className="rcm-metric" to="/app/connectivity/opportunities">
            <small>Open opportunities</small>
            <strong>{openPipeline.length}</strong>
          </Link>
        </div>
      </section>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Owner load</h2>
          </div>
          {byOwner.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Clients</th>
                    <th>A/R</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {byOwner.map(([name, stats]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{stats.clients}</td>
                      <td>{money(stats.ar)}</td>
                      <td>{stats.issues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CrmEmpty title="No owners." />
          )}
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Industry activity</h2>
          </div>
          {tests.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Industry</th>
                    <th>Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map(([name, count]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CrmEmpty title="No volume yet." />
          )}
        </section>
      </div>
    </CrmShell>
  );
}
