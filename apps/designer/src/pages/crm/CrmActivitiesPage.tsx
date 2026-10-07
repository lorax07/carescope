import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { pageRows, useCrm } from "../../crm";
import { CRM_ACCOUNTS } from "../../crmAccounts";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmActivitiesPage() {
  const crm = useCrm();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CRM_ACCOUNTS.flatMap((account) => crm.activitiesFor(account.id).map((item) => ({ ...item, accountName: account.name }))).filter((item) => {
      if (!needle) return true;
      return `${item.summary} ${item.kind} ${item.accountName}`.toLowerCase().includes(needle);
    });
  }, [crm, query]);
  const paged = pageRows(rows, 1);

  return (
    <CrmShell title="Activities" lede="One timeline of laboratory, billing, quality, and CRM events. Noise is capped so the scan stays useful.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{paged.rows.length} recent events</h2>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client, kind, summary" aria-label="Search activities" />
          </label>
        </div>
        {paged.rows.length ? (
          <ul className="account-activity">
            {paged.rows.map((item) => (
              <li key={item.id}>
                <b>{item.kind}</b>
                <span>
                  <Link className="lims-linkish" to={`/app/connectivity/clients/${item.accountId}`}>
                    {item.accountName}
                  </Link>
                  {" · "}
                  {item.summary}
                </span>
                <small>{item.at}</small>
              </li>
            ))}
          </ul>
        ) : (
          <CrmEmpty title="No activity matches." />
        )}
      </section>
    </CrmShell>
  );
}
