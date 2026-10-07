import { Link } from "react-router-dom";
import { useCrm } from "../../crm";
import { money } from "../../revenueCycle";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmOverviewPage() {
  const { cards, overlay, opportunities, canWrite } = useCrm();
  const active = cards.filter((card) => card.account.status === "Active");
  const attention = cards.filter((card) => card.health === "At risk" || card.health === "Critical" || card.openIssues || card.openTasks);
  const openTasks = overlay.tasks.filter((item) => item.status !== "done");
  const openIssues = overlay.issues.filter((item) => item.status !== "resolved");
  const pipeline = opportunities.filter((item) => item.stage !== "Won" && item.stage !== "Lost");
  const metrics = [
    { label: "Clients", value: String(cards.length), to: "/app/connectivity/clients", hint: "Sequence Client accounts" },
    { label: "Active", value: String(active.length), to: "/app/connectivity/clients?status=Active", hint: "Not on hold" },
    { label: "Need attention", value: String(attention.length), to: "/app/connectivity/health", hint: "At risk, critical, issues, or tasks" },
    { label: "At risk / critical", value: String(cards.filter((card) => card.health === "At risk" || card.health === "Critical").length), to: "/app/connectivity/health", hint: "Explainable health signals" },
    { label: "Open tasks", value: String(openTasks.length), to: "/app/connectivity/tasks", hint: "Work for someone today" },
    { label: "Open issues", value: String(openIssues.length), to: "/app/connectivity/issues", hint: "Service still unresolved" },
    { label: "Opportunities", value: String(pipeline.length), to: "/app/connectivity/opportunities", hint: "Open pipeline" },
    { label: "Open A/R", value: money(cards.reduce((sum, card) => sum + card.arCents, 0)), to: "/app/billing/ar", hint: "From Sequence Revenue" },
  ];

  return (
    <CrmShell title="Client overview" lede="How the laboratory’s clients are doing, what they need, and who should act next.">
      {!canWrite ? <p className="billing-note">You can review clients. Recording notes, tasks, and issues needs a client-success role.</p> : null}
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Portfolio</h2>
        </div>
        <div className="rcm-metric-grid">
          {metrics.map((card) => (
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
            <h2>Needs someone</h2>
            <Link to="/app/connectivity/tasks">Open tasks</Link>
          </div>
          {openTasks.length ? (
            <ul className="rcm-attention">
              {openTasks.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link to={`/app/connectivity/tasks?task=${item.id}`}>
                    <b>{item.title}</b>
                    <span>
                      {item.owner} · due {item.due}
                    </span>
                  </Link>
                  <em>{item.priority}</em>
                </li>
              ))}
            </ul>
          ) : (
            <CrmEmpty title="No open tasks." detail="Follow-ups from denials, holds, and renewals will land here." />
          )}
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Accounts to watch</h2>
            <Link to="/app/connectivity/health">Client health</Link>
          </div>
          {attention.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Health</th>
                    <th>Why</th>
                    <th>Next</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.slice(0, 6).map((card) => (
                    <tr key={card.account.id}>
                      <td>
                        <Link className="lims-linkish" to={`/app/connectivity/clients/${card.account.id}`}>
                          {card.account.name}
                        </Link>
                      </td>
                      <td>{card.health}</td>
                      <td>{card.signals[0]?.message ?? "Open work on the account"}</td>
                      <td>{card.signals[0]?.action ?? "Review the client record"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CrmEmpty title="Portfolio is quiet." detail="At-risk accounts and open issues will list here." />
          )}
        </section>
      </div>
    </CrmShell>
  );
}
