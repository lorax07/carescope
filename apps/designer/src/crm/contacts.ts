import type { AccountContact, CrmAccount } from "../crmAccounts";
import type { ContactRecord, ContactType } from "./types";

export function contactTypeFor(role: string): ContactType {
  const value = role.toLowerCase();
  if (value.includes("bill") || value.includes("payable") || value.includes("payer")) return "billing";
  if (value.includes("it ")) return "it";
  if (value.includes("lab")) return "lab_manager";
  if (value.includes("office")) return "office_manager";
  if (value.includes("director") || value.includes("executive") || value.includes("program")) return "executive";
  if (value.includes("provider") || value.includes("order")) return "ordering_provider";
  if (value.includes("quality") || value.includes("qa") || value.includes("regulatory") || value.includes("cmc") || value.includes("clinical")) {
    return "clinical";
  }
  return "other";
}

export function contactId(accountId: string, contact: AccountContact): string {
  return `${accountId}:${contact.email}`;
}

export function contactsFor(account: CrmAccount, tenantId: string): ContactRecord[] {
  return account.contacts.map((contact, index) => ({
    id: contactId(account.id, contact),
    tenantId,
    accountId: account.id,
    accountName: account.name,
    name: contact.name,
    title: contact.role,
    department: contact.role,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    contactType: contactTypeFor(contact.role),
    primary: index === 0,
    active: true,
  }));
}

export function allContacts(accounts: CrmAccount[], tenantId: string): ContactRecord[] {
  return accounts.flatMap((account) => contactsFor(account, tenantId));
}
