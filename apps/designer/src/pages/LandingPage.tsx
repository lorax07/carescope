import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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
  const activeIndex = TOPICS.findIndex((item) => item.id === activeId);
  const active = TOPICS[activeIndex] ?? TOPICS[0];

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
    <section className="lp-section lp-spotlight" id="capabilities" ref={sectionRef}>
      <div className="lp-section-inner lp-solve-board">
        <h2 className="lp-solve-side-heading">What we solve</h2>
        <div className="lp-solve-intro">
          <h2>Less friction. More science.</h2>
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
