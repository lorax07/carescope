import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MODULE_INTEGRATIONS } from "@carescope/workflow-core";
import "./landing.css";

const CAPABILITIES = MODULE_INTEGRATIONS.map((m) => ({
  id: m.module,
  label: m.label,
  description: m.description,
}));

export function LandingPage() {
  return (
    <div className="lp">
      <div className="lp-frame">
        <header className="lp-nav">
          <Link to="/" className="lp-logo" aria-label="CareScope home">
            <span className="lp-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="28" height="28">
                <circle cx="16" cy="16" r="14" fill="#1B6EF3" />
                <path
                  d="M16 7.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 3.2a2.4 2.4 0 0 1 2.4 2.4v1.1l1.8.9a1 1 0 0 1 .05 1.75l-1.85.9v1.85a2.4 2.4 0 1 1-4.8 0v-1.85l-1.85-.9a1 1 0 0 1 .05-1.75l1.8-.9V13.1A2.4 2.4 0 0 1 16 10.7Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <span className="lp-logo-word">
              <span className="lp-brand-care">CareScope</span>
            </span>
          </Link>

          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#capabilities">Capabilities</a>
            <a href="#workflows">Workflows</a>
            <a href="#compliance">Compliance</a>
            <Link to="/app?signup=1">Try OneLab</Link>
          </nav>

          <div className="lp-nav-actions">
            <a href="/intrasite" className="lp-link-quiet">
              Intrasite
            </a>
            <Link to="/app" className="lp-link-quiet">
              Sign in
            </Link>
            <Link to="/app?signup=1" className="lp-btn lp-btn-primary">
              Try OneLab
            </Link>
          </div>
        </header>

        <section className="lp-hero" aria-labelledby="hero-brand">
          <div className="lp-hero-copy">
            <p className="lp-brand-lockup" id="hero-brand">
              <span className="lp-brand-care">CareScope</span>{" "}
              <span className="lp-brand-onelab">OneLab</span>
            </p>
            <h1 className="lp-hero-title">
              Your lab shouldn’t have to work around your LIMS.
            </h1>
            <p className="lp-hero-lede">
              Stop stitching together software to run your laboratory. One
              intelligent platform connects your entire operation — from
              accessioning and testing to quality, billing, client service, and
              analytics — so your team can spend less time managing systems and
              more time advancing science.
            </p>
            <div className="lp-hero-cta">
              <Link to="/app?signup=1" className="lp-btn lp-btn-primary lp-btn-lg">
                Try OneLab
              </Link>
              <a href="#capabilities" className="lp-btn lp-btn-ghost lp-btn-lg">
                Browse Modules
              </a>
            </div>
          </div>

          <div className="lp-hero-visual" aria-hidden="true">
            <IntegrationsComparisonVisual />
          </div>
        </section>
      </div>

      <section className="lp-section" id="capabilities">
        <div className="lp-section-inner lp-section-wide">
          <div className="lp-section-heading-row">
            <div>
              <p className="lp-eyebrow">Capabilities</p>
              <h2 className="lp-h2">
                Everything you need to run the business around your lab under
                one platform
              </h2>
            </div>
            <p className="lp-capability-count">
              {CAPABILITIES.length} modules
            </p>
          </div>

          <CapabilitiesCarousel items={CAPABILITIES} />
        </div>
      </section>

      <section className="lp-section lp-section-tint" id="workflows">
        <div className="lp-section-inner lp-section-wide lp-workflow-block">
          <div>
            <p className="lp-eyebrow">Workflow engine</p>
            <h2 className="lp-h2">Automate laboratory process by design.</h2>
            <p className="lp-section-lede">
              A visual, no-code orchestration layer for approvals, instrument
              actions, notifications, and compliance checks — configurable for
              every module above.
            </p>
            <Link to="/app/workflows" className="lp-btn lp-btn-primary">
              Open workflow designer
            </Link>
          </div>
          <div className="lp-workflow-panel" aria-hidden="true">
            <WorkflowMiniCanvas />
          </div>
        </div>
      </section>

      <section className="lp-section" id="compliance">
        <div className="lp-section-inner lp-section-wide">
          <p className="lp-eyebrow">Trust</p>
          <h2 className="lp-h2">Governed for regulated environments.</h2>
          <p className="lp-section-lede">
            Immutable execution logs, e-signatures, document control, and
            multi-site isolation so audits are prepared continuously — not
            reconstructed later.
          </p>
          <ul className="lp-trust-list">
            <li>21 CFR Part 11–ready electronic signatures</li>
            <li>Chain of custody with scan-verified transfers</li>
            <li>Versioned workflows with publish, rollback, and simulation</li>
            <li>Tenant-isolated operations across laboratory sites</li>
          </ul>
        </div>
      </section>

      <section className="lp-cta-band">
        <div className="lp-cta-band-inner lp-section-wide">
          <h2 className="lp-h2">Bring pedigree to your laboratory stack.</h2>
          <p>
            Configure CareScope around your methods, sites, and quality system —
            then automate the rest through the workflow engine.
          </p>
          <Link to="/app?signup=1" className="lp-btn lp-btn-primary lp-btn-lg">
            Try OneLab
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner lp-section-wide">
          <span className="lp-logo-word">
            <span className="lp-brand-care">CareScope</span>
          </span>
          <span>Laboratory information management</span>
          <nav>
            <a href="/intrasite" className="lp-footer-intrasite">
              Intrasite
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

type Capability = {
  id: string;
  label: string;
  description: string;
};

function CapabilitiesCarousel({ items }: { items: Capability[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pageSize = usePageSize();
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  const goTo = useCallback(
    (next: number) => {
      const clamped = ((next % pageCount) + pageCount) % pageCount;
      setIndex(clamped);
      const el = trackRef.current;
      if (!el) return;
      const pageWidth = el.clientWidth;
      el.scrollTo({ left: clamped * pageWidth, behavior: "smooth" });
    },
    [pageCount]
  );

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => goTo(index + 1), 4500);
    return () => window.clearInterval(id);
  }, [goTo, index, paused]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const pageWidth = el.clientWidth || 1;
      setIndex(Math.round(el.scrollLeft / pageWidth));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    goTo(0);
  }, [goTo, pageSize]);

  const pages = Array.from({ length: pageCount }, (_, page) =>
    items.slice(page * pageSize, page * pageSize + pageSize)
  );

  return (
    <div
      className="lp-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="lp-carousel-controls">
        <button
          type="button"
          className="lp-carousel-btn"
          aria-label="Previous capabilities"
          onClick={() => goTo(index - 1)}
        >
          ←
        </button>
        <div className="lp-carousel-dots" role="tablist" aria-label="Capability pages">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`lp-carousel-dot${i === index ? " active" : ""}`}
              aria-label={`Show capabilities page ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="lp-carousel-btn"
          aria-label="Next capabilities"
          onClick={() => goTo(index + 1)}
        >
          →
        </button>
      </div>

      <div className="lp-carousel-viewport" ref={trackRef}>
        {pages.map((page, pageIdx) => (
          <div className="lp-carousel-page" key={pageIdx} aria-hidden={pageIdx !== index}>
            {page.map((item, i) => (
              <article className="lp-capability" key={item.id}>
                <span className="lp-capability-index">
                  {String(pageIdx * pageSize + i + 1).padStart(2, "0")}
                </span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function usePageSize() {
  const [size, setSize] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 700) setSize(1);
      else if (w < 1100) setSize(2);
      else setSize(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

const FRAGMENTED_PAINS = [
  "Expensive and delayed deployments",
  "Complex integration management",
  "Reduced customer satisfaction",
  "Audit risk",
] as const;

const ONELAB_BENEFITS = [
  "No middleware",
  "No glue code",
  "No stitching",
] as const;

const STACK_WINDOWS = [
  {
    id: "lis",
    app: "Vendor A LIS",
    chrome: "on-prem v7",
    alert: "HL7 NAK · interface down",
    lines: ["ADT 8821 dropped", "Retry 14 · waiting on Vendor A"],
  },
  {
    id: "emr",
    app: "Hospital EMR",
    chrome: "their window",
    alert: "ADT feed paused",
    lines: ["SSO not supported", "Open a ticket with Vendor A"],
  },
  {
    id: "qc",
    app: "QC SaaS",
    chrome: "separate login",
    alert: "Password expired",
    lines: ["New complexity rules", "MFA app on the other phone"],
  },
  {
    id: "excel",
    app: "RESULTS_FINAL_v18.xlsx",
    chrome: "Excel",
    alert: "The real system of record",
    lines: ["=VLOOKUP across 6 vendors", "Do not close · unsaved"],
  },
] as const;

const TASKBAR_APPS = [
  "LIS",
  "EMR",
  "QC",
  "Billing",
  "OEM",
  "Portal",
  "Excel",
] as const;

function TypicalLabStackVisual() {
  return (
    <div
      className="lp-stack-scene"
      role="img"
      aria-label="A night-shift lab desktop buried in mismatched vendor apps, failed logins, an Excel shadow LIS, and a STAT pager while the first sample waits"
    >
      <div className="lp-stack-scene-sky" />
      <p className="lp-stack-clock">Bench · 2:14 AM</p>
      <p className="lp-stack-chip">8 logins · 0 samples out</p>
      <aside className="lp-stack-sticky">
        <b>Who owns ADT?</b>
        <span>3 teams · 2 tickets</span>
      </aside>
      <aside className="lp-stack-pager">
        <b>INTERFACE DOWN</b>
        <span>pager · STAT hold</span>
      </aside>

      <div className="lp-stack-desktop">
        {STACK_WINDOWS.map((win, index) => (
          <article
            key={win.id}
            className={`lp-stack-window lp-stack-window-${win.id}`}
            style={{ animationDelay: `${0.12 + index * 0.08}s` }}
          >
            <header className="lp-stack-window-bar">
              <span className="lp-stack-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <strong>{win.app}</strong>
              <em>{win.chrome}</em>
            </header>
            <p className="lp-stack-window-alert">{win.alert}</p>
            <ul>
              {win.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="lp-stack-taskbar">
        {TASKBAR_APPS.map((app) => (
          <span key={app}>{app}</span>
        ))}
        <small>7 apps open</small>
      </div>
    </div>
  );
}

function IntegrationsComparisonVisual() {
  return (
    <div className="lp-compare">
      <div className="lp-compare-panel lp-compare-before">
        <div className="lp-compare-head">
          <span className="lp-compare-label lp-compare-label-alert">Typical lab stack</span>
          <strong className="lp-compare-metric lp-compare-metric-text lp-compare-metric-alert">
            Every vendor is another interface
          </strong>
          <ul className="lp-compare-pains">
            {FRAGMENTED_PAINS.map((pain) => (
              <li key={pain}>{pain}</li>
            ))}
          </ul>
        </div>
        <TypicalLabStackVisual />
      </div>

      <div className="lp-compare-divider" aria-hidden="true">
        <span>vs</span>
      </div>

      <div className="lp-compare-panel lp-compare-after">
        <div className="lp-compare-head">
          <span className="lp-compare-brand-onelab">OneLab</span>
          <strong className="lp-compare-metric lp-compare-metric-good lp-compare-metric-text">
            One Native Integration
          </strong>
          <ul className="lp-compare-benefits">
            {ONELAB_BENEFITS.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
        <div className="lp-compare-one">
          <div className="lp-compare-one-glow" />
          <OneLabUnifiedVisual />
        </div>
      </div>
    </div>
  );
}

const ONELAB_KEY_MODULES = [
  "Sample Lifecycle",
  "Data & Analytics",
  "Lab Quality Management System",
  "Billing",
  "Customer Portal",
  "20+ Modules",
] as const;

function OneLabUnifiedVisual() {
  return (
    <div
      className="lp-compare-one-system"
      aria-hidden="true"
      role="img"
      aria-label="OneLab ships key lab capabilities as one native integration"
    >
      <div className="lp-onelab-poster">
        <div className="lp-onelab-included">
          <p className="lp-onelab-included-label">
            Everything ships inside <span className="lp-onelab-name">OneLab</span>
          </p>
          <ul>
            {ONELAB_KEY_MODULES.map((item, i) => (
              <li key={item} style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function WorkflowMiniCanvas() {
  return (
    <div className="lp-mini-flow">
      <div className="node start">Start</div>
      <span className="edge" />
      <div className="node">Receive</div>
      <span className="edge" />
      <div className="node decision">STAT?</div>
      <span className="edge" />
      <div className="node">Approve</div>
      <span className="edge" />
      <div className="node end">CoA</div>
    </div>
  );
}
