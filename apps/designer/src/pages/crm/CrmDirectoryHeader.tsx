import type { ReactNode } from "react";

export function CrmDirectoryHeader({
  panel,
  onPanel,
  action,
}: {
  panel: "accounts" | "contacts";
  onPanel: (panel: "accounts" | "contacts") => void;
  action?: ReactNode;
}) {
  const title = panel === "accounts" ? "Accounts" : "Contacts";
  return (
    <header className="client-hero">
      <div className="client-hero-banner">
        <span className="client-hero-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="8" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="16" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4.6 17.5a3.6 3.6 0 0 1 6.8 0M12.6 17.5a3.6 3.6 0 0 1 6.8 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <p>CRM</p>
          <h1>{title}</h1>
          <small>Manage your accounts and contacts</small>
        </div>
      </div>
      <div className="client-hero-sheet">
        <div className="crm-view-tabs tab01" role="tablist" aria-label="Accounts and contacts">
          <button type="button" role="tab" aria-selected={panel === "accounts"} className={panel === "accounts" ? "is-on" : undefined} onClick={() => onPanel("accounts")}>
            Accounts
          </button>
          <button type="button" role="tab" aria-selected={panel === "contacts"} className={panel === "contacts" ? "is-on" : undefined} onClick={() => onPanel("contacts")}>
            Contacts
          </button>
        </div>
        {action}
      </div>
    </header>
  );
}
