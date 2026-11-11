import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addNote, crmCanWrite, useCrm } from "../../crm";
import { money } from "../../revenueCycle";
import { StageConditionCell } from "../../components/StageConditionCell";
import { useWorkflowStages } from "../../workflowStages";
import { AccountPersonCard, ClientAvatar, clientBudget } from "./clientStudio";
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
      <CrmShell studio title="Account" lede="This account is not in the current tenant.">
        <div className="crm-studio-title">
          <p className="lims-eyebrow">Sequence CRM</p>
          <h1>Account</h1>
        </div>
        <CrmEmpty title="Account not found." detail="It may belong to another laboratory database." />
      </CrmShell>
    );
  }

  const account = card.account;
  const contacts = account.contacts.length ? account.contacts : [{ name: account.contact, role: "Primary contact", email: "", phone: "" }];
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
  const facts = [
    { label: "From", value: account.billTo },
    { label: "Sector", value: account.industry },
    { label: "Budget", value: clientBudget(card) },
    { label: "Status", value: account.status },
    { label: "Health", value: card.health },
    { label: "A/R", value: money(card.arCents) },
  ];

  return (
    <CrmShell studio title={account.name} lede={`${account.number} · ${account.owner}`}>
      <div className="account-page">
        <div className="account-page-title">
          <p className="lims-eyebrow">Sequence CRM</p>
          <Link to="/app/connectivity/clients">Manage Accounts</Link>
        </div>

        <section className="client-card account-hero">
          <ClientAvatar name={account.name} size={72} />
          <div>
            <h1>{account.name}</h1>
            <small>{account.number} · {account.relationship} · {account.owner}</small>
            <em>{account.industry}</em>
          </div>
          <dl>
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="account-block">
          <h2>Contacts</h2>
          <div className="client-grid">
            {contacts.map((person) => (
              <AccountPersonCard
                key={`${account.id}-${person.name}-${person.email}`}
                name={person.name}
                role={person.role}
                accountName={account.name}
                facts={[
                  { label: "From", value: account.billTo },
                  { label: "Sector", value: account.industry },
                  { label: "Budget", value: clientBudget(card) },
                ]}
              />
            ))}
          </div>
        </section>

        <div className="account-page-grid">
          <section className="client-card account-panel">
            <h2>What needs to happen next</h2>
            <SignalList items={card.signals} />
          </section>
          <section className="client-card account-panel">
            <h2>Add more details</h2>
            {!canWrite ? <p className="billing-note">Read only. A client-success role is required to add notes.</p> : null}
            <p className="billing-note">
              Billing stays in <Link className="lims-linkish" to={`/app/billing?account=${account.id}`}>Sequence Revenue</Link>.
              {charges.length ? ` ${charges.length} charge line${charges.length === 1 ? "" : "s"} are on the ledger.` : ""}
            </p>
            <label className="rcm-field">
              Note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Pricing, sites, or the next conversation" />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canWrite}
              onClick={() => {
                addNote(account.id, note);
                setNote("");
              }}
            >
              Save note
            </button>
            {notes.map((item) => (
              <p key={item.id} className="billing-note">{item.at} · {item.actor}: {item.text}</p>
            ))}
          </section>
          <section className="client-card account-panel">
            <h2>Laboratory work</h2>
            <p className="billing-note">{tests.length ? tests.join(", ") : "No tests on file for this account yet."}</p>
            {work.length ? (
              <ul className="account-work">
                {work.slice(0, 8).map((sample) => (
                  <li key={sample.accessionId}>
                    <Link to={`/app/samples/${sample.accessionId}`}>{sample.accessionId}</Link>
                    <span>{sample.tests}</span>
                    <StageConditionCell status={sample.status} condition={sample.condition} stages={stages} />
                  </li>
                ))}
              </ul>
            ) : (
              <CrmEmpty title="No accessions." detail="New laboratory work for this name will appear here." />
            )}
          </section>
          <section className="client-card account-panel">
            <h2>Work around this account</h2>
            {issues.map((item) => (
              <p key={item.id} className="billing-note">
                {item.title} · {item.status}
                {item.claimId ? <> · <Link className="lims-linkish" to={`/app/billing/claims/${item.claimId}`}>{item.claimId}</Link></> : null}
              </p>
            ))}
            {tasks.map((item) => (
              <p key={item.id} className="billing-note">{item.title} · {item.owner} · {item.status}</p>
            ))}
            {opportunities.map((item) => (
              <p key={item.id} className="billing-note">{item.name} · {item.stage} · {item.amount}</p>
            ))}
            {documents.map((item) => (
              <p key={item.id} className="billing-note">{item.name} · {item.status}</p>
            ))}
            {!issues.length && !tasks.length && !opportunities.length && !documents.length ? <CrmEmpty title="Nothing else is open." /> : null}
          </section>
          <section className="client-card account-panel">
            <h2>What happened</h2>
            {timeline.length ? (
              <ul className="account-activity">
                {timeline.slice(0, 8).map((item) => (
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
          <section className="client-card account-panel">
            <h2>Record of changes</h2>
            {audit.length ? (
              <ul className="account-activity">
                {audit.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <b>{item.action}</b>
                    <span>{item.actor} · {item.before} → {item.after}</span>
                    <small>{item.at}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="billing-note">Account changes are kept here. Charge history stays in Sequence Revenue.</p>
            )}
          </section>
        </div>
      </div>
    </CrmShell>
  );
}
