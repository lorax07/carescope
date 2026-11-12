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
  return (
    <header className="client-board-head">
      <div className="crm-studio-title">
        <p className="lims-eyebrow">Sequence CRM</p>
        <div className="crm-view-tabs" role="tablist" aria-label="Accounts and contacts">
          <button type="button" role="tab" aria-selected={panel === "accounts"} className={panel === "accounts" ? "is-on" : undefined} onClick={() => onPanel("accounts")}>
            Accounts
          </button>
          <button type="button" role="tab" aria-selected={panel === "contacts"} className={panel === "contacts" ? "is-on" : undefined} onClick={() => onPanel("contacts")}>
            Contacts
          </button>
        </div>
      </div>
      {action}
    </header>
  );
}
