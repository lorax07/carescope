import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { completeTask, crmCanWrite, setTaskStatus, useCrm, type TaskPriority, type TaskStatus } from "../../crm";
import { ClientAvatar, shortDate } from "./clientStudio";
import { TopPriorities } from "./TopPriorities";
import { CrmAccountLink } from "./CrmRecordStrip";
import { buttonFormat1 } from "../../buttonFormat1";
import { CrmEmpty, CrmModuleTitle, CrmShell } from "./CrmShell";

const SCOPES = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
] as const;

function statusLabel(status: TaskStatus): string {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  return "Open";
}

function priorityTone(priority: TaskPriority): string {
  if (priority === "high") return "stop";
  if (priority === "low") return "done";
  return "review";
}

export function CrmTasksPage() {
  const { overlay, accounts } = useCrm();
  const [params, setParams] = useSearchParams();
  const canWrite = crmCanWrite();
  const mine = params.get("scope") || "open";
  const client = params.get("client") || "all";
  const focus = params.get("task") || "";
  const rows = useMemo(() => {
    return overlay.tasks.filter((item) => {
      if (client !== "all" && item.accountId !== client) return false;
      if (mine === "open") return item.status !== "done";
      if (mine === "in_progress") return item.status === "in_progress";
      if (mine === "done") return item.status === "done";
      return true;
    });
  }, [overlay.tasks, mine, client]);
  const counts = {
    open: overlay.tasks.filter((item) => item.status !== "done").length,
    progress: overlay.tasks.filter((item) => item.status === "in_progress").length,
    high: overlay.tasks.filter((item) => item.status !== "done" && item.priority === "high").length,
  };

  function setScope(scope: string) {
    const copy = new URLSearchParams(params);
    if (scope === "open") copy.delete("scope");
    else copy.set("scope", scope);
    setParams(copy, { replace: true });
  }

  return (
    <CrmShell studio priorities={false} title="Cases" lede="What someone owes an account today.">
      <div className="client-home">
        <div className="client-home-main">
          <header className="client-board-head">
            <CrmModuleTitle title="Cases" />
          </header>
          <div className="client-board-links">
            <Link to="/app/connectivity/inbox">Inbox</Link>
            <Link to="/app/connectivity/activities">Activity</Link>
            <Link to="/app/connectivity/issues">Issues</Link>
          </div>
          <div className="client-kpis">
            <button type="button" className={`client-kpi${mine === "open" ? " is-on" : ""}`} onClick={() => setScope("open")}>
              <header>
                <span>Open</span>
                <em className="is-up">{counts.open}</em>
              </header>
              <strong>{counts.open}</strong>
              <small>Still owed to an account</small>
            </button>
            <button type="button" className={`client-kpi${mine === "in_progress" ? " is-on" : ""}`} onClick={() => setScope("in_progress")}>
              <header>
                <span>In progress</span>
                <em className="is-up">{counts.progress}</em>
              </header>
              <strong>{counts.progress}</strong>
              <small>Started and not finished</small>
            </button>
            <button type="button" className="client-kpi" onClick={() => setScope("open")}>
              <header>
                <span>High priority</span>
                <em className={counts.high ? "is-down" : "is-up"}>{counts.high}</em>
              </header>
              <strong>{counts.high}</strong>
              <small>Open work that should move first</small>
            </button>
          </div>
          <section className="client-card client-task-board">
            <div className="client-pills" role="tablist" aria-label="Task status">
              {SCOPES.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={mine === item.id} className={buttonFormat1(mine === item.id)} onClick={() => setScope(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            {rows.length ? (
              <ul>
                {rows.map((item) => {
                  const account = accounts.find((row) => row.id === item.accountId);
                  const person = account?.contact || item.owner;
                  return (
                    <li key={item.id} className={focus === item.id ? "is-on" : undefined}>
                      <ClientAvatar name={person} size={40} />
                      <div>
                        <b>{item.title}</b>
                        <small>
                          {account ? <CrmAccountLink accountId={account.id} title={account.name}>{account.name}</CrmAccountLink> : item.accountId}
                          {" · "}
                          {item.owner}
                          {" · due "}
                          {shortDate(item.due)}
                        </small>
                        <em>{item.description}</em>
                      </div>
                      <div className="client-task-actions">
                        <span className={`client-status is-${priorityTone(item.priority)}`}>{item.priority}</span>
                        <span className={`client-status is-${item.status === "done" ? "go" : item.status === "in_progress" ? "review" : "draft"}`}>{statusLabel(item.status)}</span>
                        {item.status !== "done" ? (
                          <>
                            <button type="button" className="btn" disabled={!canWrite || item.status === "in_progress"} onClick={() => setTaskStatus(item.id, "in_progress")}>
                              Start
                            </button>
                            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => completeTask(item.id)}>
                              Complete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <CrmEmpty title="This queue is empty." detail="Completed follow-ups stay on the account timeline." />
            )}
          </section>
        </div>
        <aside className="client-home-side">
          <TopPriorities hint="Start and complete stay on the case. Account status does not change with them." />
        </aside>
      </div>
    </CrmShell>
  );
}
