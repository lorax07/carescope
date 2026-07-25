import { Link } from "react-router-dom";

type SampleRow = {
  id: string;
  received: string;
  client: string;
  matrix: string;
  tests: string;
  status: "received" | "testing" | "review" | "approval" | "released" | "hold";
  priority: "STAT" | "Rush" | "Routine";
  custody: string;
  site: string;
};

const SAMPLES: SampleRow[] = [
  {
    id: "SCP-20491",
    received: "2026-07-25 08:12",
    client: "Aether Pharma",
    matrix: "Finished product",
    tests: "HPLC Assay, Impurities",
    status: "testing",
    priority: "STAT",
    custody: "Bench 3 · QR verified",
    site: "North Lab",
  },
  {
    id: "SCP-20488",
    received: "2026-07-25 07:40",
    client: "Northwind Foods",
    matrix: "Raw material",
    tests: "Microbial Limits",
    status: "review",
    priority: "Routine",
    custody: "Micro suite",
    site: "North Lab",
  },
  {
    id: "SCP-20485",
    received: "2026-07-25 07:18",
    client: "Helix Biologics",
    matrix: "Drug substance",
    tests: "Potency ELISA",
    status: "received",
    priority: "Rush",
    custody: "Intake rack A",
    site: "North Lab",
  },
  {
    id: "SCP-20479",
    received: "2026-07-24 16:55",
    client: "Summit Generics",
    matrix: "Tablet",
    tests: "Dissolution",
    status: "approval",
    priority: "Routine",
    custody: "QA hold",
    site: "North Lab",
  },
  {
    id: "SCP-20471",
    received: "2026-07-24 15:10",
    client: "Cascade Nutraceuticals",
    matrix: "Powder",
    tests: "Heavy Metals ICP-MS",
    status: "testing",
    priority: "Routine",
    custody: "Metals lab",
    site: "North Lab",
  },
  {
    id: "SCP-20460",
    received: "2026-07-24 11:02",
    client: "Aether Pharma",
    matrix: "Stability pull",
    tests: "Assay, Appearance",
    status: "released",
    priority: "Routine",
    custody: "Archive",
    site: "North Lab",
  },
  {
    id: "SCP-20458",
    received: "2026-07-24 09:44",
    client: "Vertex Materials",
    matrix: "Polymer",
    tests: "Identity FTIR",
    status: "hold",
    priority: "Rush",
    custody: "Deviation DEV-118",
    site: "East Lab",
  },
];

const STATUS_LABEL: Record<SampleRow["status"], string> = {
  received: "Received",
  testing: "In testing",
  review: "Peer review",
  approval: "QA approval",
  released: "Released",
  hold: "On hold",
};

export function SamplesPage() {
  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Sample lifecycle</p>
          <h1>Sample worklist</h1>
          <p className="lims-page-lede">
            Accession, custody, and test assignment for samples currently in the laboratory.
          </p>
        </div>
        <div className="lims-page-actions">
          <button type="button" className="btn">
            Scan barcode
          </button>
          <button type="button" className="btn btn-primary">
            Receive sample
          </button>
        </div>
      </div>

      <div className="lims-filter-bar">
        <button type="button" className="lims-filter active">
          All open
        </button>
        <button type="button" className="lims-filter">
          STAT
        </button>
        <button type="button" className="lims-filter">
          In testing
        </button>
        <button type="button" className="lims-filter">
          Review
        </button>
        <button type="button" className="lims-filter">
          On hold
        </button>
      </div>

      <section className="lims-panel">
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Accession</th>
                <th>Received</th>
                <th>Client</th>
                <th>Matrix</th>
                <th>Tests</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Custody</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLES.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="lims-mono lims-linkish">{s.id}</span>
                  </td>
                  <td className="lims-mono muted">{s.received}</td>
                  <td>{s.client}</td>
                  <td>{s.matrix}</td>
                  <td>{s.tests}</td>
                  <td>
                    <span
                      className={`lims-badge ${
                        s.priority === "STAT"
                          ? "danger"
                          : s.priority === "Rush"
                            ? "warn"
                            : ""
                      }`}
                    >
                      {s.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`lims-status ${s.status}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td>{s.custody}</td>
                  <td>{s.site}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="lims-footnote">
        Sample events can trigger CareScope workflows —{" "}
        <Link to="/app/workflows">configure automations</Link> for receive, assign,
        review, and CoA release.
      </p>
    </div>
  );
}
