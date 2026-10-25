import { useEffect, useRef, type ReactNode } from "react";
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
      <LimsFilm />
      <div className="lp-film-space" aria-hidden="true" />
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
  outcome: string;
  icon: string;
};

const TOPICS: Topic[] = [
  {
    id: "cost",
    label: "The Cost of Change",
    description: "Even small changes can turn into large, time-consuming projects—with multiple teams, systems and approvals.",
    visual: "Illustrative annual cost model",
    outcome: "Make changes in hours, not weeks.",
    icon: "↯",
  },
  {
    id: "operations",
    label: "Operational and compliance friction",
    description: "Disconnected queues, manual handoffs, and compliance evidence assembled after the fact slow the lab and raise the chance of error.",
    visual: "Each Sequence answer sits beside the Traditional LIMS problem it removes",
    outcome: "One accession from receive through release, with the evidence already on the work.",
    icon: "⌘",
  },
  {
    id: "integration",
    label: "Integration and Contractor dependency",
    description: "Traditional LIMS changes depend on outside contractors and a separate interface for every system the laboratory touches.",
    visual: "Each Sequence answer sits beside the Traditional LIMS problem it removes",
    outcome: "Run the laboratory in Sequence, without handing the change to a contractor.",
    icon: "⌕",
  },
];

const OPERATIONS_PAIRS = [
  {
    issueTitle: "Work is scattered.",
    issue: "Samples live across spreadsheets and inboxes.",
    solutionTitle: "One connected queue.",
    solution: "Samples move through one workflow.",
  },
  {
    issueTitle: "Details are disconnected.",
    issue: "Priority, holds, and location live elsewhere.",
    solutionTitle: "Everything stays together.",
    solution: "Key sample details are visible in one place.",
  },
  {
    issueTitle: "Testing is hard to see.",
    issue: "Run status often lives at the bench.",
    solutionTitle: "Testing is visible.",
    solution: "See runs, instruments, steps, and samples.",
  },
  {
    issueTitle: "Review is a separate step.",
    issue: "Release evidence gets assembled later.",
    solutionTitle: "Review is built in.",
    solution: "Review and release from the workflow.",
  },
  {
    issueTitle: "Compliance is fragmented.",
    issue: "Quality records live in separate places.",
    solutionTitle: "Compliance stays connected.",
    solution: "Keep records and audit history together.",
  },
] as const;

const INTEGRATION_PAIRS = [
  {
    issue: "Instruments, billing, reporting, and files each depend on a separate interface.",
    solution: "Operations, Instruments, Compliance, Client, Revenue, and Insights are modules of one platform.",
  },
  {
    issue: "Connecting an instrument waits on a vendor and a programmer.",
    solution: "Add an instrument by identity, interface, and place, and see whether its sequence is running.",
  },
  {
    issue: "A workflow change passes through a contractor, IT, and a project manager before the lab can use it.",
    solution: "The lab drafts, reviews, and publishes the workflow in the designer, without handing it to a contractor.",
  },
  {
    issue: "The client account and the accessions in the laboratory are different systems.",
    solution: "Sequence Client keeps contacts, agreements, and the laboratory work under the same account.",
  },
  {
    issue: "Charges and operating questions wait on a billing tool or a report request after release.",
    solution: "Sequence Revenue bills the accession. Insights answers from that laboratory’s accounts, work, and revenue.",
  },
] as const;

function CompareLists({
  pairs,
}: {
  pairs: readonly {
    issue: string;
    solution: string;
    issueTitle?: string;
    solutionTitle?: string;
  }[];
}) {
  const supplied = pairs.some((pair) => pair.issueTitle || pair.solutionTitle);
  return (
    <div className={`lp-native-comparison lp-native-lists lp-native-pairs${supplied ? " is-supplied" : ""}`}>
      <div className="lp-native-pairs-head-row">
        <div className="lp-native-pairs-head">
          <h5>Traditional LIMS</h5>
          {supplied ? null : <p>The problems</p>}
        </div>
        {supplied ? null : <span className="lp-native-pairs-gap" aria-hidden="true" />}
        <div className="lp-native-pairs-head is-sequence">
          <h5>Sequence</h5>
          {supplied ? null : <p>How Sequence solves them</p>}
        </div>
      </div>
      {pairs.map((pair, index) => (
        <div className="lp-native-pair" key={pair.issue}>
          <article>
            {supplied ? null : <span>{index + 1}</span>}
            <div>
              {pair.issueTitle ? <strong className="lp-native-pair-title">{pair.issueTitle}</strong> : null}
              <p>{pair.issue}</p>
            </div>
          </article>
          {supplied ? null : (
            <span className="lp-native-pairs-solves" aria-hidden="true">
              →
            </span>
          )}
          <article className="is-sequence">
            {supplied ? null : <span>{index + 1}</span>}
            <div>
              {pair.solutionTitle ? <strong className="lp-native-pair-title">{pair.solutionTitle}</strong> : null}
              <p>{pair.solution}</p>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}

function CostInfographic() {
  const costs = [
    ["Vendor customization", "$142K", 49],
    ["Integrations", "$61K", 21],
    ["Internal IT", "$38K", 13],
    ["Lab staff", "$27K", 9],
    ["Validation/QA", "$19K", 7],
  ] as const;
  return (
    <div className="lp-native-cost">
      <div className="lp-native-total">
        <strong>$287K</strong>
        <small>Total annual cost of change</small>
      </div>
      <div className="lp-native-bars">
        {costs.map(([label, value, percent], index) => (
          <div className={`lp-native-bar is-${index + 1}`} key={label}>
            <div>
              <b>{label}</b>
              <span>{value} <small>({percent}%)</small></span>
            </div>
            <i style={{ width: `${percent * 1.82}%` }} />
          </div>
        ))}
      </div>
      <p>Figures are an illustrative annual cost model, not an industry average.</p>
    </div>
  );
}

function TopicInfographic({ id }: { id: Topic["id"] }) {
  if (id === "cost") return <CostInfographic />;
  if (id === "operations") return <CompareLists pairs={OPERATIONS_PAIRS} />;
  return <CompareLists pairs={INTEGRATION_PAIRS} />;
}

function WhatWeSolve() {
  return (
    <div id="less-friction">
      {TOPICS.map((topic, index) => (
        <section className={`lp-friction is-${topic.id}${index % 2 ? " is-flip" : ""}`} key={topic.id} aria-labelledby={`friction-${topic.id}`}>
          <div className="lp-friction-inner">
            <figure className="lp-friction-visual">
              <figcaption>{topic.visual}</figcaption>
              <TopicInfographic id={topic.id} />
            </figure>
            <div className="lp-friction-copy">
              <h2 id={`friction-${topic.id}`}>{topic.label}</h2>
              <p>{topic.description}</p>
              <h3>{topic.outcome}</h3>
            </div>
          </div>
        </section>
      ))}
    </div>
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
            No makeshift integrations, just genuine tools tailored for laboratory operation
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
  { code: "21 CFR 11", name: "Electronic records and signatures", detail: "Controls for trustworthy electronic records, audit trails, and legally binding signatures." },
  { code: "21 CFR 58", name: "Good Laboratory Practice", detail: "Nonclinical laboratory study controls covering personnel, records, equipment, and specimens." },
  { code: "21 CFR 210", name: "Drug manufacturing practice", detail: "Minimum GMP requirements for the methods, facilities, and controls used in drug manufacture." },
  { code: "21 CFR 211", name: "Finished pharmaceuticals", detail: "Production, laboratory control, record, and distribution requirements for finished drug products." },
  { code: "21 CFR 820", name: "Quality system regulation", detail: "Medical-device quality system requirements for design, production, and recorded evidence." },
  { code: "ISO 17025", name: "Testing laboratory competence", detail: "Requirements for impartial, technically competent testing and calibration laboratories." },
  { code: "ISO 15189", name: "Medical laboratories", detail: "Quality and competence requirements for clinical laboratory examination services." },
  { code: "CLIA", name: "Clinical laboratory quality", detail: "U.S. standards for accurate, reliable, and timely patient laboratory testing." },
  { code: "CAP", name: "Laboratory accreditation", detail: "Inspection expectations for quality management, analytical performance, and documentation." },
  { code: "EU Annex 11", name: "Computerized systems", detail: "European GMP expectations for validated systems, audit trails, and data integrity." },
  { code: "ICH Q7", name: "API good manufacturing", detail: "GMP guidance for active pharmaceutical ingredient manufacturing and quality systems." },
  { code: "HIPAA", name: "Protected health information", detail: "Safeguards for patient information handled by clinical and diagnostic laboratory operations." },
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

function ComplianceSection() {
  return (
    <section className="lp-section lp-compliance" id="compliance" aria-labelledby="compliance-heading">
      <div className="lp-compliance-stage">
        <img
          className="lp-compliance-photo"
          src="/regulations/regulated-lab-background.jpg"
          alt=""
        />
        <div className="lp-compliance-layout">
          <div className="lp-compliance-copy">
            <h2 id="compliance-heading">Governed for regulated environments</h2>
            <p>
              Immutable execution logs, signatures, document control, and site isolation keep audit evidence ready.
            </p>
            <Link to="/app?signup=1" className="lp-pill lp-pill-dark">
              Try free for 30 days
            </Link>
          </div>
          <div className="lp-reg-scroll" tabIndex={0} aria-label="Regulations">
            {REGULATIONS.map((item) => (
              <article className="lp-reg-card" key={item.code}>
                <span className="lp-reg-icon" aria-hidden="true">
                  <RegIcon code={item.code} />
                </span>
                <div className="lp-reg-copy">
                  <b>{item.code}</b>
                  <small>{item.name}</small>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
