import { Link } from "react-router-dom";

type ModulePageProps = {
  eyebrow: string;
  title: string;
  lede: string;
  rows: { label: string; value: string; meta?: string; tone?: string }[];
};

function ModulePage({ eyebrow, title, lede, rows }: ModulePageProps) {
  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">{lede}</p>
        </div>
        <div className="lims-page-actions">
          <Link to="/app/workflows" className="btn">
            Related workflows
          </Link>
        </div>
      </div>
      <section className="lims-panel">
        <ul className="lims-list dense">
          {rows.map((row) => (
            <li key={row.label}>
              <div>
                <b>{row.label}</b>
                {row.meta ? <small>{row.meta}</small> : null}
              </div>
              <span className={`lims-badge ${row.tone ?? ""}`}>{row.value}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function TestsPage() {
  return (
    <ModulePage
      eyebrow="Test scheduling"
      title="Test schedule"
      lede="Methods queued against samples, instruments, and analyst availability."
      rows={[
        {
          label: "HPLC Assay · SCP-20491",
          value: "Running",
          meta: "Agilent 1260 · M. Chen",
          tone: "info",
        },
        {
          label: "Microbial Limits · SCP-20488",
          value: "Incubating",
          meta: "BacT · 36h remaining",
          tone: "warn",
        },
        {
          label: "Dissolution · SCP-20479",
          value: "Complete",
          meta: "Awaiting QA approval",
        },
        {
          label: "ICP-MS Metals · SCP-20471",
          value: "Queued",
          meta: "Instrument free at 13:30",
        },
      ]}
    />
  );
}

export function ResultsPage() {
  return (
    <ModulePage
      eyebrow="Results entry"
      title="Results & review"
      lede="Analytical results pending entry, verification, and electronic signature."
      rows={[
        {
          label: "SCP-20488 · Total aerobic count",
          value: "Peer review",
          meta: "Entered by J. Ortiz",
          tone: "warn",
        },
        {
          label: "SCP-20479 · Dissolution mean",
          value: "QA approval",
          meta: "Spec 80–110%",
          tone: "info",
        },
        {
          label: "SCP-20460 · Assay",
          value: "Released",
          meta: "E-signed · CoA generated",
        },
        {
          label: "SCP-20491 · Impurity RRT 1.12",
          value: "In entry",
          meta: "STAT · HPLC sequence active",
          tone: "danger",
        },
      ]}
    />
  );
}

export function InstrumentsPage() {
  return (
    <ModulePage
      eyebrow="Equipment"
      title="Instruments"
      lede="Operational status, calibration currency, and active sample assignments."
      rows={[
        {
          label: "Agilent 1260 HPLC",
          value: "In use",
          meta: "SCP-20491 · Cal OK",
          tone: "info",
        },
        {
          label: "Thermo Orbitrap Exploris",
          value: "Idle",
          meta: "Cal OK · ready",
        },
        {
          label: "BioMérieux BacT/ALERT",
          value: "Running",
          meta: "SCP-20488",
          tone: "info",
        },
        {
          label: "Metrohm Titrando 907",
          value: "Cal due",
          meta: "Due 2026-07-26",
          tone: "warn",
        },
      ]}
    />
  );
}

export function InventoryPage() {
  return (
    <ModulePage
      eyebrow="Materials"
      title="Inventory & reagents"
      lede="Lots, thresholds, and controlled materials supporting active methods."
      rows={[
        {
          label: "Acetonitrile HPLC · Lot AC-2291",
          value: "OK",
          meta: "14 L on hand",
        },
        {
          label: "Reference std · RS-APX-04",
          value: "Low",
          meta: "Below reorder · 2 vials",
          tone: "warn",
        },
        {
          label: "Tryptic soy agar · Lot TS-881",
          value: "OK",
          meta: "Expires 2026-09-12",
        },
        {
          label: "ICP multi-element std",
          value: "Quarantine",
          meta: "COA pending",
          tone: "danger",
        },
      ]}
    />
  );
}

export function QualityPage() {
  return (
    <ModulePage
      eyebrow="Quality system"
      title="Quality events"
      lede="Deviations, non-conformances, and CAPA linked to laboratory work."
      rows={[
        {
          label: "DEV-118 · Out-of-temp excursion",
          value: "Open",
          meta: "Linked sample SCP-20458",
          tone: "danger",
        },
        {
          label: "NCR-042 · Label mismatch",
          value: "Investigation",
          meta: "Intake · East Lab",
          tone: "warn",
        },
        {
          label: "CAPA-015 · Training effectiveness",
          value: "Verification",
          meta: "Owner: QA",
          tone: "info",
        },
        {
          label: "CC-009 · Method update HPLC-12",
          value: "Approved",
          meta: "Effective 2026-08-01",
        },
      ]}
    />
  );
}
