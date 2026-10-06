import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CRM_ACCOUNTS } from "../crmAccounts";
import { AccountLink } from "../components/AccountTable";
import { accountRevenueLabel, money, useRevenue } from "../revenueCycle";
import { STATUS_LABEL, useSamples, type SampleStatus } from "../samples";
import { DEFAULT_WORKFLOW_STAGES } from "../workflowStages";
import { answerFromText, businessBrief, businessSnapshot } from "../insightsBrief";

type ChatMessage = { role: "user" | "assistant"; text: string };

const OPENING = "Answers come from the briefing text. Ask about accounts, revenue, laboratory work, or the pipeline.";

const SUGGESTIONS = ["Collected revenue", "Open denials", "Northwind Foods"];

const STATUS_ORDER: SampleStatus[] = DEFAULT_WORKFLOW_STAGES.map((stage) => stage.id as SampleStatus);

export function InsightsChatPage() {
  const samples = useSamples();
  const cycle = useRevenue();
  const snapshot = useMemo(
    () => businessSnapshot(samples, cycle.charges, CRM_ACCOUNTS),
    [samples, cycle.charges],
  );
  const generated = useMemo(
    () => businessBrief(samples, cycle.charges, CRM_ACCOUNTS),
    [samples, cycle.charges],
  );
  const [override, setOverride] = useState<string | null>(null);
  const briefing = override ?? generated;
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: OPENING }]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: answerFromText(trimmed, briefing) },
    ]);
    setDraft("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <div className="lims-page insights-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Overall business data, with a chat that answers from the text provided</p>
          <h1>Sequence Insights</h1>
          <p className="lims-page-lede">
            Accounts, laboratory work, revenue, and pipeline in one view. The chat answers only from the briefing.
          </p>
        </div>
      </div>

      <div className="lims-kpi-row insights-kpis">
        <div className="lims-kpi">
          <span>Accounts</span>
          <strong>{snapshot.accountCount}</strong>
          <small>Client records</small>
        </div>
        <div className={`lims-kpi${snapshot.atRisk ? " accent" : ""}`}>
          <span>At risk</span>
          <strong>{snapshot.atRisk}</strong>
          <small>Account health</small>
        </div>
        <div className="lims-kpi">
          <span>Open lab work</span>
          <strong>{snapshot.openLab}</strong>
          <small>Accessions not released</small>
        </div>
        <div className="lims-kpi">
          <span>Collected</span>
          <strong>{money(snapshot.collected)}</strong>
          <small>Payments posted</small>
        </div>
        <div className="lims-kpi">
          <span>A/R</span>
          <strong>{money(snapshot.ar)}</strong>
          <small>{snapshot.openDenials === 1 ? "1 open denial" : `${snapshot.openDenials} open denials`}</small>
        </div>
      </div>

      <div className="insights-board">
        <div className="insights-data">
          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Accounts</h2>
            </div>
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Owner</th>
                    <th>Health</th>
                    <th>Open work</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.accounts.map(({ account, openLab }) => (
                    <tr key={account.id}>
                      <td>
                        <AccountLink name={account.name} />
                      </td>
                      <td>{account.owner}</td>
                      <td>
                        <span className={`lims-badge${account.health === "At risk" ? " danger" : account.health === "Watch" ? " warn" : " info"}`}>
                          {account.health}
                        </span>
                      </td>
                      <td>{openLab}</td>
                      <td>{accountRevenueLabel(cycle.charges, account.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Laboratory</h2>
            </div>
            <ul className="insights-status">
              {STATUS_ORDER.map((status) => (
                <li key={status}>
                  <span>{STATUS_LABEL[status]}</span>
                  <strong>{snapshot.statusCounts[status]}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Revenue</h2>
            </div>
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Net</th>
                    <th>Collected</th>
                    <th>Unbilled</th>
                    <th>A/R</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.accounts.map(({ account, rollup }) => (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{money(rollup.net)}</td>
                      <td>{money(rollup.collected)}</td>
                      <td>{money(rollup.unbilled)}</td>
                      <td>{money(rollup.ar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Pipeline</h2>
            </div>
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Account</th>
                    <th>Stage</th>
                    <th>Amount</th>
                    <th>Close</th>
                  </tr>
                </thead>
                <tbody>
                  {CRM_ACCOUNTS.flatMap((account) =>
                    account.opportunities.map((opportunity) => (
                      <tr key={opportunity.id}>
                        <td>{opportunity.name}</td>
                        <td>
                          <AccountLink name={account.name} />
                        </td>
                        <td>{opportunity.stage}</td>
                        <td>{opportunity.amount}</td>
                        <td>{opportunity.close}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="insights-chat-pane">
          <section className="lims-panel insights-source">
            <div className="lims-panel-head">
              <h2>Briefing</h2>
              <button type="button" className="btn" onClick={() => setOverride(null)} disabled={override === null}>
                Refresh from business data
              </button>
            </div>
            <label className="sr-only" htmlFor="insights-briefing">
              Briefing text the chat answers from
            </label>
            <textarea
              id="insights-briefing"
              value={briefing}
              onChange={(event) => setOverride(event.target.value)}
            />
          </section>

          <section className="lims-panel insights-chat">
            <div className="lims-panel-head">
              <h2>Insights chat</h2>
            </div>
            <div className="insights-thread" aria-live="polite" ref={threadRef}>
              {messages.map((message, index) => (
                <p key={`${message.role}-${index}`} className={`insights-msg ${message.role}`}>
                  {message.text}
                </p>
              ))}
            </div>
            <div className="insights-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" className="btn" onClick={() => ask(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
            <form className="insights-ask" onSubmit={submit}>
              <label className="sr-only" htmlFor="insights-question">
                Ask about the briefing
              </label>
              <input
                id="insights-question"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about the briefing"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary">
                Ask
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
