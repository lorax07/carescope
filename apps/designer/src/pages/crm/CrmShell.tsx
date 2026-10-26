import type { ReactNode } from "react";
import type { HealthSignal } from "../../crm";
import { CLIENT_CHAPTERS } from "../moduleChapters";

export const CRM_SUBNAV = CLIENT_CHAPTERS;

export function CrmShell({
  title,
  lede,
  actions,
  studio,
  children,
}: {
  title: string;
  lede: string;
  actions?: ReactNode;
  studio?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`lims-page rcm-page${studio ? " client-studio" : ""}`}>
      {studio ? null : (
        <div className="lims-page-header">
          <div>
            <p className="lims-eyebrow">Sequence Client</p>
            <h1>{title}</h1>
            <p className="lims-page-lede">{lede}</p>
          </div>
          {actions ? <div className="rcm-header-actions">{actions}</div> : null}
        </div>
      )}
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
