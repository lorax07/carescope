import { Link } from "react-router-dom";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="lp">
      <div className="lp-frame">
        <header className="lp-nav">
          <Link to="/" className="lp-logo" aria-label="CareScope Sequence home">
            <span className="lp-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" width="34" height="34">
                <defs>
                  <linearGradient id="cs-mark" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#5b46f5" />
                    <stop offset="1" stopColor="#3b8cff" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#cs-mark)"
                  d="M9 20c0-7.2 5.2-13 12.2-13 1.6 0 3.1.3 4.5.8C21.4 9.6 17.6 14 17.6 20c0 6.2 4.2 11 9.4 12.2-1.4.5-2.9.8-4.5.8C14.2 33 9 27.2 9 20Z"
                />
                <path
                  fill="#7c6bff"
                  d="M20.2 15.2c1.6-3.6 5.2-5.6 8.8-4.6 3.8.9 6.5 4.4 6.5 8.8 0 5.6-4.4 10.2-10 10.2-1.6 0-3.1-.3-4.5-1 3.6-.8 6.4-4 6.4-7.8 0-2.2-.8-4.2-2.2-5.6-1.6 0-3.4.2-5 0Z"
                />
              </svg>
            </span>
            <span className="lp-logo-word">CareScope</span>
            <span className="lp-logo-rule" aria-hidden="true" />
            <span className="lp-logo-sequence">Sequence</span>
          </Link>

          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#capabilities">Solutions</a>
            <a href="#workflows">Resources</a>
            <a href="#compliance">About</a>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/app?signup=1" className="lp-btn lp-btn-demo">
              Request a Demo
            </Link>
          </div>
          <span className="lp-nav-wave" aria-hidden="true" />
        </header>

        <PlatformBand />
      </div>

      <WhatWeSolve />

      <section className="lp-section lp-section-tint" id="workflows">
        <div className="lp-section-inner lp-section-wide lp-workflow-block">
          <div>
            <p className="lp-eyebrow">Workflow engine</p>
            <h2 className="lp-h2">Automate laboratory process by design.</h2>
            <p className="lp-section-lede">
              A visual, no-code orchestration layer for approvals, instrument
              actions, notifications, and compliance checks — configurable for
              every module above.
            </p>
            <Link to="/app/workflows" className="lp-btn lp-btn-primary">
              Open workflow designer
            </Link>
          </div>
          <div className="lp-workflow-panel" aria-hidden="true">
            <WorkflowMiniCanvas />
          </div>
        </div>
      </section>

      <section className="lp-section" id="compliance">
        <div className="lp-section-inner lp-section-wide">
          <p className="lp-eyebrow">Trust</p>
          <h2 className="lp-h2">Governed for regulated environments.</h2>
          <p className="lp-section-lede">
            Immutable execution logs, e-signatures, document control, and
            multi-site isolation so audits are prepared continuously — not
            reconstructed later.
          </p>
          <ul className="lp-trust-list">
            <li>21 CFR Part 11–ready electronic signatures</li>
            <li>Chain of custody with scan-verified transfers</li>
            <li>Versioned workflows with publish, rollback, and simulation</li>
            <li>Tenant-isolated operations across laboratory sites</li>
          </ul>
        </div>
      </section>

      <section className="lp-cta-band">
        <div className="lp-cta-band-inner lp-section-wide">
          <h2 className="lp-h2">Bring pedigree to your laboratory stack.</h2>
          <p>
            Configure CareScope around your methods, sites, and quality system —
            then automate the rest through the workflow engine.
          </p>
          <Link to="/app?signup=1" className="lp-btn lp-btn-primary lp-btn-lg">
            Try OneLab
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner lp-section-wide">
          <img
            className="lp-footer-logo"
            src="/carescope-parent-logo.png"
            alt="CareScope. Building Better Healthcare for Everyone."
          />
          <nav>
            <a href="/intrasite" className="lp-footer-intrasite">
              Sequence Intrasite Access
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

const LIMS_FUNCTIONS = [
  "System setup and workflow configuration",
  "Instrument connectivity",
  "EHR, billing, and other interfaces",
  "Data migration",
  "Reporting and output",
  "Training and go-live support",
] as const;

const COST_SCALE = 1_000_000;

const COST_BANDS = [
  {
    id: "fifty",
    label: "About 50 people",
    note: "11–50 LIMS users",
    cloud: [20_000, 100_000] as const,
    onPrem: [75_000, 200_000] as const,
  },
  {
    id: "large",
    label: "Toward 2,000 people",
    note: "50+ LIMS users",
    cloud: [100_000, 500_000] as const,
    onPrem: [300_000, 1_000_000] as const,
  },
] as const;

const STAFF_WAGE = 61_890;

function money(value: number): string {
  if (value >= 1_000_000) return "$1M+";
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
}

function staffYears(value: number): string {
  return (value / STAFF_WAGE).toFixed(1);
}

function WhatWeSolve() {
  return (
    <section className="lp-section" id="capabilities">
      <div className="lp-section-inner lp-section-wide">
        <p className="lp-eyebrow">What we solve</p>
        <h2 className="lp-h2">A traditional LIMS change is a project. Sequence is a configuration.</h2>
        <p className="lp-section-lede">
          Laboratories of about 50 to 2,000 people still have to fund every function below when the
          LIMS itself cannot absorb the change. Sequence keeps those functions in the platform.
        </p>

        <div className="lp-solve">
          <figure className="lp-solve-chart">
            <figcaption>
              <strong>Traditional LIMS change</strong>
              <span>One-time implementation cost, published ranges</span>
            </figcaption>
            <div className="lp-solve-plot" role="img" aria-label="Traditional LIMS implementation cost by laboratory size">
              <div className="lp-solve-yaxis" aria-hidden="true">
                <span>$1M</span>
                <span>$750k</span>
                <span>$500k</span>
                <span>$250k</span>
                <span>$0</span>
              </div>
              <div className="lp-solve-canvas">
                <div className="lp-solve-grid" aria-hidden="true" />
                {COST_BANDS.map((band) => (
                  <div className="lp-solve-group" key={band.id}>
                    <div className="lp-solve-bars">
                      <RangeBar label="Cloud" low={band.cloud[0]} high={band.cloud[1]} tone="cloud" />
                      <RangeBar
                        label="On-premises"
                        low={band.onPrem[0]}
                        high={band.onPrem[1]}
                        tone="onprem"
                      />
                    </div>
                    <p>
                      <strong>{band.label}</strong>
                      <span>{band.note}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="lp-solve-staff" aria-hidden="true">
                <span>16</span>
                <span>12</span>
                <span>8</span>
                <span>4</span>
                <span>0</span>
                <small>Staff-years</small>
              </div>
            </div>
            <ul className="lp-solve-legend">
              <li><i className="cloud" /> Cloud SaaS</li>
              <li><i className="onprem" /> On-premises</li>
              <li>Right axis: cost ÷ ${STAFF_WAGE.toLocaleString()} median wage</li>
            </ul>
            <table className="lp-solve-table">
              <caption>Same ranges, read as median staff-years</caption>
              <thead>
                <tr>
                  <th>Laboratory</th>
                  <th>Cloud implementation</th>
                  <th>On-premises implementation</th>
                  <th>Median staff-years</th>
                </tr>
              </thead>
              <tbody>
                {COST_BANDS.map((band) => (
                  <tr key={band.id}>
                    <td>
                      {band.label}
                      <span>{band.note}</span>
                    </td>
                    <td>
                      {money(band.cloud[0])}–{money(band.cloud[1])}
                      {band.cloud[1] >= 500_000 ? "+" : ""}
                    </td>
                    <td>
                      {money(band.onPrem[0])}–{band.onPrem[1] >= 1_000_000 ? "$1M+" : `${money(band.onPrem[1])}+`}
                    </td>
                    <td>
                      {staffYears(band.cloud[0])}–{staffYears(band.onPrem[1])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>

          <div className="lp-solve-sequence">
            <p className="lp-eyebrow">Sequence</p>
            <h3>The same functions, without a services project</h3>
            <ol>
              {LIMS_FUNCTIONS.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  <strong>Configured</strong>
                </li>
              ))}
            </ol>
            <p>
              A traditional change prices each of these as professional services. In Sequence they
              stay in the product, so the laboratory changes the workflow instead of opening an
              implementation.
            </p>
          </div>
        </div>

        <div className="lp-solve-functions">
          <h3>Functions a traditional LIMS change has to staff</h3>
          <ul>
            {LIMS_FUNCTIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <footer className="lp-solve-sources">
          <p>
            Cost ranges are one-time professional-services estimates by LIMS user count, not a quote
            for a 50-person or 2,000-person laboratory. The 11–50 user band is the published segment
            nearest a laboratory of about 50 people. The 50+ user band is the published segment for
            larger and multi-site laboratories, including organizations that employ up to the
            thousands. Upper ends marked “+” continue above the plotted cap.
          </p>
          <ol>
            <li>
              CrelioHealth, “LIMS Implementation Cost By Lab Size Across 3 Deployment Types,” 4 Sep
              2026. Cloud and on-premises implementation ranges, go-live scope, and the function
              list (system setup, instrument connectivity, interoperability, data migration,
              reporting, training).{" "}
              <a href="https://blog.creliohealth.com/lims-implementation-cost/">
                blog.creliohealth.com/lims-implementation-cost
              </a>
            </li>
            <li>
              U.S. Bureau of Labor Statistics, Occupational Outlook Handbook, “Clinical Laboratory
              Technologists and Technicians.” Median annual wage $61,890 in May 2024. Staff-years on
              the chart equal the published cost divided by that median wage.{" "}
              <a href="https://www.bls.gov/ooh/healthcare/clinical-laboratory-technologists-and-technicians.htm">
                bls.gov/ooh/healthcare/clinical-laboratory-technologists-and-technicians.htm
              </a>
            </li>
            <li>
              College of American Pathologists Q-Probes studies of technical staffing find wide
              variation across laboratories and do not publish one average headcount for labs of 50
              to 2,000 people. Valenstein, Souers, and colleagues, Archives of Pathology &amp;
              Laboratory Medicine.{" "}
              <a href="https://doi.org/10.5858/arpa.2020-0760-cp">doi.org/10.5858/arpa.2020-0760-cp</a>
            </li>
          </ol>
        </footer>
      </div>
    </section>
  );
}

function RangeBar({
  label,
  low,
  high,
  tone,
}: {
  label: string;
  low: number;
  high: number;
  tone: "cloud" | "onprem";
}) {
  const start = (low / COST_SCALE) * 100;
  const end = (Math.min(high, COST_SCALE) / COST_SCALE) * 100;
  return (
    <div className="lp-solve-col">
      <div className="lp-solve-track">
        <span
          className={`lp-solve-range ${tone}`}
          style={{ bottom: `${start}%`, height: `${Math.max(end - start, 2)}%` }}
          title={`${label}: ${money(low)} to ${money(high)}`}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}

function PlatformBand() {
  return (
    <section className="lp-platform" aria-labelledby="platform-heading">
      <div className="lp-platform-inner">
        <h2 id="platform-heading">
          The laboratory platform
          <br />
          that keeps you moving.
        </h2>
        <p>
          CareScope Sequence brings your lab’s workflows, data and systems
          together — so you can make changes faster, reduce integrations, and
          run a more efficient laboratory.
        </p>
        <ul>
          {PLATFORM_PILLARS.map((pillar) => (
            <li key={pillar.title}>
              <span className={`lp-platform-icon ${pillar.tone}`} aria-hidden="true">
                {pillar.icon}
              </span>
              <strong>{pillar.title}</strong>
              <span>{pillar.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PLATFORM_PILLARS = [
  {
    title: "LIMS",
    detail: "Manage samples, tests and results",
    tone: "blue",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M12 5h8M13.5 5v8.2L8.2 24.2A4.2 4.2 0 0 0 12 30h8a4.2 4.2 0 0 0 3.8-5.8L18.5 13.2V5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M11 21h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Workflow",
    detail: "Configure and adapt as your needs change",
    tone: "green",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="8" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="24" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="24" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M11 16h6a4 4 0 0 0 4-4V11M17 16a4 4 0 0 1 4 4v1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Integrations",
    detail: "Connect the systems you already use",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M10 20.5A6.5 6.5 0 0 1 16.2 12h.3A5.5 5.5 0 1 1 22 22.5H11.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Quality",
    detail: "Maintain compliance and confidence",
    tone: "blue",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M16 5.5 7.5 9v6.2c0 5.2 3.4 8.8 8.5 10.8 5.1-2 8.5-5.6 8.5-10.8V9L16 5.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m12.2 16.2 2.6 2.6 5-5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Analytics",
    detail: "Turn data into better decisions",
    tone: "cyan",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M7 24V14M13 24V8M19 24v-6M25 24V11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Client Services",
    detail: "Deliver a better client experience",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="21" cy="13" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M6.5 23.5c.8-3.2 2.8-4.8 5.5-4.8s4.7 1.6 5.5 4.8M18.2 23.5c.4-1.8 1.5-3.1 3.2-3.5 1.8.3 3 1.6 3.4 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

function WorkflowMiniCanvas() {
  return (
    <div className="lp-mini-flow">
      <div className="node start">Start</div>
      <span className="edge" />
      <div className="node">Receive</div>
      <span className="edge" />
      <div className="node decision">STAT?</div>
      <span className="edge" />
      <div className="node">Approve</div>
      <span className="edge" />
      <div className="node end">CoA</div>
    </div>
  );
}
