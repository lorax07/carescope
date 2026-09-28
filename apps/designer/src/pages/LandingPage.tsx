import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="lp-page">
        <header className="lp-nav">
          <div className="lp-nav-bar">
          <Link to="/" className="lp-logo" aria-label="CareScope Sequence home">
            <img
              className="lp-header-logo"
              src="/carescope-header-logo.png"
              width={224}
              height={56}
              alt="CareScope. Building Better Healthcare for Everyone."
            />
            <span className="lp-logo-rule" aria-hidden="true" />
            <span className="lp-logo-sequence">Sequence</span>
          </Link>

          <div className="lp-nav-actions">
            <nav className="lp-nav-links" aria-label="Primary">
              <a href="#capabilities">What we solve</a>
              <a href="#modules">Modules</a>
              <a href="#compliance">About</a>
            </nav>
            <span className="lp-nav-divider" aria-hidden="true" />
            <Link to="/intrasite" className="lp-nav-text">
              Sign in
            </Link>
            <Link to="/app?signup=1" className="lp-btn lp-btn-demo">
              Request a Demo
            </Link>
          </div>
          </div>
        </header>

        <div className="lp">
        <PlatformBand />
      <LimsFilm />
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
    </div>
  );
}

type ChangeBar = {
  cost: number;
  costLabel: string;
  hours: number | null;
  timeLabel: string;
};

type ModuleChange = {
  id: string;
  module: string;
  change: string;
  traditional: ChangeBar;
  sequence: ChangeBar;
  sources: number[];
};

const WEEK = 7 * 24;

const MODULE_CHANGES: ModuleChange[] = [
  {
    id: "operations",
    module: "Sequence Operations",
    change: "Add a laboratory department",
    traditional: { cost: 3600, costLabel: "$3,600", hours: 4 * WEEK, timeLabel: "3–4 weeks" },
    sequence: { cost: 0, costLabel: "$0", hours: 24, timeLabel: "1 day" },
    sources: [1],
  },
  {
    id: "instruments",
    module: "Sequence Instruments",
    change: "Add a bidirectional instrument interface",
    traditional: { cost: 5000, costLabel: "About $5,000", hours: 2 * WEEK, timeLabel: "1–2 weeks" },
    sequence: { cost: 0, costLabel: "$0", hours: null, timeLabel: "Not published" },
    sources: [2],
  },
  {
    id: "compliance",
    module: "Sequence Compliance",
    change: "Adjust a controlled worksheet",
    traditional: { cost: 4000, costLabel: "About $4,000", hours: 4 * WEEK, timeLabel: "About 4 weeks" },
    sequence: { cost: 0, costLabel: "$0", hours: 10 / 3600, timeLabel: "Seconds" },
    sources: [3],
  },
  {
    id: "client",
    module: "Sequence Client",
    change: "Adjust a client worksheet",
    traditional: { cost: 4000, costLabel: "About $4,000", hours: 4 * WEEK, timeLabel: "About 4 weeks" },
    sequence: { cost: 0, costLabel: "$0", hours: 10 / 3600, timeLabel: "Seconds" },
    sources: [3],
  },
  {
    id: "revenue",
    module: "Sequence Revenue",
    change: "Adjust an invoice report",
    traditional: { cost: 4000, costLabel: "About $4,000", hours: 4 * WEEK, timeLabel: "About 4 weeks" },
    sequence: { cost: 0, costLabel: "$0", hours: 10 / 3600, timeLabel: "Seconds" },
    sources: [3],
  },
  {
    id: "insights",
    module: "Sequence Insights",
    change: "New report template",
    traditional: { cost: 2000, costLabel: "$2,000", hours: 3 * WEEK, timeLabel: "2–3 weeks" },
    sequence: { cost: 0, costLabel: "$0", hours: 1, timeLabel: "1 hour" },
    sources: [1],
  },
];

const COST_MAX = 6000;

const COST_ROLES = [
  { id: "consultants", label: "Consultants", published: true },
  { id: "it", label: "Internal IT team", published: false },
  { id: "pm", label: "Project manager", published: false },
  { id: "lab", label: "Lab staff", published: false },
] as const;

function RoleName({ role }: { role: (typeof COST_ROLES)[number] }) {
  if (role.id === "it") {
    return (
      <>
        Internal IT<span className="lp-role-gap"> </span>
        <span className="lp-role-break">team</span>
      </>
    );
  }
  if (role.id === "pm") {
    return (
      <>
        Project<span className="lp-role-gap"> </span>
        <span className="lp-role-break">manager</span>
      </>
    );
  }
  return role.label;
}

function costHeight(cost: number): string {
  return `${Math.max(0, Math.min(100, (cost / COST_MAX) * 100))}%`;
}

function timeWidth(hours: number | null, maxHours: number): string {
  if (hours == null || maxHours <= 0 || hours <= 0) return "0%";
  const pct = Math.max(0, Math.min(100, (hours / maxHours) * 100));
  return `max(10px, ${pct}%)`;
}

function RoleCostChart({ change }: { change: ModuleChange }) {
  const maxHours = change.traditional.hours ?? 1;
  const summary = [
    `${change.change}.`,
    `Traditional LIMS consultant cost ${change.traditional.costLabel}.`,
    `Sequence consultant cost ${change.sequence.costLabel}.`,
    "Internal IT team, project manager, and lab staff have no published dollar amount.",
    `Example timeline: traditional ${change.traditional.timeLabel}, Sequence ${change.sequence.timeLabel}.`,
  ].join(" ");

  return (
    <figure className="lp-role" aria-label={summary}>
      <div className="lp-role-top">
        <div>
          <p className="lp-role-kicker">Example change</p>
          <h3 className="lp-compare-change">{change.change}</h3>
        </div>
        <ul className="lp-role-legend">
          <li>
            <i className="is-traditional" aria-hidden="true" />
            Traditional LIMS
          </li>
          <li>
            <i className="is-sequence" aria-hidden="true" />
            Sequence
          </li>
        </ul>
      </div>

      <div className="lp-role-time">
        <p className="lp-role-time-title">
          <span>Example timeline</span>
          <span>Calendar time for this change</span>
        </p>
        <div className="lp-role-time-row">
          <span>Traditional LIMS</span>
          <div className="lp-role-time-track">
            <div className="lp-role-time-fill is-traditional" style={{ width: "100%" }} />
          </div>
          <strong>{change.traditional.timeLabel}</strong>
        </div>
        <div className="lp-role-time-row">
          <span>Sequence</span>
          <div className="lp-role-time-track">
            <div
              className="lp-role-time-fill is-sequence"
              style={{ width: timeWidth(change.sequence.hours, maxHours) }}
            />
          </div>
          <strong>{change.sequence.timeLabel}</strong>
        </div>
      </div>

      <div className="lp-role-plot" key={change.id}>
        <div className="lp-role-yaxis">
          <span className="lp-role-axis-name">Cost</span>
          <div className="lp-role-yticks" aria-hidden="true">
            <span>$6,000</span>
            <span>$4,000</span>
            <span>$2,000</span>
            <span>$0</span>
          </div>
        </div>
        <div className="lp-role-canvas">
          <div className="lp-role-stage">
            <div className="lp-role-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="lp-role-groups">
              {COST_ROLES.map((role) =>
                role.published ? (
                  <div className="lp-role-group" key={role.id}>
                    <div className="lp-role-col">
                      <span className="lp-role-val" style={{ bottom: `calc(${costHeight(change.traditional.cost)} + 0.35rem)` }}>
                        {change.traditional.costLabel}
                      </span>
                      <div className="lp-role-bar is-traditional" style={{ height: costHeight(change.traditional.cost) }} />
                    </div>
                    <div className="lp-role-col">
                      <span
                        className="lp-role-val"
                        style={{
                          bottom: change.sequence.cost > 0 ? `calc(${costHeight(change.sequence.cost)} + 0.35rem)` : "calc(6px + 0.35rem)",
                        }}
                      >
                        {change.sequence.costLabel}
                      </span>
                      <div
                        className={change.sequence.cost > 0 ? "lp-role-bar is-sequence" : "lp-role-bar is-sequence is-zero"}
                        style={change.sequence.cost > 0 ? { height: costHeight(change.sequence.cost) } : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="lp-role-group" key={role.id}>
                    <span className="lp-role-empty" aria-hidden="true">
                      —
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="lp-role-x">
            {COST_ROLES.map((role) => (
              <span key={role.id}>
                <RoleName role={role} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="lp-role-note">
        Internal IT, the project manager, and lab staff have no published dollar amount for this change.
      </p>
    </figure>
  );
}

function WhatWeSolve() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(MODULE_CHANGES[0].id);
  const active = MODULE_CHANGES.find((item) => item.id === activeId) ?? MODULE_CHANGES[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const view = window.innerHeight;
      const enter = 1 - (rect.top - view * 0.12) / (view * 0.42);
      const leave = (rect.bottom - view * 0.08) / (view * 0.38);
      const spotlight = Math.min(1, Math.max(0, Math.min(enter, leave)));
      section.style.setProperty("--spotlight", spotlight.toFixed(3));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    const index = MODULE_CHANGES.findIndex((item) => item.id === active.id);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % MODULE_CHANGES.length : (index - 1 + MODULE_CHANGES.length) % MODULE_CHANGES.length;
    setActiveId(MODULE_CHANGES[next].id);
  }

  return (
    <section className="lp-section lp-spotlight" id="capabilities" ref={sectionRef}>
      <div className="lp-section-inner">
        <div className="lp-section-head lp-section-head-left">
          <h2>What we solve</h2>
          <p className="lp-compare-lede">
            One published change after go-live, for each module. Consultant cost is the vendor fee. The timeline on the chart is that source’s calendar time. Adding a department is the 3–4 week example.
          </p>
        </div>

        <div className="lp-compare-tabs" role="tablist" aria-label="Sequence modules" onKeyDown={moveTab}>
          {MODULE_CHANGES.map((item) => {
            const selected = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`solve-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`solve-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                className={selected ? "is-on" : undefined}
                onClick={() => setActiveId(item.id)}
              >
                {item.module}
              </button>
            );
          })}
        </div>

        <div
          className="lp-compare-panel"
          role="tabpanel"
          id={`solve-panel-${active.id}`}
          aria-labelledby={`solve-tab-${active.id}`}
        >
          <RoleCostChart change={active} />
          <p className="lp-compare-cite">Sources {active.sources.join(" and ")} below.</p>
        </div>

        <footer className="lp-solve-sources">
          <p>
            The consultant column is the vendor fee published for that change. Internal IT, the project manager, and
            lab staff are on the axis because a change needs them. No source publishes their dollar share, so those
            columns stay open. The timeline is calendar time from the same source. Where a source gives a range, the
            timeline bar reaches the long end and the label shows the range. Adding a laboratory department is the
            3–4 week example: $3,600 and 3–4 weeks on a traditional LIMS, and $0 and 1 day when the laboratory
            configures the department itself. The Sequence figure is that source’s published self-configuration
            result, not a survey of Sequence customers. No source publishes an average for laboratories of 50 to
            2,000 people.
          </p>
          <ol>
            <li>
              CleverLAB, Piotr Płonka, “How We Reduced LIMS Costs by 90%,” 1 October 2025. A traditional new report
              template is $2,000 and 2–3 weeks; self-configuration is $0 and 1 hour. Adding a laboratory department
              is $3,600 and 3–4 weeks; self-configuration is $0 and 1 day.{" "}
              <a href="https://cleverlab.pl/lims_cost_reduction_en.html">cleverlab.pl/lims_cost_reduction_en.html</a>
            </li>
            <li>
              Bika Lab Systems, “A Realistic Timeline and Cost Breakdown for Implementing Bika LIMS.” A unidirectional
              instrument interface is about $3,000 and a bidirectional interface is about $5,000. Either takes one to
              two weeks, including testing. An interface that already exists is free. The article does not say how
              long an existing interface takes to turn on.{" "}
              <a href="https://www.bikalims.org/blog/a-realistic-timeline-and-cost-breakdown-for-implementing-bika-lims">
                bikalims.org/blog/a-realistic-timeline-and-cost-breakdown-for-implementing-bika-lims
              </a>
            </li>
            <li>
              QBench, Nicholas Evans, “The Hidden Costs of a LIMS,” 29 December 2025. Legacy vendors bill about
              $4,000 and take about four weeks for a minor tweak. On a configurable system, staff adjust a worksheet
              or certificate of analysis, automate a process, or generate a report in seconds, without that invoice.{" "}
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

function LimsFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 0.85;
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      void video.play();
      const unmute = () => {
        video.muted = false;
        void video.play();
      };
      video.addEventListener("pointerdown", unmute, { once: true });
    });
  }, []);

  return (
    <figure className="lp-lims-film">
      <video
        ref={videoRef}
        src="/lims-in-action.mp4"
        autoPlay
        loop
        playsInline
        controls
        aria-label="Sequence LIMS: workflow design, Sequence Instruments, and a Sequence Insights metrics question, each opened from the left menu"
      />
    </figure>
  );
}

function PlatformBand() {
  return (
    <section className="lp-section lp-platform" id="modules" aria-labelledby="platform-heading">
      <div className="lp-section-inner">
        <div className="lp-section-head">
        <h2 id="platform-heading">
          The laboratory platform
          <br />
          that keeps you moving.
        </h2>
        <p>
          CareScope Sequence brings your lab workflows, data and systems
          together — so you can make changes faster, reduce integrations, and
          run a more efficient laboratory.
        </p>
        </div>
        <ul className="lp-cols">
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
    title: "Sequence Operations",
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
    title: "Sequence Instruments",
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
    title: "Sequence Compliance",
    detail: "This is a quality and Compliance module",
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
    title: "Sequence Client",
    detail: "This is an RCM for accounts, pipeline, and lab work",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="16" cy="11" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.5 23.5c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M22 8.5h5M24.5 6v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Sequence Revenue",
    detail: "This is a robust revenue Cycle management system",
    tone: "amber",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <rect x="8" y="5.5" width="16" height="21" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 12h8M12 16h8M12 20h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Sequence Insights",
    detail: "Overall business data, with a chat that answers from the text provided",
    tone: "cyan",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path d="M7 24V14M13 24V8M19 24v-6M25 24V11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

