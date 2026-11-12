import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Filter01 } from "../../components/Filter01";
import { filter01Match } from "../../filter01";
import { accountById } from "../../crmAccounts";
import type { Claim, ClaimWorkflow } from "../../rcm";
import { WORKFLOW_LABEL, formatMoney } from "../../rcm";
import { ClientAvatar, greetingName, shortDate } from "../crm/clientStudio";

export const CLAIM_FILTERS = [
  { id: "open", label: "Open" },
  { id: "risk", label: "At risk" },
  { id: "denied", label: "Denied" },
  { id: "paid", label: "Paid" },
  { id: "all", label: "All" },
] as const;

export type ClaimFilter = (typeof CLAIM_FILTERS)[number]["id"];

export function claimMatches(
  claim: { workflow: string; financial: string; balanceCents: number; ageDays: number; recordStatus: string },
  filter: ClaimFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "paid") return claim.workflow === "paid" || claim.workflow === "resolved" || claim.financial === "collected";
  if (filter === "denied") return claim.workflow === "denied" || claim.workflow === "appealed" || claim.financial === "denied_balance";
  if (filter === "risk") return claim.balanceCents > 0 && (claim.workflow === "denied" || claim.workflow === "appealed" || claim.ageDays >= 90);
  return claim.recordStatus === "open" && claim.workflow !== "paid" && claim.workflow !== "resolved";
}

export function claimTone(workflow: ClaimWorkflow): { label: string; tone: "draft" | "go" | "review" | "done" | "stop" } {
  const label = WORKFLOW_LABEL[workflow];
  if (workflow === "paid" || workflow === "resolved") return { label, tone: "done" };
  if (workflow === "denied" || workflow === "rejected") return { label, tone: "stop" };
  if (workflow === "appealed" || workflow === "review" || workflow === "ready" || workflow === "scrubbed") return { label, tone: "review" };
  if (workflow === "submitted" || workflow === "accepted" || workflow === "adjudicated") return { label, tone: "go" };
  return { label, tone: "draft" };
}

export function RevenueClaimTable({
  rows,
  filters,
  onFilter,
  query,
  onQuery,
  scroll = false,
}: {
  rows: Claim[];
  filters: string[];
  onFilter: (filters: string[]) => void;
  query: string;
  onQuery: (query: string) => void;
  scroll?: boolean;
}) {
  const visible = useMemo(() => {
    const stages = filters.filter((id): id is ClaimFilter => CLAIM_FILTERS.some((item) => item.id === id && item.id !== "all"));
    const queries = filters.filter((id) => id.startsWith("search:")).map((id) => id.slice(7));
    const needles = queries.length ? queries : query.trim() ? [query] : [];
    return rows.filter((row) => {
      if (stages.length && !stages.some((filter) => claimMatches(row, filter))) return false;
      if (!needles.length) return true;
      return needles.some((needle) => filter01Match(`${row.id} ${row.accountName} ${row.accessionId} ${row.payerName} ${row.nextAction}`, needle));
    });
  }, [filters, query, rows]);

  return (
    <section className={`client-card client-projects${scroll ? " is-scroll" : ""}`}>
      <header>
        <h2>Manage Claims</h2>
        <label>
          <span className="sr-only">Search claims</span>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search" aria-label="Search claims" />
        </label>
      </header>
      <Filter01
        label="Claims"
        scope="claims"
        options={CLAIM_FILTERS.filter((item) => item.id !== "all").map((item) => ({ id: item.id, label: item.label, category: "Status" }))}
        selected={filters}
        onChange={onFilter}
        query={query}
        onQuery={onQuery}
      />
      {visible.length ? (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Claim</th>
                <th>Note</th>
                <th>Age</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const person = accountById(row.accountId)?.contact || row.accountName;
                const tone = claimTone(row.workflow);
                return (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/app/billing/claims/${encodeURIComponent(row.id)}`}>
                        <ClientAvatar name={person} size={36} />
                        <span>
                          <b>{person}</b>
                          <small>{row.accountName}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <b>{row.id}</b>
                      <small>{row.payerName}</small>
                    </td>
                    <td>{row.nextAction ? <span className="client-note" title={row.nextAction} /> : null}</td>
                    <td>{row.submittedAt ? shortDate(row.submittedAt) : `${row.ageDays}d`}</td>
                    <td>{formatMoney(row.balanceCents)}</td>
                    <td>
                      <em className={`client-status is-${tone.tone}`}>{tone.label}</em>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="client-empty">No claims in this view.</p>
      )}
    </section>
  );
}

export function RevenueAssist({ actor, hint }: { actor: string; hint: string }) {
  const [draft, setDraft] = useState("");
  const navigate = useNavigate();
  const first = greetingName(actor);
  return (
    <section className="client-assist">
      <p>Hi, {first}</p>
      <h2>How can I help you?</h2>
      <div className="client-assist-grid">
        <Link to="/app/billing/queues">
          <i className="is-mint" />
          <span>Exceptions</span>
          <small>Work that is blocked until someone acts.</small>
        </Link>
        <Link to="/app/billing/denials">
          <i className="is-rose" />
          <span>Denials</span>
          <small>Money a payer refused.</small>
        </Link>
        <Link to="/app/billing/claims">
          <i className="is-amber" />
          <span>Claims</span>
          <small>Charges moving through the ledger.</small>
        </Link>
        <Link to="/app/billing/ar">
          <i className="is-pink" />
          <span>Receivables</span>
          <small>Balances still open by age.</small>
        </Link>
      </div>
      <form
        className="client-assist-ask"
        onSubmit={(event) => {
          event.preventDefault();
          const query = draft.trim();
          if (!query) return;
          navigate(`/app/billing/claims?q=${encodeURIComponent(query)}`);
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a claim, payer, or balance" aria-label="Ask about a claim" />
        <button type="submit" aria-label="Search claims">↑</button>
      </form>
      <p className="client-assist-hint">{hint}</p>
    </section>
  );
}
