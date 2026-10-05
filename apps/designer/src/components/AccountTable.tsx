import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CRM_ACCOUNTS, accountByName, type AccountHealth, type CrmAccount } from "../crmAccounts";
import { accountRevenueLabel, useRevenue } from "../revenueCycle";
import { useSamples } from "../samples";

export function accountPath(accountId: string): string {
  return `/app/connectivity?account=${accountId}`;
}

export function AccountLink({ name }: { name: string }) {
  const account = accountByName(name);
  if (!account) return <>{name}</>;
  return (
    <Link className="lims-linkish" to={accountPath(account.id)}>
      {account.name}
    </Link>
  );
}

function healthTone(health: AccountHealth): string {
  if (health === "At risk") return " danger";
  if (health === "Watch") return " warn";
  return " info";
}

export function AccountTable({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (account: CrmAccount) => void;
}) {
  const samples = useSamples();
  const ledger = useRevenue();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "On hold">("All");
  const openByName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sample of samples) {
      if (sample.status === "released") continue;
      counts.set(sample.client, (counts.get(sample.client) ?? 0) + 1);
    }
    return counts;
  }, [samples]);

  const rows = CRM_ACCOUNTS.filter((account) => {
    if (status !== "All" && account.status !== status) return false;
    const haystack = `${account.name} ${account.number} ${account.owner} ${account.industry}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="account-toolbar">
        <input
          type="search"
          value={query}
          placeholder="Search accounts, owners, industries"
          aria-label="Search accounts"
          onChange={(event) => setQuery(event.target.value)}
        />
        <select aria-label="Account status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option>All</option>
          <option>Active</option>
          <option>On hold</option>
        </select>
        <span>{rows.length} accounts</span>
      </div>
      <div className="lims-table-wrap">
        <table className="lims-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Number</th>
              <th>Owner</th>
              <th>Industry</th>
              <th>Open work</th>
              <th>Revenue</th>
              <th>Health</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => {
              const selected = account.id === selectedId;
              return (
                <tr
                  key={account.id}
                  className={selected ? "is-selected" : undefined}
                  onClick={onSelect ? () => onSelect(account) : undefined}
                >
                  <td>
                    {onSelect ? (
                      <button type="button" className="lims-linkish account-row-button" onClick={() => onSelect(account)}>
                        {account.name}
                      </button>
                    ) : (
                      <AccountLink name={account.name} />
                    )}
                  </td>
                  <td className="lims-mono">{account.number}</td>
                  <td>{account.owner}</td>
                  <td>{account.industry}</td>
                  <td>{openByName.get(account.name) ?? 0}</td>
                  <td>{accountRevenueLabel(ledger.charges, account.id)}</td>
                  <td>
                    <span className={`lims-badge${healthTone(account.health)}`}>{account.health}</span>
                  </td>
                  <td>
                    <span className={`lims-badge${account.status === "On hold" ? " warn" : " info"}`}>{account.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
