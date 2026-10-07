import { useState } from "react";
import { Link } from "react-router-dom";
import { crmCanWrite, logCommunication, useCrm, type CommunicationKind } from "../../crm";
import { CRM_ACCOUNTS } from "../../crmAccounts";
import { CrmEmpty, CrmShell } from "./CrmShell";

export function CrmCommunicationsPage() {
  const { overlay, contacts } = useCrm();
  const canWrite = crmCanWrite();
  const [accountId, setAccountId] = useState(CRM_ACCOUNTS[0]?.id ?? "");
  const [kind, setKind] = useState<CommunicationKind>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const people = contacts.filter((item) => item.accountId === accountId);

  return (
    <CrmShell title="Communications" lede="Calls, meetings, email records, and notes. The log is local to Sequence; an adapter boundary is ready if a mailbox is connected later.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Log a conversation</h2>
        </div>
        {!canWrite ? <p className="billing-note">Read only for this user.</p> : null}
        <div className="lims-panel-head rcm-toolbar">
          <label>
            Client
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Client">
              {CRM_ACCOUNTS.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kind
            <select value={kind} onChange={(event) => setKind(event.target.value as CommunicationKind)} aria-label="Communication kind">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
          </label>
        </div>
        <label className="rcm-field">
          Subject
          <input value={subject} onChange={(event) => setSubject(event.target.value)} />
        </label>
        <label className="rcm-field">
          Detail
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} />
        </label>
        <div className="rcm-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canWrite}
            onClick={() => {
              logCommunication({ accountId, contactId: people[0]?.id ?? "", kind, subject, body });
              setSubject("");
              setBody("");
            }}
          >
            Save
          </button>
        </div>
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Recorded communications</h2>
        </div>
        {overlay.communications.length ? (
          <ul className="account-activity">
            {overlay.communications.map((item) => {
              const account = CRM_ACCOUNTS.find((row) => row.id === item.accountId);
              return (
                <li key={item.id}>
                  <b>{item.kind}</b>
                  <span>
                    <Link className="lims-linkish" to={`/app/connectivity/clients/${item.accountId}`}>
                      {account?.name ?? item.accountId}
                    </Link>
                    {" · "}
                    {item.subject}
                    {item.body ? ` — ${item.body}` : ""}
                  </span>
                  <small>
                    {item.at} · {item.actor}
                  </small>
                </li>
              );
            })}
          </ul>
        ) : (
          <CrmEmpty title="No conversations logged." detail="Save a call or note from this page. Mail sync is not wired to a vendor." />
        )}
      </section>
    </CrmShell>
  );
}
