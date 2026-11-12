import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Filter01 } from "../../components/Filter01";
import { useCrm, type CommunicationKind } from "../../crm";
import { ClientAvatar } from "./clientStudio";
import { InboxChannelMark } from "./InboxChannelMark";
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
  const [platforms, setPlatforms] = useState<CommunicationKind[]>([]);
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
          email: contact.email,
          phone: contact.phone,
        })),
        accounts.map((account) => ({
          id: account.id,
          industry: account.industry,
          agreements: account.agreements,
          activities: account.activities,
        })),
        overlay.communications,
      ).filter((thread) => threadMatches(thread, query, platforms)),
    [accounts, contacts, overlay.communications, platforms, query],
  );

  return (
    <section className="inbox-list" aria-label="All messages">
      <header>
        <h1>All messages</h1>
        <label>
          <span className="sr-only">Search messages</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search messages" />
        </label>
        <Filter01
          className="is-inline"
          label="Messages"
          options={PLATFORMS.filter((item) => item.id !== "all").map((item) => ({ id: item.id, label: item.label, category: "Channel" }))}
          selected={platforms}
          onChange={(ids) => setPlatforms(ids.filter((id): id is CommunicationKind => id === "email" || id === "call" || id === "meeting" || id === "note"))}
          query={query}
          onQuery={setQuery}
        />
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
                  <b>
                  {thread.name}
                  <InboxChannelMark channel={thread.channel} reach={thread.reach} />
                </b>
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
