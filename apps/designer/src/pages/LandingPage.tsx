import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BuildPlanDialog } from "./BuildPlanDialog";
import { MARKETING_MODULES } from "./marketingModules";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

export function LandingPage() {
  const [planOpen, setPlanOpen] = useState(false);
  const openPlanRef = useRef<HTMLButtonElement>(null);
  const closePlan = useCallback(() => {
    setPlanOpen(false);
    requestAnimationFrame(() => openPlanRef.current?.focus());
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#less-friction") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("less-friction")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="lp-page lp-home">
        <SiteHeader />
        <section className="lp-showcase" aria-labelledby="showcase-heading">
          <h1 id="showcase-heading">
            Modern Laboratory Software
            <br />
            Build for change
            <br />
            Designed to scale
          </h1>
          <p>
            CareScope Sequence brings your lab workflows, data and systems together — so you can make changes
            faster, reduce integrations, and run a more efficient laboratory.
          </p>
          <div className="lp-showcase-actions">
            <Link to="/app?signup=1" className="lp-pill lp-pill-dark">
              Try free for 30 days
            </Link>
            <button type="button" className="lp-pill lp-pill-light" ref={openPlanRef} onClick={() => setPlanOpen(true)}>
              Build your plan
            </button>
          </div>
        </section>

        <div className="lp">
      <CoreHero />
      <WhyChoose />
      <FounderQuote />
      <WhatWeSolve />
      <PlatformBand />
      <IndustrySpotlights />
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
      {planOpen ? <BuildPlanDialog onClose={closePlan} /> : null}
    </div>
  );
}

type Topic = {
  id: string;
  label: string;
  description: string;
  visual: string;
  points: readonly [string, string];
  icon: string;
};

const TOPICS: Topic[] = [
  {
    id: "cost",
    label: "Make changes faster and at a lower cost",
    description: "Traditional LIMS changes turn into large, time consuming projects with multiple teams and high cost. Sequence does not require complex integrations which immediately allows laboratories to build meaningful changes at a lower cost.",
    visual: "Cost of a change for a small, medium, and major multi-site lab, Traditional LIMS beside Sequence",
    points: ["Make changes in weeks, not months.", "No complex integrations required."],
    icon: "↯",
  },
  {
    id: "operations",
    label: "Reduce errors caused by disconnected systems and custom integrations",
    description: "Multiple software integrations means that when 1 link in the chain is broken, the risk of cascading failure downstream is imminent. Sequence is built to reduce the need of disconnected systems so your IT team doesn't have to worry about fixing integration failures.",
    visual: "Each Sequence answer sits beside the Traditional LIMS problem it removes",
    points: ["One broken link does not cascade downstream.", "IT does not have to fix integration failures."],
    icon: "⌘",
  },
  {
    id: "integration",
    label: "Build your entire laboratory business using Sequence",
    description: "Most laboratory systems don't grow to meet your operational needs when you need support customers, refine quality or manage revenue and expenses. Sequence eases your growing pains with state of the art modules that seamlessly plug into your core system and allow you to grow faster than the competition.",
    visual: "Each Sequence module sits beside the Traditional LIMS problem it removes",
    points: ["Modules plug into the core system.", "Support customers, quality, and revenue as you grow."],
    icon: "⌕",
  },
];

const OPERATIONS_PAIRS = [
  {
    issue: "Samples live across spreadsheets and inboxes.",
    solution: "Samples move through one workflow.",
  },
  {
    issue: "Priority, holds, and location live elsewhere.",
    solution: "Key sample details are visible in one place.",
  },
  {
    issue: "Run status often lives at the bench.",
    solution: "See runs, instruments, steps, and samples.",
  },
  {
    issue: "Release evidence gets assembled later.",
    solution: "Review and release from the workflow.",
  },
  {
    issue: "Quality records live in separate places.",
    solution: "Keep records and audit history together.",
  },
] as const;

const INTEGRATION_PAIRS = [
  {
    issue: "Sample status lives in spreadsheets, inboxes, and the bench.",
    solution: "Sequence Operations receives, tests, reviews, and releases one record.",
  },
  {
    issue: "A new instrument waits on a vendor interface and a programmer.",
    solution: "Sequence Instruments shows identity, interface, place, and whether a sequence is running.",
  },
  {
    issue: "Deviations, CAPA, and the audit trail are rebuilt for the inspection.",
    solution: "Sequence Compliance records quality work as it happens.",
  },
  {
    issue: "The client account and the laboratory work are different systems.",
    solution: "Sequence Client keeps contacts, agreements, and accessions on one account.",
  },
  {
    issue: "Charges and denials start after the result is already released.",
    solution: "Sequence Revenue bills the accession from the same account and work.",
  },
  {
    issue: "A question about the laboratory waits on a report request.",
    solution: "Sequence Insights answers from that laboratory’s accounts, work, and revenue.",
  },
] as const;

function CompareLists({
  pairs,
  colored = false,
}: {
  pairs: readonly { issue: string; solution: string }[];
  colored?: boolean;
}) {
  return (
    <div className="lp-native-comparison lp-native-lists lp-native-pairs is-supplied">
      <div className="lp-native-pairs-head-row">
        <div className="lp-native-pairs-head">
          <h5>Traditional LIMS</h5>
        </div>
        <div className="lp-native-pairs-head is-sequence">
          <h5>Sequence</h5>
        </div>
      </div>
      {pairs.map((pair) => (
        <div className="lp-native-pair" key={pair.issue}>
          <article>
            <p className={colored ? "lp-native-pair-title" : undefined}>{pair.issue}</p>
          </article>
          <article className="is-sequence">
            <p className={colored ? "lp-native-pair-title" : undefined}>{pair.solution}</p>
          </article>
        </div>
      ))}
    </div>
  );
}

const CHANGE_SCALE = 654400;

const CHANGE_COSTS = [
  {
    name: "Traditional LIMS",
    who: "Cost of a change",
    tone: "is-traditional",
    rows: [
      { label: "Cost range for a small lab", value: "$6.2K–$31K", low: 6200, high: 30600 },
      { label: "Cost range for a medium lab", value: "$20K–$132K", low: 20000, high: 132200 },
      { label: "Cost range for a major lab with multiple sites", value: "$197K–$654K", low: 196800, high: 654400 },
    ],
  },
  {
    name: "Sequence",
    who: "Estimated cost of a change",
    tone: "is-sequence",
    rows: [
      { label: "Estimated cost range for a small lab", value: "$5K–$18K", low: 5000, high: 18000 },
      { label: "Estimated cost range for a medium lab", value: "$5K–$50K", low: 5000, high: 50000 },
      { label: "Estimated cost range for a major lab with multiple sites", value: "$75K–$300K", low: 75000, high: 300000 },
    ],
  },
] as const;

function CostInfographic() {
  return (
    <div className="lp-native-cost is-compare">
      {CHANGE_COSTS.map((side) => (
        <article className={`lp-cost-side ${side.tone}`} key={side.name}>
          <h3>{side.name}</h3>
          <p className="lp-cost-who">{side.who}</p>
          <ul className="lp-cost-lines">
            {side.rows.map((row) => (
              <li key={row.label}>
                <b>{row.label}</b>
                <span>{row.value}</span>
                <div
                  className="lp-cost-range"
                  role="img"
                  aria-label={`${side.name}, ${row.label}, ${row.value}`}
                >
                  <i
                    style={{
                      left: `${(row.low / CHANGE_SCALE) * 100}%`,
                      width: `${Math.max(((row.high - row.low) / CHANGE_SCALE) * 100, 1.5)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
      <p className="lp-cost-sources">
        Traditional LIMS ranges are change lines in{" "}
        <a href="https://sabineindustrial.com/research/what-a-lims-really-costs/" target="_blank" rel="noreferrer">
          Sabine Industrial, What a LIMS Really Costs (2026)
        </a>
        , not the implementation line. Small: a $6,200 change-order allowance and $30,600 in instrument interfaces. Medium: a $20,000 report amendment through a $132,200 version upgrade. Major, several sites: $196,800 in interfaces and integrations through a $654,400 upgrade. Bars share that $654,400 scale. Sequence has not published a change price by lab size. The ranges shown are estimates for a change: $5,000 to $18,000 for a small lab, $5,000 to $50,000 for a medium lab, and $75,000 to $300,000 for a major lab with multiple sites.
      </p>
    </div>
  );
}

function TopicInfographic({ id }: { id: Topic["id"] }) {
  if (id === "cost") return <CostInfographic />;
  if (id === "operations") return <CompareLists pairs={OPERATIONS_PAIRS} />;
  return <CompareLists pairs={INTEGRATION_PAIRS} colored />;
}

function TopicBlock({
  topic,
  flipped,
  active,
  reveal,
  staged,
}: {
  topic: Topic;
  flipped: boolean;
  active: boolean;
  reveal: number;
  staged: boolean;
}) {
  const showCopy = !staged || (active && reveal >= 1);
  const showPoints = !staged || (active && reveal >= 2);
  const showCta = !staged || (active && reveal >= 3);
  return (
    <section className={`lp-friction is-${topic.id}${flipped ? " is-flip" : ""}${active ? " is-active" : ""}`} aria-labelledby={`friction-${topic.id}`}>
      <div className="lp-friction-inner">
        <figure className="lp-friction-visual">
          <div className="lp-friction-screen">
            <TopicInfographic id={topic.id} />
          </div>
          <figcaption className="lp-sr">{topic.visual}</figcaption>
        </figure>
        <div className="lp-friction-copy">
          <h2 id={`friction-${topic.id}`}>{topic.label}</h2>
          <div className={`lp-reveal${showCopy ? " is-open" : ""}`} aria-hidden={!showCopy}>
            <p>{topic.description}</p>
          </div>
          <div className={`lp-reveal${showPoints ? " is-open" : ""}`} aria-hidden={!showPoints}>
            <ul className="lp-friction-points">
              {topic.points.map((point) => (
                <li key={point}>
                  <span className="lp-friction-mark" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="15" height="15">
                      <path
                        fill="currentColor"
                        d="M8 1.15 9.05 5.1h4.15L10.05 7.5l1.1 3.95L8 9.05 4.85 11.45 5.95 7.5 2.8 5.1h4.15L8 1.15z"
                      />
                    </svg>
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className={`lp-reveal${showCta ? " is-open" : ""}`} aria-hidden={!showCta}>
            <Link to="/app?signup=1" className="lp-friction-cta" tabIndex={showCta ? undefined : -1}>
              Try free for 30 days
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function prefersStackedSolve() {
  return window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)").matches;
}

function WhatWeSolve() {
  const sectionRef = useRef<HTMLElement>(null);
  const [staged, setStaged] = useState(() => (typeof window === "undefined" ? false : !prefersStackedSolve()));
  const [beat, setBeat] = useState({ topic: 0, reveal: 0 });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const fitIntegration = (stacked: boolean) => {
      const visual = section.querySelector<HTMLElement>(".lp-friction.is-integration .lp-friction-visual");
      const slides = section.querySelector<HTMLElement>(".lp-solve-slides");
      const friction = section.querySelector<HTMLElement>(".lp-friction.is-integration");
      if (!visual || !slides || !friction) return;
      if (stacked) {
        visual.style.zoom = "";
        return;
      }
      visual.style.zoom = "1";
      const style = getComputedStyle(friction);
      const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const available = slides.clientHeight - padY - 36;
      const needed = visual.offsetHeight;
      const scale = needed > 0 && needed > available ? Math.max(0.72, available / needed) : 1;
      visual.style.zoom = scale < 0.995 ? String(scale) : "";
    };

    const update = () => {
      const stacked = prefersStackedSolve();
      if (stacked) {
        setStaged(false);
        setBeat((prev) => (prev.topic === 0 && prev.reveal === 0 ? prev : { topic: 0, reveal: 0 }));
        return;
      }
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, -section.getBoundingClientRect().top / scrollable));
      const scaled = Math.min(TOPICS.length - 1e-4, progress * TOPICS.length);
      const topic = Math.floor(scaled);
      const reveal = Math.min(3, Math.floor((scaled - topic) * 4));
      setStaged(true);
      setBeat((prev) => (prev.topic === topic && prev.reveal === reveal ? prev : { topic, reveal }));
    };

    const onResize = () => {
      fitIntegration(prefersStackedSolve());
      update();
    };

    fitIntegration(prefersStackedSolve());
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section id="less-friction" ref={sectionRef} className={`lp-solve-scroll${staged ? " is-staged" : ""}`} aria-labelledby="what-we-solve-heading">
      <div className="lp-solve-stage">
        <div className="lp-section-head lp-solve-banner lp-solve-pin">
          <h2 id="what-we-solve-heading" className="lp-display-head">What we solve</h2>
        </div>
        <div className="lp-solve-slides">
          {TOPICS.map((topic, index) => (
            <TopicBlock
              key={topic.id}
              topic={topic}
              flipped={index % 2 === 0}
              active={index === beat.topic}
              reveal={beat.reveal}
              staged={staged}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const HERO_STAGES = ["Received", "Testing", "Review", "Released"] as const;

function CoreHero() {
  return (
    <section className="lp-core-hero" aria-labelledby="core-hero-caption">
      <div className="lp-core-stage">
        <div className="lp-core-product">
        <div className="lp-core-glow" aria-hidden="true" />
        <div className="lp-core-rig" aria-hidden="true">
          <div className="lp-core-shadow" />
          <article className="lp-core-window">
            <header className="lp-core-chrome">
              <img src="/sequence-logo.png" alt="" />
              <span>Core</span>
            </header>
            <div className="lp-core-body">
              <p className="lp-core-kicker">Accession</p>
              <h2>SCP-20491</h2>
              <p className="lp-core-meta">
                HPLC Assay · USP
                <span>Aether Pharma</span>
              </p>
              <ol className="lp-core-stages">
                {HERO_STAGES.map((stage) => (
                  <li key={stage}>{stage}</li>
                ))}
              </ol>
              <div className="lp-core-track">
                <span className="lp-core-track-fill" />
                <span className="lp-core-orb" />
              </div>
              <svg className="lp-core-trace" viewBox="0 0 640 80">
                <path d="M4 58C28 58 48 54 70 46S110 22 140 40 180 66 220 48 270 12 320 30 370 62 420 40 470 18 520 34 570 52 636 28" />
              </svg>
            </div>
            <div className="lp-core-sheen" />
          </article>
          <p className="lp-core-float is-instrument">
            <span>Instrument</span>
            <strong>Agilent 1260 HPLC</strong>
          </p>
          <p className="lp-core-float is-release">
            <span>Same record</span>
            <strong>Ready to release</strong>
          </p>
        </div>
        </div>
        <div className="lp-core-software" aria-hidden="true">
          <div className="lp-core-screen">
            <img className="is-queue" src="/hero-software-queue.png" alt="" />
            <img className="is-record" src="/hero-software-record.png" alt="" />
            <span className="lp-core-click" />
            <svg className="lp-core-cursor" viewBox="0 0 18 18">
              <path d="M1 1v14.2l3.7-3.6 2.7 5.4 2.2-1.1-2.7-5.3 4.6-.2L1 1z" />
            </svg>
          </div>
        </div>
      </div>
      <p className="lp-core-caption" id="core-hero-caption">
        One record, from receipt to release.
      </p>
    </section>
  );
}

const WHY_CHOOSE = [
  {
    n: "01",
    title: ["Fewer integrations.", "Less complexity."],
    body: "Reduce the number of systems you need to manage so your team can focus on what matters most.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="3" />
        <circle cx="7" cy="8.5" r="2.5" />
        <circle cx="25" cy="8.5" r="2.5" />
        <circle cx="16" cy="25" r="2.5" />
        <path d="M9.2 10 13.4 14M22.8 10 18.6 14M16 19v3.4" />
      </svg>
    ),
  },
  {
    n: "02",
    title: ["Make changes faster.", "Stay agile."],
    body: "Simpler workflows and a modular design give you the flexibility to adapt and grow without the delays.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="19" cy="16" r="7" />
        <path d="M19 12.2V16l2.6 1.7M7 11.5h4.2M5 16h5.2M7 20.5h4.2" />
      </svg>
    ),
  },
  {
    n: "03",
    title: ["Built for growth.", "Long-term value."],
    body: "Scale your laboratory operations with a platform that grows with you — today and tomorrow.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 25V15M13 25V11M20 25V16M27 25V7" />
      </svg>
    ),
  },
] as const;

function WhyChoose() {
  return (
    <section className="lp-why" aria-labelledby="why-sequence-heading">
      <h2 id="why-sequence-heading">Why choose Sequence</h2>
      <div className="lp-why-stats">
        {WHY_CHOOSE.map((item) => (
          <article key={item.n}>
            <div className="lp-why-mark">
              <span className="lp-why-num">{item.n}</span>
              <span className="lp-why-icon">{item.icon}</span>
            </div>
            <h3>
              {item.title[0]}
              <br />
              {item.title[1]}
            </h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SequenceWord() {
  return <img className="lp-founder-logo" src="/sequence-logo.png" alt="Sequence" />;
}

const FOUNDER_LINES = [
  <>Many laboratory systems are too complex, forcing labs to rely on expensive consultants and disconnected tools.</>,
  <><SequenceWord /> was built as a result of that frustration.</>,
  <><SequenceWord /> supports scientists, IT teams and operation by simplifying workflows, reducing integration complexity, and making changes faster.</>,
];

function FounderQuote() {
  const sectionRef = useRef<HTMLElement>(null);
  const [staged, setStaged] = useState(() => (typeof window === "undefined" ? false : !prefersStackedSolve()));
  const [reveal, setReveal] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const update = () => {
      if (prefersStackedSolve()) {
        setStaged(false);
        setReveal(FOUNDER_LINES.length - 1);
        return;
      }
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, -section.getBoundingClientRect().top / scrollable));
      const step = Math.min(FOUNDER_LINES.length - 1, Math.floor(Math.min(FOUNDER_LINES.length - 1e-4, progress * FOUNDER_LINES.length)));
      setStaged(true);
      setReveal((prev) => (prev === step ? prev : step));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      className={`lp-founder${staged ? " is-staged" : ""}`}
      ref={sectionRef}
      aria-labelledby="founder-quote-heading"
    >
      <div className="lp-founder-stage">
        <div className="lp-founder-panel">
          <p className="lp-founder-by">
            <span className="lp-founder-thumb" aria-hidden="true">LA</span>
            <span>Loris Azo, CEO, Carescope</span>
          </p>
          <blockquote>
            <h2 id="founder-quote-heading" className="lp-sr">From the founder</h2>
            {FOUNDER_LINES.map((line, index) => (
              <p key={index} className={`lp-founder-line${reveal >= index ? " is-on" : ""}`} aria-hidden={staged && reveal < index}>
                {line}
              </p>
            ))}
          </blockquote>
        </div>
      </div>
    </section>
  );
}

const MODULES_BOUNCING_UP = new Set(["operations", "compliance", "revenue"]);

function PlatformBand() {
  return (
    <section className="lp-section lp-platform" id="modules" aria-labelledby="platform-heading">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 id="platform-heading" className="lp-display-head lp-module-lead">
            No makeshift integrations,
            <br />
            just genuine tools
            <br />
            tailored for laboratory operation
          </h2>
        </div>
        <ul className="lp-module-row">
          {MARKETING_MODULES.map((pillar) => (
            <li key={pillar.slug} className={MODULES_BOUNCING_UP.has(pillar.slug) ? "is-up" : "is-down"}>
              <Link to={`/modules/${pillar.slug}`} className={`lp-module-card is-${pillar.slug}`}>
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

const INDUSTRY_SPOTLIGHTS = [
  {
    title: "Pharmaceutical",
    summary: "Control stability, release, and batch records from one governed laboratory workflow.",
    points: ["Method control", "Certificate release", "Audit history"],
    tone: "navy",
  },
  {
    title: "Agriculture",
    summary: "Follow soil, crop, feed, and residue samples from the field through the reported result.",
    points: ["Chain of custody", "High-volume intake", "Client certificates"],
    tone: "green",
  },
  {
    title: "Manufacturing",
    summary: "Connect incoming material, in-process checks, and final quality release without extra systems.",
    points: ["Spec routing", "Batch traceability", "Controlled change"],
    tone: "slate",
  },
  {
    title: "Chemicals",
    summary: "Standardize methods, solutions, instrument runs, and certificates across complex matrices.",
    points: ["Run traceability", "Method setup", "Governed release"],
    tone: "amber",
  },
  {
    title: "Food & Beverage",
    summary: "Move microbiology, chemistry, and safety testing through one visible operating workflow.",
    points: ["Holds and priority", "Batch review", "Release evidence"],
    tone: "rose",
  },
  {
    title: "Environmental",
    summary: "Manage large sample intakes, custody movements, analysis, and compliance reporting together.",
    points: ["Custody movement", "Multi-site work", "Reporting packages"],
    tone: "teal",
  },
  {
    title: "Clinical",
    summary: "Keep accessioning, testing, review, and release aligned for diagnostic laboratory teams.",
    points: ["Clear queues", "Authorization", "Operational history"],
    tone: "violet",
  },
  {
    title: "Cosmetics",
    summary: "Coordinate formulation testing, stability, and quality release with less operational friction.",
    points: ["Stability studies", "Review before release", "Versioned workflows"],
    tone: "blush",
  },
] as const;

function IndustryMark({ title }: { title: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 28,
    height: 28,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (title === "Pharmaceutical") {
    return (
      <svg {...common}>
        <path d="M9 3h6" />
        <path d="M10 3v6.2L6.2 18A3.4 3.4 0 0 0 9.3 22h5.4a3.4 3.4 0 0 0 3.1-4L14 9.2V3" />
      </svg>
    );
  }
  if (title === "Agriculture") {
    return (
      <svg {...common}>
        <path d="M12 21V10" />
        <path d="M12 14c-4 0-6-2.2-7-5 3 .2 5.2 1.6 7 5Z" />
        <path d="M12 12c3.6 0 6-2 7.2-5-2.6.4-5 1.8-7.2 5Z" />
      </svg>
    );
  }
  if (title === "Manufacturing") {
    return (
      <svg {...common}>
        <path d="M3 20V10l5 3V10l5 3V8l8 4v8" />
        <path d="M3 20h18" />
      </svg>
    );
  }
  if (title === "Chemicals") {
    return (
      <svg {...common}>
        <path d="M8 3h8" />
        <path d="M9 3v5L5.5 16A3.2 3.2 0 0 0 8.4 21h7.2a3.2 3.2 0 0 0 2.9-5L15 8V3" />
        <path d="M8.5 14h7" />
      </svg>
    );
  }
  if (title === "Food & Beverage") {
    return (
      <svg {...common}>
        <path d="M7 3v8a3 3 0 0 0 6 0V3" />
        <path d="M10 3v8" />
        <path d="M17 3v6.5a2.2 2.2 0 0 1-2.2 2.2H14" />
        <path d="M7 21h10" />
      </svg>
    );
  }
  if (title === "Environmental") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2.4 2.2 3.6 4.8 3.6 8s-1.2 5.8-3.6 8c-2.4-2.2-3.6-4.8-3.6-8s1.2-5.8 3.6-8Z" />
      </svg>
    );
  }
  if (title === "Clinical") {
    return (
      <svg {...common}>
        <path d="M12 21s-7-4.2-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.8-7 9-7 9Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="m12 3 1.4 4.2L18 8.5l-3.4 2.6L15.8 16 12 13.6 8.2 16l1.2-4.9L6 8.5l4.6-1.3L12 3Z" />
    </svg>
  );
}

function IndustrySpotlights() {
  return (
    <section className="lp-section lp-industries" id="industries" aria-labelledby="industry-spotlights-heading">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 id="industry-spotlights-heading" className="lp-display-head">Use Sequence wherever science is fundamental</h2>
        </div>
        <div className="lp-industry-mosaic">
          {INDUSTRY_SPOTLIGHTS.map((industry) => (
            <article className={`lp-industry-tile is-${industry.tone}`} key={industry.title}>
              <span className="lp-industry-mark" aria-hidden="true">
                <IndustryMark title={industry.title} />
              </span>
              <h3>{industry.title}</h3>
              <p>{industry.summary}</p>
              <ul>
                {industry.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const REGULATIONS = [
  { code: "21 CFR 11", name: "Electronic records and signatures", meets: "Sequence binds each signature to the section it approves and keeps the audit trail on that same electronic record." },
  { code: "21 CFR 58", name: "Good Laboratory Practice", meets: "Sequence Operations keeps the study sample, the instrument that tested it, and the people who handled it on one record." },
  { code: "21 CFR 210", name: "Drug manufacturing practice", meets: "Sequence holds the batch steps, the holds, and the laboratory controls on the accession the laboratory is already running." },
  { code: "21 CFR 211", name: "Finished pharmaceuticals", meets: "Sequence records laboratory control, review, and release on the finished-product accession instead of a separate batch file." },
  { code: "21 CFR 820", name: "Quality system regulation", meets: "Sequence Compliance keeps the device change, the deviation, and the controlled document together, with the approval on the section it covers." },
  { code: "ISO 17025", name: "Testing laboratory competence", meets: "Sequence keeps the method, the instrument, and the result on the testing record, and the audit trail shows who changed each one." },
  { code: "ISO 15189", name: "Medical laboratories", meets: "Sequence Operations carries a clinical sample from receipt through review, with the site and any hold visible on that accession." },
  { code: "CLIA", name: "Clinical laboratory quality", meets: "Sequence keeps the patient test, its review, and the released result on one accession." },
  { code: "CAP", name: "Laboratory accreditation", meets: "Sequence Compliance keeps deviations, CAPA, and the audit trail in the same module the laboratory uses for the work." },
  { code: "EU Annex 11", name: "Computerized systems", meets: "Sequence records who changed a workflow and keeps the audit trail on that change in the designer." },
  { code: "ICH Q7", name: "API good manufacturing", meets: "Sequence keeps the ingredient batch, its tests, and the release decision on one record, and Sequence Compliance records a deviation beside that batch." },
  { code: "HIPAA", name: "Protected health information", meets: "Sequence Client keeps the account and its accessions together, so the laboratory work stays on that account rather than a separate list." },
] as const;

function RegIcon({ code }: { code: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 28,
    height: 28,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<string, ReactNode> = {
    "21 CFR 11": (
      <>
        <path d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M14 4v4h4M8 14h5M8 17h3" />
      </>
    ),
    "21 CFR 58": (
      <>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    "21 CFR 210": (
      <>
        <path d="M4 20V9l5 3V9l5 3V7l6 3v10" />
        <path d="M4 20h16" />
      </>
    ),
    "21 CFR 211": (
      <>
        <rect x="7" y="3" width="10" height="18" rx="5" />
        <path d="M7 10h10" />
      </>
    ),
    "21 CFR 820": (
      <>
        <path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    "ISO 17025": (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.8 12.2 2.1 2.1 4.3-4.6" />
      </>
    ),
    "ISO 15189": (
      <>
        <path d="M12 21s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 3.8C19 16.6 12 21 12 21Z" />
      </>
    ),
    CLIA: (
      <>
        <path d="M9 3h6" />
        <path d="M10 3v5.5L6.5 18A3.2 3.2 0 0 0 9.4 22h5.2a3.2 3.2 0 0 0 2.9-4L14 8.5V3" />
      </>
    ),
    CAP: (
      <>
        <circle cx="12" cy="9" r="4" />
        <path d="M8 14.5 6.5 21l5.5-2.4L17.5 21 16 14.5" />
      </>
    ),
    "EU Annex 11": (
      <>
        <rect x="4" y="4" width="16" height="6" rx="1.5" />
        <rect x="4" y="14" width="16" height="6" rx="1.5" />
        <path d="M8 7h.01M8 17h.01" />
      </>
    ),
    "ICH Q7": (
      <>
        <path d="M8 3h8M9 3v6l-3.2 6.2A3 3 0 0 0 8.4 21h7.2a3 3 0 0 0 2.6-5.8L15 9V3" />
      </>
    ),
    HIPAA: (
      <>
        <rect x="6" y="10" width="12" height="10" rx="2" />
        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      </>
    ),
  };
  return <svg {...common}>{paths[code]}</svg>;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function ComplianceSection() {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [hovering, setHovering] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousIndex = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const normalized = query.trim().toLowerCase();
  const matchIndex = normalized
    ? REGULATIONS.findIndex((item) =>
        `${item.code} ${item.name} ${item.meets}`.toLowerCase().includes(normalized),
      )
    : -1;
  const searching = normalized.length > 0;

  useEffect(() => {
    if (searching || hovering || reducedMotion) return;
    const timer = window.setInterval(() => {
      setCursor((current) => (current + 1) % REGULATIONS.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [searching, hovering, reducedMotion]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const index = searching ? matchIndex : cursor;
    if (index < 0) return;
    const card = scroller.querySelectorAll<HTMLElement>(".lp-reg-card")[index];
    if (!card) return;
    const top = searching
      ? card.offsetTop - (scroller.clientHeight - card.offsetHeight) / 2
      : card.offsetTop;
    const behavior: ScrollBehavior =
      reducedMotion || (!searching && index < previousIndex.current) ? "auto" : "smooth";
    previousIndex.current = index;
    scroller.scrollTo({ top: Math.max(0, top), behavior });
  }, [cursor, matchIndex, searching, reducedMotion]);

  return (
    <section className="lp-rigor" id="compliance" aria-labelledby="rigor-heading">
      <h2 id="rigor-heading" className="lp-rigor-heading">Build with regulatory rigor in mind</h2>
      <div className="lp-section lp-compliance">
      <div className="lp-compliance-stage">
        <img
          className="lp-compliance-photo"
          src="/regulations/regulated-lab-background.jpg"
          alt=""
        />
        <div className="lp-compliance-layout">
          <div className="lp-compliance-copy">
            <h2 id="compliance-heading">
              Sequence helps quality leadership feel at ease. The Core product and all modules continuously meet regulatory scrutiny across multiple industries.
            </h2>
            <label className="lp-reg-search">
              <span className="lp-sr">Find your regulatory framework</span>
              <input
                type="search"
                value={query}
                placeholder="find your regulatory framework"
                onChange={(event) => setQuery(event.target.value)}
                aria-controls="regulation-carousel"
              />
            </label>
            {searching && matchIndex < 0 ? (
              <p className="lp-reg-empty" role="status">No framework matches that search.</p>
            ) : null}
            <Link to="/app?signup=1" className="lp-pill lp-pill-dark">
              Try free for 30 days
            </Link>
          </div>
          <div
            className={`lp-reg-scroll${searching ? " is-searching" : ""}`}
            id="regulation-carousel"
            ref={scrollRef}
            tabIndex={0}
            aria-label="Regulations"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
          >
            {REGULATIONS.map((item, index) => (
              <article
                className={`lp-reg-card${searching && index === matchIndex ? " is-focus" : ""}`}
                key={item.code}
                data-code={item.code}
              >
                <span className="lp-reg-icon" aria-hidden="true">
                  <RegIcon code={item.code} />
                </span>
                <div className="lp-reg-copy">
                  <b>{item.code}</b>
                  <small>{item.name}</small>
                  <p className="lp-reg-more">{item.meets}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
