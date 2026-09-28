import { useState } from "react";
import { CrmAccountList } from "../components/CrmAccountList";

type BillingArea = {
  label: string;
  note: string;
  columns: string[];
  rows: string[][];
};

const AREAS: BillingArea[] = [
  {
    label: "Charge capture",
    note: "Charges posted from released and in-process accessions.",
    columns: ["Accession", "Account", "Test", "Amount", "Status"],
    rows: [
      ["SCP-20458", "Vertex Materials", "Identity FTIR", "$160.00", "Captured"],
      ["SCP-20471", "Cascade Nutraceuticals", "Heavy Metals ICP-MS", "$420.00", "Captured"],
      ["SCP-20491", "Aether Pharma", "HPLC Assay", "$198.00", "Ready"],
      ["SCP-20496", "Summit Generics", "Uniformity", "$275.00", "Held"],
    ],
  },
  {
    label: "Test pricing",
    note: "List price for each billable test.",
    columns: ["Test", "CPT/HCPCS", "List price", "Unit"],
    rows: [
      ["Identity FTIR", "82542", "$186.00", "Sample"],
      ["HPLC Assay", "80150", "$240.00", "Sample"],
      ["Heavy Metals ICP-MS", "82175", "$420.00", "Sample"],
      ["Dissolution", "80299", "$260.00", "Sample"],
      ["Uniformity", "80375", "$310.00", "Sample"],
      ["Potency ELISA", "83520", "$390.00", "Sample"],
      ["Salmonella", "87045", "$175.00", "Sample"],
    ],
  },
  {
    label: "Client-specific pricing",
    note: "Contract prices that override the test list price.",
    columns: ["Account", "Test", "List price", "Contract price", "Agreement"],
    rows: [
      ["Vertex Materials", "Identity FTIR", "$186.00", "$160.00", "VM-12"],
      ["Aether Pharma", "HPLC Assay", "$240.00", "$198.00", "AP-4"],
      ["Summit Generics", "Uniformity", "$310.00", "$275.00", "SG-9"],
      ["Northwind Foods", "Salmonella", "$175.00", "$150.00", "NW-2"],
    ],
  },
  {
    label: "Insurance billing",
    note: "Claims billed to a payer for an account.",
    columns: ["Claim", "Account", "Payer", "Accession", "Amount", "Status"],
    rows: [
      ["CLM-88421", "Summit Generics", "UnitedHealthcare", "SCP-20496", "$275.00", "Submitted"],
      ["CLM-88302", "Aether Pharma", "Aetna Commercial", "SCP-20460", "$198.00", "Paid"],
      ["CLM-88110", "Helix Biologics", "Patient", "SCP-20485", "$390.00", "Denied"],
    ],
  },
  {
    label: "CPT/HCPCS codes",
    note: "Procedure codes mapped to laboratory tests.",
    columns: ["Code", "System", "Description", "Test"],
    rows: [
      ["82542", "CPT", "Column chromatography, qualitative or quantitative", "Identity FTIR"],
      ["80150", "CPT", "Drug assay, quantitative", "HPLC Assay"],
      ["82175", "CPT", "Arsenic", "Heavy Metals ICP-MS"],
      ["80299", "CPT", "Quantitation of drug, not otherwise specified", "Dissolution"],
      ["80375", "CPT", "Drug or substance, definitive, not otherwise specified", "Uniformity"],
      ["83520", "CPT", "Immunoassay, quantitative", "Potency ELISA"],
      ["87045", "CPT", "Culture, bacterial, stool", "Salmonella"],
    ],
  },
  {
    label: "ICD-10 codes",
    note: "Diagnosis codes accepted on claims for these accounts.",
    columns: ["Code", "Description", "Used by"],
    rows: [
      ["Z01.89", "Encounter for other specified special examination", "Summit Generics"],
      ["R79.89", "Other specified abnormal findings of blood chemistry", "Aether Pharma"],
      ["Z13.89", "Encounter for screening for other disorder", "Helix Biologics"],
      ["Z02.89", "Encounter for other administrative examinations", "Cascade Nutraceuticals"],
    ],
  },
  {
    label: "Payer information",
    note: "Payers the laboratory bills for CRM accounts.",
    columns: ["Payer", "Payer ID", "Plan", "Accounts", "Route"],
    rows: [
      ["Aetna Commercial", "60054", "PPO", "Aether Pharma", "837P"],
      ["UnitedHealthcare", "87726", "Choice Plus", "Summit Generics", "837P"],
      ["Patient", "SELF", "Self-pay", "Helix Biologics", "Statement"],
      ["Client accounts payable", "CLIENT", "Net 30", "Vertex Materials, Cascade Nutraceuticals, Northwind Foods", "Invoice"],
    ],
  },
  {
    label: "Claim data",
    note: "Claim headers ready for submission or already sent.",
    columns: ["Claim", "Account", "Type", "Accession", "Amount", "Status"],
    rows: [
      ["CLM-88421", "Summit Generics", "837P", "SCP-20496", "$275.00", "Submitted"],
      ["CLM-88302", "Aether Pharma", "837P", "SCP-20460", "$198.00", "Paid"],
      ["CLM-88110", "Helix Biologics", "837P", "SCP-20485", "$390.00", "Denied"],
    ],
  },
  {
    label: "Self-pay",
    note: "Patient responsibility billed directly to the account.",
    columns: ["Account", "Statement", "Accession", "Balance", "Status"],
    rows: [["Helix Biologics", "ST-220", "SCP-20485", "$390.00", "Due"]],
  },
  {
    label: "Client billing",
    note: "Invoices sent to the client account.",
    columns: ["Invoice", "Account", "Accession", "Amount", "Terms", "Status"],
    rows: [
      ["INV-4418", "Vertex Materials", "SCP-20458", "$160.00", "Net 30", "Open"],
      ["INV-4420", "Cascade Nutraceuticals", "SCP-20471", "$420.00", "Net 30", "Paid"],
      ["INV-4390", "Northwind Foods", "SCP-20494", "$150.00", "Net 30", "Held"],
    ],
  },
  {
    label: "Billing edits/holds",
    note: "Charges stopped until the edit is cleared.",
    columns: ["Accession", "Account", "Edit", "Owner", "Status"],
    rows: [
      ["SCP-20496", "Summit Generics", "ICD-10 required before claim", "Billing", "Held"],
      ["SCP-20494", "Northwind Foods", "Account is on hold", "CRM", "Held"],
      ["SCP-20491", "Aether Pharma", "Payer ID check", "Billing", "Ready"],
    ],
  },
  {
    label: "Rebilling",
    note: "Corrected claims waiting to be sent again.",
    columns: ["Original claim", "Account", "Correction", "Amount", "Status"],
    rows: [
      ["CLM-88110", "Helix Biologics", "Add ICD-10 Z13.89", "$390.00", "Queued"],
      ["CLM-87944", "Cascade Nutraceuticals", "Frequency denial, new date of service", "$420.00", "Sent"],
    ],
  },
  {
    label: "Denials and exceptions",
    note: "Payer denials and billing exceptions on CRM accounts.",
    columns: ["Claim", "Account", "Code", "Reason", "Status"],
    rows: [
      ["CLM-88110", "Helix Biologics", "CO-16", "Claim lacks information", "Open"],
      ["CLM-87944", "Cascade Nutraceuticals", "CO-18", "Duplicate claim", "Rebilled"],
    ],
  },
  {
    label: "Payment status",
    note: "What has been paid, what is pending, and what is still due.",
    columns: ["Document", "Account", "Billed", "Paid", "Balance", "Status"],
    rows: [
      ["CLM-88302", "Aether Pharma", "$198.00", "$198.00", "$0.00", "Paid"],
      ["INV-4420", "Cascade Nutraceuticals", "$420.00", "$420.00", "$0.00", "Paid"],
      ["CLM-88421", "Summit Generics", "$275.00", "$0.00", "$275.00", "Pending"],
      ["INV-4418", "Vertex Materials", "$160.00", "$0.00", "$160.00", "Open"],
      ["ST-220", "Helix Biologics", "$390.00", "$0.00", "$390.00", "Denied"],
    ],
  },
  {
    label: "Revenue reporting",
    note: "Charges, payments, denials, and holds by CRM account.",
    columns: ["Account", "Captured", "Paid", "Open", "Denied or held"],
    rows: [
      ["Vertex Materials", "$160.00", "$0.00", "$160.00", "$0.00"],
      ["Aether Pharma", "$198.00", "$198.00", "$0.00", "$0.00"],
      ["Cascade Nutraceuticals", "$420.00", "$420.00", "$0.00", "$0.00"],
      ["Summit Generics", "$275.00", "$0.00", "$275.00", "$275.00"],
      ["Helix Biologics", "$390.00", "$0.00", "$390.00", "$390.00"],
      ["Northwind Foods", "$150.00", "$0.00", "$0.00", "$150.00"],
    ],
  },
];

function badgeTone(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("denied") || text.includes("open")) return " danger";
  if (text.includes("held") || text.includes("pending") || text.includes("due") || text.includes("queued") || text.includes("ready")) {
    return " warn";
  }
  if (text.includes("paid") || text.includes("captured") || text.includes("sent") || text.includes("submitted") || text.includes("rebilled")) {
    return " info";
  }
  return "";
}

export function BillingPage() {
  const [areaLabel, setAreaLabel] = useState(AREAS[0].label);
  const area = AREAS.find((item) => item.label === areaLabel) ?? AREAS[0];

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Billing</p>
          <h1>Billing & Revenue</h1>
          <p className="lims-page-lede">
            Capture charges, price tests, bill payers and clients, and follow claims through payment. Accounts are the Healthcare CRM account list.
          </p>
        </div>
      </div>

      <div className="lims-kpi-row">
        <div className="lims-kpi">
          <span>Captured</span>
          <strong>$1,593</strong>
          <small>Charges on CRM accounts</small>
        </div>
        <div className="lims-kpi">
          <span>Paid</span>
          <strong>$618</strong>
          <small>Posted payments</small>
        </div>
        <div className="lims-kpi accent">
          <span>Open denials</span>
          <strong>1</strong>
          <small>Helix Biologics · CO-16</small>
        </div>
        <div className="lims-kpi">
          <span>On hold</span>
          <strong>$425</strong>
          <small>Edits waiting to clear</small>
        </div>
      </div>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>{area.label}</h2>
        </div>
        <div className="billing-areas" role="tablist" aria-label="Billing work">
          {AREAS.map((item) => (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={item.label === area.label}
              className={`btn btn-mini${item.label === area.label ? " is-on" : ""}`}
              onClick={() => setAreaLabel(item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="billing-note">{area.note}</p>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                {area.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {area.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, index) => (
                    <td key={`${cell}-${index}`} className={index === 0 ? "lims-mono" : undefined}>
                      {index === row.length - 1 && badgeTone(cell) ? <span className={`lims-badge${badgeTone(cell)}`}>{cell}</span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Accounts</h2>
        </div>
        <p className="billing-note">The same account list used in Healthcare CRM.</p>
        <CrmAccountList />
      </section>
    </div>
  );
}
