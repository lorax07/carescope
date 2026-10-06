import { Link } from "react-router-dom";
import { AccountLink } from "../../components/AccountTable";
import { CRM_ACCOUNTS } from "../../crmAccounts";
import { formatMoney, rcmCanWrite, toggleRule, useRcm } from "../../rcm";
import {
  ICD10,
  PAYER_DIRECTORY,
  billingRoute,
  routeLabel,
  setContractPrice,
  setListPrice,
} from "../../revenueCycle";
import { RcmEmpty, RcmShell } from "./RcmShell";

export function RcmConfigPage() {
  const { cycle, overlay } = useRcm();
  const canWrite = rcmCanWrite();

  return (
    <RcmShell title="Billing configuration" lede="How Sequence prices tests, chooses a payer route, and evaluates billing rules before a claim can be submitted.">
      {!canWrite ? <p className="billing-note">Configuration is read only for this user.</p> : null}
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Payers and plans</h2>
          <Link to="/app/billing/capture">Charge capture workbench</Link>
        </div>
        <p className="billing-note">
          Payer, plan, and route come from the Sequence Client account. Insurance uses 837P, client billing uses an invoice, and self-pay uses a statement. Medicare, Medicaid, and commercial plans attach here without a second patient or payer database.
        </p>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Payer</th>
                <th>Payer ID</th>
                <th>Plan</th>
              </tr>
            </thead>
            <tbody>
              {PAYER_DIRECTORY.map((payer) => (
                <tr key={payer.payerId}>
                  <td>{payer.name}</td>
                  <td className="lims-mono">{payer.payerId}</td>
                  <td>{payer.plan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Bill to</th>
                <th>Payer</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              {CRM_ACCOUNTS.map((account) => {
                const billed = billingRoute(account);
                return (
                  <tr key={account.id}>
                    <td>
                      <AccountLink name={account.name} />
                    </td>
                    <td>{account.billTo}</td>
                    <td>
                      {billed.payerName} · {billed.payerId} · {billed.plan}
                    </td>
                    <td>{routeLabel(billed.route)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Fee schedule</h2>
          </div>
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>CPT</th>
                  <th>List</th>
                </tr>
              </thead>
              <tbody>
                {cycle.fees.map((fee) => (
                  <tr key={fee.test}>
                    <td>{fee.test}</td>
                    <td>
                      {fee.cpt}
                      <div className="rcm-muted">{fee.description}</div>
                    </td>
                    <td>
                      <input
                        aria-label={`List price for ${fee.test}`}
                        defaultValue={(fee.listCents / 100).toFixed(2)}
                        disabled={!canWrite}
                        onBlur={(event) => {
                          const cents = Math.round(Number(event.target.value) * 100);
                          if (Number.isFinite(cents) && cents >= 0) setListPrice(fee.test, cents);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Contracts</h2>
          </div>
          {cycle.contracts.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Agreement</th>
                    <th>Client</th>
                    <th>Test</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {cycle.contracts.map((line) => {
                    const account = CRM_ACCOUNTS.find((item) => item.id === line.accountId);
                    return (
                      <tr key={`${line.accountId}-${line.test}`}>
                        <td>{line.agreement}</td>
                        <td>{account?.name ?? line.accountId}</td>
                        <td>{line.test}</td>
                        <td>
                          <input
                            aria-label={`Contract price for ${line.test}`}
                            defaultValue={(line.cents / 100).toFixed(2)}
                            disabled={!canWrite}
                            onBlur={(event) => {
                              const cents = Math.round(Number(event.target.value) * 100);
                              if (Number.isFinite(cents) && cents >= 0) setContractPrice(line.accountId, line.test, cents);
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <RcmEmpty title="No contract prices." detail="Client-specific fees overlay the list schedule when an accession is captured." />
          )}
        </section>
      </div>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Billing rules</h2>
        </div>
        <p className="billing-note">
          Rules run through the Sequence workflow engine. The UI does not hard-code payer or diagnosis policy. Clearinghouse, eligibility, and 835 adapters stay behind the same RCM boundary.
        </p>
        {overlay.rules.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>When</th>
                  <th>Action</th>
                  <th>Queue</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overlay.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      {rule.name}
                      <div className="rcm-muted">{rule.message}</div>
                    </td>
                    <td>
                      {rule.field} {rule.operator} {rule.value || "—"}
                    </td>
                    <td>{rule.action.replace("_", " ")}</td>
                    <td>{rule.queueId ?? "—"}</td>
                    <td>
                      <button type="button" className="btn" disabled={!canWrite} onClick={() => toggleRule(rule.id, !rule.enabled)}>
                        {rule.enabled ? "On" : "Off"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="No billing rules." detail="Add a rule to prevent submit, require a field, or route work to a queue." />
        )}
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Coding reference</h2>
        </div>
        <p className="billing-note">
          CPT/HCPCS live on the fee schedule. ICD-10 values below are the current diagnosis catalog. Modifiers and units stay on the charge line so they can be extended without a second coding database.
        </p>
        <ul className="rcm-log">
          {ICD10.map((code) => (
            <li key={code.code}>
              {code.code} · {code.description}
            </li>
          ))}
        </ul>
        <p className="billing-note">List prices currently total {formatMoney(cycle.fees.reduce((sum, fee) => sum + fee.listCents, 0))} across {cycle.fees.length} tests.</p>
      </section>
    </RcmShell>
  );
}
