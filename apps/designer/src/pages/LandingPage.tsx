import { useEffect, useRef } from "react";
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
  imagePosition: string;
  outcome: string;
  icon: string;
};

const TOPICS: Topic[] = [
  {
    id: "cost",
    label: "The Cost of Change",
    description: "Even small changes can turn into large, time-consuming projects—with multiple teams, systems and approvals.",
    visual: "Illustrative annual cost model",
    imagePosition: "0% center",
    outcome: "Make changes in hours, not weeks.",
    icon: "↯",
  },
  {
    id: "friction",
    label: "Operational Friction",
    description: "Disconnected systems, manual steps and waiting points slow your lab down and increase the risk of errors.",
    visual: "Traditional LIMS compared with Sequence",
    imagePosition: "25% center",
    outcome: "Keep your workflow moving.",
    icon: "⌘",
  },
  {
    id: "consultants",
    label: "Consultant Dependency",
    description: "Traditional LIMS changes require multiple teams and external consultants, adding time, cost and complexity.",
    visual: "Traditional lifecycle compared with Sequence",
    imagePosition: "50% center",
    outcome: "Put control back in your hands.",
    icon: "♟",
  },
  {
    id: "integration",
    label: "Integration Complexity",
    description: "Multiple systems, interfaces and vendors create a fragile ecosystem that’s hard to manage and scale.",
    visual: "Legacy LIMS compared with Sequence",
    imagePosition: "75% center",
    outcome: "Fewer integrations. Greater control.",
    icon: "⌕",
  },
  {
    id: "compliance",
    label: "Compliance Friction",
    description: "Every change requires documentation, approvals and validation—slowing down innovation and operations.",
    visual: "Controlled and compliant by design",
    imagePosition: "100% center",
    outcome: "Stay compliant, move faster.",
    icon: "♢",
  },
];

function WhatWeSolve() {
  const sectionRef = useRef<HTMLElement>(null);

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

        <nav className="lp-solve-jumps" aria-label="What we solve topics">
          {TOPICS.map((item) => (
            <a key={item.id} href={`#solve-${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="lp-solve-grid">
          {TOPICS.map((item, index) => (
            <article className="lp-solve-card" id={`solve-${item.id}`} key={item.id}>
              <div className="lp-solve-card-head">
                <span>{index + 1}</span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </div>
              <figure className="lp-solve-visual">
                <figcaption>{item.visual}</figcaption>
                <div
                  className="lp-solve-visual-image"
                  role="img"
                  aria-label={`${item.label} infographic from the supplied reference`}
                  style={{ backgroundPosition: item.imagePosition }}
                />
              </figure>
              <div className="lp-solve-outcome">
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <p>How Sequence helps</p>
                  <h4>{item.outcome}</h4>
                </div>
              </div>
            </article>
          ))}
        </div>
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
