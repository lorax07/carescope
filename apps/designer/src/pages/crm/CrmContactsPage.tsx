import { useMemo, useState } from "react";
import { CONTACT_TYPE_LABEL, pageRows, useCrm, type ContactType } from "../../crm";
import { CrmEmpty, CrmShell } from "./CrmShell";
import { CrmAccountLink } from "./CrmRecordStrip";

export function CrmContactsPage() {
  const { contacts } = useCrm();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | ContactType>("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter((item) => {
      if (type !== "all" && item.contactType !== type) return false;
      if (!needle) return true;
      return `${item.name} ${item.email} ${item.phone} ${item.accountName} ${item.role}`.toLowerCase().includes(needle);
    });
  }, [contacts, query, type]);
  const paged = pageRows(filtered, page);

  return (
    <CrmShell title="Contacts" lede="People on Sequence CRM accounts. Roles come from the account record; they are not a second person database.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{filtered.length} contacts</h2>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone, account" aria-label="Search contacts" />
          </label>
          <label>
            Type
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as typeof type);
                setPage(1);
              }}
              aria-label="Filter by contact type"
            >
              <option value="all">All</option>
              {(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((key) => (
                <option key={key} value={key}>
                  {CONTACT_TYPE_LABEL[key]}
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
                  <th>Name</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <CrmAccountLink className="lims-linkish" accountId={item.accountId} contactId={item.id} title={item.name}>
                        {item.name}
                      </CrmAccountLink>
                      {item.primary ? <small className="rcm-muted"> Primary</small> : null}
                    </td>
                    <td>
                      <CrmAccountLink className="lims-linkish" accountId={item.accountId} title={item.accountName}>
                        {item.accountName}
                      </CrmAccountLink>
                    </td>
                    <td>{CONTACT_TYPE_LABEL[item.contactType]}</td>
                    <td>{item.email}</td>
                    <td className="lims-mono">{item.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No contacts match." />
        )}
      </section>
    </CrmShell>
  );
}
