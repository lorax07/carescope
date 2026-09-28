import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AccountTable } from "../components/AccountTable";
import { accountById, accountOpportunities, CRM_ACCOUNTS, type CrmAccount } from "../crmAccounts";
import { accountRevenueLabel, useRevenue } from "../revenueCycle";
import { STATUS_LABEL, useSamples } from "../samples";

export function SequenceClientPage() {
  const samples = useSamples();
  const ledger = useRevenue();
  const [params, setParams] = useSearchParams();
  const selected = accountById(params.get("account") ?? "") ?? CRM_ACCOUNTS[0];
  const work = useMemo(
    () => samples.filter((sample) => sample.client === selected.name),
    [samples, selected.name],
  );
  const pipeline = accountOpportunities();
  const atRisk = CRM_ACCOUNTS.filter((account) => account.health === "At risk").length;

  function selectAccount(account: CrmAccount) {
    const next = new URLSearchParams(params);
    next.set("account", account.id);
    setParams(next, { replace: true });
  }

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Clients</p>
          <h1>Sequence Client</h1>
          <p className="lims-page-lede">
            Accounts, contacts, agreements, pipeline, and laboratory work live on one record. The same account table is used in Sequence Revenue and on sample work.
          </p>
        </div>
      </div>

      <div className="lims-kpi-row">
        <div className="lims-kpi">
          <span>Accounts</span>
          <strong>{CRM_ACCOUNTS.length}</strong>
          <small>Shared across the app</small>
        </div>
        <div className="lims-kpi">
          <span>Pipeline</span>
          <strong>{pipeline.length}</strong>
          <small>Open opportunities</small>
        </div>
        <div className="lims-kpi accent">
          <span>At risk</span>
          <strong>{atRisk}</strong>
          <small>Need an owner follow-up</small>
        </div>
        <div className="lims-kpi">
          <span>Open lab work</span>
          <strong>{samples.filter((sample) => sample.status !== "released").length}</strong>
          <small>Accessions still in the laboratory</small>
        </div>
      </div>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Accounts</h2>
        </div>
        <AccountTable selectedId={selected.id} onSelect={selectAccount} />
      </section>

      <div className="client-record-grid">
        <section className="lims-panel">
          <div className="lims-panel-head">
            <h2>{selected.name}</h2>
            <span className="lims-mono">{selected.number}</span>
          </div>
          <dl className="account-facts">
            <div>
              <dt>Owner</dt>
              <dd>{selected.owner}</dd>
            </div>
            <div>
              <dt>Industry</dt>
              <dd>{selected.industry}</dd>
            </div>
            <div>
              <dt>Bill to</dt>
              <dd>{selected.billTo}</dd>
            </div>
            <div>
              <dt>Payer</dt>
              <dd>{selected.payer}</dd>
            </div>
            <div>
              <dt>Pricing</dt>
              <dd>{selected.pricing}</dd>
            </div>
            <div>
              <dt>Revenue</dt>
              <dd>{accountRevenueLabel(ledger.charges, selected.id)}</dd>
            </div>
          </dl>

          <h3>Contacts</h3>
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {selected.contacts.map((contact) => (
                  <tr key={contact.email}>
                    <td>{contact.name}</td>
                    <td>{contact.role}</td>
                    <td>{contact.email}</td>
                    <td className="lims-mono">{contact.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Laboratory work</h3>
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Accession</th>
                  <th>Tests</th>
                  <th>Status</th>
                  <th>Site</th>
                </tr>
              </thead>
              <tbody>
                {work.map((sample) => (
                  <tr key={sample.accessionId}>
                    <td className="lims-mono">{sample.accessionId}</td>
                    <td>{sample.tests}</td>
                    <td>{STATUS_LABEL[sample.status]}</td>
                    <td>{sample.site}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Activity</h3>
          <ul className="account-activity">
            {selected.activities.map((item) => (
              <li key={`${item.when}-${item.summary}`}>
                <b>{item.kind}</b>
                <span>{item.summary}</span>
                <small>{item.when}</small>
              </li>
            ))}
          </ul>
        </section>

        <div className="client-side">
          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Pipeline</h2>
            </div>
            <ul className="account-activity">
              {pipeline.map((item) => {
                const account = accountById(item.accountId);
                return (
                  <li key={item.id}>
                    <b>{item.name}</b>
                    <span>
                      {account?.name} · {item.stage} · {item.amount}
                    </span>
                    <small>Close {item.close}</small>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="lims-panel billing-panel">
            <div className="lims-panel-head">
              <h2>Agreements</h2>
            </div>
            <ul className="account-activity">
              {selected.agreements.map((agreement) => (
                <li key={agreement.id}>
                  <b>
                    {agreement.id} · {agreement.name}
                  </b>
                  <span>
                    {agreement.term} · {agreement.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="billing-note">
              Pricing and claims for this account are in{" "}
              <Link className="lims-linkish" to={`/app/billing?account=${selected.id}`}>
                Sequence Revenue
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
