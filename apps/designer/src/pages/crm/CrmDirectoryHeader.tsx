import type { ReactNode } from "react";
import { ScreenTitle } from "../ScreenTitle";

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
        <div>
          <ScreenTitle name={panel === "accounts" ? "clients" : "contacts"}>{title}</ScreenTitle>
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
