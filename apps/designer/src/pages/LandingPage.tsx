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

type ComparePoint = {
  id: string;
  label: string;
  traditional: number;
  traditionalLabel: string;
  /** Undefined hides the Sequence bar. Null means the source did not publish a figure. */
  sequence?: number | null;
  sequenceLabel?: string;
};

type TopicChart = {
  id: string;
  kicker: string;
  title: string;
  axis: string;
  max: number;
  ticks: { label: string; at: number }[];
  points: ComparePoint[];
  note: string;
};

type Topic = {
  id: string;
  label: string;
  sources: number[];
  chart: TopicChart;
};

const WEEK = 7 * 24;
const COST_MAX = 6000;
const COST_TICKS = [
  { label: "$6,000", at: 1 },
  { label: "$4,000", at: 4 / 6 },
  { label: "$2,000", at: 2 / 6 },
  { label: "$0", at: 0 },
];
const TIME_MAX = 4 * WEEK * 1.22;
const WEEK_TICKS = [4, 3, 2, 1, 0].map((weeks) => ({
  label: weeks === 0 ? "0" : `${weeks} wk`,
  at: (weeks * WEEK) / TIME_MAX,
}));

const TOPICS: Topic[] = [
  {
    id: "cost",
    label: "The Cost of Change",
    sources: [1, 3],
    chart: {
      id: "cost",
      kicker: "Vendor fee",
      title: "What one change costs after go-live",
      axis: "Cost",
      max: COST_MAX,
      ticks: COST_TICKS,
      note: "Traditional bars are the published vendor fee. Sequence bars are that source’s self-configuration result, with no invoice.",
      points: [
        { id: "report", label: "New report\ntemplate", traditional: 2000, traditionalLabel: "$2,000", sequence: 0, sequenceLabel: "$0" },
        { id: "department", label: "Add a\ndepartment", traditional: 3600, traditionalLabel: "$3,600", sequence: 0, sequenceLabel: "$0" },
        { id: "tweak", label: "Minor tweak", traditional: 4000, traditionalLabel: "About $4,000", sequence: 0, sequenceLabel: "$0" },
      ],
    },
  },
  {
    id: "friction",
    label: "Operational Friction",
    sources: [1, 2, 3],
    chart: {
      id: "friction",
      kicker: "Calendar time",
      title: "How long the same kind of change takes",
      axis: "Time",
      max: TIME_MAX,
      ticks: WEEK_TICKS,
      note: "Where a source gives a range, the bar reaches the long end and the label shows the range. A new instrument interface takes one to two weeks. The time to turn on an interface that already exists is not published.",
      points: [
        { id: "report", label: "New report\ntemplate", traditional: 3 * WEEK, traditionalLabel: "2–3 weeks", sequence: 1, sequenceLabel: "1 hour" },
        { id: "department", label: "Add a\ndepartment", traditional: 4 * WEEK, traditionalLabel: "3–4 weeks", sequence: 24, sequenceLabel: "1 day" },
        { id: "tweak", label: "Minor tweak", traditional: 4 * WEEK, traditionalLabel: "About 4 weeks", sequence: 10 / 3600, sequenceLabel: "Seconds" },
        { id: "interface", label: "Instrument\ninterface", traditional: 2 * WEEK, traditionalLabel: "1–2 weeks", sequence: null, sequenceLabel: "Not published" },
      ],
    },
  },
  {
    id: "consultants",
    label: "Consultant Dependency",
    sources: [1, 2, 3],
    chart: {
      id: "consultants",
      kicker: "Outside specialist",
      title: "The fee for a programmer or vendor",
      axis: "Cost",
      max: COST_MAX,
      ticks: COST_TICKS,
      note: "These are published programmer or vendor fees, not a split of internal labor. Sequence is $0 where the source publishes self-configuration. A new bidirectional interface is about $5,000; that article does not publish a self-configuration price for building one. An interface that already exists is free.",
      points: [
        { id: "report", label: "New report\ntemplate", traditional: 2000, traditionalLabel: "$2,000", sequence: 0, sequenceLabel: "$0" },
        { id: "department", label: "Add a\ndepartment", traditional: 3600, traditionalLabel: "$3,600", sequence: 0, sequenceLabel: "$0" },
        { id: "tweak", label: "Minor tweak", traditional: 4000, traditionalLabel: "About $4,000", sequence: 0, sequenceLabel: "$0" },
        { id: "interface", label: "Bidirectional\ninterface", traditional: 5000, traditionalLabel: "About $5,000", sequence: null, sequenceLabel: "Not published" },
      ],
    },
  },
  {
    id: "integration",
    label: "Integration Complexity",
    sources: [2],
    chart: {
      id: "integration",
      kicker: "Instrument interface",
      title: "Published cost of connecting an instrument",
      axis: "Cost",
      max: COST_MAX,
      ticks: COST_TICKS,
      note: "A new unidirectional interface is about $3,000 and a bidirectional interface is about $5,000. Either takes one to two weeks, including testing. An interface already in the catalogue is free. The time to turn an existing interface on is not published.",
      points: [
        { id: "uni", label: "Unidirectional", traditional: 3000, traditionalLabel: "About $3,000" },
        { id: "bi", label: "Bidirectional", traditional: 5000, traditionalLabel: "About $5,000" },
        { id: "exists", label: "Already in\nthe catalogue", traditional: 0, traditionalLabel: "$0" },
      ],
    },
  },
  {
    id: "compliance",
    label: "Compliance Friction",
    sources: [3],
    chart: {
      id: "compliance",
      kicker: "Controlled change",
      title: "Calendar time for a minor tweak",
      axis: "Time",
      max: TIME_MAX,
      ticks: WEEK_TICKS,
      note: "Each traditional bar is the same published figure: about four weeks and about $4,000 for one minor tweak. It is not three invoices added together. On a configurable system, staff adjust a worksheet or certificate of analysis, or generate a report, in seconds and without that invoice.",
      points: [
        { id: "worksheet", label: "Worksheet", traditional: 4 * WEEK, traditionalLabel: "About 4 weeks", sequence: 10 / 3600, sequenceLabel: "Seconds" },
        { id: "coa", label: "Certificate\nof analysis", traditional: 4 * WEEK, traditionalLabel: "About 4 weeks", sequence: 10 / 3600, sequenceLabel: "Seconds" },
        { id: "report", label: "Generate\na report", traditional: 4 * WEEK, traditionalLabel: "About 4 weeks", sequence: 10 / 3600, sequenceLabel: "Seconds" },
      ],
    },
  },
];

function AxisLabel({ text }: { text: string }) {
  const [first, second] = text.split("\n");
  if (!second) return first;
  return (
    <>
      {first}
      <span className="lp-role-gap"> </span>
      <span className="lp-role-break">{second}</span>
    </>
  );
}

function barPresentation(value: number, max: number): { stub: boolean; height: string } {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  if (pct < 3.5) return { stub: true, height: "6px" };
  return { stub: false, height: `${pct}%` };
}

function CompareBar({
  value,
  label,
  max,
  tone,
}: {
  value: number;
  label: string;
  max: number;
  tone: "traditional" | "sequence";
}) {
  const bar = barPresentation(value, max);
  return (
    <div className="lp-role-col">
      <span className="lp-role-val" style={{ bottom: bar.stub ? "calc(6px + 0.35rem)" : `calc(${bar.height} + 0.35rem)` }}>
        {label}
      </span>
      <div className={`lp-role-bar is-${tone}${bar.stub ? " is-zero" : ""}`} style={bar.stub ? undefined : { height: bar.height }} />
    </div>
  );
}

function TopicChartView({ chart }: { chart: TopicChart }) {
  const paired = chart.points.some((point) => point.sequence !== undefined);
  const columns = `repeat(${chart.points.length}, minmax(0, 1fr))`;
  const summary = [
    chart.title,
    ...chart.points.map((point) => {
      const name = point.label.replace("\n", " ");
      const sequence = point.sequence === undefined ? "" : `, Sequence ${point.sequenceLabel}`;
      return `${name}: traditional ${point.traditionalLabel}${sequence}`;
    }),
  ].join(". ");

  return (
    <figure className="lp-role" aria-label={summary}>
      <div className="lp-role-top">
        <div>
          <p className="lp-role-kicker">{chart.kicker}</p>
          <h3 className="lp-compare-change">{chart.title}</h3>
        </div>
        <ul className="lp-role-legend">
          <li>
            <i className="is-traditional" aria-hidden="true" />
            {paired ? "Traditional LIMS" : "Published fee"}
          </li>
          {paired ? (
            <li>
              <i className="is-sequence" aria-hidden="true" />
              Sequence
            </li>
          ) : null}
        </ul>
      </div>
      <div className="lp-role-plot" key={chart.id}>
        <div className="lp-role-yaxis">
          <span className="lp-role-axis-name">{chart.axis}</span>
          <div className="lp-role-yticks" aria-hidden="true">
            {chart.ticks.map((tick) => (
              <span key={tick.label} style={{ top: `${(1 - tick.at) * 100}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
        </div>
        <div className="lp-role-canvas">
          <div className="lp-role-stage">
            <div className="lp-role-grid" aria-hidden="true">
              {chart.ticks.map((tick) => (
                <span key={tick.label} style={{ top: `${(1 - tick.at) * 100}%` }} data-axis={tick.at === 0 ? "zero" : undefined} />
              ))}
            </div>
            <div className="lp-role-groups" style={{ gridTemplateColumns: columns }}>
              {chart.points.map((point) => (
                <div className="lp-role-group" key={point.id}>
                  <CompareBar value={point.traditional} label={point.traditionalLabel} max={chart.max} tone="traditional" />
                  {point.sequence === undefined ? null : point.sequence === null ? (
                    <div className="lp-role-col">
                      <span className="lp-role-val" style={{ bottom: "1.35rem" }}>
                        {point.sequenceLabel}
                      </span>
                      <span className="lp-role-empty" aria-hidden="true">
                        —
                      </span>
                    </div>
                  ) : (
                    <CompareBar value={point.sequence} label={point.sequenceLabel ?? ""} max={chart.max} tone="sequence" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="lp-role-x" style={{ gridTemplateColumns: columns }}>
            {chart.points.map((point) => (
              <span key={point.id}>
                <AxisLabel text={point.label} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="lp-role-note">{chart.note}</p>
    </figure>
  );
}

function sourceCite(sources: number[]): string {
  if (sources.length === 1) return `Source ${sources[0]} below.`;
  if (sources.length === 2) return `Sources ${sources[0]} and ${sources[1]} below.`;
  const head = sources.slice(0, -1).join(", ");
  return `Sources ${head}, and ${sources[sources.length - 1]} below.`;
}

function WhatWeSolve() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(TOPICS[0].id);
  const active = TOPICS.find((item) => item.id === activeId) ?? TOPICS[0];

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
    const index = TOPICS.findIndex((item) => item.id === active.id);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % TOPICS.length : (index - 1 + TOPICS.length) % TOPICS.length;
    setActiveId(TOPICS[next].id);
  }

  return (
    <section className="lp-section lp-spotlight" id="capabilities" ref={sectionRef}>
      <div className="lp-section-inner">
        <div className="lp-section-head lp-section-head-left">
          <h2>What we solve</h2>
          <p className="lp-compare-lede">
            Published vendor fees and calendar times for a change after go-live. Adding a department is the 3–4 week example.
          </p>
        </div>

        <div className="lp-compare-tabs" role="tablist" aria-label="Change costs" onKeyDown={moveTab}>
          {TOPICS.map((item) => {
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
                {item.label}
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
          <TopicChartView chart={active.chart} />
          <p className="lp-compare-cite">{sourceCite(active.sources)}</p>
        </div>

        <footer className="lp-solve-sources">
          <p>
            Traditional bars are the vendor fee or calendar time published for that change. Sequence bars are the
            same source’s published self-configuration result, with no vendor invoice. Where a source gives a range,
            the bar reaches the long end and the label shows the range. Adding a laboratory department is the 3–4
            week example: $3,600 and 3–4 weeks on a traditional LIMS, and $0 and 1 day when the laboratory configures
            the department itself. These figures are not a survey of Sequence customers. No source publishes an
            average for laboratories of 50 to 2,000 people.
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

