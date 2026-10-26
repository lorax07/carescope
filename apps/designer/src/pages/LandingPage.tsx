import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MARKETING_MODULES } from "./marketingModules";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

export function LandingPage() {
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
            <a href="#modules" className="lp-pill lp-pill-light">
              Explore modules
            </a>
          </div>
        </section>

        <div className="lp">
      <CoreHero />
      <WhyChoose />
      <PlatformBand />
      <WhatWeSolve />
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
    label: "Make changes at a lower cost",
    description: "Traditional LIMS changes turn into large, time consuming projects with multiple teams and high cost. Sequence does not require complex integrations which immediately allows laboratories to build meaningful changes at a lower cost.",
    visual: "Published cost of one custom LIMS change beside Sequence’s published menu",
    points: ["Make changes in hours, not weeks.", "No complex integrations required."],
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

const CHANGE_SCALE = 74394;

const CHANGE_COSTS = [
  {
    name: "Traditional LIMS",
    who: "One custom change",
    range: "$950–$74K",
    low: 950,
    high: 74394,
    tone: "is-traditional",
    note: "Cost of a custom change",
    rows: [
      ["Instrument interface", "$950–$3,825"],
      ["Report amendment", "$20,000"],
      ["Results interface", "$74,394"],
    ],
  },
  {
    name: "Sequence",
    who: "Published one-time menu",
    range: "$5K–$21K",
    low: 5000,
    high: 21000,
    tone: "is-sequence",
    note: "Published menu",
    rows: [
      ["Database transfer", "$8,000"],
      ["Core installation", "$5,000"],
      ["Validation deliverables", "$8,000"],
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
          <div className="lp-native-total">
            <strong>{side.range}</strong>
            <small>{side.note}</small>
          </div>
          <div className="lp-cost-range" role="img" aria-label={`${side.name}, ${side.who}, ${side.range}`}>
            <i style={{ left: `${(side.low / CHANGE_SCALE) * 100}%`, width: `${((side.high - side.low) / CHANGE_SCALE) * 100}%` }} />
          </div>
          <ul className="lp-cost-lines">
            {side.rows.map(([label, value]) => (
              <li key={label}>
                <b>{label}</b>
                <span>{value}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
      <p className="lp-cost-sources">
        The Traditional LIMS range is the cost of one custom change in{" "}
        <a href="https://sabineindustrial.com/research/what-a-lims-really-costs/" target="_blank" rel="noreferrer">
          Sabine Industrial, What a LIMS Really Costs (2026)
        </a>
        : instrument interfaces $950 to $3,825, one report amendment $20,000, and one results interface $74,394. These are public contract figures, not an average. Both bars use that $74,394 scale. Sequence’s published menu is Database Transfer $8,000, Core System Installation $5,000, and Validation Deliverables $8,000, taken separately or together ($5,000 to $21,000). That menu is not a figure from the study.
      </p>
    </div>
  );
}

function TopicInfographic({ id }: { id: Topic["id"] }) {
  if (id === "cost") return <CostInfographic />;
  if (id === "operations") return <CompareLists pairs={OPERATIONS_PAIRS} />;
  return <CompareLists pairs={INTEGRATION_PAIRS} colored />;
}

function TopicBlock({ topic, flipped }: { topic: Topic; flipped: boolean }) {
  return (
    <section className={`lp-friction is-${topic.id}${flipped ? " is-flip" : ""}`} aria-labelledby={`friction-${topic.id}`}>
      <div className="lp-friction-inner">
        <figure className="lp-friction-visual">
          <div className="lp-friction-screen">
            <TopicInfographic id={topic.id} />
          </div>
          <figcaption className="lp-sr">{topic.visual}</figcaption>
        </figure>
        <div className="lp-friction-copy">
          <h2 id={`friction-${topic.id}`}>{topic.label}</h2>
          <p>{topic.description}</p>
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
          <Link to="/app?signup=1" className="lp-friction-cta">
            Try free for 30 days
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhatWeSolve() {
  return (
    <section id="less-friction" aria-labelledby="what-we-solve-heading">
      <div className="lp-section-head lp-solve-banner">
        <h2 id="what-we-solve-heading" className="lp-display-head">What we solve</h2>
      </div>
      {TOPICS.map((topic) => (
        <TopicBlock key={topic.id} topic={topic} flipped={TOPICS.indexOf(topic) % 2 === 0} />
      ))}
    </section>
  );
}

const HERO_STAGES = ["Received", "Testing", "Review", "Released"] as const;

function CoreHero() {
  return (
    <section className="lp-core-hero" aria-labelledby="core-hero-caption">
      <div className="lp-core-stage">
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
      <p className="lp-core-caption" id="core-hero-caption">
        One record, from receipt to release.
      </p>
    </section>
  );
}

const WHY_CHOOSE = [
  {
    figure: "6",
    caption: "Modules for operations, instruments, compliance, client, revenue, and insights.",
  },
  {
    figure: "30 days",
    caption: "Try Sequence free and run a laboratory workflow before you commit.",
  },
  {
    figure: "1 record",
    caption: "The accession, the evidence, and the release stay on the same workflow.",
  },
] as const;

function WhyChoose() {
  return (
    <section className="lp-why" aria-labelledby="why-sequence-heading">
      <h2 id="why-sequence-heading">Why choose Sequence</h2>
      <div className="lp-why-stats">
        {WHY_CHOOSE.map((item) => (
          <article key={item.figure}>
            <strong>{item.figure}</strong>
            <p>{item.caption}</p>
          </article>
        ))}
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
