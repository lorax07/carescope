import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export const RCM_SUBNAV = [
  { to: "/app/billing", label: "Overview", end: true, question: "How is revenue performing and what needs attention?" },
  { to: "/app/billing/claims", label: "Claims", end: false, question: "What claims are moving through the revenue cycle?" },
  { to: "/app/billing/queues", label: "Work queues", end: false, question: "What requires someone to take action?" },
  { to: "/app/billing/payments", label: "Payments", end: false, question: "What money has been received or still needs posting?" },
  { to: "/app/billing/denials", label: "Denials", end: false, question: "Why wasn’t money paid and what can we recover?" },
  { to: "/app/billing/ar", label: "A/R", end: false, question: "What money is still outstanding?" },
  { to: "/app/billing/config", label: "Configuration", end: false, question: "How are clients, payers, and services billed?" },
  { to: "/app/billing/analytics", label: "Analytics", end: false, question: "What patterns are affecting revenue?" },
] as const;

export function RcmShell({
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
          <p className="lims-eyebrow">Sequence Revenue</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">{lede}</p>
        </div>
        {actions ? <div className="rcm-header-actions">{actions}</div> : null}
      </div>
      <nav className="billing-areas rcm-subnav" aria-label="Revenue submodules">
        {RCM_SUBNAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.question} className={({ isActive }) => `btn${isActive ? " is-on" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

export function RcmEmpty({ title, detail }: { title: string; detail?: string }) {
  return (
    <p className="billing-note rcm-empty">
      <strong>{title}</strong>
      {detail ? ` ${detail}` : ""}
    </p>
  );
}

export function ExceptionList({
  items,
}: {
  items: { code: string; message: string; impact: string; action: string; owner: string }[];
}) {
  if (!items.length) return <p className="billing-note">No exceptions on this record.</p>;
  return (
    <ul className="rcm-exceptions">
      {items.map((item, index) => (
        <li key={`${item.code}-${index}`}>
          <b>
            {item.code}: {item.message}
          </b>
          <span>Impact: {item.impact}</span>
          <span>Next: {item.action}</span>
          <span>Owner: {item.owner}</span>
        </li>
      ))}
    </ul>
  );
}
