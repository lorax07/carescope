import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { MARKETING_MODULES } from "./marketingModules";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="lp-page">
        <SiteHeader />

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

const CUSTOM_CHANGE: ChangeExample = {
  id: "change",
  name: "Custom change",
  cost: 2000,
  costLabel: "$2,000",
  hours: 3 * WEEK,
  timeLabel: "2–3 weeks",
  sequenceCost: 0,
  sequenceCostLabel: "$0",
  sequenceHours: 1,
  sequenceTimeLabel: "1 hour",
};

const INTERFACE_CHANGE: ChangeExample = {
  id: "interface",
  name: "Custom instrument connection",
  cost: 5000,
  costLabel: "About $3,000–$5,000",
  hours: 2 * WEEK,
  timeLabel: "1–2 weeks",
  sequenceCost: null,
  sequenceCostLabel: "Not published",
  sequenceHours: null,
  sequenceTimeLabel: "Not published",
};

const TOPICS: Topic[] = [
  {
    id: "cost",
    label: "The Cost of Change",
    kicker: "Custom change",
    title: "Total cost of one custom change",
    emphasis: "cost",
    sources: [1],
    note: "The total is the published fee for one custom change. That fee is drawn on Consultants. Internal IT team and Project manager/Lab admin take part, and the source does not price them, so those bands are named and left unpriced. On Sequence the same change is $0.",
    examples: [CUSTOM_CHANGE],
  },
  {
    id: "friction",
    label: "Operational Friction",
    kicker: "Custom change",
    title: "Total calendar time for one custom change",
    emphasis: "time",
    sources: [1],
    note: "The time total is calendar time for the whole change, not a sum of hours from each team. A range is drawn to its long end and labeled in full. Sequence is one hour when the laboratory configures the change.",
    examples: [CUSTOM_CHANGE],
  },
  {
    id: "consultants",
    label: "Consultant Dependency",
    kicker: "Custom change",
    title: "The consultant fee is the published total",
    emphasis: "cost",
    sources: [1],
    note: "The source prices a custom change as a programmer’s fee. That fee is the Consultants band. The other two teams are on the change and are not given a dollar slice. On Sequence the published total for this change is $0.",
    examples: [CUSTOM_CHANGE],
  },
  {
    id: "integration",
    label: "Integration Complexity",
    kicker: "Custom change",
    title: "Total cost of a custom instrument connection",
    emphasis: "cost",
    sources: [2],
    note: "Bika prices a new instrument connection as vendor customisation: about $3,000 one way and about $5,000 both ways, over 1–2 weeks, with help from the lab during testing. The bar reaches the long end of that range. The fee sits with the vendor. The other two teams are not itemized.",
    examples: [INTERFACE_CHANGE],
  },
  {
    id: "compliance",
    label: "Compliance Friction",
    kicker: "Custom change",
    title: "One custom change, on the compliance calendar",
    emphasis: "time",
    sources: [1],
    note: "The source does not publish a separate price for a compliance-only tweak. This is the same custom change: a published fee and 2–3 weeks, or $0 and 1 hour when the laboratory configures it.",
    examples: [CUSTOM_CHANGE],
  },
];

const TEAMS = [
  { id: "consultants", label: "Consultants" },
  { id: "it", label: "Internal IT team" },
  { id: "pm", label: "Project manager/Lab admin" },
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

type TeamBand = {
  id: string;
  label: string;
  value: number;
  display: string;
  unpublished?: boolean;
};

function traditionalBands(example: ChangeExample): TeamBand[] {
  return [
    { id: "consultants", label: "Consultants", value: example.cost, display: example.costLabel },
    { id: "it", label: "Internal IT team", value: 0, display: "Not published", unpublished: true },
    { id: "pm", label: "Project manager/Lab admin", value: 0, display: "Not published", unpublished: true },
  ];
}

function sequenceBands(example: ChangeExample): TeamBand[] {
  const unpublished = example.sequenceCost == null;
  const display = unpublished ? "Not published" : example.sequenceCostLabel;
  return TEAMS.map((team) => ({
    id: team.id,
    label: team.label,
    value: 0,
    display,
    unpublished,
  }));
}

function timeSegments(hours: number | null, sequence: boolean): StackSegment[] {
  if (hours == null || hours <= 0) return [];
  return [{ id: sequence ? "sequence" : "calendar", label: "", value: hours }];
}

const BAND_PX = 148;

function bandHeight(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "0px";
  return `${Math.max(72, Math.round((value / max) * BAND_PX))}px`;
}

function VerticalRoleStack({
  total,
  caption,
  segments,
  max,
}: {
  total: string;
  caption: string;
  segments: TeamBand[];
  max: number;
}) {
  const quiet = total === "Not published" || total === "$0";
  return (
    <div className="lp-vcol">
      <strong className={quiet ? "is-quiet" : undefined}>{total}</strong>
      <div className="lp-vplot" aria-hidden="true">
        <div className="lp-vstack">
          {segments.map((segment) => {
            const zero = segment.display === "$0";
            const open = Boolean(segment.unpublished) || zero;
            return (
              <i
                key={segment.id}
                className={`is-${segment.id}${segment.unpublished ? " is-unpublished" : ""}${zero ? " is-zero" : ""}`}
                style={open ? undefined : { height: bandHeight(segment.value, max) }}
              >
                <span>{segment.label}</span>
                <b>{segment.display}</b>
              </i>
            );
          })}
        </div>
      </div>
      <em>{caption}</em>
    </div>
  );
}

function ChangeInfographic({ topic }: { topic: Topic }) {
  const costMax = Math.max(1, ...topic.examples.map((item) => item.cost));
  const timeMax = Math.max(
    1,
    ...topic.examples.flatMap((item) => [item.hours ?? 0, item.sequenceHours ?? 0]),
  );
  const summary = [
    topic.title,
    ...topic.examples.map((item) => {
      const roles = traditionalBands(item)
        .map((role) => `${role.label} ${role.display}`)
        .join(", ");
      return `${item.name}: ${roles}. Time ${item.timeLabel}, Sequence ${item.sequenceTimeLabel}`;
    }),
  ].join(". ");

  return (
    <figure className={`lp-info is-${topic.emphasis}`} aria-label={summary}>
      <div className="lp-info-head">
        <div>
          <p className="lp-info-kicker">{topic.kicker}</p>
          <h3 className="lp-compare-change">{topic.title}</h3>
        </div>
        <ul className="lp-info-legend">
          {TEAMS.map((role) => (
            <li key={role.id}>
              <i className={`is-${role.id}`} aria-hidden="true" />
              {role.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-pair">
        <section className="lp-pair-side" aria-label="Cost by who took part">
          <p>
            Who took part <span>Cost in each stack</span>
          </p>
          {topic.examples.map((example) => (
            <div className="lp-vgroup" key={example.id}>
              <h4>{example.name}</h4>
              <div className="lp-vrow">
                <VerticalRoleStack
                  total={example.costLabel}
                  caption="Traditional"
                  segments={traditionalBands(example)}
                  max={costMax}
                />
                <VerticalRoleStack
                  total={example.sequenceCostLabel}
                  caption="Sequence"
                  segments={sequenceBands(example)}
                  max={costMax}
                />
              </div>
              <ul className="lp-role-key" aria-label="Traditional cost by team">
                {traditionalBands(example).map((role) => (
                  <li key={role.id}>
                    <i className={`is-${role.id}`} aria-hidden="true" />
                    <span>{role.label}</span>
                    <b className={role.display === "Not published" ? "is-quiet" : undefined}>{role.display}</b>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="lp-pair-side lp-pair-time" aria-label="Time">
          <p>
            Time <span>Total calendar time</span>
          </p>
          {topic.examples.map((example) => (
            <div className="lp-vgroup" key={example.id}>
              <h4>{example.name}</h4>
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
            </div>
          ))}
        </section>
      </div>
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
            Each chart is one custom change. Cost totals come from CleverLAB, except the instrument connection, which
            comes from Bika. The cost total is the published fee, drawn on Consultants. Internal IT team and Project
            manager/Lab admin are on the change. Neither source prices those two teams, so their bands say “Not
            published” and are not a slice of the fee. Where Sequence publishes $0, that total is repeated on each team
            because the source does not split it. The time total is the published calendar time. Where a source gives a
            range, the bar reaches the long end and the label shows the range. These figures are not a survey of
            Sequence customers.
          </p>
          <ol>
            <li>
              CleverLAB, Piotr Płonka, “How We Reduced LIMS Costs by 90%,” 1 October 2025. One custom change is $2,000
              and 2–3 weeks; self-configuration is $0 and 1 hour. The article illustrates that priced change with a new
              report template.{" "}
              <a href="https://cleverlab.pl/lims_cost_reduction_en.html">cleverlab.pl/lims_cost_reduction_en.html</a>
            </li>
            <li>
              Bika Lab Systems, “A Realistic Timeline and Cost Breakdown for Implementing Bika LIMS.” A unidirectional
              instrument connection is about $3,000 and a bidirectional connection is about $5,000. Either takes one to
              two weeks, including testing with help from the lab. A connection that already exists is free. The
              article does not say how long an existing connection takes to turn on.{" "}
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
          {MARKETING_MODULES.map((pillar) => (
            <li key={pillar.slug}>
              <Link to={`/modules/${pillar.slug}`} className="lp-platform-card">
                <span className={`lp-platform-icon ${pillar.tone}`} aria-hidden="true">
                  {pillar.icon}
                </span>
                <strong>{pillar.title}</strong>
                <span>{pillar.detail}</span>
              </Link>
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
