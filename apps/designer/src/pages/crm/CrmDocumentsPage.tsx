import { Link } from "react-router-dom";
import { useCrm } from "../../crm";
import { CRM_ACCOUNTS } from "../../crmAccounts";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmDocumentsPage() {
  const crm = useCrm();
  const rows = CRM_ACCOUNTS.flatMap((account) => crm.documentsFor(account.id).map((item) => ({ ...item, accountName: account.name })));

  return (
    <CrmShell title="Documents" lede="Agreements already on the Sequence Client account. This is not a document-management product; files stay referenced, not copied.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Agreements and files</h2>
        </div>
        {rows.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Client</th>
                  <th>Kind</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={`${item.accountId}-${item.id}`}>
                    <td>{item.name}</td>
                    <td>
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${item.accountId}`}>
                        {item.accountName}
                      </Link>
                    </td>
                    <td>{item.kind}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No documents on file." />
        )}
      </section>
    </CrmShell>
  );
}
