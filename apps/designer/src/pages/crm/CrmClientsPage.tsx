import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buttonFormat1 } from "../../buttonFormat1";
import { Wildcard01 } from "../../components/Wildcard01";
import { addClientAccount, addClientContact, useCrm, type ClientCard } from "../../crm";
import { contactsOnAccount } from "../../crm/directory";
import { openCrmRecordTab, recordPath, rememberCrmHome } from "../../crmRecordTabs";
import { wildcard01Match } from "../../wildcard01";
import { AccountCompanyCard, AccountPersonCard, SourceBars, clientBudget } from "./clientStudio";
import { CrmDirectoryHeader } from "./CrmDirectoryHeader";
import { TopPriorities } from "./TopPriorities";
import { CrmEmpty, CrmShell } from "./CrmShell";
import { CrmImportPanel } from "./CrmImportPanel";
import { CrmRecordStrip } from "./CrmRecordStrip";

const FILTERS = [
  { id: "watch", label: "Watch" },
  { id: "hold", label: "On hold" },
] as const;

function accountText(card: ClientCard): string {
  const account = card.account;
  const people = account.contacts.map((person) => `${person.name} ${person.role} ${person.email} ${person.phone}`).join(" ");
  return [account.name, account.number, account.contact, account.industry, account.owner, account.billTo, account.relationship, people].join(" ");
}

function matchesFilter(card: ClientCard, filter: string): boolean {
  if (filter === "watch") return card.health === "Watch" || card.health === "At risk" || card.health === "Critical";
  if (filter === "hold") return card.account.status === "On hold";
  return true;
}

export function CrmClientsPage() {
  const { cards, canWrite, accounts, overlay } = useCrm();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [wildcard, setWildcard] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", role: "", industry: "" });
  const [contactDraft, setContactDraft] = useState({ accountId: "", name: "", role: "", email: "", phone: "" });
  const [saved, setSaved] = useState<string[]>([]);
  const panel = params.get("panel") === "contacts" ? "contacts" : "accounts";
  const filter = params.get("view") || (params.get("status") === "On hold" ? "hold" : params.get("health") === "At risk" || params.get("health") === "Critical" ? "watch" : "all");
  const filtered = useMemo(() => {
    return cards.filter((card) => {
      if (filter === "custom") return wildcard01Match(accountText(card), wildcard);
      return matchesFilter(card, filter);
    });
  }, [cards, filter, wildcard]);
  const contactRows = useMemo(() => {
    return cards.flatMap((card) => {
      if (filter !== "custom" && !matchesFilter(card, filter)) return [];
      return contactsOnAccount(card.account.id, overlay)
        .filter((person) => filter !== "custom" || wildcard01Match(`${person.name} ${person.role} ${person.email} ${person.phone} ${card.account.name}`, wildcard))
        .map((person) => ({ card, person }));
    });
  }, [cards, filter, overlay, wildcard]);

  useEffect(() => {
    const incoming = params.get("q");
    if (!incoming) return;
    setWildcard(incoming);
    const copy = new URLSearchParams(params);
    copy.delete("q");
    copy.set("view", "custom");
    setParams(copy, { replace: true });
  }, [params, setParams]);

  const signed = accounts.reduce((sum, account) => sum + account.agreements.filter((item) => item.status === "Active").length, 0);
  const negotiating = accounts.reduce((sum, account) => sum + account.opportunities.filter((item) => item.stage === "Negotiation" || item.stage === "Proposal").length, 0);
  const sources = ["Client", "Insurance", "Self-pay"].map((label, index) => ({
    label: label === "Client" ? "Account" : label,
    count: accounts.filter((account) => account.billTo === label).length,
    tone: ["is-rose", "is-mint", "is-lilac"][index] ?? "is-mint",
  }));
  const quiet = [...sources].sort((a, b) => a.count - b.count)[0];

  function setFilter(next: string) {
    const copy = new URLSearchParams(params);
    if (next === "all") {
      copy.delete("view");
      setWildcard("");
    } else copy.set("view", next);
    copy.delete("status");
    copy.delete("health");
    copy.delete("page");
    copy.delete("q");
    setParams(copy, { replace: true });
  }

  function setPanel(next: "accounts" | "contacts") {
    const copy = new URLSearchParams(params);
    if (next === "accounts") copy.delete("panel");
    else copy.set("panel", "contacts");
    copy.delete("view");
    copy.delete("status");
    copy.delete("health");
    copy.delete("q");
    setWildcard("");
    setParams(copy, { replace: true });
  }

  useEffect(() => {
    rememberCrmHome(panel);
  }, [panel]);

  function openAccount(accountId: string, title?: string) {
    setAdding(false);
    setImporting(false);
    const name = title || accounts.find((account) => account.id === accountId)?.name || "Account";
    const tab = { key: `account:${accountId}`, kind: "account" as const, accountId, title: name };
    openCrmRecordTab(tab);
    navigate(recordPath(tab));
  }

  return (
    <CrmShell studio priorities={false} title="Account" lede="The people on Sequence CRM accounts.">
      <div className="client-board">
        <div className="client-board-main">
          <CrmDirectoryHeader
            panel={panel}
            onPanel={setPanel}
            action={canWrite ? (
              <button type="button" className="client-add" onClick={() => { setImporting(false); setAdding(true); }}>
                {panel === "accounts" ? "Add new Account" : "Add new Contact"}
              </button>
            ) : null}
          />
          <CrmRecordStrip />
          <div className="client-pills" role="tablist" aria-label="Account filter">
            <button type="button" role="tab" aria-selected={filter === "all"} className={buttonFormat1(filter === "all")} onClick={() => setFilter("all")}>
              {panel === "accounts" ? "All Accounts" : "All Contacts"}
            </button>
            <Wildcard01
              key={panel}
              scope={panel === "accounts" ? "manage-accounts" : "manage-contacts"}
              active={filter === "custom"}
              query={filter === "custom" ? wildcard : ""}
              onSearch={(query) => {
                setWildcard(query);
                setFilter("custom");
              }}
            />
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={buttonFormat1(filter === item.id)} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {panel === "accounts" && filtered.length ? (
            <div className="client-grid">
              {filtered.map((card) => (
                <AccountCompanyCard
                  key={card.account.id}
                  name={card.account.name}
                  industry={card.account.industry}
                  number={card.account.number}
                  onOpen={() => openAccount(card.account.id, card.account.name)}
                  facts={[
                    { label: "Status", value: card.account.status },
                    { label: "Sector", value: card.account.industry },
                    { label: "Health", value: card.health },
                    { label: "Budget", value: clientBudget(card) },
                  ]}
                  saved={saved.includes(card.account.id)}
                  onSave={() => setSaved((current) => (current.includes(card.account.id) ? current.filter((item) => item !== card.account.id) : [...current, card.account.id]))}
                />
              ))}
            </div>
          ) : null}
          {panel === "contacts" && contactRows.length ? (
            <div className="client-grid">
              {contactRows.map(({ card, person }) => (
                <AccountPersonCard
                  key={person.id}
                  name={person.name}
                  role={person.role}
                  accountName={card.account.name}
                  onOpen={() => {
                    const tab = { key: `contact:${person.id}`, kind: "contact" as const, accountId: card.account.id, contactId: person.id, title: person.name };
                    openCrmRecordTab(tab);
                    navigate(recordPath(tab));
                  }}
                  facts={[
                    { label: "Email", value: person.email || "—" },
                    { label: "Phone", value: person.phone || "—" },
                    { label: "Account", value: card.account.name },
                  ]}
                  saved={saved.includes(person.id)}
                  onSave={() => setSaved((current) => (current.includes(person.id) ? current.filter((item) => item !== person.id) : [...current, person.id]))}
                />
              ))}
            </div>
          ) : null}
          {(panel === "accounts" ? filtered.length : contactRows.length) ? null : (
            <CrmEmpty
              title={panel === "accounts" ? "No accounts match." : "No contacts match."}
              detail={panel === "accounts" ? "Choose All Accounts to see the full list." : "Choose All Contacts to see the full list."}
            />
          )}
        </div>
        <aside className="client-board-side">
          <TopPriorities hint="A saved star stays on this screen until you leave it." />
          <section className="client-card client-contracts">
            <div className="client-contract-bar" aria-hidden="true">
              <span style={{ width: `${signed + negotiating === 0 ? 50 : Math.round((signed / (signed + negotiating)) * 100)}%` }} />
            </div>
            <div>
              <strong>{signed}</strong>
              <small>Signed contracts</small>
            </div>
            <div>
              <strong>{negotiating}</strong>
              <small>Ongoing negotiations</small>
            </div>
          </section>
          <SourceBars
            groups={sources}
            title="Account source"
            note={quiet ? `${quiet.label} is the smallest source, with ${quiet.count} account${quiet.count === 1 ? "" : "s"}.` : "Sources appear as accounts are billed."}
          />
        </aside>
      </div>
      {adding ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setAdding(false)}>
          <form
            className={`lims-modal client-add-dialog${importing ? " is-import" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-client-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              if (importing) return;
              if (panel === "accounts") {
                const accountId = addClientAccount(draft);
                setDraft({ name: "", contact: "", role: "", industry: "" });
                if (accountId) openAccount(accountId);
                return;
              }
              const accountId = addClientContact(contactDraft);
              setContactDraft({ accountId: "", name: "", role: "", email: "", phone: "" });
              if (accountId) openAccount(accountId);
            }}
          >
            <div className="lims-dialog-bar">
              <h2 id="add-client-title">{importing ? (panel === "accounts" ? "Import accounts" : "Import contacts") : panel === "accounts" ? "Add new Account" : "Add new Contact"}</h2>
              <button type="button" className="btn" onClick={() => setAdding(false)}>Close</button>
            </div>
            {importing ? (
              <CrmImportPanel kind={panel === "accounts" ? "account" : "contact"} accounts={accounts} onDone={openAccount} />
            ) : panel === "accounts" ? (
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
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
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
                <button type="submit" className="btn btn-primary">{panel === "accounts" ? "Save account" : "Save contact"}</button>
              </div>
            )}
          </form>
        </div>
      ) : null}
    </CrmShell>
  );
}
