import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { crmCanWrite, logCommunication, useCrm, type CommunicationKind } from "../../crm";
import { ClientAvatar } from "./clientStudio";
import { CrmShell } from "./CrmShell";
import {
  attachmentNote,
  buildInboxThreads,
  followUpDraft,
  formalTone,
  latestActivity,
  messageStamp,
  relativeAge,
  smartReply,
  statusDraft,
  summarizeThread,
  threadMatches,
  unreadCount,
  type InboxThread,
} from "./inboxStudio";

const PLATFORMS: { id: "all" | CommunicationKind; label: string }[] = [
  { id: "all", label: "All Platforms" },
  { id: "email", label: "Email" },
  { id: "call", label: "Call" },
  { id: "meeting", label: "Meeting" },
  { id: "note", label: "Note" },
];

const ACTIONS = [
  { id: "reply", label: "Smart Reply", tone: "is-lilac" },
  { id: "tone", label: "Tone Adjustment", tone: "is-rose" },
  { id: "follow", label: "Follow-Up Suggestions", tone: "is-amber" },
  { id: "summary", label: "Message Summarization", tone: "is-mint" },
  { id: "files", label: "Suggested Attachments", tone: "is-peach" },
  { id: "status", label: "Automated Status Updates", tone: "is-violet" },
] as const;

function snippet(thread: InboxThread): string {
  const body = thread.messages.at(-1)?.body ?? "";
  return body.length > 72 ? `${body.slice(0, 69)}...` : body;
}

export function CrmInboxPage() {
  const { overlay, contacts, accounts } = useCrm();
  const canWrite = crmCanWrite();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("all");
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState("");
  const [starred, setStarred] = useState<string[]>(["acc-helix:m.brooks@helix.example", "acc-northwind:c.ibarra@northwind.example"]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const now = useMemo(() => new Date(), []);

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
      ),
    [accounts, contacts, overlay.communications],
  );
  const visible = threads.filter((thread) => threadMatches(thread, query, platform));
  const requested = params.get("contact") || "";
  const selected = visible.find((thread) => thread.contactId === requested) ?? visible[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    setRead((current) => (current.includes(selected.contactId) ? current : [...current, selected.contactId]));
  }, [selected]);

  function openThread(contactId: string) {
    const copy = new URLSearchParams(params);
    copy.set("contact", contactId);
    setParams(copy, { replace: true });
    setDraft("");
    setSummary("");
  }

  function applyAction(id: (typeof ACTIONS)[number]["id"]) {
    if (!selected) return;
    const account = accounts.find((item) => item.id === selected.accountId);
    const lastInbound = [...selected.messages].reverse().find((message) => message.direction === "in") ?? selected.messages.at(-1);
    const openTasks = overlay.tasks.filter((task) => task.accountId === selected.accountId && task.status !== "done").map((task) => task.title);
    if (id === "reply") setDraft(smartReply(lastInbound?.body ?? ""));
    if (id === "tone") setDraft((current) => formalTone(current || lastInbound?.body || ""));
    if (id === "follow") setDraft(followUpDraft(openTasks));
    if (id === "summary") setSummary(summarizeThread(selected.messages.map((message) => message.body)));
    if (id === "files") setDraft(attachmentNote(account?.agreements.map((item) => item.name) ?? []));
    if (id === "status") setDraft(statusDraft(latestActivity(account)));
  }

  function send() {
    if (!selected || !canWrite) return;
    const body = draft.trim();
    if (!body) return;
    logCommunication({
      accountId: selected.accountId,
      contactId: selected.contactId,
      kind: "email",
      subject: body.slice(0, 80),
      body,
    });
    setDraft("");
    setSummary("");
  }

  const ordered = [...visible].sort((a, b) => Number(pinned.includes(b.contactId)) - Number(pinned.includes(a.contactId)));

  return (
    <CrmShell studio title="Inbox" lede="Messages with the people on Sequence Client accounts.">
      <div className="inbox">
        <section className="inbox-thread" aria-label={selected ? `Conversation with ${selected.name}` : "Conversation"}>
          {selected ? (
            <>
              <header className="inbox-thread-head">
                <ClientAvatar name={selected.name} size={44} />
                <div>
                  <b>{selected.name}</b>
                  <small>
                    {selected.industry} | Local time: {now.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </small>
                </div>
                <button
                  type="button"
                  className={pinned.includes(selected.contactId) ? "is-on" : undefined}
                  aria-pressed={pinned.includes(selected.contactId)}
                  aria-label={pinned.includes(selected.contactId) ? "Unpin conversation" : "Pin conversation"}
                  onClick={() =>
                    setPinned((current) =>
                      current.includes(selected.contactId) ? current.filter((id) => id !== selected.contactId) : [...current, selected.contactId],
                    )
                  }
                >
                  ⌁
                </button>
                <button
                  type="button"
                  className={starred.includes(selected.contactId) ? "is-on" : undefined}
                  aria-pressed={starred.includes(selected.contactId)}
                  aria-label={starred.includes(selected.contactId) ? "Unstar conversation" : "Star conversation"}
                  onClick={() =>
                    setStarred((current) =>
                      current.includes(selected.contactId) ? current.filter((id) => id !== selected.contactId) : [...current, selected.contactId],
                    )
                  }
                >
                  ★
                </button>
              </header>
              <div className="inbox-log">
                {selected.messages.map((message, index) => {
                  const previous = selected.messages[index - 1];
                  const showTime = !previous || previous.at.slice(0, 16) !== message.at.slice(0, 16);
                  return (
                    <div key={message.id} className={message.direction === "out" ? "is-out" : "is-in"}>
                      {showTime ? <p className="inbox-stamp">{messageStamp(message.at)}</p> : null}
                      <p className={`inbox-bubble is-${message.direction}`}>{message.body}</p>
                    </div>
                  );
                })}
              </div>
              <div className="inbox-actions">
                {ACTIONS.map((action) => (
                  <button key={action.id} type="button" onClick={() => applyAction(action.id)}>
                    <i className={action.tone} />
                    {action.label}
                  </button>
                ))}
              </div>
              {summary ? <p className="inbox-summary">{summary}</p> : null}
              <form
                className="inbox-compose"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <button
                  type="button"
                  aria-label="Suggest an attachment"
                  onClick={() => selected && setDraft(attachmentNote(accounts.find((item) => item.id === selected.accountId)?.agreements.map((item) => item.name) ?? []))}
                >
                  📎
                </button>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Send message..."
                  aria-label={`Message ${selected.name}`}
                />
                <button type="submit" aria-label="Send message" disabled={!canWrite || !draft.trim()}>
                  ➤
                </button>
                <button type="button" aria-label="Draft a reply" onClick={() => applyAction("reply")}>
                  ✦
                </button>
              </form>
              <p className="inbox-footnote">
                <Link to={`/app/connectivity/clients/${selected.accountId}`}>{selected.accountName}</Link>
                {" · "}
                {selected.role}. Replies are saved on the Sequence Client account.
              </p>
            </>
          ) : (
            <p className="client-empty">No conversations match this search.</p>
          )}
        </section>

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
            {ordered.map((thread) => {
              const unread = read.includes(thread.contactId) ? 0 : unreadCount(thread);
              const on = selected?.contactId === thread.contactId;
              return (
                <li key={thread.contactId}>
                  <button type="button" className={on ? "is-on" : undefined} aria-current={on ? "true" : undefined} onClick={() => openThread(thread.contactId)}>
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
      </div>
    </CrmShell>
  );
}
