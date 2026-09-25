import { Link } from "react-router-dom";
import { labMenuPath, useLabOperations } from "../labOperations";
import { SAMPLES } from "../samples";

const WEEK = {
  tat: "18.4 h",
  onTime: "94%",
  released: "126",
};

export function OpsOverviewPage() {
  const { menu } = useLabOperations();
  const title = menu.find((item) => item.view === "overview")?.label || "Overview";
  const open = SAMPLES.filter((sample) => sample.status !== "released");
  const stat = open.filter((sample) => sample.priority === "STAT");
  const hold = open.filter((sample) => sample.status === "hold");
  const review = open.filter((sample) => sample.status === "review" || sample.status === "approval");
  const stages = [
    { label: "Received", count: open.filter((sample) => sample.status === "received").length, to: labMenuPath("home") },
    { label: "In testing", count: open.filter((sample) => sample.status === "testing").length, to: labMenuPath("testing") },
    { label: "Review", count: review.length, to: labMenuPath("review") },
    { label: "On hold", count: hold.length, to: labMenuPath("home") },
  ];
  const sites = [...new Set(open.map((sample) => sample.site))].map((site) => ({
    site,
    count: open.filter((sample) => sample.site === site).length,
  }));

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Lab operations</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">
            Shift view of the queue, turnaround, and what is stuck. Sample work stays on Home.
          </p>
        </div>
        <Link className="btn btn-primary" to={labMenuPath("home")}>
          Open sample work
        </Link>
      </div>

      <div className="lims-kpi-row">
        <div className="lims-kpi">
          <span>Open in lab</span>
          <strong>{open.length}</strong>
          <small>Not yet released</small>
        </div>
        <div className="lims-kpi accent">
          <span>STAT open</span>
          <strong>{stat.length}</strong>
          <small>{stat.map((sample) => sample.accessionId).join(", ") || "None"}</small>
        </div>
        <div className="lims-kpi">
          <span>Awaiting review</span>
          <strong>{review.length}</strong>
          <small>Peer review and QA approval</small>
        </div>
        <div className="lims-kpi">
          <span>On hold</span>
          <strong>{hold.length}</strong>
          <small>{hold[0]?.custody || "Clear"}</small>
        </div>
      </div>

      <div className="lims-dash-grid">
        <section className="lims-panel">
          <div className="lims-panel-head">
            <h2>Queue by stage</h2>
          </div>
          <ul className="lims-list">
            {stages.map((stage) => (
              <li key={stage.label}>
                <div>
                  <b>
                    <Link to={stage.to}>{stage.label}</Link>
                  </b>
                  <small>Open samples in this stage</small>
                </div>
                <strong>{stage.count}</strong>
              </li>
            ))}
          </ul>
        </section>

        <aside className="lims-side-stack">
          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>This week</h2>
            </div>
            <ul className="lims-list">
              <li>
                <div>
                  <b>Turnaround</b>
                  <small>Average release time</small>
                </div>
                <strong>{WEEK.tat}</strong>
              </li>
              <li>
                <div>
                  <b>On time</b>
                  <small>Released inside target</small>
                </div>
                <strong>{WEEK.onTime}</strong>
              </li>
              <li>
                <div>
                  <b>Released</b>
                  <small>Samples closed this week</small>
                </div>
                <strong>{WEEK.released}</strong>
              </li>
            </ul>
          </section>
          <section className="lims-panel">
            <div className="lims-panel-head">
              <h2>Open by site</h2>
            </div>
            <ul className="lims-list">
              {sites.map((row) => (
                <li key={row.site}>
                  <b>{row.site}</b>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
