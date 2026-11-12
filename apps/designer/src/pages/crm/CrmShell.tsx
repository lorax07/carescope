import type { ReactNode } from "react";
import type { HealthSignal } from "../../crm";
import { CLIENT_CHAPTERS } from "../moduleChapters";
import { TopPriorities } from "./TopPriorities";

export const CRM_SUBNAV = CLIENT_CHAPTERS;

export function CrmModuleTitle({ title }: { title: string }) {
  return (
    <div className="crm-studio-title">
      <p className="lims-eyebrow">Sequence CRM</p>
      <h1>{title}</h1>
    </div>
  );
}

export function CrmShell({
  title,
  lede,
  actions,
  studio,
  priorities = true,
  children,
}: {
  title: string;
  lede: string;
  actions?: ReactNode;
  studio?: boolean;
  /** Pages that already place Top Priorities in their own right column pass false. */
  priorities?: boolean;
  children: ReactNode;
}) {
  const header = studio ? null : (
    <div className="lims-page-header">
      <div>
        <p className="lims-eyebrow">Sequence CRM</p>
        <h1>{title}</h1>
        <p className="lims-page-lede">{lede}</p>
      </div>
      {actions ? <div className="rcm-header-actions">{actions}</div> : null}
    </div>
  );
  return (
    <div className={`lims-page rcm-page${studio ? " client-studio" : ""}${priorities ? " has-priorities" : ""}`}>
      {priorities ? (
        <>
          <div className="crm-priority-main">
            {header}
            {children}
          </div>
          <aside className="crm-priority-side">
            <TopPriorities />
          </aside>
        </>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
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
