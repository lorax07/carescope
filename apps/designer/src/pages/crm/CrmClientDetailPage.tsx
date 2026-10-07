import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addNote, crmCanWrite, useCrm } from "../../crm";
import { CONTACT_TYPE_LABEL } from "../../crm/types";
import { money } from "../../revenueCycle";
import { StageConditionCell } from "../../components/StageConditionCell";
import { useWorkflowStages } from "../../workflowStages";
import { CrmEmpty, CrmShell, SignalList } from "./CrmShell";

export function CrmClientDetailPage() {
  const { accountId = "" } = useParams();
  const crm = useCrm();
  const stages = useWorkflowStages();
  const card = crm.cards.find((item) => item.account.id === accountId);
  const [note, setNote] = useState("");
  const canWrite = crmCanWrite();

  if (!card) {
    return (
      <CrmShell title="Client" lede="This account is not in the current tenant.">
        <CrmEmpty title="Client not found." detail="It may belong to another laboratory database." />
      </CrmShell>
    );
  }

  const account = card.account;
  const contacts = crm.contacts.filter((item) => item.accountId === account.id);
  const work = crm.samples.filter((sample) => sample.client === account.name);
  const charges = crm.charges.filter((charge) => charge.accountId === account.id && charge.status !== "rebilled");
  const issues = crm.overlay.issues.filter((item) => item.accountId === account.id);
  const tasks = crm.overlay.tasks.filter((item) => item.accountId === account.id);
  const notes = crm.overlay.notes.filter((item) => item.accountId === account.id);
  const audit = crm.overlay.audit.filter((item) => item.entityId === account.id || issues.some((issue) => issue.id === item.entityId) || tasks.some((task) => task.id === item.entityId));
  const opportunities = crm.opportunities.filter((item) => item.accountId === account.id);
  const documents = crm.documentsFor(account.id);
  const timeline = crm.activitiesFor(account.id);
  const tests = [...new Set(work.flatMap((sample) => sample.tests.split(",").map((item) => item.trim()).filter(Boolean)))];

  return (
    <CrmShell
      title={account.name}
      lede={`${account.number} · ${account.owner} · ${card.health}. ${card.signals[0]?.action ?? "No exception on this account."}`}
      actions={
        <Link className="btn" to="/app/connectivity/clients">
          All clients
        </Link>
      }
    >
      <div className="rcm-status-row">
        <span>
          Client status <b>{account.status}</b>
        </span>
        <span>
          Health <b>{card.health}</b>
        </span>
        <span>
          Relationship <b>{account.relationship}</b>
        </span>
        <span>
          A/R <b>{money(card.arCents)}</b>
        </span>
      </div>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>What needs to happen next</h2>
        </div>
        <SignalList items={card.signals} />
      </section>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Who they are</h2>
          </div>
          <dl className="account-facts">
            <div>
              <dt>Industry</dt>
              <dd>{account.industry}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{account.owner}</dd>
            </div>
            <div>
              <dt>Bill to</dt>
              <dd>{account.billTo}</dd>
            </div>
            <div>
              <dt>Payer</dt>
              <dd>{account.payer}</dd>
            </div>
            <div>
              <dt>Pricing</dt>
              <dd>{account.pricing}</dd>
            </div>
            <div>
              <dt>Collected</dt>
              <dd>{money(card.collectedCents)}</dd>
            </div>
          </dl>
          <h3>Contacts</h3>
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      {item.primary ? <small className="rcm-muted"> Primary</small> : null}
                    </td>
                    <td>{CONTACT_TYPE_LABEL[item.contactType]}</td>
                    <td>{item.email}</td>
                    <td className="lims-mono">{item.phone}</td>
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
          {!canWrite ? <p className="billing-note">Read only. A client-success role is required to add notes.</p> : null}
          <p className="billing-note">
            Billing is in{" "}
            <Link className="lims-linkish" to={`/app/billing?account=${account.id}`}>
              Sequence Revenue
            </Link>
            . Laboratory work stays on the accession.
          </p>
          <label className="rcm-field">
            Note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() => {
              addNote(account.id, note);
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
            <h2>What they use</h2>
          </div>
          <p className="billing-note">{tests.length ? tests.join(", ") : "No tests on file for this account yet."}</p>
          {work.length ? (
            <div className="lims-table-wrap">
              <table className="lims-table">
                <thead>
                  <tr>
                    <th>Accession</th>
                    <th>Tests</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {work.slice(0, 8).map((sample) => (
                    <tr key={sample.accessionId}>
                      <td>
                        <Link className="lims-linkish" to={`/app/samples/${sample.accessionId}`}>
                          {sample.accessionId}
                        </Link>
                      </td>
                      <td>{sample.tests}</td>
                      <td className="is-stage">
                        <StageConditionCell status={sample.status} condition={sample.condition} stages={stages} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CrmEmpty title="No accessions." detail="New laboratory work for this name will appear here." />
          )}
          {charges.length ? (
            <p className="billing-note">
              {charges.length} charge line{charges.length === 1 ? "" : "s"} on the revenue ledger.
            </p>
          ) : null}
        </section>
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>Issues, tasks, opportunities</h2>
          </div>
          {issues.map((item) => (
            <p key={item.id} className="billing-note">
              {item.id}: {item.title} · {item.status}
              {item.claimId ? (
                <>
                  {" "}
                  ·{" "}
                  <Link className="lims-linkish" to={`/app/billing/claims/${item.claimId}`}>
                    {item.claimId}
                  </Link>
                </>
              ) : null}
            </p>
          ))}
          {tasks.map((item) => (
            <p key={item.id} className="billing-note">
              Task {item.id}: {item.title} · {item.owner} · {item.status}
            </p>
          ))}
          {opportunities.map((item) => (
            <p key={item.id} className="billing-note">
              {item.name} · {item.stage} · {item.amount} · {item.nextAction}
            </p>
          ))}
          {documents.map((item) => (
            <p key={item.id} className="billing-note">
              {item.name} · {item.status}
            </p>
          ))}
        </section>
      </div>
      <div className="rcm-split">
        <section className="lims-panel billing-panel">
          <div className="lims-panel-head">
            <h2>What happened</h2>
          </div>
          {timeline.length ? (
            <ul className="account-activity">
              {timeline.slice(0, 12).map((item) => (
                <li key={item.id}>
                  <b>{item.kind}</b>
                  <span>{item.summary}</span>
                  <small>{item.at}</small>
                </li>
              ))}
            </ul>
          ) : (
            <CrmEmpty title="No activity yet." />
          )}
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
            <p className="billing-note">Client changes are written to the CRM overlay. Charge history stays in Sequence Revenue.</p>
          )}
        </section>
      </div>
    </CrmShell>
  );
}
