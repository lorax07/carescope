export type CrmAccount = {
  id: string;
  number: string;
  name: string;
  relationship: string;
  contact: string;
  status: "Active" | "On hold";
};

/** Client accounts owned by Healthcare CRM and reused by Sequence Revenue. */
export const CRM_ACCOUNTS: CrmAccount[] = [
  {
    id: "acc-vertex",
    number: "ACC-1042",
    name: "Vertex Materials",
    relationship: "Client",
    contact: "R. Okonkwo",
    status: "Active",
  },
  {
    id: "acc-aether",
    number: "ACC-1048",
    name: "Aether Pharma",
    relationship: "Client",
    contact: "L. Shah",
    status: "Active",
  },
  {
    id: "acc-cascade",
    number: "ACC-1055",
    name: "Cascade Nutraceuticals",
    relationship: "Client",
    contact: "D. Nguyen",
    status: "Active",
  },
  {
    id: "acc-summit",
    number: "ACC-1061",
    name: "Summit Generics",
    relationship: "Client",
    contact: "P. Alvarez",
    status: "Active",
  },
  {
    id: "acc-helix",
    number: "ACC-1070",
    name: "Helix Biologics",
    relationship: "Client",
    contact: "M. Brooks",
    status: "Active",
  },
  {
    id: "acc-northwind",
    number: "ACC-1077",
    name: "Northwind Foods",
    relationship: "Client",
    contact: "C. Ibarra",
    status: "On hold",
  },
];
