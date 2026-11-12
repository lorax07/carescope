import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter01 } from "../../components/Filter01";
import { filter01Match } from "../../filter01";
import { CRM_ACCOUNTS } from "../../crmAccounts";
import { FINANCIAL_LABEL, bucketFor, formatMoney, pageRows, rcmCanWrite, useRcm, type AgingBucket } from "../../rcm";
import { routeLabel, writeOffCharge } from "../../revenueCycle";
import { RcmEmpty, RcmShell } from "./RcmShell";

function unpack(value: string | null): string[] {
  if (!value || value === "all") return [];
  return value.split(",").flatMap((item) => {
    try {
      const decoded = decodeURIComponent(item);
      return decoded ? [decoded] : [];
    } catch {
      return item ? [item] : [];
    }
  });
}

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
  const buckets = unpack(params.get("bucket"));
  const routes = unpack(params.get("route"));
  const payersSelected = unpack(params.get("payer"));
  const clients = unpack(params.get("client"));
  const page = Number(params.get("page") || "1");
  const open = useMemo(
    () => claims.filter((claim) => claim.balanceCents > 0 && claim.financial !== "unbilled"),
    [claims],
  );
  const payers = useMemo(() => [...new Set(open.map((claim) => claim.payerName))].sort(), [open]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return open.filter((claim) => {
      if (buckets.length && !buckets.includes(bucketFor(claim.ageDays))) return false;
      if (routes.length && !routes.includes(claim.route)) return false;
      if (payersSelected.length && !payersSelected.includes(claim.payerName)) return false;
      if (clients.length && !clients.includes(claim.accountId)) return false;
      if (needle && !filter01Match(`${claim.id} ${claim.accountName} ${claim.accessionId} ${claim.payerName}`, needle)) {
        return false;
      }
      return true;
    });
  }, [open, buckets, routes, payersSelected, clients, query]);
  const paged = pageRows(filtered, page);
  const totals = BUCKETS.filter((item) => item.id !== "all").map((item) => ({
    ...item,
    cents: aging[item.id as AgingBucket],
  }));

  function chooseFilters(ids: string[]) {
    const copy = new URLSearchParams(params);
    const write = (key: string, prefix: string) => {
      const values = ids.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
      if (values.length) copy.set(key, values.map((item) => encodeURIComponent(item)).join(","));
      else copy.delete(key);
    };
    write("bucket", "aging:");
    write("client", "client:");
    write("payer", "payer:");
    write("route", "route:");
    copy.delete("page");
    setParams(copy, { replace: true });
  }

  const filterSelected = [
    ...buckets.map((id) => `aging:${id}`),
    ...clients.map((id) => `client:${id}`),
    ...payersSelected.map((name) => `payer:${name}`),
    ...routes.map((id) => `route:${id}`),
  ];

  return (
    <RcmShell studio title="Receivables" lede="Outstanding balances by aging, client, payer, and route.">
      <header className="client-board-head">
        <h1>Receivables</h1>
        <Link to="/app/billing/payments">Cash</Link>
        <Link to="/app/billing/denials">Denials</Link>
      </header>
      <section className="client-card">
        <header>
          <h2>Aging</h2>
          <strong>{formatMoney(metrics.ar)}</strong>
        </header>
        <Filter01
          label="Receivables"
          query={query}
          onQuery={setQuery}
          options={[
            ...totals.map((item) => ({ id: `aging:${item.id}`, label: `${item.label} · ${formatMoney(item.cents)}`, category: "Aging" })),
            ...CRM_ACCOUNTS.map((account) => ({ id: `client:${account.id}`, label: account.name, category: "Client" })),
            ...payers.map((name) => ({ id: `payer:${name}`, label: name, category: "Payer" })),
            { id: "route:837P", label: "Insurance", category: "Route" },
            { id: "route:Invoice", label: "Client invoice", category: "Route" },
            { id: "route:Statement", label: "Self-pay", category: "Route" },
          ]}
          selected={filterSelected}
          onChange={chooseFilters}
        />
        <p className="client-empty">
          {formatMoney(metrics.atRisk)} is at risk in 91+ and denied balances. Days in A/R: {metrics.daysInAr}.
        </p>
      </section>
      <section className="client-card client-projects is-scroll">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{filtered.length} accounts</h2>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Claim, client, payer" aria-label="Search A/R" />
          </label>
        </div>
        {paged.rows.length ? (
          <div className="client-table-wrap">
            <table className="client-table">
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
              <button type="button" className="btn" onClick={() => {
                const copy = new URLSearchParams(params);
                copy.set("page", String(paged.page + 1));
                setParams(copy, { replace: true });
              }}>
                Next
              </button>
            ) : null}
          </p>
        ) : null}
      </section>
    </RcmShell>
  );
}
