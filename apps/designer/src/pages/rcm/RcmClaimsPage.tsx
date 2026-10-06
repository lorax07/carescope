import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FINANCIAL_LABEL, WORKFLOW_LABEL, formatMoney, pageRows, useRcm, type ClaimFinancial, type ClaimWorkflow } from "../../rcm";
import { routeLabel } from "../../revenueCycle";
import { RcmEmpty, RcmShell } from "./RcmShell";

export function RcmClaimsPage() {
  const { claims } = useRcm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const workflow = params.get("workflow") || "all";
  const page = Number(params.get("page") || "1");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return claims
      .filter((claim) => {
        if (workflow !== "all" && claim.workflow !== workflow) return false;
        if (!needle) return true;
        return `${claim.id} ${claim.accountName} ${claim.accessionId} ${claim.payerName}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        if (a.recordStatus !== b.recordStatus) return a.recordStatus === "open" ? -1 : 1;
        if (Boolean(a.exceptions.length) !== Boolean(b.exceptions.length)) return a.exceptions.length ? -1 : 1;
        return b.balanceCents - a.balanceCents || a.id.localeCompare(b.id);
      });
  }, [claims, query, workflow]);
  const paged = pageRows(filtered, page);

  function setWorkflow(next: string) {
    const copy = new URLSearchParams(params);
    if (next === "all") copy.delete("workflow");
    else copy.set("workflow", next);
    copy.delete("page");
    setParams(copy, { replace: true });
  }

  return (
    <RcmShell title="Claims" lede="Every claim moving through capture, scrubbing, submission, payment, and denial. Workflow, financial status, and record status stay separate.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{filtered.length} claims</h2>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Claim, account, accession, payer" aria-label="Search claims" />
          </label>
          <label>
            Workflow
            <select value={workflow} onChange={(event) => setWorkflow(event.target.value)} aria-label="Filter by workflow">
              <option value="all">All</option>
              {(Object.keys(WORKFLOW_LABEL) as ClaimWorkflow[]).map((key) => (
                <option key={key} value={key}>
                  {WORKFLOW_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {paged.rows.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Account</th>
                  <th>Accession</th>
                  <th>Payer</th>
                  <th>Workflow</th>
                  <th>Financial</th>
                  <th>Balance</th>
                  <th>Next</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <Link className="lims-linkish" to={`/app/billing/claims/${encodeURIComponent(claim.id)}`}>
                        {claim.id}
                      </Link>
                    </td>
                    <td>{claim.accountName}</td>
                    <td>{claim.accessionId}</td>
                    <td>
                      {claim.payerName}
                      <small className="rcm-muted"> {routeLabel(claim.route)}</small>
                    </td>
                    <td>{WORKFLOW_LABEL[claim.workflow]}</td>
                    <td>{FINANCIAL_LABEL[claim.financial as ClaimFinancial]}</td>
                    <td>{formatMoney(claim.balanceCents)}</td>
                    <td>{claim.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="No claims match." detail="Clear the search or capture charges from the work queues." />
        )}
        {paged.pages > 1 ? (
          <p className="billing-note">
            Page {paged.page} of {paged.pages}{" "}
            {paged.page < paged.pages ? (
              <button type="button" className="btn" onClick={() => setParams({ ...Object.fromEntries(params), page: String(paged.page + 1) }, { replace: true })}>
                Next
              </button>
            ) : null}
          </p>
        ) : null}
      </section>
    </RcmShell>
  );
}
