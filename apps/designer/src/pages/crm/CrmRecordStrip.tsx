import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { closeCrmRecordTab, crmHomePath, listCrmRecordTabs, openCrmRecordTab, recordPath, subscribeCrmRecordTabs, type CrmRecordTab } from "../../crmRecordTabs";

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

export function CrmRecordStrip({ activeKey }: { activeKey?: string }) {
  const tabs = useCrmRecordTabs();
  const navigate = useNavigate();
  return (
    <div className="crm-record-strip" role="tablist" aria-label="Open records">
      <Link to={crmHomePath()} role="tab" aria-selected={!activeKey} className={!activeKey ? "is-on" : undefined}>
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
                if (on) navigate(crmHomePath());
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
