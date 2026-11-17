import type { ReactNode } from "react";
import { ModuleHeader } from "../ModuleHeader";

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
    <ModuleHeader
      title={title}
      name={panel === "accounts" ? "clients" : "contacts"}
      subtitle="Manage your accounts and contacts"
      action={action}
      sheet={
        <div className="crm-view-tabs tab01" role="tablist" aria-label="Accounts and contacts">
          <button type="button" role="tab" aria-selected={panel === "accounts"} className={panel === "accounts" ? "is-on" : undefined} onClick={() => onPanel("accounts")}>
            Accounts
          </button>
          <button type="button" role="tab" aria-selected={panel === "contacts"} className={panel === "contacts" ? "is-on" : undefined} onClick={() => onPanel("contacts")}>
            Contacts
          </button>
        </div>
      }
    />
  );
}
