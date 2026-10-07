import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import type { HealthSignal } from "../../crm";

export const CRM_SUBNAV = [
  { to: "/app/connectivity", label: "Overview", end: true, question: "How is the client portfolio doing and what needs attention?" },
  { to: "/app/connectivity/clients", label: "Clients", end: false, question: "Who are the clients and how is each relationship?" },
  { to: "/app/connectivity/contacts", label: "Contacts", end: false, question: "Who should Sequence talk to?" },
  { to: "/app/connectivity/activities", label: "Activities", end: false, question: "What has happened recently?" },
  { to: "/app/connectivity/tasks", label: "Tasks", end: false, question: "What do I need to do today?" },
  { to: "/app/connectivity/opportunities", label: "Opportunities", end: false, question: "Where can the relationship grow?" },
  { to: "/app/connectivity/health", label: "Client health", end: false, question: "Why is a client at risk, and what should we do?" },
  { to: "/app/connectivity/communications", label: "Communications", end: false, question: "What conversations have we had?" },
  { to: "/app/connectivity/issues", label: "Service", end: false, question: "What is going wrong for a client?" },
  { to: "/app/connectivity/documents", label: "Documents", end: false, question: "What agreements and files sit on the account?" },
  { to: "/app/connectivity/analytics", label: "Analytics", end: false, question: "What patterns are in the client portfolio?" },
] as const;

export function CrmShell({
  title,
  lede,
  actions,
  children,
}: {
  title: string;
  lede: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="lims-page rcm-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Sequence Client</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">{lede}</p>
        </div>
        {actions ? <div className="rcm-header-actions">{actions}</div> : null}
      </div>
      <nav className="billing-areas rcm-subnav" aria-label="Client submodules">
        {CRM_SUBNAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.question} className={({ isActive }) => `btn${isActive ? " is-on" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function CrmEmpty({ title, detail }: { title: string; detail?: string }) {
  return (
    <p className="billing-note rcm-empty">
      <strong>{title}</strong>
      {detail ? ` ${detail}` : ""}
    </p>
  );
}

export function SignalList({ items }: { items: HealthSignal[] }) {
  if (!items.length) return <p className="billing-note">No health exceptions on this account.</p>;
  return (
    <ul className="rcm-exceptions">
      {items.map((item) => (
        <li key={item.code}>
          <b>
            {item.code}: {item.message}
          </b>
          <span>Why: {item.why}</span>
          <span>Next: {item.action}</span>
          <span>Owner: {item.owner}</span>
        </li>
      ))}
    </ul>
  );
}
