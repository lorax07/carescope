import { Link } from "react-router-dom";

const QUEUE = [
  {
    id: "SCP-20491",
    client: "Aether Pharma",
    test: "HPLC Assay · USP",
    status: "testing",
    priority: "STAT",
    analyst: "M. Chen",
    due: "Today 14:00",
  },
  {
    id: "SCP-20488",
    client: "Northwind Foods",
    test: "Microbial Limits",
    status: "review",
    priority: "Routine",
    analyst: "J. Ortiz",
    due: "Today 16:30",
  },
  {
    id: "SCP-20485",
    client: "Helix Biologics",
    test: "Potency · ELISA",
    status: "received",
    priority: "Rush",
    analyst: "Unassigned",
    due: "Tomorrow 09:00",
  },
  {
    id: "SCP-20479",
    client: "Summit Generics",
    test: "Dissolution",
    status: "approval",
    priority: "Routine",
    analyst: "A. Patel",
    due: "Today 17:00",
  },
  {
    id: "SCP-20471",
    client: "Cascade Nutraceuticals",
    test: "Heavy Metals ICP-MS",
    status: "testing",
    priority: "Routine",
    analyst: "M. Chen",
    due: "Tomorrow 11:00",
  },
] as const;

const INSTRUMENTS = [
  { name: "Agilent 1260 HPLC", status: "In use", sample: "SCP-20491" },
  { name: "Thermo Orbitrap", status: "Idle", sample: "—" },
  { name: "BioMérieux BacT", status: "Running", sample: "SCP-20488" },
  { name: "Metrohm Titrando", status: "Cal due", sample: "—" },
] as const;

export function DashboardPage() {
  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Operations</p>
          <h1>Laboratory dashboard</h1>
          <p className="lims-page-lede">
            Live work across sample intake, testing, review, and release for North Lab.
          </p>
        </div>
        <div className="lims-page-actions">
          <Link to="/app/samples" className="btn">
            Sample worklist
          </Link>
          <Link to="/app/workflows" className="btn btn-primary">
            Automations
          </Link>
        </div>
      </div>

      <div className="lims-kpi-row">
        <div className="lims-kpi">
          <span>In lab</span>
          <strong>47</strong>
          <small>+6 since morning board</small>
        </div>
        <div className="lims-kpi accent">
          <span>STAT open</span>
          <strong>3</strong>
          <small>1 awaiting assignment</small>
        </div>
        <div className="lims-kpi">
          <span>Pending review</span>
          <strong>12</strong>
          <small>4 past target TAT</small>
        </div>
        <div className="lims-kpi">
          <span>Ready to release</span>
          <strong>8</strong>
          <small>CoA queue</small>
        </div>
      </div>

      <div className="lims-dash-grid">
        <section className="lims-panel">
          <div className="lims-panel-head">
            <h2>Active sample queue</h2>
            <Link to="/app/samples">View all</Link>
          </div>
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Accession</th>
                  <th>Client</th>
                  <th>Test</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Analyst</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {QUEUE.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to="/app/samples" className="lims-mono">
                        {row.id}
                      </Link>
                    </td>
                    <td>{row.client}</td>
                    <td>{row.test}</td>
                    <td>
                      <span
                        className={`lims-badge ${
                          row.priority === "STAT"
                            ? "danger"
                            : row.priority === "Rush"
                              ? "warn"
                              : ""
                        }`}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`lims-status ${row.status}`}>
                        {labelStatus(row.status)}
                      </span>
                    </td>
                    <td>{row.analyst}</td>
                    <td>{row.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="lims-side-stack">
          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Instruments</h2>
            </div>
            <ul className="lims-list">
              {INSTRUMENTS.map((inst) => (
                <li key={inst.name}>
                  <div>
                    <b>{inst.name}</b>
                    <small>{inst.sample}</small>
                  </div>
                  <span
                    className={`lims-badge ${
                      inst.status === "Cal due"
                        ? "warn"
                        : inst.status === "In use" || inst.status === "Running"
                          ? "info"
                          : ""
                    }`}
                  >
                    {inst.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Today’s checkpoints</h2>
            </div>
            <ul className="lims-checklist">
              <li className="done">Morning instrument suitability</li>
              <li className="done">Reagent lot verification</li>
              <li>STAT HPLC peer review</li>
              <li>Stability pull · Chamber B</li>
              <li>QA CoA batch sign-off</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function labelStatus(status: string): string {
  switch (status) {
    case "received":
      return "Received";
    case "testing":
      return "In testing";
    case "review":
      return "Peer review";
    case "approval":
      return "QA approval";
    default:
      return status;
  }
}
