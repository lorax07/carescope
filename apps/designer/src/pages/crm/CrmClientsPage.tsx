import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addClientAccount, useCrm, type ClientCard } from "../../crm";
import { ClientAssist, ClientAvatar, SourceBars, clientBudget } from "./clientStudio";
import { CrmEmpty, CrmShell } from "./CrmShell";

const FILTERS = [
  { id: "all", label: "All Clients" },
  { id: "active", label: "Active" },
  { id: "watch", label: "Watch" },
  { id: "hold", label: "On hold" },
] as const;

function matchesFilter(card: ClientCard, filter: string): boolean {
  if (filter === "active") return card.account.status === "Active" && card.health !== "At risk" && card.health !== "Critical";
  if (filter === "watch") return card.health === "Watch" || card.health === "At risk" || card.health === "Critical";
  if (filter === "hold") return card.account.status === "On hold";
  return true;
}

export function CrmClientsPage() {
  const { cards, actor, canWrite, accounts } = useCrm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", role: "", industry: "" });
  const [saved, setSaved] = useState<string[]>([]);
  const filter = params.get("view") || (params.get("status") === "On hold" ? "hold" : params.get("health") === "At risk" || params.get("health") === "Critical" ? "watch" : "all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (!matchesFilter(card, filter)) return false;
      if (!needle) return true;
      const people = card.account.contacts.map((item) => `${item.name} ${item.role}`).join(" ");
      return `${card.account.name} ${card.account.contact} ${card.account.industry} ${card.account.owner} ${people}`.toLowerCase().includes(needle);
    });
  }, [cards, filter, query]);

  const signed = accounts.reduce((sum, account) => sum + account.agreements.filter((item) => item.status === "Active").length, 0);
  const negotiating = accounts.reduce((sum, account) => sum + account.opportunities.filter((item) => item.stage === "Negotiation" || item.stage === "Proposal").length, 0);
  const sources = ["Client", "Insurance", "Self-pay"].map((label, index) => ({
    label,
    count: accounts.filter((account) => account.billTo === label).length,
    tone: ["is-rose", "is-mint", "is-lilac"][index] ?? "is-mint",
  }));
  const quiet = [...sources].sort((a, b) => a.count - b.count)[0];

  function setFilter(next: string) {
    const copy = new URLSearchParams(params);
    if (next === "all") copy.delete("view");
    else copy.set("view", next);
    copy.delete("status");
    copy.delete("health");
    copy.delete("page");
    setParams(copy, { replace: true });
  }

  return (
    <CrmShell studio title="Client" lede="The people on Sequence Client accounts.">
      <div className="client-board">
        <div className="client-board-main">
          <header className="client-board-head">
            <h1>Manage Clients</h1>
            <label>
              <span className="sr-only">Search clients</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search clients" />
            </label>
            {canWrite ? (
              <button type="button" className="client-add" onClick={() => setAdding(true)}>
                Add new Client
              </button>
            ) : null}
          </header>
          <div className="client-board-links">
            <Link to="/app/connectivity/contacts">People</Link>
            <Link to="/app/connectivity/documents">Agreements</Link>
            <Link to="/app/connectivity/health">Health</Link>
          </div>
          <div className="client-pills" role="tablist" aria-label="Client filter">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "is-on" : undefined} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {filtered.length ? (
            <div className="client-grid">
              {filtered.flatMap((card) => {
                const people = card.account.contacts.length ? card.account.contacts : [{ name: card.account.contact, role: "Primary contact", email: "", phone: "" }];
                return people.map((person) => (
                  <article key={`${card.account.id}-${person.name}`} className="client-person">
                    <button
                      type="button"
                      className={saved.includes(`${card.account.id}:${person.name}`) ? "is-saved" : undefined}
                      aria-label={`Save ${person.name}`}
                      aria-pressed={saved.includes(`${card.account.id}:${person.name}`)}
                      onClick={() =>
                        setSaved((current) =>
                          current.includes(`${card.account.id}:${person.name}`)
                            ? current.filter((item) => item !== `${card.account.id}:${person.name}`)
                            : [...current, `${card.account.id}:${person.name}`],
                        )
                      }
                    >
                      ★
                    </button>
                    <Link to={`/app/connectivity/clients/${card.account.id}`}>
                      <ClientAvatar name={person.name} />
                      <b>{person.name}</b>
                      <small>{person.role}</small>
                      <em>{card.account.name}</em>
                    </Link>
                    <dl>
                      <div>
                        <dt>From</dt>
                        <dd>{card.account.billTo}</dd>
                      </div>
                      <div>
                        <dt>Sector</dt>
                        <dd>{card.account.industry}</dd>
                      </div>
                      <div>
                        <dt>Budget</dt>
                        <dd>{clientBudget(card)}</dd>
                      </div>
                    </dl>
                  </article>
                ));
              })}
            </div>
          ) : (
            <CrmEmpty title="No clients match." detail="Clear the search or choose All Clients." />
          )}
        </div>
        <aside className="client-board-side">
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
            note={quiet ? `${quiet.label} is the smallest source, with ${quiet.count} account${quiet.count === 1 ? "" : "s"}.` : "Sources appear as accounts are billed."}
          />
          <ClientAssist actor={actor} hint="A saved star stays on this screen until you leave it." />
        </aside>
      </div>
      {adding ? (
        <div className="lims-modal-backdrop" role="presentation" onClick={() => setAdding(false)}>
          <form
            className="lims-modal client-add-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-client-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              addClientAccount(draft);
              setAdding(false);
              setDraft({ name: "", contact: "", role: "", industry: "" });
            }}
          >
            <div className="lims-dialog-bar">
              <h2 id="add-client-title">Add new Client</h2>
              <button type="button" className="btn" onClick={() => setAdding(false)}>Close</button>
            </div>
            <label>Account name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
            <label>Primary contact<input value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} required /></label>
            <label>Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="Lab director" /></label>
            <label>Sector<input value={draft.industry} onChange={(event) => setDraft({ ...draft, industry: event.target.value })} placeholder="Pharmaceutical" /></label>
            <button type="submit" className="btn btn-primary">Save client</button>
          </form>
        </div>
      ) : null}
    </CrmShell>
  );
}
