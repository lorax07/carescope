import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addClientAccount, addClientContact, addNote, crmCanWrite, saveAccountWorkspace, useCrm } from "../../crm";
import { directoryContacts } from "../../crm/directory";
import { money } from "../../revenueCycle";
import { StageConditionCell } from "../../components/StageConditionCell";
import { useWorkflowStages } from "../../workflowStages";
import { crmHomePanel, crmSubtabPath, openCrmRecordTab, recordPath, rememberCrmHome, rememberCrmSubtab } from "../../crmRecordTabs";
import { ClientAvatar, clientBudget, initials } from "./clientStudio";
import { CrmDirectoryHeader } from "./CrmDirectoryHeader";
import { CrmImportPanel } from "./CrmImportPanel";
import { InboxChannelMark } from "./InboxChannelMark";
import { contactChannels } from "./inboxStudio";
import { AccountEditDialog } from "./AccountEditDialog";
import { CrmRecordStrip } from "./CrmRecordStrip";
import { CrmEmpty, CrmShell, SignalList } from "./CrmShell";
import { usePriorityPanel } from "../../priorityPanel";
import { TopPriorities } from "./TopPriorities";

function FeedIcon({ kind }: { kind: "activity" | "documents" | "notes" }) {
  const path = kind === "activity"
    ? "M4 12h3l2-5 2 10 2-5h3"
    : kind === "documents"
      ? "M6 3.5h5l3 3V16.5H6zM11 3.5V7h3.5"
      : "M5 5.5h10M5 9h10M5 12.5h6";
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function monthLabel(value: string): string {
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "Earlier";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function CrmClientDetailPage() {
  const pinned = usePriorityPanel().pinned;
  const { accountId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const crm = useCrm();
  const stages = useWorkflowStages();
  const card = crm.cards.find((item) => item.account.id === accountId);
  const [note, setNote] = useState("");
  const [feed, setFeed] = useState<"activity" | "documents" | "notes">("activity");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<"account" | "contact" | null>(null);
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", role: "", industry: "" });
  const [contactDraft, setContactDraft] = useState({ accountId: "", name: "", role: "", email: "", phone: "" });
  const [reach, setReach] = useState<string | null>(null);
  const canWrite = crmCanWrite();
  const contactKey = params.get("contact") || "";
  const directory = useMemo(() => directoryContacts(crm.overlay), [crm.overlay]);
  const people = directory.filter((contact) => contact.accountIds.includes(accountId));
  const focus = people.find((contact) => contact.id === contactKey);

  useEffect(() => {
    if (!card) return;
    if (focus) {
      openCrmRecordTab({ key: `contact:${focus.id}`, kind: "contact", accountId, contactId: focus.id, title: focus.name });
      rememberCrmHome("contacts");
      rememberCrmSubtab("contacts", `contact:${focus.id}`);
    } else {
      openCrmRecordTab({ key: `account:${accountId}`, kind: "account", accountId, title: card.account.name });
      rememberCrmHome("accounts");
      rememberCrmSubtab("accounts", `account:${accountId}`);
    }
  }, [accountId, card, focus]);

  useEffect(() => {
    if (!reach) return;
    function close(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".account-contact-chip")) setReach(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [reach]);

  const home = crmHomePanel();
  function chooseHome(next: "accounts" | "contacts") {
    navigate(crmSubtabPath(next));
  }

  if (!card) {
    return (
      <CrmShell studio priorities={false} title="Account" lede="This account is not in the current tenant.">
        <div className={`client-board${pinned ? " is-priorities-pinned" : ""}`}>
          <div className="client-overview-head">
            <CrmDirectoryHeader panel={home} onPanel={chooseHome} />
          </div>
          <div className="client-board-main">
            <CrmRecordStrip panel={home} />
            <CrmEmpty title="Account not found." detail="It may belong to another laboratory database." />
          </div>
          {pinned ? (
            <aside className="client-board-side">
              <TopPriorities />
            </aside>
          ) : null}
        </div>
      </CrmShell>
    );
  }

  const account = card.account;
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
    { label: "Sector", value: account.industry },
    { label: "Budget", value: clientBudget(card) },
    { label: "Status", value: account.status },
    { label: "Health", value: card.health },
    { label: "A/R", value: money(card.arCents) },
  ];
  const activity = [
    ...timeline.map((item) => ({ id: item.id, at: item.at, title: item.kind, detail: item.summary })),
    ...audit.map((item) => ({ id: item.id, at: item.at, title: item.actor, detail: `${item.action} · ${item.before} → ${item.after}` })),
    ...issues.map((item) => ({ id: item.id, at: "", title: "Issue", detail: `${item.title} · ${item.status}` })),
    ...tasks.map((item) => ({ id: item.id, at: item.due, title: "Case", detail: `${item.title} · ${item.owner} · ${item.status}` })),
    ...opportunities.map((item) => ({ id: item.id, at: item.close, title: "Opportunity", detail: `${item.name} · ${item.stage} · ${item.amount}` })),
  ];
  const months = activity.reduce<Map<string, typeof activity>>((groups, item) => {
    const label = monthLabel(item.at);
    groups.set(label, [...(groups.get(label) ?? []), item]);
    return groups;
  }, new Map());
  const activeKey = focus ? `contact:${focus.id}` : `account:${account.id}`;

  function openAccountRecord() {
    const tab = { key: `account:${account.id}`, kind: "account" as const, accountId: account.id, title: account.name };
    openCrmRecordTab(tab);
    navigate(recordPath(tab));
  }

  function openContact(contactId: string, title: string) {
    openCrmRecordTab({ key: `contact:${contactId}`, kind: "contact", accountId: account.id, contactId, title });
    navigate(`/app/connectivity/clients/${account.id}?contact=${encodeURIComponent(contactId)}`);
  }

  return (
    <CrmShell studio priorities={false} title={focus ? focus.name : account.name} lede={focus ? focus.role : `${account.number} · ${account.owner}`}>
      <div className={`client-board${pinned ? " is-priorities-pinned" : ""}`}>
        <div className="client-overview-head">
          <CrmDirectoryHeader
            panel={focus ? "contacts" : "accounts"}
            onPanel={chooseHome}
            action={canWrite ? (
              <button type="button" className="client-add" onClick={() => { setImporting(false); setAdding(focus ? "contact" : "account"); }}>
                {focus ? "Add new Contact" : "Add new Account"}
              </button>
            ) : null}
          />
        </div>
        <div className="account-page">
        <CrmRecordStrip activeKey={activeKey} panel={focus ? "contacts" : "accounts"} />

        {focus ? (
          <section className="client-card account-hero contact-record">
            {canWrite ? <button type="button" className="btn account-card-edit" onClick={() => setEditing(true)}>Edit</button> : null}
            <ClientAvatar name={focus.name} size={72} />
            <div>
              <h1>{focus.name}</h1>
              <small>{focus.role}</small>
              <em>{account.name}</em>
            </div>
            <dl>
              <div><dt>Email</dt><dd>{focus.email ? <a href={`mailto:${focus.email}`}>{focus.email}</a> : "—"}</dd></div>
              <div><dt>Phone</dt><dd>{focus.phone ? <a href={`tel:${focus.phone}`}>{focus.phone}</a> : "—"}</dd></div>
              <div><dt>Account</dt><dd><button type="button" className="crm-record-link" onClick={() => openAccountRecord()}>{account.name}</button></dd></div>
              <div><dt>Sector</dt><dd>{account.industry}</dd></div>
            </dl>
          </section>
        ) : (
        <section className="client-card account-hero">
          {canWrite ? <button type="button" className="btn account-card-edit" onClick={() => setEditing(true)}>Edit</button> : null}
          <span className="account-mark is-hero" aria-hidden="true">{initials(account.name)}</span>
          <div>
            <h1>{account.name}</h1>
            <small>{account.number} · {account.owner}</small>
            <em>{account.industry}</em>
          </div>
          <div className="account-card-contacts">
            <h2>Contacts</h2>
          <div className="account-contact-row">
            {people.map((person) => (
              <div key={person.id} className="account-contact-chip">
                <button type="button" aria-label={`Contact ${person.name}`} aria-expanded={reach === person.id} onClick={() => setReach((current) => current === person.id ? null : person.id)}>
                  <ClientAvatar name={person.name} size={36} />
                </button>
                <button type="button" className="account-contact-name" onClick={() => openContact(person.id, person.name)}>{person.name}</button>
                <span className="account-contact-channels">
                  {contactChannels(person.id, person.email, person.phone).map((mark) => (
                    <InboxChannelMark key={mark.channel} channel={mark.channel} reach={mark.reach} />
                  ))}
                </span>
                {reach === person.id ? (
                  <div className="account-contact-menu" role="menu">
                    {person.email ? <a href={`mailto:${person.email}`}>Email {person.email}</a> : <span>No email on file</span>}
                    {person.phone ? <a href={`tel:${person.phone}`}>Call {person.phone}</a> : <span>No phone on file</span>}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
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
        )}

        {focus ? null : <div className="account-page-grid">
          <section className="client-card account-panel">
            <h2>What needs to happen next</h2>
            <SignalList items={card.signals} />
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
            {charges.length ? <p className="billing-note">{charges.length} charge line{charges.length === 1 ? "" : "s"} stay in Sequence Revenue.</p> : null}
          </section>
        </div>}

        {focus ? null : <section className="client-card account-feed">
          <div className="account-feed-tabs subtab01" role="tablist" aria-label="Account record">
            {(["activity", "documents", "notes"] as const).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={feed === item} className={feed === item ? "is-on" : undefined} onClick={() => setFeed(item)}>
                <FeedIcon kind={item} />
                {item === "activity" ? "Activity" : item === "documents" ? "Documents" : "Notes"}
              </button>
            ))}
          </div>
          {feed === "activity" ? (
            <div className="account-feed-body">
              {[...months.entries()].map(([month, items]) => (
                <section key={month}>
                  <h3>{month}</h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <FeedIcon kind="activity" />
                        <b>{item.title}</b>
                        <span>{item.detail}</span>
                        <time>{item.at}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {!activity.length ? <CrmEmpty title="No activity yet." /> : null}
            </div>
          ) : null}
          {feed === "documents" ? (
            <div className="account-feed-body">
              {documents.length ? documents.map((item) => (
                <p key={item.id} className="account-feed-doc"><b>{item.name}</b><span>{item.kind} · {item.status}</span></p>
              )) : <CrmEmpty title="No documents on this account." />}
            </div>
          ) : null}
          {feed === "notes" ? (
            <div className="account-feed-body">
              {!canWrite ? <p className="billing-note">Read only. An account role is required to add notes.</p> : null}
              <label className="rcm-field">
                Note
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Pricing, sites, or the next conversation" />
              </label>
              <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => { addNote(account.id, note); setNote(""); }}>Save note</button>
              {notes.map((item) => <p key={item.id} className="account-feed-doc"><b>{item.actor}</b><span>{item.text}</span><time>{item.at}</time></p>)}
            </div>
          ) : null}
        </section>}
        </div>
        {pinned ? (
          <aside className="client-board-side">
            <TopPriorities />
          </aside>
        ) : null}
      </div>
      {editing ? (
        <AccountEditDialog
          account={{ id: account.id, name: account.name, industry: account.industry, owner: account.owner, relationship: account.relationship, status: account.status, billTo: account.billTo, payer: account.payer, pricing: account.pricing }}
          contacts={people}
          directory={directory}
          onClose={() => setEditing(false)}
          onSave={(nextAccount, nextContacts) => saveAccountWorkspace(account.id, nextAccount, nextContacts)}
        />
      ) : null}
      {adding ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setAdding(null)}>
          <form
            className={`lims-modal client-add-dialog${importing ? " is-import" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-client-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              if (importing) return;
              if (adding === "account") {
                const accountId = addClientAccount(draft);
                setDraft({ name: "", contact: "", role: "", industry: "" });
                setAdding(null);
                if (accountId) navigate(`/app/connectivity/clients/${accountId}`);
                return;
              }
              const accountId = addClientContact(contactDraft);
              setContactDraft({ accountId: "", name: "", role: "", email: "", phone: "" });
              setAdding(null);
              if (accountId) navigate(`/app/connectivity/clients/${accountId}`);
            }}
          >
            <div className="lims-dialog-bar">
              <h2 id="add-client-title">{importing ? (adding === "account" ? "Import accounts" : "Import contacts") : adding === "account" ? "Add new Account" : "Add new Contact"}</h2>
              <button type="button" className="btn" onClick={() => setAdding(null)}>Close</button>
            </div>
            {importing ? (
              <CrmImportPanel kind={adding === "account" ? "account" : "contact"} accounts={crm.accounts} onDone={(accountId) => { setAdding(null); setImporting(false); navigate(`/app/connectivity/clients/${accountId}`); }} />
            ) : adding === "account" ? (
              <>
                <label>Account name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
                <label>Primary contact<input value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} required /></label>
                <label>Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="Lab director" /></label>
                <label>Sector<input value={draft.industry} onChange={(event) => setDraft({ ...draft, industry: event.target.value })} placeholder="Pharmaceutical" /></label>
              </>
            ) : (
              <>
                <label>
                  Account
                  <select value={contactDraft.accountId} onChange={(event) => setContactDraft({ ...contactDraft, accountId: event.target.value })} required>
                    <option value="">Choose an account</option>
                    {crm.accounts.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>Name<input value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} required /></label>
                <label>Role<input value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Lab director" /></label>
                <label>Email<input type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="name@lab.example" /></label>
                <label>Phone<input value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="503-555-0100" /></label>
              </>
            )}
            {importing ? (
              <button type="button" className="btn" onClick={() => setImporting(false)}>Back to form</button>
            ) : (
              <div className="client-add-actions">
                <button type="button" className="btn" onClick={() => setImporting(true)}>Import</button>
                <button type="submit" className="btn btn-primary">{adding === "account" ? "Save account" : "Save contact"}</button>
              </div>
            )}
          </form>
        </div>
      ) : null}
    </CrmShell>
  );
}
