import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCrm } from "../../crm";
import { money, type Charge } from "../../revenueCycle";
import { ClientAssist, ProjectTable, RevenueChart, StudioLink, paymentBars, type ProjectFilter } from "./clientStudio";
import { CrmShell } from "./CrmShell";

function postedPayments(charges: Charge[]): { at: string; cents: number }[] {
  return charges.flatMap((charge) =>
    charge.events
      .filter((event) => event.text.startsWith("Payment posted"))
      .map((event) => ({ at: event.at, cents: charge.paidCents })),
  );
}

export function CrmOverviewPage() {
  const { cards, overlay, opportunities, actor, accounts, charges } = useCrm();
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [query, setQuery] = useState("");
  const active = cards.filter((card) => card.account.status === "Active");
  const collected = cards.reduce((sum, card) => sum + card.collectedCents, 0);
  const openAr = cards.reduce((sum, card) => sum + card.arCents, 0);
  const openProjects = opportunities.filter((item) => item.stage !== "Won" && item.stage !== "Lost");
  const moving = openProjects.filter((item) => item.stage === "Proposal" || item.stage === "Negotiation" || item.stage === "Qualified");
  const openTasks = overlay.tasks.filter((item) => item.status !== "done");
  const series = useMemo(() => paymentBars(postedPayments(charges), 2026, 7), [charges]);
  const paidShare = collected + openAr > 0 ? Math.round((collected / (collected + openAr)) * 100) : 0;
  const watch = cards.filter((card) => card.health === "At risk" || card.health === "Critical").length;

  return (
    <CrmShell studio title="Client overview" lede="How the laboratory’s clients are doing, what they need, and who should act next.">
      <div className="client-home">
        <div className="client-home-main">
          <div className="client-kpis">
            <StudioLink to="/app/connectivity/clients">
              <header>
                <span>Clients</span>
                <em className="is-up">+{active.length}</em>
              </header>
              <strong>{cards.length}</strong>
              <small>{active.length} active</small>
            </StudioLink>
            <StudioLink to="/app/connectivity/analytics">
              <header>
                <span>Revenue</span>
                <em className={paidShare >= 50 ? "is-up" : "is-down"}>{paidShare}%</em>
              </header>
              <strong>{money(collected)}</strong>
              <small>{money(openAr)} still open</small>
            </StudioLink>
            <StudioLink to="/app/connectivity/opportunities">
              <header>
                <span>Projects</span>
                <em className="is-up">+{moving.length}</em>
              </header>
              <strong>{openProjects.length}</strong>
              <small>Compare {opportunities.length} on the book</small>
            </StudioLink>
          </div>

          <section className="client-card client-analytics">
            <header>
              <h2>Revenue analytics</h2>
              <div>
                <span className="client-legend"><i /> Collected</span>
                <span className="client-legend is-peak"><i /> Peak day</span>
                <b>July 2026</b>
              </div>
            </header>
            <div className="client-analytics-body">
              <div className="client-analytics-side">
                <p><i className="is-actual" /> Collected</p>
                <p><i className="is-peak" /> Peak day</p>
                <blockquote>
                  {watch
                    ? `${watch} account${watch === 1 ? "" : "s"} need a conversation. Open tasks and agreements before the next invoice.`
                    : "Collections are quiet. Follow the open projects before the next close date."}
                </blockquote>
                <Link className="client-analysis" to="/app/connectivity/analytics">Run analysis</Link>
              </div>
              <RevenueChart series={series} />
            </div>
          </section>

          <ProjectTable rows={opportunities} accounts={accounts} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
        </div>

        <aside className="client-home-side">
          <section className="client-card client-tasks">
            <header>
              <h2>Priority tasks</h2>
              <Link to="/app/connectivity/tasks">See all</Link>
            </header>
            {openTasks.length ? (
              <ul>
                {openTasks.slice(0, 4).map((task) => (
                  <li key={task.id}>
                    <Link to={`/app/connectivity/tasks?task=${task.id}`}>
                      <span className={`client-task-mark is-${task.priority}`} />
                      <span>
                        <b>{task.title}</b>
                        <small>{task.due.slice(5)} · {task.priority}</small>
                        <em>{task.description}</em>
                      </span>
                      <span aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="client-empty">No open tasks.</p>
            )}
          </section>
          <ClientAssist actor={actor} hint="Search uses the same client accounts as the laboratory and Sequence Revenue." />
        </aside>
      </div>
    </CrmShell>
  );
}
