import { Link, useSearchParams } from "react-router-dom";
import { PIPELINE_STAGES, useCrm } from "../../crm";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmOpportunitiesPage() {
  const { opportunities } = useCrm();
  const [params] = useSearchParams();
  const client = params.get("client") || "all";
  const rows = opportunities.filter((item) => client === "all" || item.accountId === client);

  return (
    <CrmShell title="Opportunities" lede="A simple laboratory pipeline: new tests, locations, integrations, and renewals. This is not a second Salesforce.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Pipeline</h2>
        </div>
        <div className="rcm-aging">
          {PIPELINE_STAGES.filter((stage) => stage !== "Won" && stage !== "Lost").map((stage) => (
            <div key={stage}>
              <span>{stage}</span>
              <strong>{rows.filter((item) => item.stage === stage).length}</strong>
            </div>
          ))}
        </div>
        {rows.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Next</th>
                  <th>Close</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <Link className="lims-linkish" to={`/app/connectivity/clients/${item.accountId}`}>
                        {item.accountName}
                      </Link>
                    </td>
                    <td>{item.stage}</td>
                    <td>{item.amount}</td>
                    <td>{item.nextAction}</td>
                    <td>{item.close}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CrmEmpty title="No opportunities in this view." />
        )}
      </section>
    </CrmShell>
  );
}
