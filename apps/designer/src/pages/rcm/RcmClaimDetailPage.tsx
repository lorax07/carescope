import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AccountLink } from "../../components/AccountTable";
import { FINANCIAL_LABEL, WORKFLOW_LABEL, fileAppeal, formatMoney, rcmCanWrite, recordManualPayment, recordNote, useRcm } from "../../rcm";
import {
  CHARGE_STATUS_LABEL,
  ICD10,
  denyCharge,
  rebillCharge,
  routeLabel,
  setDiagnosis,
  submitCharge,
  writeOffCharge,
} from "../../revenueCycle";
import { ExceptionList, RcmEmpty, RcmShell } from "./RcmShell";

export function RcmClaimDetailPage() {
  const { claimId = "" } = useParams();
  const id = decodeURIComponent(claimId);
  const rcm = useRcm();
  const claim = rcm.claims.find((item) => item.id === id);
  const [note, setNote] = useState("");
  const [pay, setPay] = useState("0.00");
  const notes = rcm.overlay.notes.filter((item) => item.claimId === id);
  const payments = rcm.overlay.payments.filter((item) => item.claimId === id);
  const denials = rcm.overlay.denials.filter((item) => item.claimId === id);
  const audit = rcm.overlay.audit.filter((item) => item.entityId === id || claim?.lineIds.includes(item.entityId));
  const canWrite = rcmCanWrite();

  if (!claim) {
    return (
      <RcmShell title="Claim" lede="This claim is not in the current tenant ledger.">
        <RcmEmpty title="Claim not found." detail="It may belong to another laboratory database, or charges have not been captured yet." />
      </RcmShell>
    );
  }

  const line = claim.lines.find((item) => item.status !== "rebilled") ?? claim.lines[0];

  return (
    <RcmShell
      title={claim.id}
      lede={`${claim.accountName} · ${claim.accessionId} · ${claim.nextAction}`}
      actions={
        <Link className="btn" to="/app/billing/claims">
          All claims
        </Link>
      }
    >
      <div className="rcm-status-row">
        <span>
          Workflow <b>{WORKFLOW_LABEL[claim.workflow]}</b>
        </span>
        <span>
          Financial <b>{FINANCIAL_LABEL[claim.financial]}</b>
        </span>
        <span>
          Record <b>{claim.recordStatus}</b>
        </span>
        <span>
          Balance <b>{formatMoney(claim.balanceCents)}</b>
        </span>
      </div>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>What is wrong</h2>
        </div>
        <ExceptionList items={claim.exceptions} />
      </section>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Claim</h2>
          </div>
          <dl className="account-facts">
            <div>
              <dt>Client</dt>
              <dd>
                <AccountLink name={claim.accountName} />
              </dd>
            </div>
            <div>
              <dt>Accession</dt>
              <dd>
                <Link className="lims-linkish" to={`/app/samples/${claim.accessionId}`}>
                  {claim.accessionId}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Order</dt>
              <dd>{claim.orderId}</dd>
            </div>
            <div>
              <dt>Payer</dt>
              <dd>
                {claim.payerName} · {claim.payerId} · {claim.plan}
              </dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{routeLabel(claim.route)}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{claim.owner}</dd>
            </div>
          </dl>
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Charge</th>
                  <th>Test</th>
                  <th>CPT</th>
                  <th>ICD-10</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {claim.lines.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.test}</td>
                    <td>{item.cpt}</td>
                    <td>{item.icd10 || "—"}</td>
                    <td>{formatMoney(item.amountCents)}</td>
                    <td>{CHARGE_STATUS_LABEL[item.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Take action</h2>
          </div>
          {!canWrite ? <p className="billing-note">Read only. A billing role is required to change this claim.</p> : null}
          {line && (line.status === "held" || line.status === "ready" || line.status === "denied") ? (
            <label className="rcm-field">
              Diagnosis
              <select
                aria-label="ICD-10"
                value={line.icd10}
                disabled={!canWrite}
                onChange={(event) => setDiagnosis(line.id, event.target.value)}
              >
                <option value="">Select ICD-10</option>
                {ICD10.map((code) => (
                  <option key={code.code} value={code.code}>
                    {code.code} {code.description}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="rcm-actions">
            {line?.status === "ready" ? (
              <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => submitCharge(line.id)}>
                Submit
              </button>
            ) : null}
            {line && (line.status === "submitted" || line.status === "partial") ? (
              <>
                <label>
                  Payment
                  <input aria-label="Payment amount" value={pay} onChange={(event) => setPay(event.target.value)} />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canWrite}
                  onClick={() => recordManualPayment(line.id, Math.round(Number(pay) * 100))}
                >
                  Post payment
                </button>
                <button type="button" className="btn" disabled={!canWrite} onClick={() => denyCharge(line.id, "CO-45")}>
                  Record denial
                </button>
              </>
            ) : null}
            {line?.status === "denied" ? (
              <>
                <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => rebillCharge(line.id)}>
                  Rebill
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!canWrite}
                  onClick={() => fileAppeal(denials[0]?.id ?? "", "Appeal from claim detail")}
                >
                  File appeal
                </button>
                <button type="button" className="btn" disabled={!canWrite} onClick={() => writeOffCharge(line.id)}>
                  Write off
                </button>
              </>
            ) : null}
          </div>
          <label className="rcm-field">
            Note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() => {
              recordNote(claim.id, note);
              setNote("");
            }}
          >
            Add note
          </button>
        </section>
      </div>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Payments and denials</h2>
          </div>
          {payments.length ? (
            <ul className="rcm-log">
              {payments.map((item) => (
                <li key={item.id}>
                  {item.at} · {formatMoney(item.cents)} · {item.method} · {item.postedBy}
                </li>
              ))}
            </ul>
          ) : (
            <p className="billing-note">No payments posted to this claim.</p>
          )}
          {denials.map((item) => (
            <p key={item.id} className="billing-note">
              {item.carc} / {item.rarc}: {item.reason}. Root cause: {item.rootCause || "Unassigned"}. Deadline {item.appealDeadline}.
            </p>
          ))}
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Audit</h2>
          </div>
          {notes.map((item) => (
            <p key={item.id} className="billing-note">
              {item.at} · {item.actor}: {item.text}
            </p>
          ))}
          {audit.length ? (
            <ul className="rcm-log">
              {audit.map((item) => (
                <li key={item.id}>
                  {item.at} · {item.actor} · {item.action} · {item.before} → {item.after}
                </li>
              ))}
            </ul>
          ) : (
            <p className="billing-note">Charge history stays on each line in Sequence Revenue.</p>
          )}
          {claim.lines.flatMap((item) =>
            item.events.map((event) => (
              <p key={`${item.id}-${event.at}-${event.text}`} className="billing-note">
                {event.at} · {item.id}: {event.text}
              </p>
            )),
          )}
        </section>
      </div>
    </RcmShell>
  );
}
