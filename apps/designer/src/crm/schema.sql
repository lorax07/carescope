-- Sequence CRM account and contact tables.
-- A contact can belong to more than one account through crm_account_contacts.

create table crm_accounts (
  id text primary key,
  tenant_id text not null,
  number text not null,
  name text not null,
  relationship text not null,
  industry text not null,
  owner_name text not null,
  status text not null,
  health text not null,
  bill_to text not null,
  payer text not null,
  pricing text not null
);

create table crm_contacts (
  id text primary key,
  tenant_id text not null,
  name text not null,
  role text not null,
  email text not null default '',
  phone text not null default ''
);

create table crm_account_contacts (
  account_id text not null references crm_accounts (id),
  contact_id text not null references crm_contacts (id),
  is_primary boolean not null default false,
  primary key (account_id, contact_id)
);

create index crm_account_contacts_contact_idx on crm_account_contacts (contact_id);
