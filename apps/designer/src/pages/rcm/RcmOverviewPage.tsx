import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney, useRcm } from "../../rcm";
import { QUEUE_META } from "../../rcm/types";
import { RevenueChart, StudioLink, paymentBars } from "../crm/clientStudio";
import { RcmShell } from "./RcmShell";
import { RevenueAssist, RevenueClaimTable, type ClaimFilter } from "./revenueStudio";

export function RcmOverviewPage() {
  const { metrics, queues, claims, cycle, actor } = useRcm();
  const [filter, setFilter] = useState<ClaimFilter>("open");
  const [query, setQuery] = useState("");
  const openClaims = claims.filter((claim) => claim.recordStatus === "open" && claim.workflow !== "paid" && claim.workflow !== "resolved");
  const moving = claims.filter((claim) => claim.workflow === "submitted" || claim.workflow === "accepted" || claim.workflow === "ready");
  const watch = claims.filter((claim) => claim.balanceCents > 0 && (claim.workflow === "denied" || claim.ageDays >= 90)).length;
  const series = useMemo(
    () =>
      paymentBars(
        cycle.charges.flatMap((charge) =>
          charge.events.filter((event) => event.text.startsWith("Payment posted")).map((event) => ({ at: event.at, cents: charge.paidCents })),
        ),
        2026,
        7,
      ),
    [cycle.charges],
  );
  const attention = QUEUE_META.map((meta) => ({ ...meta, count: queues[meta.id].length })).filter((item) => item.count).slice(0, 4);

  return (
    <RcmShell studio title="Revenue overview" lede="What needs attention, what money is at risk, and the next action on the laboratory ledger.">
      <div className="client-home">
        <h1 className="client-overview-title">Revenue Overview</h1>
        <div className="client-home-main">
          <div className="client-kpis">
            <StudioLink to="/app/billing/ar">
              <header>
                <span>Receivables</span>
                <em className={metrics.daysInAr > 45 ? "is-down" : "is-up"}>{metrics.daysInAr}d</em>
              </header>
              <strong>{formatMoney(metrics.ar)}</strong>
              <small>{formatMoney(metrics.atRisk)} at risk</small>
            </StudioLink>
            <StudioLink to="/app/billing/payments">
              <header>
                <span>Collected</span>
                <em className={metrics.collectionRate >= 50 ? "is-up" : "is-down"}>{metrics.collectionRate}%</em>
              </header>
              <strong>{formatMoney(metrics.payments)}</strong>
              <small>Posted on the ledger</small>
            </StudioLink>
            <StudioLink to="/app/billing/claims">
              <header>
                <span>Claims</span>
                <em className="is-up">+{moving.length}</em>
              </header>
              <strong>{openClaims.length}</strong>
              <small>Compare {claims.length} on the book</small>
            </StudioLink>
          </div>

          <section className="client-card client-analytics">
            <header>
              <h2>Revenue analytics</h2>
              <div>
                <span className="client-legend"><i /> Collected</span>
                <span className="client-legend is-peak"><i /> Peak day</span>
                <b>July 2026</b>
                <small className="client-chart-hint">Ctrl + scroll to zoom</small>
              </div>
            </header>
            <div className="client-analytics-body">
              <div className="client-analytics-side">
                <p><i className="is-actual" /> Collected</p>
                <p><i className="is-peak" /> Peak day</p>
                <blockquote>
                  {watch
                    ? `${watch} balance${watch === 1 ? "" : "s"} need a conversation. Open denials and aging before the next close.`
                    : "Collections are quiet. Follow the claims that are still in flight."}
                </blockquote>
                <Link className="client-analysis" to="/app/billing/analytics">Run analysis</Link>
              </div>
              <RevenueChart series={series} />
            </div>
          </section>

          <RevenueClaimTable scroll rows={claims} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
        </div>
        <aside className="client-home-side">
          <section className="client-card client-tasks">
            <header>
              <h2>Priority exceptions</h2>
              <Link to="/app/billing/queues">See all</Link>
            </header>
            {attention.length ? (
              <ul>
                {attention.map((item) => (
                  <li key={item.id}>
                    <Link to={`/app/billing/queues?queue=${item.id}`}>
                      <span className="client-task-mark is-high" />
                      <span>
                        <b>{item.label}</b>
                        <small>{item.count} open</small>
                        <em>{item.question}</em>
                      </span>
                      <span aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="client-empty">Queues are clear.</p>
            )}
          </section>
          <RevenueAssist actor={actor} hint="Search uses the same claims as the laboratory ledger and Sequence Client." />
        </aside>
      </div>
    </RcmShell>
  );
}
