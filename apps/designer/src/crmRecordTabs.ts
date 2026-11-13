export const CRM_RECORD_TAB_LIMIT = 10;

export type CrmRecordTab = {
  key: string;
  kind: "account" | "contact";
  accountId: string;
  contactId?: string;
  title: string;
};

const TABS_KEY = "carescope.crm.record-tabs";
const HOME_KEY = "carescope.crm.home-panel";
const SUBTAB_KEY = "carescope.crm.active-subtab";
const EVENT = "carescope-crm-tabs";

function readTabs(): CrmRecordTab[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TABS_KEY) || "[]") as CrmRecordTab[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.key === "string").slice(-CRM_RECORD_TAB_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeTabs(tabs: CrmRecordTab[]) {
  const next = tabs.slice(-CRM_RECORD_TAB_LIMIT);
  sessionStorage.setItem(TABS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export function rememberCrmHome(panel: "accounts" | "contacts") {
  sessionStorage.setItem(HOME_KEY, panel);
}

export function crmHomePanel(): "accounts" | "contacts" {
  return sessionStorage.getItem(HOME_KEY) === "contacts" ? "contacts" : "accounts";
}

export function crmHomePath(): string {
  return crmListPath(crmHomePanel());
}

export function crmListPath(panel: "accounts" | "contacts"): string {
  return panel === "contacts" ? "/app/connectivity/clients?panel=contacts" : "/app/connectivity/clients";
}

function readSubtabs(): { accounts: string; contacts: string } {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SUBTAB_KEY) || "{}") as { accounts?: unknown; contacts?: unknown };
    return {
      accounts: typeof parsed.accounts === "string" ? parsed.accounts : "home",
      contacts: typeof parsed.contacts === "string" ? parsed.contacts : "home",
    };
  } catch {
    return { accounts: "home", contacts: "home" };
  }
}

export function rememberCrmSubtab(panel: "accounts" | "contacts", key: string) {
  const current = readSubtabs();
  current[panel] = key;
  sessionStorage.setItem(SUBTAB_KEY, JSON.stringify(current));
}

/** The list, or the record that was last open under Accounts or Contacts. */
export function crmSubtabPath(panel: "accounts" | "contacts"): string {
  const key = readSubtabs()[panel];
  const kind = panel === "contacts" ? "contact" : "account";
  const tab = key && key !== "home" ? readTabs().find((item) => item.key === key && item.kind === kind) : undefined;
  return tab ? recordPath(tab) : crmListPath(panel);
}

export function listCrmRecordTabs(): CrmRecordTab[] {
  return readTabs();
}

/** Newest tab stays. The oldest drops off once eleven records are open. */
export function openCrmRecordTab(tab: CrmRecordTab): CrmRecordTab[] {
  const without = readTabs().filter((item) => item.key !== tab.key);
  return writeTabs([...without, tab]);
}

export function closeCrmRecordTab(key: string): CrmRecordTab[] {
  const next = writeTabs(readTabs().filter((item) => item.key !== key));
  const memory = readSubtabs();
  if (memory.accounts === key) rememberCrmSubtab("accounts", "home");
  if (memory.contacts === key) rememberCrmSubtab("contacts", "home");
  return next;
}

export function recordPath(tab: Pick<CrmRecordTab, "accountId" | "contactId">): string {
  return tab.contactId ? `/app/connectivity/clients/${tab.accountId}?contact=${encodeURIComponent(tab.contactId)}` : `/app/connectivity/clients/${tab.accountId}`;
}

export function subscribeCrmRecordTabs(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
