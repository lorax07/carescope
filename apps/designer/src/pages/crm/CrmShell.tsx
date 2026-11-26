import type { ReactNode } from "react";
import type { HealthSignal } from "../../crm";
import { usePriorityPanel } from "../../priorityPanel";
import { CLIENT_CHAPTERS } from "../moduleChapters";
import { ModuleHeader } from "../ModuleHeader";
import { TopPriorities } from "./TopPriorities";

export const CRM_SUBNAV = CLIENT_CHAPTERS;

export function CrmModuleTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <ModuleHeader title={title} subtitle={subtitle} />;
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
  const heading = <ModuleHeader title={title} subtitle={lede} action={actions} />;
  const header = studio ? null : heading;
  const pinned = usePriorityPanel().pinned;
  const showPriorities = priorities && pinned;
  return (
    <div className={`lims-page rcm-page${studio ? " client-studio" : ""}${showPriorities ? " has-priorities" : ""}`}>
      {showPriorities ? (
        <>
          {header}
          <div className="crm-priority-main">
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
