/** Relational shape for Sequence CRM accounts and contacts. See schema.sql. */

export type CrmAccountRow = {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  relationship: string;
  industry: string;
  ownerName: string;
  status: string;
  health: string;
  billTo: string;
  payer: string;
  pricing: string;
};

export type CrmContactRow = {
  id: string;
  tenantId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type CrmAccountContactRow = {
  accountId: string;
  contactId: string;
  isPrimary: boolean;
};

export const CRM_TABLES = ["crm_accounts", "crm_contacts", "crm_account_contacts"] as const;
