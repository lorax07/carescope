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
    id: "friction",
    label: "Operational Friction",
    description: "Disconnected systems, manual steps and waiting points slow your lab down and increase the risk of errors.",
    visual: "Traditional LIMS compared with Sequence",
    outcome: "Keep your workflow moving.",
    icon: "⌘",
  },
  {
    id: "consultants",
    label: "Consultant Dependency",
    description: "Traditional LIMS changes require multiple teams and external consultants, adding time, cost and complexity.",
    visual: "Traditional lifecycle compared with Sequence",
    outcome: "Put control back in your hands.",
    icon: "♟",
  },
  {
    id: "integration",
    label: "Integration Complexity",
    description: "Multiple systems, interfaces and vendors create a fragile ecosystem that’s hard to manage and scale.",
    visual: "Legacy LIMS compared with Sequence",
    outcome: "Fewer integrations. Greater control.",
    icon: "⌕",
  },
  {
    id: "compliance",
    label: "Compliance Friction",
    description: "Every change requires documentation, approvals and validation—slowing down innovation and operations.",
    visual: "Controlled and compliant by design",
    outcome: "Stay compliant, move faster.",
    icon: "♢",
  },
];

const FLOW = ["Order", "Accession", "Testing", "Result", "Report"];
const CONSULTANT_FLOW = ["Lab request", "Consultant", "IT", "Project mgr", "Testing", "Validation", "Deployment"];
const CONFIG_FLOW = ["Draft", "Review", "Test", "Approve", "Deploy"];
const COMPLIANCE_FLOW = ["Change request", "Test", "Validate", "Document", "Approve", "Release"];
const INTEGRATIONS = ["EMR", "Instruments", "Billing", "Reporting", "Other systems", "Portals", "Files"];

function Flow({ items, tone = "traditional" }: { items: string[]; tone?: "traditional" | "sequence" }) {
  return (
    <div className={`lp-native-flow is-${tone}`}>
      {items.map((item, index) => (
        <div className="lp-native-flow-item" key={item}>
          <span>{index + 1}</span>
          <b>{item}</b>
          {index < items.length - 1 ? <i aria-hidden="true">→</i> : null}
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

function OperationalInfographic() {
  return (
    <div className="lp-native-comparison">
      <section>
        <h5>Traditional LIMS</h5>
        <Flow items={FLOW} />
        <p className="lp-native-warning">Workarounds · handoffs · waiting</p>
      </section>
      <section>
        <h5>Sequence</h5>
        <Flow items={FLOW} tone="sequence" />
        <p className="lp-native-good">A unified workflow with no disconnected handoffs</p>
      </section>
    </div>
  );
}

function ConsultantInfographic() {
  return (
    <div className="lp-native-comparison">
      <section>
        <h5>Traditional LIMS</h5>
        <Flow items={CONSULTANT_FLOW} />
        <p className="lp-native-warning">Multiple handoffs. Extended timelines.</p>
      </section>
      <section>
        <h5>Sequence configuration lifecycle</h5>
        <Flow items={CONFIG_FLOW} tone="sequence" />
        <p className="lp-native-good">The lab retains control from draft through deployment</p>
      </section>
    </div>
  );
}

function IntegrationMap({ sequence = false }: { sequence?: boolean }) {
  return (
    <div className={`lp-native-hub${sequence ? " is-sequence" : ""}`}>
      <strong>{sequence ? "Sequence" : "LIMS"}</strong>
      {INTEGRATIONS.map((item, index) => (
        <span key={item} style={{ "--hub-index": index } as CSSProperties}>{item}</span>
      ))}
    </div>
  );
}

function IntegrationInfographic() {
  return (
    <div className="lp-native-comparison lp-native-integration">
      <section>
        <h5>Legacy LIMS</h5>
        <IntegrationMap />
      </section>
      <section>
        <h5>Sequence</h5>
        <IntegrationMap sequence />
        <p className="lp-native-good">Reduce integration dependency</p>
      </section>
    </div>
  );
}

function ComplianceInfographic() {
  return (
    <div className="lp-native-comparison">
      <section>
        <h5>Traditional LIMS</h5>
        <Flow items={COMPLIANCE_FLOW} />
        <p className="lp-native-warning">Slow, manual and high risk</p>
      </section>
      <section>
        <h5>Sequence · controlled and compliant by design</h5>
        <Flow items={COMPLIANCE_FLOW} tone="sequence" />
        <div className="lp-native-features">
          {["Audit trail", "Electronic signatures", "Versioning", "Traceability"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
    </div>
  );
}

function TopicInfographic({ id }: { id: Topic["id"] }) {
  if (id === "cost") return <CostInfographic />;
  if (id === "friction") return <OperationalInfographic />;
  if (id === "consultants") return <ConsultantInfographic />;
  if (id === "integration") return <IntegrationInfographic />;
  return <ComplianceInfographic />;
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
