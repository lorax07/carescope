import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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
            The laboratory platform
            <br />
            that keeps you moving.
          </h1>
          <p>
            CareScope Sequence brings your lab workflows, data and systems together — so you can make changes
            faster, reduce integrations, and run a more efficient laboratory.
          </p>
          <div className="lp-showcase-actions">
            <Link to="/app?signup=1" className="lp-pill lp-pill-dark">
              Request a Demo
            </Link>
            <a href="#modules" className="lp-pill lp-pill-light">
              Explore modules
            </a>
          </div>
        </section>

        <div className="lp">
      <LimsFilm />
      <ServedMarquee />
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
    visual: "Traditional LIMS issues compared with Sequence",
    outcome: "One accession from receive through release, with the evidence already on the work.",
    icon: "⌘",
  },
  {
    id: "integration",
    label: "Integration and Contractor dependency",
    description: "Traditional LIMS changes depend on outside contractors and a separate interface for every system the laboratory touches.",
    visual: "Traditional LIMS issues compared with Sequence",
    outcome: "Run the laboratory in Sequence, without handing the change to a contractor.",
    icon: "⌕",
  },
];

const OPERATIONS_ISSUES = [
  "Sample status is split across spreadsheets, inboxes, and conversations at the bench.",
  "Receive, testing, review, and release do not share one accession record.",
  "Priority, holds, and location are tracked outside the workflow.",
  "Instrument status and the current run step are only visible by walking to the bench.",
  "Flags, reviewer identity, and release evidence are assembled after testing is finished.",
  "Deviations, CAPA, change control, and controlled documents live in separate binders.",
  "Signatures are scanned pages, and the audit trail is rebuilt when an inspection is already scheduled.",
];

const OPERATIONS_SOLUTIONS = [
  "Home, Testing, Review, and Release are stages of the same accession.",
  "Receive sample and Log sample open the record, with chain of custody in order and who did it.",
  "Priority, site, and hold stay on the work. The queue shows open, in testing, in review, or ready for release.",
  "A current run shows the instrument, the step it is on, the samples and solutions, and the control panel when the instrument is integrated.",
  "Review covers an individual sample or a batch, with flags, a reviewer PIN, and authorization before release.",
  "Sequence Compliance keeps deviations, CAPA, change control, controlled documents, and signatures on the work they approve.",
  "The audit trail is the record of those actions, so the inspection file is the work itself.",
];

const INTEGRATION_ISSUES = [
  "Instruments, billing, reporting, portals, and files each depend on a separate interface.",
  "Connecting an instrument waits on a vendor and a programmer.",
  "A workflow change passes through a contractor, IT, and a project manager before the lab can use it.",
  "The client account and the accessions in the laboratory are different systems.",
  "Charges are created after release, in a billing tool the bench does not open.",
  "A question about open work, revenue, or an account becomes a report request.",
  "Even a small change becomes a customization project with outside cost and delay.",
];

const INTEGRATION_SOLUTIONS = [
  "Operations, Instruments, Compliance, Client, Revenue, and Insights are modules of one platform.",
  "Add an instrument by identity, interface, and place, and see whether its sequence is running.",
  "The workflow designer builds screens, branches, and connections, and can attach a template to a branch the lab selects.",
  "Sequence Client keeps contacts, agreements, and the laboratory work under the same account.",
  "Sequence Revenue carries charge capture, edits, denials, and payment on that account and accession.",
  "Sequence Insights shows accounts, open work, revenue, and pipeline, and answers only from that laboratory text.",
  "The lab drafts, reviews, and publishes the workflow without handing the change to a contractor.",
];

function CompareLists({ issues, solutions }: { issues: string[]; solutions: string[] }) {
  return (
    <div className="lp-native-comparison lp-native-lists">
      <section>
        <h5>Traditional LIMS</h5>
        <p>Issues laboratories face</p>
        <ul>
          {issues.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="is-sequence">
        <h5>Sequence</h5>
        <p>How this product addresses them</p>
        <ul>
          {solutions.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
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
  if (id === "operations") return <CompareLists issues={OPERATIONS_ISSUES} solutions={OPERATIONS_SOLUTIONS} />;
  return <CompareLists issues={INTEGRATION_ISSUES} solutions={INTEGRATION_SOLUTIONS} />;
}

function WhatWeSolve() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(TOPICS[0].id);
  const [paused, setPaused] = useState(false);
  const activeIndex = TOPICS.findIndex((item) => item.id === activeId);
  const active = TOPICS[activeIndex] ?? TOPICS[0];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      setActiveId((current) => {
        const index = TOPICS.findIndex((item) => item.id === current);
        return TOPICS[(index + 1) % TOPICS.length].id;
      });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeId, paused]);

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
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    let next = activeIndex;
    if (event.key === "ArrowRight") next = (activeIndex + 1) % TOPICS.length;
    if (event.key === "ArrowLeft") next = (activeIndex - 1 + TOPICS.length) % TOPICS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TOPICS.length - 1;
    setActiveId(TOPICS[next].id);
    document.getElementById(`solve-tab-${TOPICS[next].id}`)?.focus();
  }

  return (
    <section
      className="lp-section lp-spotlight"
      id="less-friction"
      ref={sectionRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="lp-section-inner lp-solve-board">
        <div className="lp-solve-intro">
          <h2 className="lp-display-head">Less friction, more science</h2>
          <p>
            CareScope Sequence eliminates the biggest operational, technical and compliance challenges labs face—so
            you can focus on what matters most: better patient outcomes.
          </p>
        </div>

        <div className="lp-solve-jumps" role="tablist" aria-label="What we solve topics" onKeyDown={moveTab}>
          {TOPICS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`solve-tab-${item.id}`}
              aria-selected={item.id === active.id}
              aria-controls="solve-active-panel"
              tabIndex={item.id === active.id ? 0 : -1}
              className={item.id === active.id ? "is-on" : undefined}
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <article
          className="lp-solve-card"
          id="solve-active-panel"
          role="tabpanel"
          aria-labelledby={`solve-tab-${active.id}`}
          key={active.id}
        >
          <div className="lp-solve-card-head">
            <span>{activeIndex + 1}</span>
            <div>
              <h3>{active.label}</h3>
              <p>{active.description}</p>
            </div>
          </div>
          <figure className="lp-solve-visual">
            <figcaption>{active.visual}</figcaption>
            <TopicInfographic id={active.id} />
          </figure>
          <div className="lp-solve-outcome">
            <span aria-hidden="true">{active.icon}</span>
            <div>
              <p>How Sequence helps</p>
              <h4>{active.outcome}</h4>
            </div>
          </div>
        </article>
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

const BUSINESSES_SERVED = [
  "Pharmaceutical",
  "Clinical diagnostics",
  "Food & beverage",
  "Agriculture",
  "Environmental",
  "Chemicals",
  "Petrochemicals",
  "Manufacturing",
  "Cosmetics",
  "Biologics",
] as const;

function ServedMarquee() {
  return (
    <section className="lp-served" aria-labelledby="served-heading">
      <h2 id="served-heading">Businesses we have served</h2>
      <div className="lp-served-viewport">
        <div className="lp-served-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1}>
              {BUSINESSES_SERVED.map((name) => (
                <li key={`${copy}-${name}`}>{name}</li>
              ))}
            </ul>
          ))}
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
        <h2 id="platform-heading" className="sr-only">Laboratory modules</h2>
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
    points: ["Method and specification control", "Review, approval, and certificate release", "Complete audit history for every change"],
  },
  {
    title: "Agriculture",
    summary: "Follow soil, crop, feed, and residue samples from the field through the reported result.",
    points: ["Field-to-lab chain of custody", "High-volume accessioning", "Client-ready certificates"],
  },
  {
    title: "Manufacturing",
    summary: "Connect incoming material, in-process checks, and final quality release without extra systems.",
    points: ["Specification-driven routing", "Instrument and batch traceability", "Faster controlled changes"],
  },
  {
    title: "Chemicals / Petrochemicals",
    summary: "Standardize methods, solutions, instrument runs, and certificates across complex matrices.",
    points: ["Run and reagent traceability", "Repeatable method setup", "Governed result release"],
  },
  {
    title: "Food & Beverage",
    summary: "Move microbiology, chemistry, and safety testing through one visible operating workflow.",
    points: ["Priority and hold management", "Batch and individual review", "Release evidence in one record"],
  },
  {
    title: "Environmental",
    summary: "Manage large sample intakes, custody movements, analysis, and compliance reporting together.",
    points: ["Custody at every movement", "Multi-site operations", "Defensible reporting packages"],
  },
  {
    title: "Clinical",
    summary: "Keep accessioning, testing, review, and release aligned for diagnostic laboratory teams.",
    points: ["Clear work queues", "Controlled authorization", "Protected operational history"],
  },
  {
    title: "Cosmetics",
    summary: "Coordinate formulation testing, stability, and quality release with less operational friction.",
    points: ["Stability study tracking", "Review before release", "Versioned quality workflows"],
  },
] as const;

function IndustrySpotlights() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % INDUSTRY_SPOTLIGHTS.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="lp-section lp-industry-spotlights"
      id="industries"
      aria-labelledby="industry-spotlights-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 id="industry-spotlights-heading" className="lp-display-head">Industry Spotlights</h2>
          <p>See how Sequence supports the laboratories testing products across regulated and everyday industries.</p>
        </div>
        <div className="lp-page-stage" aria-live="polite">
          <div className="lp-page-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {INDUSTRY_SPOTLIGHTS.map((industry, industryIndex) => (
              <article className="lp-page-card" key={industry.title} aria-hidden={industryIndex !== index}>
                <header>
                  <span>Page {String(industryIndex + 1).padStart(2, "0")}</span>
                  <b>{industry.title}</b>
                </header>
                <h3>{industry.title}</h3>
                <p>{industry.summary}</p>
                <ul>
                  {industry.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
        <div className="lp-page-nav" role="tablist" aria-label="Industry spotlight pages">
          {INDUSTRY_SPOTLIGHTS.map((industry, industryIndex) => (
            <button
              type="button"
              role="tab"
              key={industry.title}
              aria-selected={industryIndex === index}
              aria-label={`Show ${industry.title}`}
              className={industryIndex === index ? "is-on" : undefined}
              onClick={() => setIndex(industryIndex)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const REGULATIONS = [
  { code: "21 CFR 11", name: "Electronic records and signatures", detail: "Controls for trustworthy electronic records, audit trails, and legally binding signatures.", image: "/regulations/reg-cfr-11.jpg" },
  { code: "21 CFR 58", name: "Good Laboratory Practice", detail: "Nonclinical laboratory study controls covering personnel, records, equipment, and specimens.", image: "/regulations/reg-cfr-58.jpg" },
  { code: "21 CFR 210", name: "Drug manufacturing practice", detail: "Minimum GMP requirements for the methods, facilities, and controls used in drug manufacture.", image: "/regulations/reg-cfr-210.jpg" },
  { code: "21 CFR 211", name: "Finished pharmaceuticals", detail: "Production, laboratory control, record, and distribution requirements for finished drug products.", image: "/regulations/reg-cfr-211.jpg" },
  { code: "21 CFR 820", name: "Quality system regulation", detail: "Medical-device quality system requirements for design, production, and recorded evidence.", image: "/regulations/reg-cfr-820.jpg" },
  { code: "ISO 17025", name: "Testing laboratory competence", detail: "Requirements for impartial, technically competent testing and calibration laboratories.", image: "/regulations/reg-iso-17025.jpg" },
  { code: "ISO 15189", name: "Medical laboratories", detail: "Quality and competence requirements for clinical laboratory examination services.", image: "/regulations/reg-iso-15189.jpg" },
  { code: "CLIA", name: "Clinical laboratory quality", detail: "U.S. standards for accurate, reliable, and timely patient laboratory testing.", image: "/regulations/reg-clia.jpg" },
  { code: "CAP", name: "Laboratory accreditation", detail: "Inspection expectations for quality management, analytical performance, and documentation.", image: "/regulations/reg-cap.jpg" },
  { code: "EU Annex 11", name: "Computerized systems", detail: "European GMP expectations for validated systems, audit trails, and data integrity.", image: "/regulations/reg-annex-11.jpg" },
  { code: "ICH Q7", name: "API good manufacturing", detail: "GMP guidance for active pharmaceutical ingredient manufacturing and quality systems.", image: "/regulations/reg-ich-q7.jpg" },
  { code: "HIPAA", name: "Protected health information", detail: "Safeguards for patient information handled by clinical and diagnostic laboratory operations.", image: "/regulations/reg-hipaa.jpg" },
] as const;

function ComplianceSection() {
  return (
    <section className="lp-section" id="compliance">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 className="lp-display-head">Governed for regulated environments</h2>
          <p>
            Immutable execution logs, signatures, document control, and site isolation keep audit evidence ready.
          </p>
        </div>
        <div className="lp-reg-grid">
          {REGULATIONS.map((item) => (
            <article
              className="lp-reg-card"
              key={item.code}
              tabIndex={0}
              style={{ "--reg-image": `url("${item.image}")` } as CSSProperties}
            >
              <b>{item.code}</b>
              <small>{item.name}</small>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
