import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { pageRows, useCrm, type DerivedHealth } from "../../crm";
import { money } from "../../revenueCycle";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmClientsPage() {
  const { cards } = useCrm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const status = params.get("status") || "all";
  const health = params.get("health") || "all";
  const page = Number(params.get("page") || "1");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (status !== "all" && card.account.status !== status) return false;
      if (health !== "all" && card.health !== health) return false;
      if (!needle) return true;
      const hay = `${card.account.name} ${card.account.number} ${card.account.owner} ${card.account.industry} ${card.account.contact} ${card.account.contacts.map((item) => `${item.name} ${item.email} ${item.phone}`).join(" ")}`;
      return hay.toLowerCase().includes(needle);
    });
  }, [cards, query, status, health]);
  const paged = pageRows(filtered, page);

  function setFilter(key: string, value: string) {
    const copy = new URLSearchParams(params);
    if (value === "all") copy.delete(key);
    else copy.set(key, value);
    if (key !== "page") copy.delete("page");
    setParams(copy, { replace: true });
  }

  return (
    <CrmShell title="Clients" lede="Search the same Sequence Client accounts used in the laboratory and in Sequence Revenue. Health here is explained, not scored.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{filtered.length} clients</h2>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, contact, email, phone, owner" aria-label="Search clients" />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setFilter("status", event.target.value)} aria-label="Filter by client status">
              <option value="all">All</option>
              <option value="Active">Active</option>
              <option value="On hold">On hold</option>
            </select>
          </label>
          <label>
            Health
            <select value={health} onChange={(event) => setFilter("health", event.target.value)} aria-label="Filter by client health">
              <option value="all">All</option>
              {(["Healthy", "Watch", "At risk", "Critical"] as DerivedHealth[]).map((item) => (
                <option key={item} value={item}>
                  {item}
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
                  <th>Client</th>
                  <th>Owner</th>
                  <th>Health</th>
                  <th>Status</th>
                  <th>Open work</th>
                  <th>Issues</th>
                  <th>Tasks</th>
                  <th>A/R</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((card) => (
                  <tr key={card.account.id}>
                    <td>
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${card.account.id}`}>
                        {card.account.name}
                      </Link>
                      <small className="rcm-muted">
                        {" "}
                        {card.account.number} · {card.account.industry}
                      </small>
                    </td>
                    <td>{card.account.owner}</td>
                    <td>{card.health}</td>
                    <td>{card.account.status}</td>
                    <td>{card.openWork}</td>
                    <td>{card.openIssues}</td>
                    <td>{card.openTasks}</td>
                    <td>{money(card.arCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No clients match." detail="Clear the search or status filter." />
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
    </CrmShell>
  );
}
