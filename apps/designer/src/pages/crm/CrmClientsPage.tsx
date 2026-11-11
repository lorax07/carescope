import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Wildcard01 } from "../../components/Wildcard01";
import { addClientAccount, useCrm, type ClientCard } from "../../crm";
import { wildcard01Match } from "../../wildcard01";
import { ClientAssist, ClientAvatar, SourceBars, clientBudget } from "./clientStudio";
import { CrmEmpty, CrmModuleTitle, CrmShell } from "./CrmShell";

const FILTERS = [
  { id: "watch", label: "Watch" },
  { id: "hold", label: "On hold" },
] as const;

function accountText(card: ClientCard): string {
  const account = card.account;
  const people = account.contacts.map((person) => `${person.name} ${person.role} ${person.email}`).join(" ");
  return [account.name, account.number, account.contact, account.industry, account.owner, account.billTo, account.relationship, people].join(" ");
}

function matchesFilter(card: ClientCard, filter: string): boolean {
  if (filter === "watch") return card.health === "Watch" || card.health === "At risk" || card.health === "Critical";
  if (filter === "hold") return card.account.status === "On hold";
  return true;
}

export function CrmClientsPage() {
  const { cards, actor, canWrite, accounts } = useCrm();
  const [params, setParams] = useSearchParams();
  const [wildcard, setWildcard] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", role: "", industry: "" });
  const [saved, setSaved] = useState<string[]>([]);
  const filter = params.get("view") || (params.get("status") === "On hold" ? "hold" : params.get("health") === "At risk" || params.get("health") === "Critical" ? "watch" : "all");
  const filtered = useMemo(() => {
    return cards.filter((card) => {
      if (filter === "custom") return wildcard01Match(accountText(card), wildcard);
      return matchesFilter(card, filter);
    });
  }, [cards, filter, wildcard]);

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
    label,
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

  return (
    <CrmShell studio title="Client" lede="The people on Sequence CRM accounts.">
      <div className="client-board">
        <div className="client-board-main">
          <header className="client-board-head">
            <CrmModuleTitle title="Manage Accounts" />
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
          <div className="client-pills" role="tablist" aria-label="Account filter">
            <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "is-on" : undefined} onClick={() => setFilter("all")}>
              All Accounts
            </button>
            <Wildcard01
              scope="manage-accounts"
              active={filter === "custom"}
              query={filter === "custom" ? wildcard : ""}
              onSearch={(query) => {
                setWildcard(query);
                setFilter("custom");
              }}
            />
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
            <CrmEmpty title="No accounts match." detail="Choose All Accounts to see the full list." />
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
