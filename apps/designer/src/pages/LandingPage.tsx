import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MODULE_INTEGRATIONS } from "@carescope/workflow-core";
import "./landing.css";

const CAPABILITIES = MODULE_INTEGRATIONS.map((m) => ({
  id: m.module,
  label: m.label,
  description: m.description,
  events: m.events.slice(0, 2),
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
            <Link to="/app">Request demo</Link>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/app" className="lp-link-quiet">
              Sign in
            </Link>
            <Link to="/app" className="lp-btn lp-btn-primary">
              Request demo
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
              <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg">
                Request demo
              </Link>
              <a href="#capabilities" className="lp-btn lp-btn-ghost lp-btn-lg">
                Browse capabilities
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
              <h2 className="lp-h2">Every laboratory module, one platform.</h2>
              <p className="lp-section-lede">
                CareScope covers the full LIMS continuum — from sample intake and
                instruments to quality, compliance, billing, and automation.
              </p>
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
          <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg">
            Request demo
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
            <Link to="/app">LIMS</Link>
            <Link to="/app/samples">Samples</Link>
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
  events: string[];
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
                {item.events.length > 0 ? (
                  <div className="lp-capability-events">
                    {item.events.map((ev) => (
                      <span key={ev}>{ev}</span>
                    ))}
                  </div>
                ) : null}
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

const FRAGMENTED_SYSTEMS = [
  { id: "lis", label: "Legacy LIS", x: 78, y: 58 },
  { id: "emr", label: "EMR", x: 210, y: 42 },
  { id: "inst", label: "Instruments", x: 318, y: 78 },
  { id: "qc", label: "QC / CAPA", x: 54, y: 168 },
  { id: "bill", label: "Billing", x: 176, y: 198 },
  { id: "inv", label: "Inventory", x: 300, y: 176 },
  { id: "crm", label: "Client portal", x: 112, y: 278 },
  { id: "bi", label: "BI / Excel", x: 250, y: 288 },
] as const;

const FRAGMENTED_EDGES: Array<[number, number]> = [
  [0, 1],
  [0, 3],
  [0, 4],
  [1, 2],
  [1, 4],
  [2, 5],
  [3, 4],
  [3, 6],
  [4, 5],
  [4, 7],
  [5, 7],
  [6, 7],
];

function IntegrationsComparisonVisual() {
  return (
    <div className="lp-compare">
      <div className="lp-compare-panel lp-compare-before">
        <div className="lp-compare-head">
          <span className="lp-compare-label">Typical lab stack</span>
          <strong className="lp-compare-metric lp-compare-metric-text">
            Multiple Custom Integrations
          </strong>
          <ul className="lp-compare-pains">
            {FRAGMENTED_PAINS.map((pain) => (
              <li key={pain}>{pain}</li>
            ))}
          </ul>
        </div>
        <svg
          className="lp-compare-canvas"
          viewBox="0 0 380 340"
          role="img"
          aria-label="Many disconnected systems linked by integrations"
        >
          <defs>
            <linearGradient id="fragLine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {FRAGMENTED_EDGES.map(([a, b], i) => {
            const from = FRAGMENTED_SYSTEMS[a];
            const to = FRAGMENTED_SYSTEMS[b];
            const midX = (from.x + to.x) / 2 + ((i % 2 === 0 ? 1 : -1) * 18);
            const midY = (from.y + to.y) / 2 + ((i % 3) - 1) * 14;
            return (
              <path
                key={`${from.id}-${to.id}`}
                className="lp-compare-edge"
                style={{ animationDelay: `${0.15 + i * 0.07}s` }}
                d={`M${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke="url(#fragLine)"
                strokeWidth="1.75"
              />
            );
          })}
          {FRAGMENTED_SYSTEMS.map((node, i) => (
            <g
              key={node.id}
              className="lp-compare-node"
              style={{ animationDelay: `${0.35 + i * 0.06}s` }}
              transform={`translate(${node.x} ${node.y})`}
            >
              <rect x="-52" y="-18" width="104" height="36" rx="8" />
              <text y="5">{node.label}</text>
            </g>
          ))}
        </svg>
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
  "Results & Review",
  "Quality Events",
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
          <p className="lp-onelab-included-label">Everything ships inside OneLab</p>
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
