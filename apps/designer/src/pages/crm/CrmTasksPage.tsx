import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { completeTask, crmCanWrite, setTaskStatus, useCrm } from "../../crm";
import { accountById } from "../../crmAccounts";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmTasksPage() {
  const { overlay } = useCrm();
  const [params, setParams] = useSearchParams();
  const canWrite = crmCanWrite();
  const mine = params.get("scope") || "open";
  const client = params.get("client") || "all";
  const rows = useMemo(() => {
    return overlay.tasks.filter((item) => {
      if (client !== "all" && item.accountId !== client) return false;
      if (mine === "open") return item.status !== "done";
      if (mine === "done") return item.status === "done";
      return true;
    });
  }, [overlay.tasks, mine, client]);

  return (
    <CrmShell title="Tasks" lede="What someone owes a client today. Tasks keep their own status, separate from client status and issue status.">
      <div className="client-board-links">
        <Link to="/app/connectivity/communications">Messages</Link>
        <Link to="/app/connectivity/activities">Activity</Link>
        <Link to="/app/connectivity/issues">Issues</Link>
      </div>
      <section className="lims-panel billing-panel">
        <div className="chapter-tools" role="group" aria-label="Task status">
          {[
            { id: "open", label: "Open" },
            { id: "done", label: "Done" },
            { id: "all", label: "All" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={mine === item.id ? "is-on" : undefined}
              aria-pressed={mine === item.id}
              onClick={() => setParams({ scope: item.id, ...(client !== "all" ? { client } : {}) }, { replace: true })}
            >
              {item.label}
            </button>
          ))}
        </div>
        {rows.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Client</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const account = accountById(item.accountId);
                  return (
                    <tr key={item.id}>
                      <td>
                        {item.title}
                        <div className="rcm-muted">{item.description}</div>
                      </td>
                      <td>
                        {account ? (
                          <Link className="lims-linkish" to={`/app/connectivity/clients/${account.id}`}>
                            {account.name}
                          </Link>
                        ) : (
                          item.accountId
                        )}
                      </td>
                      <td>{item.owner}</td>
                      <td>{item.due}</td>
                      <td>{item.priority}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.status !== "done" ? (
                          <>
                            <button type="button" className="btn" disabled={!canWrite} onClick={() => setTaskStatus(item.id, "in_progress")}>
                              Start
                            </button>
                            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => completeTask(item.id)}>
                              Complete
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="This queue is empty." detail="Completed follow-ups stay on the account timeline." />
        )}
      </section>
    </CrmShell>
  );
}
