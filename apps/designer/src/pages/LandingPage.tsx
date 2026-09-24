import { Link } from "react-router-dom";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="lp">
        <header className="lp-nav">
          <Link to="/" className="lp-logo" aria-label="CareScope Sequence home">
            <img
              className="lp-header-logo"
              src="/carescope-parent-logo.png"
              alt="CareScope. Building Better Healthcare for Everyone."
            />
            <span className="lp-logo-rule" aria-hidden="true" />
            <span className="lp-logo-sequence">Sequence</span>
          </Link>

          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#capabilities">What we solve</a>
            <a href="#workflows">Resources</a>
            <a href="#compliance">About</a>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/app?signup=1" className="lp-btn lp-btn-demo">
              Request a Demo
            </Link>
          </div>
        </header>

        <PlatformBand />
      <WhatWeSolve />
      <WorkflowSection />
      <ComplianceSection />

      <p className="lp-brand-lockup">
        <img
          className="lp-footer-logo"
          src="/carescope-parent-logo.png"
          alt="CareScope. Building Better Healthcare for Everyone."
        />
      </p>

      <footer className="lp-footer">
        <div className="lp-footer-inner lp-section-wide">
          <p className="lp-copyright">© 2026 Carescope, All Rights Reserved</p>
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
  "A new report template",
  "A new laboratory department",
  "A minor workflow tweak",
] as const;

const COST_SCALE = 5_000;

const CHANGE_CYCLES = [
  {
    id: "report",
    label: "New report",
    note: "2–3 weeks",
    cost: 2_000,
    source: "CleverLAB",
  },
  {
    id: "department",
    label: "New department",
    note: "3–4 weeks",
    cost: 3_600,
    source: "CleverLAB",
  },
  {
    id: "tweak",
    label: "Minor tweak",
    note: "About 4 weeks",
    cost: 4_000,
    source: "QBench",
  },
] as const;

function money(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function WhatWeSolve() {
  return (
    <section className="lp-section" id="capabilities">
      <div className="lp-section-inner">
        <div className="lp-section-head lp-section-head-left">
          <h2>What we solve</h2>
        </div>

        <div className="lp-solve">
          <figure className="lp-solve-chart">
            <figcaption>
              <strong>Average change cycle cost</strong>
              <span>One change after go-live. Not the initial LIMS implementation.</span>
            </figcaption>
            <div className="lp-solve-plot" role="img" aria-label="Published cost of one traditional LIMS change cycle">
              <div className="lp-solve-yaxis" aria-hidden="true">
                <span>$5k</span>
                <span>$3.75k</span>
                <span>$2.5k</span>
                <span>$1.25k</span>
                <span>$0</span>
              </div>
              <div className="lp-solve-canvas">
                <div className="lp-solve-grid" aria-hidden="true" />
                {CHANGE_CYCLES.map((cycle) => (
                  <div className="lp-solve-group" key={cycle.id}>
                    <div className="lp-solve-bars">
                      <RangeBar label={money(cycle.cost)} low={0} high={cycle.cost} tone="cloud" />
                    </div>
                    <p>
                      <strong>{cycle.label}</strong>
                      <span>{cycle.note}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <ul className="lp-solve-legend">
              <li><i className="cloud" /> Published cost of that change</li>
              <li>Calendar time is the vendor’s stated wait, not staff-years</li>
            </ul>
            <table className="lp-solve-table">
              <caption>Published examples of a single change cycle</caption>
              <thead>
                <tr>
                  <th>Change</th>
                  <th>Published cost</th>
                  <th>Calendar time</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {CHANGE_CYCLES.map((cycle) => (
                  <tr key={cycle.id}>
                    <td>{cycle.label}</td>
                    <td>{money(cycle.cost)}</td>
                    <td>{cycle.note}</td>
                    <td>{cycle.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>

          <div className="lp-solve-sequence">
            <p className="lp-eyebrow">Sequence</p>
            <h3>The same change, without a services project</h3>
            <ol>
              {LIMS_FUNCTIONS.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  <strong>Configured</strong>
                </li>
              ))}
            </ol>
            <p>
              A traditional change cycle bills the laboratory for the programmer and the wait. In
              Sequence the same change stays in the product, so the laboratory configures it.
            </p>
          </div>
        </div>

        <footer className="lp-solve-sources">
          <p>
            These figures are the published cost of one change after the LIMS is already live. They
            are not the cost of the first implementation, and they are not a surveyed average for
            laboratories of 50 to 2,000 people. No source publishes that average.
          </p>
          <ol>
            <li>
              CleverLAB, “How We Reduced LIMS Costs by 90%.” A traditional new report template is
              cited at $2,000 and 2–3 weeks. Adding a laboratory department is cited at $3,600 and
              3–4 weeks.{" "}
              <a href="https://cleverlab.pl/lims_cost_reduction_en.html">
                cleverlab.pl/lims_cost_reduction_en.html
              </a>
            </li>
            <li>
              QBench, “The Hidden Costs of a LIMS.” Describes legacy vendors billing about $4,000
              and about four weeks for a minor tweak.{" "}
              <a href="https://qbench.com/blog/the-hidden-costs-of-a-lims-what-to-know-before-you-buy">
                qbench.com/blog/the-hidden-costs-of-a-lims-what-to-know-before-you-buy
              </a>
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

function LimsDemo() {
  return (
    <figure className="lp-demo">
      <figcaption>Sequence LIMS</figcaption>
      <div className="lp-demo-frame">
        <iframe title="CareScope Sequence LIMS demo" src="/app" />
      </div>
      <p>
        <Link to="/app">Open the LIMS</Link>
      </p>
    </figure>
  );
}

function PlatformBand() {
  return (
    <section className="lp-section lp-platform" aria-labelledby="platform-heading">
      <div className="lp-section-inner">
        <div className="lp-section-head">
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
        </div>
        <LimsDemo />
        <ul className="lp-cols lp-cols-5">
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

const WORKFLOW_STEPS = [
  { title: "Start", detail: "A sample, order, or schedule opens the path" },
  { title: "Receive", detail: "Accession the work into the laboratory" },
  { title: "Route", detail: "Send STAT and routine work to the right queue" },
  { title: "Approve", detail: "Collect the review the method requires" },
  { title: "Release", detail: "Publish the result, report, or certificate" },
] as const;

function WorkflowSection() {
  return (
    <section className="lp-section" id="workflows">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2>Automate laboratory process by design.</h2>
          <p>
            A visual, no-code orchestration layer for approvals, instrument actions, notifications,
            and compliance checks — configurable for every module above.
          </p>
        </div>
        <ul className="lp-cols lp-cols-5">
          {WORKFLOW_STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ul>
        <p className="lp-section-action">
          <Link to="/app/workflows" className="lp-btn lp-btn-demo">
            Open workflow designer
          </Link>
        </p>
      </div>
    </section>
  );
}

const TRUST_POINTS = [
  { title: "Signatures", detail: "21 CFR Part 11–ready electronic signatures" },
  { title: "Custody", detail: "Chain of custody with scan-verified transfers" },
  { title: "Versions", detail: "Publish, roll back, and simulate every workflow" },
  { title: "Sites", detail: "Tenant-isolated operations across laboratory sites" },
] as const;

function ComplianceSection() {
  return (
    <section className="lp-section" id="compliance">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2>Governed for regulated environments.</h2>
          <p>
            Immutable execution logs, e-signatures, document control, and multi-site isolation so
            audits are prepared continuously — not reconstructed later.
          </p>
        </div>
        <ul className="lp-cols lp-cols-4">
          {TRUST_POINTS.map((point) => (
            <li key={point.title}>
              <strong>{point.title}</strong>
              <span>{point.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PLATFORM_PILLARS = [
  {
    title: "Lab Operations",
    detail: "The core LIMS",
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
    title: "Instrument Integration",
    detail: "Connect your instruments to Sequence",
    tone: "green",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <rect x="6" y="8" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 13h6M10 17h6M20 12h6M20 16h6M20 20h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Connectivity",
    detail: "Connect Sequence to the outside world",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="8" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="24" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="24" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M11 16h6a4 4 0 0 0 4-4V11M17 16a4 4 0 0 1 4 4v1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Quality & Compliance",
    detail: "Keep the laboratory controlled and traceable",
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
        <path d="m12.2 16.2 2.6 2.6 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Insights",
    detail: "Turn laboratory data into operational intelligence",
    tone: "cyan",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path d="M7 24V14M13 24V8M19 24v-6M25 24V11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

