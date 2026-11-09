import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CONTACT_TYPE_LABEL, pageRows, useCrm, type ContactType } from "../../crm";
import { personName } from "../../crm/clientWorkflow";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmContactsPage() {
  const { contacts, patients, physicians, canWrite } = useCrm();
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
    <CrmShell title="Contacts" lede="Account contacts stay on the client record. Patients and ordering physicians are added through workflows.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head rcm-toolbar">
          <h2>{filtered.length} contacts</h2>
          {canWrite ? (
            <span className="client-board-links">
              <Link to="/app/connectivity/workflows?flow=patient">New patient</Link>
              <Link to="/app/connectivity/workflows?flow=physician">New physician</Link>
            </span>
          ) : null}
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone, client" aria-label="Search contacts" />
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
                  <th>Client</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      {item.primary ? <small className="rcm-muted"> Primary</small> : null}
                    </td>
                    <td>
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${item.accountId}`}>
                        {item.accountName}
                      </Link>
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
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Patients</h2>
        </div>
        {patients.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Account</th>
                  <th>MRN</th>
                  <th>Date of birth</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{personName(patient)}</td>
                    <td>
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${patient.accountId}`}>
                        {patient.accountName}
                      </Link>
                    </td>
                    <td className="lims-mono">{patient.mrn}</td>
                    <td className="lims-mono">{patient.dob}</td>
                    <td className="lims-mono">{patient.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No patients yet." detail="Register one from Workflows." />
        )}
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Ordering physicians</h2>
        </div>
        {physicians.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Account</th>
                  <th>NPI</th>
                  <th>Specialty</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {physicians.map((physician) => (
                  <tr key={physician.id}>
                    <td>{personName(physician)}</td>
                    <td>
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${physician.accountId}`}>
                        {physician.accountName}
                      </Link>
                    </td>
                    <td className="lims-mono">{physician.npi}</td>
                    <td>{physician.specialty}</td>
                    <td className="lims-mono">{physician.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No ordering physicians yet." detail="Add one from Workflows." />
        )}
      </section>
    </CrmShell>
  );
}
