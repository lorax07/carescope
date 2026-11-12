import type { InboxChannel } from "./inboxStudio";

function ChannelIcon({ channel }: { channel: InboxChannel }) {
  if (channel === "phone") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.2 2.6h2.1l1 2.3-1.3.9a7.2 7.2 0 0 0 3.2 3.2l.9-1.3 2.3 1v2.1c0 .6-.5 1.1-1.1 1.1A9.4 9.4 0 0 1 2.1 3.7c0-.6.5-1.1 1.1-1.1Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (channel === "slack") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M5.04 15.17a2.53 2.53 0 0 1-2.52 2.52A2.53 2.53 0 0 1 0 15.17a2.53 2.53 0 0 1 2.52-2.52h2.52v2.52Zm1.27 0a2.53 2.53 0 0 1 2.52-2.52 2.53 2.53 0 0 1 2.52 2.52v6.31A2.53 2.53 0 0 1 8.83 24a2.53 2.53 0 0 1-2.52-2.52v-6.31ZM8.83 5.04a2.53 2.53 0 0 1-2.52-2.52A2.53 2.53 0 0 1 8.83 0a2.53 2.53 0 0 1 2.52 2.52v2.52H8.83Zm0 1.27a2.53 2.53 0 0 1 2.52 2.52 2.53 2.53 0 0 1-2.52 2.52H2.52A2.53 2.53 0 0 1 0 8.83a2.53 2.53 0 0 1 2.52-2.52h6.31Zm10.13 2.52a2.53 2.53 0 0 1 2.52-2.52A2.53 2.53 0 0 1 24 8.83a2.53 2.53 0 0 1-2.52 2.52h-2.52V8.83Zm-1.27 0a2.53 2.53 0 0 1-2.52 2.52 2.53 2.53 0 0 1-2.52-2.52V2.52A2.53 2.53 0 0 1 15.17 0a2.53 2.53 0 0 1 2.52 2.52v6.31Zm-2.52 10.13a2.53 2.53 0 0 1 2.52 2.52A2.53 2.53 0 0 1 15.17 24a2.53 2.53 0 0 1-2.52-2.52v-2.52h2.52Zm0-1.27a2.53 2.53 0 0 1-2.52-2.52 2.53 2.53 0 0 1 2.52-2.52h6.31A2.53 2.53 0 0 1 24 15.17a2.53 2.53 0 0 1-2.52 2.52h-6.31Z" />
      </svg>
    );
  }
  if (channel === "teams") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.2" y="3.4" width="9.4" height="9.4" rx="1.7" fill="currentColor" />
        <path d="M3.2 6.1h5.4M5.9 6.1v4.6" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="12.8" cy="4.2" r="1.5" fill="currentColor" />
        <path d="M11.2 7.2h2.7c.5 0 .9.4.9.9v2.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.6" y="3.4" width="12.8" height="9.2" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.2 4.4 8 8.6l5.8-4.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

const LABEL: Record<InboxChannel, string> = {
  email: "Email",
  phone: "Phone",
  slack: "Slack",
  teams: "Teams",
};

export function InboxChannelMark({ channel, reach }: { channel: InboxChannel; reach: string }) {
  return (
    <span className={`inbox-channel is-${channel}`} title={reach} aria-label={`${LABEL[channel]} ${reach}`}>
      <ChannelIcon channel={channel} />
      <span className="inbox-channel-tip" role="tooltip">{reach}</span>
    </span>
  );
}
