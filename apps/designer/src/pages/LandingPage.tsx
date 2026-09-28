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
            <img className="lp-logo-sequence" src="/sequence-logo.png" width={1400} height={318} alt="Sequence" />
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

type StackSegment = {
  id: string;
  label: string;
  value: number;
};

type ChangeExample = {
  id: string;
  name: string;
  cost: number;
  costLabel: string;
  /** Hours at the long end of a published range. Null when the source publishes a label only. */
  hours: number | null;
  timeLabel: string;
  sequenceCost: number | null;
  sequenceCostLabel: string;
  sequenceHours: number | null;
  sequenceTimeLabel: string;
};

type Topic = {
  id: string;
  label: string;
  kicker: string;
  title: string;
  note: string;
  sources: number[];
  emphasis: "cost" | "time";
  examples: ChangeExample[];
};

const WEEK = 7 * 24;

const REPORT: ChangeExample = {
  id: "report",
  name: "New report template",
  cost: 2000,
  costLabel: "$2,000",
  hours: 3 * WEEK,
  timeLabel: "2–3 weeks",
  sequenceCost: 0,
  sequenceCostLabel: "$0",
  sequenceHours: 1,
  sequenceTimeLabel: "1 hour",
};

const DEPARTMENT: ChangeExample = {
  id: "department",
  name: "Add a department",
  cost: 3600,
  costLabel: "$3,600",
  hours: 4 * WEEK,
  timeLabel: "3–4 weeks",
  sequenceCost: 0,
  sequenceCostLabel: "$0",
  sequenceHours: 24,
  sequenceTimeLabel: "1 day",
};

const TOPICS: Topic[] = [
  {
    id: "cost",
    label: "The Cost of Change",
    kicker: "Custom change",
    title: "Total cost of a priced change",
    emphasis: "cost",
    sources: [1],
    note: "Each total is one custom change from CleverLAB. The cost bar is the consultant fee, which is the whole published price. The article says every change also needs project scope. It does not price internal IT, the project manager, or lab staff.",
    examples: [REPORT, DEPARTMENT],
  },
  {
    id: "friction",
    label: "Operational Friction",
    kicker: "Custom change",
    title: "Total calendar time for that change",
    emphasis: "time",
    sources: [1],
    note: "The time total is calendar time for the whole change, not a sum of hours from each function. A range is drawn to its long end and labeled in full. Sequence is the lab configuring the change itself.",
    examples: [REPORT, DEPARTMENT],
  },
  {
    id: "consultants",
    label: "Consultant Dependency",
    kicker: "Custom change",
    title: "The consultant fee is the published total",
    emphasis: "cost",
    sources: [1],
    note: "CleverLAB prices a custom change as a programmer’s fee. That fee is the cost total. On Sequence the same change is self-configuration, so the consultant fee is $0.",
    examples: [REPORT, DEPARTMENT],
  },
  {
    id: "integration",
    label: "Integration Complexity",
    kicker: "Custom interface",
    title: "Total cost and time to connect an instrument",
    emphasis: "cost",
    sources: [2],
    note: "Bika prices a new interface as vendor customisation, built with help from the lab during testing. The cost total is that vendor fee. The time total is one to two weeks, including testing. An interface already in the catalogue is free, and its turn-on time is not published.",
    examples: [
      {
        id: "uni",
        name: "Unidirectional interface",
        cost: 3000,
        costLabel: "About $3,000",
        hours: 2 * WEEK,
        timeLabel: "1–2 weeks",
        sequenceCost: null,
        sequenceCostLabel: "Not published",
        sequenceHours: null,
        sequenceTimeLabel: "Not published",
      },
      {
        id: "bi",
        name: "Bidirectional interface",
        cost: 5000,
        costLabel: "About $5,000",
        hours: 2 * WEEK,
        timeLabel: "1–2 weeks",
        sequenceCost: null,
        sequenceCostLabel: "Not published",
        sequenceHours: null,
        sequenceTimeLabel: "Not published",
      },
      {
        id: "exists",
        name: "Already in the catalogue",
        cost: 0,
        costLabel: "$0",
        hours: null,
        timeLabel: "Not published",
        sequenceCost: 0,
        sequenceCostLabel: "$0",
        sequenceHours: null,
        sequenceTimeLabel: "Not published",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance Friction",
    kicker: "Custom report",
    title: "A new report template, priced as one change",
    emphasis: "time",
    sources: [1],
    note: "CleverLAB’s priced custom report is a new report template: $2,000 and 2–3 weeks with a programmer, or $0 and 1 hour when the lab configures it. The article does not publish a second price for a compliance-only tweak.",
    examples: [REPORT],
  },
];

const FUNCTIONS = [
  { id: "consultants", label: "Consultants", hint: "The published fee" },
  { id: "it", label: "Internal IT", hint: "Not priced" },
  { id: "pm", label: "Project manager", hint: "Not priced" },
  { id: "lab", label: "Lab staff", hint: "Configures Sequence" },
] as const;

const INTERFACE_FUNCTIONS = [
  { id: "consultants", label: "Consultants", hint: "The vendor fee" },
  { id: "it", label: "Internal IT", hint: "Not priced" },
  { id: "pm", label: "Project manager", hint: "Not priced" },
  { id: "lab", label: "Lab staff", hint: "Help with testing" },
] as const;

function stackWidth(value: number | null, max: number): string {
  if (value == null || max <= 0 || value <= 0) return "0%";
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `max(10px, ${pct}%)`;
}

function StackBar({ segments, max }: { segments: StackSegment[]; max: number }) {
  const drawn = segments.filter((segment) => segment.value > 0);
  return (
    <div className="lp-stack" aria-hidden="true">
      {drawn.length === 0 ? <i className="is-empty" /> : null}
      {drawn.map((segment) => (
          <i key={segment.id} className={`is-${segment.id}`} style={{ width: stackWidth(segment.value, max) }}>
          {segment.label ? <span>{segment.label}</span> : null}
        </i>
      ))}
    </div>
  );
}

function costSegments(value: number | null, sequence: boolean): StackSegment[] {
  if (value == null || value <= 0) return [];
  if (sequence) return [{ id: "lab", label: "Lab staff", value }];
  return [{ id: "consultants", label: "Consultants", value }];
}

function timeSegments(hours: number | null, sequence: boolean): StackSegment[] {
  if (hours == null || hours <= 0) return [];
  if (sequence) return [{ id: "lab", label: "Lab staff", value: hours }];
  return [{ id: "calendar", label: "", value: hours }];
}

function ChangeInfographic({ topic }: { topic: Topic }) {
  const costMax = Math.max(1, ...topic.examples.map((item) => item.cost));
  const timeMax = Math.max(
    1,
    ...topic.examples.flatMap((item) => [item.hours ?? 0, item.sequenceHours ?? 0]),
  );
  const functions = topic.id === "integration" ? INTERFACE_FUNCTIONS : FUNCTIONS;
  const summary = [
    topic.title,
    ...topic.examples.map(
      (item) =>
        `${item.name}: traditional cost ${item.costLabel}, traditional time ${item.timeLabel}, Sequence cost ${item.sequenceCostLabel}, Sequence time ${item.sequenceTimeLabel}`,
    ),
  ].join(". ");

  return (
    <figure className={`lp-info is-${topic.emphasis}`} aria-label={summary}>
      <div className="lp-info-head">
        <div>
          <p className="lp-info-kicker">{topic.kicker}</p>
          <h3 className="lp-compare-change">{topic.title}</h3>
        </div>
        <ul className="lp-info-legend">
          <li>
            <i className="is-consultants" aria-hidden="true" />
            Traditional
          </li>
          <li>
            <i className="is-lab" aria-hidden="true" />
            Sequence
          </li>
        </ul>
      </div>

      <div className="lp-info-examples">
        {topic.examples.map((example) => (
          <article className="lp-info-example" key={example.id}>
            <h4>{example.name}</h4>
            <div className="lp-info-sections">
              <section className="lp-info-cost" aria-label={`${example.name} cost`}>
                <p>Cost <span>Total fee</span></p>
                <div className="lp-info-metric">
                  <div>
                    <span>Traditional total</span>
                    <strong className={example.costLabel === "Not published" ? "is-quiet" : undefined}>{example.costLabel}</strong>
                  </div>
                  <StackBar segments={costSegments(example.cost, false)} max={costMax} />
                </div>
                <div className="lp-info-metric">
                  <div>
                    <span>Sequence total</span>
                    <strong className={example.sequenceCostLabel === "Not published" ? "is-quiet" : undefined}>
                      {example.sequenceCostLabel}
                    </strong>
                  </div>
                  <StackBar segments={costSegments(example.sequenceCost, true)} max={costMax} />
                </div>
              </section>
              <section className="lp-info-time" aria-label={`${example.name} time`}>
                <p>Time <span>Total calendar time</span></p>
                <div className="lp-info-metric">
                  <div>
                    <span>Traditional total</span>
                    <strong className={example.timeLabel === "Not published" ? "is-quiet" : undefined}>{example.timeLabel}</strong>
                  </div>
                  <StackBar segments={timeSegments(example.hours, false)} max={timeMax} />
                </div>
                <div className="lp-info-metric">
                  <div>
                    <span>Sequence total</span>
                    <strong className={example.sequenceTimeLabel === "Not published" ? "is-quiet" : undefined}>
                      {example.sequenceTimeLabel}
                    </strong>
                  </div>
                  <StackBar segments={timeSegments(example.sequenceHours, true)} max={timeMax} />
                </div>
              </section>
            </div>
          </article>
        ))}
      </div>

      <p className="lp-functions-title">Who takes part</p>
      <ul className="lp-functions">
        {functions.map((fn) => (
          <li key={fn.id}>
            <i className={`is-${fn.id}`} aria-hidden="true" />
            <span>{fn.label}</span>
            <small>{fn.hint}</small>
          </li>
        ))}
      </ul>
      <p className="lp-info-note">{topic.note}</p>
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
          <ChangeInfographic topic={active} />
          <p className="lp-compare-cite">{sourceCite(active.sources)}</p>
        </div>

        <footer className="lp-solve-sources">
          <p>
            Custom change totals come from CleverLAB. Instrument interfaces come from Bika. The cost total is the
            published fee. The time total is the published calendar time. The fee sits with the consultant or vendor.
            Neither source itemizes internal IT, the project manager, or lab staff, so those functions are named and
            not given a slice of the total. Sequence is the same source’s self-configuration result. Where a source
            gives a range, the bar reaches the long end and the label shows the range. Adding a department is $3,600
            and 3–4 weeks, or $0 and 1 day when the lab configures it. These figures are not a survey of Sequence
            customers.
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
              two weeks, including testing with help from the lab. An interface that already exists is free. The
              article does not say how long an existing interface takes to turn on.{" "}
              <a href="https://www.bikalims.org/blog/a-realistic-timeline-and-cost-breakdown-for-implementing-bika-lims">
                bikalims.org/blog/a-realistic-timeline-and-cost-breakdown-for-implementing-bika-lims
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

