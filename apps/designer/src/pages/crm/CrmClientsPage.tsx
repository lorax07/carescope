import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Filter01, type Filter01Option } from "../../components/Filter01";
import { addClientAccount, addClientContact, useCrm, type ClientCard } from "../../crm";
import { contactsOnAccount } from "../../crm/directory";
import { openCrmRecordTab, recordPath, rememberCrmHome } from "../../crmRecordTabs";
import { filter01Match } from "../../filter01";
import { AccountCompanyCard, AccountPersonCard, clientBudget } from "./clientStudio";
import { CrmDirectoryHeader } from "./CrmDirectoryHeader";
import { TopPriorities } from "./TopPriorities";
import { CrmEmpty, CrmShell } from "./CrmShell";
import { CrmImportPanel } from "./CrmImportPanel";
import { CrmRecordStrip } from "./CrmRecordStrip";

function readFilters(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").flatMap((item) => {
    try {
      const decoded = decodeURIComponent(item);
      return decoded ? [decoded] : [];
    } catch {
      return item ? [item] : [];
    }
  });
}

function writeFilters(ids: string[]): string {
  return ids.map((item) => encodeURIComponent(item)).join(",");
}

function accountText(card: ClientCard): string {
  const account = card.account;
  const people = account.contacts.map((person) => `${person.name} ${person.role} ${person.email} ${person.phone}`).join(" ");
  return [account.name, account.number, account.contact, account.industry, account.owner, account.billTo, account.relationship, people].join(" ");
}

function picked(ids: string[], prefix: string): string[] {
  return ids.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
}

function accountMatches(card: ClientCard, ids: string[], wildcard: string): boolean {
  const status = picked(ids, "status:");
  const health = picked(ids, "health:");
  const sector = picked(ids, "sector:");
  const source = picked(ids, "source:");
  const queries = picked(ids, "search:");
  if (status.length && !status.includes(card.account.status)) return false;
  if (health.length && !health.includes(card.health)) return false;
  if (sector.length && !sector.includes(card.account.industry)) return false;
  const sourceLabel = card.account.billTo === "Client" ? "Account" : card.account.billTo;
  if (source.length && !source.includes(sourceLabel)) return false;
  const needles = queries.length ? queries : wildcard.trim() ? [wildcard] : [];
  if (needles.length && !needles.some((query) => filter01Match(accountText(card), query))) return false;
  return true;
}

export function CrmClientsPage() {
  const { cards, canWrite, accounts, overlay } = useCrm();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [wildcard, setWildcard] = useState(params.get("q") || "");
  const [selected, setSelected] = useState<string[]>(() => {
    const stored = readFilters(params.get("filters"));
    if (stored.length) return stored;
    const legacy: string[] = [];
    if (params.get("view") === "hold" || params.get("status") === "On hold") legacy.push("status:On hold");
    if (params.get("view") === "watch" || params.get("health") === "At risk" || params.get("health") === "Critical") {
      legacy.push("health:Watch", "health:At risk", "health:Critical");
    }
    return legacy;
  });
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", role: "", industry: "" });
  const [contactDraft, setContactDraft] = useState({ accountId: "", name: "", role: "", email: "", phone: "" });
  const [saved, setSaved] = useState<string[]>([]);
  const panel = params.get("panel") === "contacts" ? "contacts" : "accounts";
  const filtered = useMemo(() => cards.filter((card) => accountMatches(card, selected, wildcard)), [cards, selected, wildcard]);
  const contactRows = useMemo(() => {
    const roles = picked(selected, "role:");
    const names = picked(selected, "account:");
    const sectors = picked(selected, "sector:");
    const queries = picked(selected, "search:");
    const needles = queries.length ? queries : wildcard.trim() ? [wildcard] : [];
    return cards.flatMap((card) => {
      if (names.length && !names.includes(card.account.name)) return [];
      if (sectors.length && !sectors.includes(card.account.industry)) return [];
      return contactsOnAccount(card.account.id, overlay)
        .filter((person) => !roles.length || roles.includes(person.role))
        .filter((person) => !needles.length || needles.some((query) => filter01Match(`${person.name} ${person.role} ${person.email} ${person.phone} ${card.account.name}`, query)))
        .map((person) => ({ card, person }));
    });
  }, [cards, overlay, selected, wildcard]);
  const filterOptions = useMemo<Filter01Option[]>(() => {
    if (panel === "contacts") {
      const people = accounts.flatMap((account) => account.contacts.map((person) => ({ role: person.role, account: account.name, sector: account.industry })));
      return [
        ...[...new Set(people.map((person) => person.role))].sort().map((role) => ({ id: `role:${role}`, label: role, category: "Role" })),
        ...[...new Set(people.map((person) => person.account))].sort().map((name) => ({ id: `account:${name}`, label: name, category: "Account" })),
        ...[...new Set(people.map((person) => person.sector))].sort().map((sector) => ({ id: `sector:${sector}`, label: sector, category: "Sector" })),
      ];
    }
    return [
      { id: "status:Active", label: "Active", category: "Status" },
      { id: "status:On hold", label: "On hold", category: "Status" },
      { id: "health:Healthy", label: "Healthy", category: "Health" },
      { id: "health:Watch", label: "Watch", category: "Health" },
      { id: "health:At risk", label: "At risk", category: "Health" },
      { id: "health:Critical", label: "Critical", category: "Health" },
      ...[...new Set(accounts.map((account) => account.industry))].sort().map((sector) => ({ id: `sector:${sector}`, label: sector, category: "Sector" })),
      { id: "source:Account", label: "Account", category: "Source" },
      { id: "source:Insurance", label: "Insurance", category: "Source" },
      { id: "source:Self-pay", label: "Self-pay", category: "Source" },
    ];
  }, [accounts, panel]);

  function chooseFilters(next: string[]) {
    setSelected(next);
    const copy = new URLSearchParams(params);
    if (next.length) copy.set("filters", writeFilters(next));
    else copy.delete("filters");
    copy.delete("view");
    copy.delete("status");
    copy.delete("health");
    copy.delete("q");
    copy.delete("page");
    setParams(copy, { replace: true });
  }

  function setPanel(next: "accounts" | "contacts") {
    const copy = new URLSearchParams(params);
    if (next === "accounts") copy.delete("panel");
    else copy.set("panel", "contacts");
    copy.delete("view");
    copy.delete("status");
    copy.delete("health");
    copy.delete("filters");
    copy.delete("q");
    setSelected([]);
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
        <div className="client-overview-head">
          <CrmDirectoryHeader
            panel={panel}
            onPanel={setPanel}
            action={canWrite ? (
              <button type="button" className="client-add" onClick={() => { setImporting(false); setAdding(true); }}>
                {panel === "accounts" ? "Add new Account" : "Add new Contact"}
              </button>
            ) : null}
          />
        </div>
        <div className="client-board-main">
          <div className="tab-sheet">
          <CrmRecordStrip />
          <div className="tab-sheet">
          <Filter01
            key={panel}
            label={panel === "accounts" ? "Accounts" : "Contacts"}
            scope={panel === "accounts" ? "manage-accounts" : "manage-contacts"}
            options={filterOptions}
            selected={selected}
            onChange={chooseFilters}
            query={wildcard}
            onQuery={setWildcard}
          />
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
          </div>
        </div>
        <aside className="client-board-side">
          <TopPriorities defaultOpen hint="A saved star stays on this screen until you leave it." />
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
