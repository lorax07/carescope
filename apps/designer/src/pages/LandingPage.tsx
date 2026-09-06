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
            <Link to="/app">Intrasite</Link>
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

const VENDOR_CABLES: Array<{ d: string; color: string; broken?: boolean }> = [
  { d: "M64 52 C 110 80, 140 130, 176 168", color: "#1e3a5f" },
  { d: "M196 48 C 200 90, 188 130, 184 166", color: "#0f766e" },
  { d: "M318 62 C 280 100, 240 140, 198 170", color: "#c2410c" },
  { d: "M58 148 C 100 160, 140 168, 168 176", color: "#6d28d9" },
  { d: "M322 156 C 270 168, 230 176, 202 180", color: "#3f6212" },
  { d: "M70 248 C 120 220, 150 200, 172 184", color: "#9a3412", broken: true },
  { d: "M312 250 C 260 220, 230 200, 200 186", color: "#1d4ed8" },
  { d: "M188 292 C 186 250, 184 220, 184 190", color: "#a16207" },
  { d: "M40 200 C 90 210, 130 190, 168 182", color: "#be123c" },
  { d: "M340 200 C 290 210, 240 190, 204 182", color: "#0e7490" },
];

function TypicalLabStackVisual() {
  return (
    <svg
      className="lp-compare-canvas lp-stack-mess"
      viewBox="0 0 380 340"
      role="img"
      aria-label="A lab scientist wrapped in incompatible vendor cables, holding plugs that do not fit, with failed interfaces and delayed go-lives"
    >
      <defs>
        <filter id="stackShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>

      {VENDOR_CABLES.map((cable, index) => (
        <path
          key={cable.d}
          className="lp-stack-cable-line"
          style={{ animationDelay: `${0.1 + index * 0.05}s` }}
          d={cable.d}
          fill="none"
          stroke={cable.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={cable.broken ? "6 5" : undefined}
          opacity="0.9"
        />
      ))}

      <g className="lp-stack-person" transform="translate(190 176)">
        <path d="M-28 8 C -36 28, -18 46, 0 46 C 18 46, 36 28, 28 8" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" />
        <path d="M-18 -8 h36 l8 38 h-52 z" fill="#f8fafc" stroke="#475569" strokeWidth="1.3" />
        <path d="M-6 -4 h12 v10 h-12z" fill="#cbd5e1" />
        <circle cy="-28" r="13" fill="#f0c9a8" />
        <path d="M-11 -36 C -8 -44, 8 -44, 11 -36 L 9 -28 H -9 Z" fill="#1f2937" />
        <circle cx="-4.2" cy="-29" r="1.2" fill="#111827" />
        <circle cx="4.2" cy="-29" r="1.2" fill="#111827" />
        <path d="M-5 -23.5 Q 0 -20.8 5 -23.5" fill="none" stroke="#7c2d12" strokeWidth="1.3" />
        <path d="M-16 -6 L -46 10" stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 -6 L 46 8" stroke="#9a3412" strokeWidth="3" strokeLinecap="round" />
        <circle cx="-48" cy="12" r="6" fill="#1e3a5f" />
        <rect x="41" y="3" width="12" height="10" rx="1.5" fill="#9a3412" />
        <path d="M-48 12 h4 M47 8 v-4" stroke="#f8fafc" strokeWidth="1.2" />
        <circle cx="14" cy="-40" r="2.4" fill="#f87171" />
        <text y="64" className="lp-stack-person-label">
          Bench lead · 2:14 AM
        </text>
        <text y="76" className="lp-stack-person-sub">
          three plugs. none of them fit.
        </text>
      </g>

      <g className="lp-stack-tape" transform="translate(190 148) rotate(-8)">
        <rect x="-44" y="-12" width="88" height="22" rx="3" fill="#fbbf24" />
        <text y="3" className="lp-stack-tape-label">
          DUCT-TAPED MIDDLEWARE
        </text>
      </g>

      <g className="lp-stack-vendor" transform="translate(10 10) rotate(-8)" filter="url(#stackShadow)">
        <rect width="108" height="48" rx="4" fill="#1e3a5f" />
        <text x="54" y="20" className="lp-stack-vendor-name" fill="#e8eef7">Vendor A LIS</text>
        <text x="54" y="36" className="lp-stack-vendor-tag" fill="#93c5fd">on-prem v7 · HL7 only</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(142 4) rotate(3)" filter="url(#stackShadow)">
        <rect width="100" height="44" rx="16" fill="#0f766e" />
        <text x="50" y="18" className="lp-stack-vendor-name" fill="#ecfdf8">Hospital EMR</text>
        <text x="50" y="33" className="lp-stack-vendor-tag" fill="#99f6e4">ADT feed · their window</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(268 22) rotate(9)" filter="url(#stackShadow)">
        <rect width="102" height="46" rx="6" fill="#9a3412" />
        <rect x="8" y="8" width="18" height="30" rx="2" fill="#fdba74" />
        <text x="64" y="20" className="lp-stack-vendor-name" fill="#fff7ed">Analyzer OEM</text>
        <text x="64" y="35" className="lp-stack-vendor-tag" fill="#fed7aa">driver still in QA</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(4 116) rotate(-5)" filter="url(#stackShadow)">
        <ellipse cx="48" cy="22" rx="48" ry="22" fill="#5b21b6" />
        <text x="48" y="18" className="lp-stack-vendor-name" fill="#f5f3ff">QC SaaS</text>
        <text x="48" y="32" className="lp-stack-vendor-tag" fill="#ddd6fe">separate login</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(274 128) rotate(6)" filter="url(#stackShadow)">
        <path d="M8 6 h88 l-8 40 H16 Z" fill="#3f6212" />
        <text x="50" y="22" className="lp-stack-vendor-name" fill="#f7fee7">Billing vendor</text>
        <text x="50" y="36" className="lp-stack-vendor-tag" fill="#d9f99d">CSV drop Fridays</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(6 226) rotate(5)" filter="url(#stackShadow)">
        <rect width="104" height="44" rx="2" fill="#7c2d12" />
        <text x="52" y="18" className="lp-stack-vendor-name" fill="#fff7ed">Inventory app</text>
        <text x="52" y="33" className="lp-stack-vendor-tag" fill="#fed7aa">no API · rekey it</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(262 232) rotate(-7)" filter="url(#stackShadow)">
        <rect width="108" height="46" rx="8" fill="#1e40af" />
        <text x="54" y="19" className="lp-stack-vendor-name" fill="#eff6ff">Client portal</text>
        <text x="54" y="34" className="lp-stack-vendor-tag" fill="#bfdbfe">another contract</text>
      </g>
      <g className="lp-stack-vendor" transform="translate(136 286) rotate(2)" filter="url(#stackShadow)">
        <rect width="112" height="42" rx="3" fill="#854d0e" />
        <text x="56" y="17" className="lp-stack-vendor-name" fill="#fffbeb">Excel / shadow LIS</text>
        <text x="56" y="32" className="lp-stack-vendor-tag" fill="#fde68a">the real system of record</text>
      </g>

      <g className="lp-stack-break" transform="translate(118 216)">
        <circle r="9" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.4" />
        <path d="M-3.6 -3.6 3.6 3.6M3.6 -3.6 -3.6 3.6" stroke="#dc2626" strokeWidth="1.6" />
      </g>
      <g className="lp-stack-spark" transform="translate(118 200)">
        <path d="M0 0 L 4 -10 L 1 -10 L 6 -20" fill="none" stroke="#f59e0b" strokeWidth="1.4" />
      </g>

      <g className="lp-stack-badge" transform="translate(118 92)">
        <rect width="148" height="28" rx="14" />
        <text x="74" y="18">8 vendors · 11 interfaces · 1 person</text>
      </g>

      <g className="lp-stack-note" transform="translate(286 78) rotate(8)">
        <rect width="84" height="36" rx="3" />
        <text x="7" y="15">go-live slipped again</text>
        <text x="7" y="28">waiting on Vendor A</text>
      </g>
      <g className="lp-stack-note lp-stack-note-warn" transform="translate(8 174) rotate(-7)">
        <rect width="90" height="36" rx="3" />
        <text x="7" y="15">who owns this map?</text>
        <text x="7" y="28">3 teams · 2 tickets</text>
      </g>
      <g className="lp-stack-pager" transform="translate(292 176) rotate(4)">
        <rect width="78" height="28" rx="6" />
        <text x="39" y="12">INTERFACE DOWN</text>
        <text x="39" y="22">pager · STAT queue</text>
      </g>
    </svg>
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
