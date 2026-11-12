import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCrm, type CommunicationKind } from "../../crm";
import { ClientAvatar } from "./clientStudio";
import { buildInboxThreads, relativeAge, threadMatches, unreadCount, type InboxThread } from "./inboxStudio";

const PLATFORMS: { id: "all" | CommunicationKind; label: string }[] = [
  { id: "all", label: "All Platforms" },
  { id: "email", label: "Email" },
  { id: "call", label: "Call" },
  { id: "meeting", label: "Meeting" },
  { id: "note", label: "Note" },
];

function snippet(thread: InboxThread): string {
  const body = thread.messages.at(-1)?.body ?? "";
  return body.length > 72 ? `${body.slice(0, 69)}...` : body;
}

export function AllMessagesCard() {
  const { overlay, contacts, accounts } = useCrm();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("all");
  const [starred] = useState<string[]>(["acc-helix:m.brooks@helix.example", "acc-northwind:c.ibarra@northwind.example"]);
  const [read, setRead] = useState<string[]>([]);
  const now = useMemo(() => new Date(), []);
  const current = params.get("contact") || "";
  const threads = useMemo(
    () =>
      buildInboxThreads(
        contacts.map((contact) => ({
          id: contact.id,
          accountId: contact.accountId,
          name: contact.name,
          accountName: contact.accountName,
          role: contact.role,
        })),
        accounts.map((account) => ({
          id: account.id,
          industry: account.industry,
          agreements: account.agreements,
          activities: account.activities,
        })),
        overlay.communications,
      ).filter((thread) => threadMatches(thread, query, platform)),
    [accounts, contacts, overlay.communications, platform, query],
  );

  return (
    <section className="inbox-list" aria-label="All messages">
      <header>
        <h1>All messages</h1>
        <label>
          <span className="sr-only">Search messages</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search messages" />
        </label>
        <label>
          <span className="sr-only">Platform</span>
          <select value={platform} aria-label="All Platforms" onChange={(event) => setPlatform(event.target.value as (typeof PLATFORMS)[number]["id"])}>
            {PLATFORMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <ul>
        {threads.map((thread) => {
          const unread = read.includes(thread.contactId) ? 0 : unreadCount(thread);
          const on = current === thread.contactId;
          return (
            <li key={thread.contactId}>
              <button
                type="button"
                className={on ? "is-on" : undefined}
                aria-current={on ? "true" : undefined}
                onClick={() => {
                  setRead((items) => (items.includes(thread.contactId) ? items : [...items, thread.contactId]));
                  navigate(`/app/connectivity/inbox?contact=${encodeURIComponent(thread.contactId)}`);
                }}
              >
                <ClientAvatar name={thread.name} size={40} />
                <span>
                  <b>{thread.name}</b>
                  <small>{snippet(thread)}</small>
                </span>
                <span className="inbox-row-meta">
                  <time dateTime={thread.messages.at(-1)?.at}>{relativeAge(thread.messages.at(-1)?.at ?? "", now)}</time>
                  {starred.includes(thread.contactId) ? <em aria-label="Starred">★</em> : unread ? <i>{unread}</i> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
