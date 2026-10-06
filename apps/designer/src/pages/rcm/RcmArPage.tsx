import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CRM_ACCOUNTS } from "../../crmAccounts";
import { FINANCIAL_LABEL, bucketFor, formatMoney, pageRows, rcmCanWrite, useRcm, type AgingBucket } from "../../rcm";
import { routeLabel, writeOffCharge } from "../../revenueCycle";
import { RcmEmpty, RcmShell } from "./RcmShell";

const BUCKETS: { id: AgingBucket | "all"; label: string }[] = [
  { id: "all", label: "All open" },
  { id: "current", label: "Current" },
  { id: "d1", label: "1–30" },
  { id: "d31", label: "31–60" },
  { id: "d61", label: "61–90" },
  { id: "d91", label: "91–120" },
  { id: "d120", label: "120+" },
];

export function RcmArPage() {
  const { claims, aging, metrics } = useRcm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const canWrite = rcmCanWrite();
  const bucket = (params.get("bucket") as AgingBucket | "all") || "all";
  const route = params.get("route") || "all";
  const payer = params.get("payer") || "all";
  const client = params.get("client") || "all";
  const page = Number(params.get("page") || "1");
  const open = useMemo(
    () => claims.filter((claim) => claim.balanceCents > 0 && claim.financial !== "unbilled"),
    [claims],
  );
  const payers = useMemo(() => [...new Set(open.map((claim) => claim.payerName))].sort(), [open]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return open.filter((claim) => {
      if (bucket !== "all" && bucketFor(claim.ageDays) !== bucket) return false;
      if (route !== "all" && claim.route !== route) return false;
      if (payer !== "all" && claim.payerName !== payer) return false;
      if (client !== "all" && claim.accountId !== client) return false;
      if (needle && !`${claim.id} ${claim.accountName} ${claim.accessionId} ${claim.payerName}`.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [open, bucket, route, payer, client, query]);
  const paged = pageRows(filtered, page);
  const totals = BUCKETS.filter((item) => item.id !== "all").map((item) => ({
    ...item,
    cents: aging[item.id as AgingBucket],
  }));

  function setFilter(key: string, value: string) {
    const copy = new URLSearchParams(params);
    if (value === "all") copy.delete(key);
    else copy.set(key, value);
    if (key !== "page") copy.delete("page");
    setParams(copy, { replace: true });
  }

  return (
    <RcmShell title="Accounts receivable" lede="Outstanding balances by aging, client, payer, and route. Large and aging balances are the work, not a static report.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Aging</h2>
          <strong>{formatMoney(metrics.ar)}</strong>
        </div>
        <div className="rcm-aging">
          {totals.map((item) => (
            <button
              key={item.id}
              type="button"
              className={bucket === item.id ? "is-on" : ""}
              onClick={() => setFilter("bucket", bucket === item.id ? "all" : item.id)}
            >
              <span>{item.label}</span>
              <strong>{formatMoney(item.cents)}</strong>
            </button>
          ))}
        </div>
        <p className="billing-note">
          {formatMoney(metrics.atRisk)} is at risk in 91+ and denied balances. Days in A/R: {metrics.daysInAr}.
        </p>
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{filtered.length} accounts</h2>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Claim, client, payer" aria-label="Search A/R" />
          </label>
          <label>
            Client
            <select value={client} onChange={(event) => setFilter("client", event.target.value)} aria-label="Filter by client">
              <option value="all">All clients</option>
              {CRM_ACCOUNTS.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payer
            <select value={payer} onChange={(event) => setFilter("payer", event.target.value)} aria-label="Filter by payer">
              <option value="all">All payers</option>
              {payers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Route
            <select value={route} onChange={(event) => setFilter("route", event.target.value)} aria-label="Filter by billing route">
              <option value="all">All routes</option>
              <option value="837P">Insurance</option>
              <option value="Invoice">Client invoice</option>
              <option value="Statement">Self-pay</option>
            </select>
          </label>
        </div>
        {paged.rows.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Client</th>
                  <th>Payer</th>
                  <th>Age</th>
                  <th>Financial</th>
                  <th>Balance</th>
                  <th>Next</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((claim) => {
                  const line = claim.lines.find((item) => item.status === "denied" || item.status === "submitted" || item.status === "partial");
                  return (
                    <tr key={claim.id}>
                      <td>
                        <Link className="lims-linkish" to={`/app/billing/claims/${encodeURIComponent(claim.id)}`}>
                          {claim.id}
                        </Link>
                      </td>
                      <td>{claim.accountName}</td>
                      <td>
                        {claim.payerName}
                        <small className="rcm-muted"> {routeLabel(claim.route)}</small>
                      </td>
                      <td>{claim.ageDays}d</td>
                      <td>{FINANCIAL_LABEL[claim.financial]}</td>
                      <td>{formatMoney(claim.balanceCents)}</td>
                      <td>{claim.nextAction}</td>
                      <td>
                        {line ? (
                          <button type="button" className="btn" disabled={!canWrite} onClick={() => writeOffCharge(line.id)}>
                            Write off
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="No outstanding balances in this view." detail="Clear filters or open claims still waiting to bill from work queues." />
        )}
        {paged.pages > 1 ? (
          <p className="billing-note">
            Page {paged.page} of {paged.pages}{" "}
            {paged.page < paged.pages ? (
              <button type="button" className="btn" onClick={() => setFilter("page", String(paged.page + 1))}>
                Next
              </button>
            ) : null}
          </p>
        ) : null}
      </section>
    </RcmShell>
  );
}
