import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { REVENUE_CHAPTERS } from "../moduleChapters";

export const RCM_SUBNAV = REVENUE_CHAPTERS;

export function RcmShell({
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
  const onSetup = useLocation().pathname.startsWith("/app/billing/config");
  return (
    <div className={`lims-page rcm-page${studio ? " client-studio" : ""}`}>
      {studio ? null : (
        <div className="lims-page-header">
          <div>
            <p className="lims-eyebrow">Sequence Revenue</p>
            <h1>{title}</h1>
            <p className="lims-page-lede">{lede}</p>
          </div>
          <div className="rcm-header-actions">
            <Link className={`module-setup-link${onSetup ? " is-on" : ""}`} to="/app/billing/config">
              Billing setup
            </Link>
            {actions}
          </div>
        </div>
      )}
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
