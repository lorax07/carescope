import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { closeCrmRecordTab, crmListPath, listCrmRecordTabs, openCrmRecordTab, recordPath, subscribeCrmRecordTabs, type CrmRecordTab } from "../../crmRecordTabs";

export function CrmAccountLink({
  accountId,
  title,
  contactId,
  className,
  children,
}: {
  accountId: string;
  title: string;
  contactId?: string;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const tab: CrmRecordTab = contactId
    ? { key: `contact:${contactId}`, kind: "contact", accountId, contactId, title }
    : { key: `account:${accountId}`, kind: "account", accountId, title };
  return (
    <button type="button" className={className ?? "crm-record-link"} onClick={() => { openCrmRecordTab(tab); navigate(recordPath(tab)); }}>
      {children}
    </button>
  );
}

export function useCrmRecordTabs(): CrmRecordTab[] {
  const [tabs, setTabs] = useState<CrmRecordTab[]>(() => listCrmRecordTabs());
  useEffect(() => subscribeCrmRecordTabs(() => setTabs(listCrmRecordTabs())), []);
  return tabs;
}

export function CrmRecordStrip({ activeKey, panel }: { activeKey?: string; panel: "accounts" | "contacts" }) {
  const kind = panel === "contacts" ? "contact" : "account";
  const tabs = useCrmRecordTabs().filter((tab) => tab.kind === kind);
  const home = crmListPath(panel);
  const navigate = useNavigate();
  return (
    <div className="crm-record-strip" role="tablist" aria-label={panel === "contacts" ? "Open contacts" : "Open accounts"}>
      <Link to={home} role="tab" aria-selected={!activeKey} className={!activeKey ? "is-on" : undefined}>
        Home
      </Link>
      {tabs.map((tab) => {
        const on = tab.key === activeKey;
        return (
          <span key={tab.key} className={on ? "is-on" : undefined}>
            <Link to={recordPath(tab)} role="tab" aria-selected={on}>
              {tab.title}
            </Link>
            <button
              type="button"
              aria-label={`Close ${tab.title}`}
              onClick={() => {
                closeCrmRecordTab(tab.key);
                if (on) navigate(home);
              }}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}
