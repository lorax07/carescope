import { Link, useSearchParams } from "react-router-dom";
import { crmCanWrite, ISSUE_CATEGORY_LABEL, resolveIssue, setIssueStatus, useCrm } from "../../crm";
import { accountById, accountByName } from "../../crmAccounts";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmIssuesPage() {
  const { overlay, deviations, samples } = useCrm();
  const [params] = useSearchParams();
  const canWrite = crmCanWrite();
  const focus = params.get("issue");
  const qualityRows = deviations
    .map((item) => {
      const sample = samples.find((row) => row.accessionId === item.accessionId);
      return { ...item, client: sample?.client ?? "" };
    })
    .filter((item) => item.client);

  return (
    <CrmShell title="Service issues" lede="Client problems that need a person. Quality deviations stay in Sequence Compliance; they appear here by accession so the client record is complete.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>CRM issues</h2>
        </div>
        {overlay.issues.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Client</th>
                  <th>Category</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overlay.issues.map((item) => {
                  const account = accountById(item.accountId);
                  return (
                    <tr key={item.id} className={focus === item.id ? "is-selected" : undefined}>
                      <td>
                        {item.title}
                        <div className="rcm-muted">
                          {item.description}
                          {item.claimId ? ` · ${item.claimId}` : ""}
                          {item.accessionId ? ` · ${item.accessionId}` : ""}
                        </div>
                      </td>
                      <td>
                        {account ? (
                          <Link className="lims-linkish" to={`/app/connectivity/clients/${account.id}`}>
                            {account.name}
                          </Link>
                        ) : (
                          item.accountId
                        )}
                      </td>
                      <td>{ISSUE_CATEGORY_LABEL[item.category]}</td>
                      <td>{item.owner}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.status !== "resolved" ? (
                          <>
                            <button type="button" className="btn" disabled={!canWrite} onClick={() => setIssueStatus(item.id, "in_progress")}>
                              Start
                            </button>
                            <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => resolveIssue(item.id, "Closed from the service queue")}>
                              Resolve
                            </button>
                          </>
                        ) : (
                          item.resolution
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No CRM issues." />
        )}
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Linked quality records</h2>
          <Link to="/app/quality">Sequence Compliance</Link>
        </div>
        {qualityRows.length ? (
          <ul className="account-activity">
            {qualityRows.map((item) => {
              const account = accountByName(item.client);
              return (
                <li key={item.id}>
                  <b>{item.id}</b>
                  <span>
                    {account ? (
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${account.id}`}>
                        {item.client}
                      </Link>
                    ) : (
                      item.client
                    )}
                    {" · "}
                    {item.title} · {item.status}
                  </span>
                  <small>{item.accessionId}</small>
                </li>
              );
            })}
          </ul>
        ) : (
          <CrmEmpty title="No quality records on a client accession." />
        )}
      </section>
    </CrmShell>
  );
}
