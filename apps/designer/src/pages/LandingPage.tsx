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
        </section>
      </div>

      <PlatformBand />

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

function PlatformBand() {
  return (
    <section className="lp-platform" aria-labelledby="platform-heading">
      <div className="lp-platform-inner">
        <h2 id="platform-heading">
          The laboratory platform
          <br />
          that keeps you moving.
        </h2>
        <p>
          CareScope Sequence brings your lab’s workflows, data and systems
          together — so you can make changes faster, reduce integrations, and
          run a more efficient laboratory.
        </p>
        <ul>
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

const PLATFORM_PILLARS = [
  {
    title: "LIMS",
    detail: "Manage samples, tests and results",
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
    title: "Workflow",
    detail: "Configure and adapt as your needs change",
    tone: "green",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="8" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="24" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="24" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M11 16h6a4 4 0 0 0 4-4V11M17 16a4 4 0 0 1 4 4v1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Integrations",
    detail: "Connect the systems you already use",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M10 20.5A6.5 6.5 0 0 1 16.2 12h.3A5.5 5.5 0 1 1 22 22.5H11.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Quality",
    detail: "Maintain compliance and confidence",
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
        <path
          d="m12.2 16.2 2.6 2.6 5-5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Analytics",
    detail: "Turn data into better decisions",
    tone: "cyan",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path
          d="M7 24V14M13 24V8M19 24v-6M25 24V11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Client Services",
    detail: "Deliver a better client experience",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="21" cy="13" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M6.5 23.5c.8-3.2 2.8-4.8 5.5-4.8s4.7 1.6 5.5 4.8M18.2 23.5c.4-1.8 1.5-3.1 3.2-3.5 1.8.3 3 1.6 3.4 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

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
