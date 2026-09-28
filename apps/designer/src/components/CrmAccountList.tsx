import { CRM_ACCOUNTS } from "../crmAccounts";

export function CrmAccountList() {
  return (
    <div className="lims-table-wrap">
      <table className="lims-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Account number</th>
            <th>Relationship</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {CRM_ACCOUNTS.map((account) => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td className="lims-mono">{account.number}</td>
              <td>{account.relationship}</td>
              <td>{account.contact}</td>
              <td>
                <span className={`lims-badge${account.status === "On hold" ? " warn" : " info"}`}>{account.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
