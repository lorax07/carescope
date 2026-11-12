import { beforeAll, describe, expect, it } from "vitest";
import { CRM_RECORD_TAB_LIMIT, closeCrmRecordTab, listCrmRecordTabs, openCrmRecordTab, type CrmRecordTab } from "./crmRecordTabs";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, String(value)); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => { map.clear(); },
  };
}

beforeAll(() => {
  Object.defineProperty(globalThis, "sessionStorage", { value: memoryStore(), configurable: true });
  if (typeof globalThis.window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      value: { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} },
      configurable: true,
    });
  }
});

function tab(index: number): CrmRecordTab {
  return { key: `account:acc-${index}`, kind: "account", accountId: `acc-${index}`, title: `Account ${index}` };
}

describe("CRM record tabs", () => {
  it("keeps ten open records and drops the oldest", () => {
    sessionStorage.clear();
    for (let index = 1; index <= 11; index += 1) openCrmRecordTab(tab(index));
    const tabs = listCrmRecordTabs();
    expect(tabs).toHaveLength(CRM_RECORD_TAB_LIMIT);
    expect(tabs.some((item) => item.key === "account:acc-1")).toBe(false);
    expect(tabs.at(-1)?.key).toBe("account:acc-11");
    closeCrmRecordTab("account:acc-11");
    expect(listCrmRecordTabs().some((item) => item.key === "account:acc-11")).toBe(false);
  });
});
