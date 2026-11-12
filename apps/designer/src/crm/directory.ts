import { CRM_ACCOUNTS, type AccountContact, type CrmAccount } from "../crmAccounts";
import { contactId } from "./contacts";
import type { CrmOverlay } from "./types";

export type DirectoryContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  accountIds: string[];
};

function row(id: string, contact: AccountContact, accountId: string): DirectoryContact {
  return { id, name: contact.name, role: contact.role, email: contact.email, phone: contact.phone, accountIds: [accountId] };
}

function baseAccounts(overlay: CrmOverlay): CrmAccount[] {
  const extras = overlay.extraAccounts ?? [];
  return extras.length ? [...CRM_ACCOUNTS, ...extras] : CRM_ACCOUNTS;
}

export function directoryContacts(overlay: CrmOverlay): DirectoryContact[] {
  const byId = new Map<string, DirectoryContact>();
  for (const account of baseAccounts(overlay)) {
    account.contacts.forEach((contact, index) => {
      const id = contactId(account.id, contact, index);
      const current = byId.get(id);
      if (current) current.accountIds.push(account.id);
      else byId.set(id, row(id, contact, account.id));
    });
    (overlay.extraContacts?.[account.id] ?? []).forEach((contact, index) => {
      const id = `extra:${account.id}:${index}:${contact.email || contact.name}`;
      byId.set(id, row(id, contact, account.id));
    });
  }
  for (const contact of overlay.contacts ?? []) {
    const current = byId.get(contact.id);
    if (current) {
      current.name = contact.name;
      current.role = contact.role;
      current.email = contact.email;
      current.phone = contact.phone;
    } else byId.set(contact.id, { ...contact, accountIds: [] });
  }
  for (const link of overlay.removedLinks ?? []) {
    const contact = byId.get(link.contactId);
    if (!contact) continue;
    contact.accountIds = contact.accountIds.filter((id) => id !== link.accountId);
  }
  for (const link of overlay.accountContactLinks ?? []) {
    const contact = byId.get(link.contactId);
    if (contact && !contact.accountIds.includes(link.accountId)) contact.accountIds.push(link.accountId);
  }
  return [...byId.values()];
}

export function contactsOnAccount(accountId: string, overlay: CrmOverlay): DirectoryContact[] {
  return directoryContacts(overlay).filter((contact) => contact.accountIds.includes(accountId));
}
