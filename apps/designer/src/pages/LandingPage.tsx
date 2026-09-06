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
            <Link to="/intrasite">Intrasite</Link>
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

const VENDOR_BOXES = [
  { id: "lis", label: "Vendor A LIS", tag: "on-prem v7", x: 18, y: 18, rotate: -7, fill: "#1e3a5f", text: "#e8eef7" },
  { id: "emr", label: "Hospital EMR", tag: "HL7 feed", x: 148, y: 8, rotate: 4, fill: "#0f766e", text: "#ecfdf8" },
  { id: "inst", label: "Analyzer OEM", tag: "driver wait", x: 268, y: 28, rotate: 8, fill: "#9a3412", text: "#fff7ed" },
  { id: "qc", label: "QC SaaS", tag: "separate login", x: 8, y: 118, rotate: -5, fill: "#5b21b6", text: "#f5f3ff" },
  { id: "bill", label: "Billing vendor", tag: "CSV drop", x: 270, y: 132, rotate: 6, fill: "#3f6212", text: "#f7fee7" },
  { id: "inv", label: "Inventory app", tag: "no API", x: 12, y: 228, rotate: 5, fill: "#7c2d12", text: "#fff7ed" },
  { id: "crm", label: "Client portal", tag: "another contract", x: 258, y: 236, rotate: -6, fill: "#1e40af", text: "#eff6ff" },
  { id: "bi", label: "Excel / BI", tag: "shadow system", x: 148, y: 292, rotate: 3, fill: "#854d0e", text: "#fffbeb" },
] as const;

const VENDOR_CABLES: Array<{ d: string; color: string; protocol: string; broken?: boolean }> = [
  { d: "M70 42 C 90 90, 140 110, 176 148", color: "#1e3a5f", protocol: "HL7" },
  { d: "M200 36 C 210 80, 200 120, 188 150", color: "#0f766e", protocol: "ADT" },
  { d: "M310 56 C 280 90, 250 130, 204 158", color: "#9a3412", protocol: "driver" },
  { d: "M60 140 C 100 150, 130 160, 168 168", color: "#5b21b6", protocol: "REST" },
  { d: "M300 154 C 260 170, 230 180, 208 176", color: "#3f6212", protocol: "SFTP" },
  { d: "M70 250 C 110 230, 140 200, 170 184", color: "#7c2d12", protocol: "CSV", broken: true },
  { d: "M290 258 C 250 230, 220 200, 200 186", color: "#1e40af", protocol: "nightly" },
  { d: "M190 278 C 190 240, 188 210, 186 188", color: "#854d0e", protocol: "email" },
];

function TypicalLabStackVisual() {
  return (
    <svg
      className="lp-compare-canvas lp-stack-mess"
      viewBox="0 0 380 340"
      role="img"
      aria-label="A lab operator tangled in one-off vendor integrations, protocols, and failed interfaces"
    >
      <defs>
        <filter id="stackShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#0f172a" floodOpacity="0.16" />
        </filter>
      </defs>

      {VENDOR_CABLES.map((cable, index) => (
        <g key={cable.protocol + index} className="lp-stack-cable" style={{ animationDelay: `${0.12 + index * 0.06}s` }}>
          <path
            d={cable.d}
            fill="none"
            stroke={cable.color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={cable.broken ? "5 4" : undefined}
            opacity="0.88"
          />
          {cable.broken ? (
            <g transform="translate(128 214)" className="lp-stack-break">
              <circle r="8" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.2" />
              <path d="M-3.2 -3.2 3.2 3.2M3.2 -3.2 -3.2 3.2" stroke="#dc2626" strokeWidth="1.5" />
            </g>
          ) : null}
        </g>
      ))}

      <g className="lp-stack-knot" transform="translate(188 168)">
        <ellipse rx="36" ry="20" fill="#fff7ed" stroke="#c2410c" strokeWidth="1.4" />
        <path
          d="M-22 0 C -10 -12, 10 12, 22 0 M-16 7 C -2 -9, 8 10, 18 -3"
          fill="none"
          stroke="#9a3412"
          strokeWidth="1.6"
        />
        <text y="-2" className="lp-stack-knot-title">
          custom middleware
        </text>
        <text y="11" className="lp-stack-knot-sub">
          8 vendor contracts
        </text>
      </g>

      <g className="lp-stack-person" transform="translate(188 214)">
        <circle cy="-28" r="10" fill="#f3d2b5" />
        <circle cx="-3.2" cy="-29.4" r="1.05" fill="#1f2937" />
        <circle cx="3.2" cy="-29.4" r="1.05" fill="#1f2937" />
        <path d="M-3.4 -24.6 Q 0 -22.6 3.4 -24.6" fill="none" stroke="#7c2d12" strokeWidth="1.1" />
        <path d="M-11 -19 h22 l5 24 h-32 z" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
        <path d="M-3.5 -17 h7 v7 h-7z" fill="#e2e8f0" />
        <circle cx="11" cy="-37" r="2.1" fill="#fca5a5" />
        <text y="22" className="lp-stack-person-label">
          Integration owner
        </text>
        <text y="34" className="lp-stack-person-sub">
          still mapping last night’s feed
        </text>
      </g>

      {VENDOR_BOXES.map((vendor, index) => (
        <g
          key={vendor.id}
          className="lp-stack-vendor"
          style={{ animationDelay: `${0.2 + index * 0.05}s` }}
          transform={`translate(${vendor.x} ${vendor.y}) rotate(${vendor.rotate})`}
          filter="url(#stackShadow)"
        >
          <rect width="104" height="40" rx="7" fill={vendor.fill} />
          <text x="52" y="17" fill={vendor.text} className="lp-stack-vendor-name">
            {vendor.label}
          </text>
          <text x="52" y="31" fill={vendor.text} className="lp-stack-vendor-tag">
            {vendor.tag}
          </text>
        </g>
      ))}

      {[
        { x: 92, y: 78, label: "HL7" },
        { x: 214, y: 72, label: "ADT" },
        { x: 268, y: 98, label: "driver" },
        { x: 88, y: 156, label: "REST" },
        { x: 256, y: 168, label: "SFTP" },
      ].map((mark) => (
        <g key={mark.label} className="lp-stack-proto" transform={`translate(${mark.x} ${mark.y})`}>
          <rect x="-16" y="-7" width="32" height="14" rx="3" />
          <text y="3.5">{mark.label}</text>
        </g>
      ))}

      <g className="lp-stack-note" transform="translate(286 188) rotate(7)">
        <rect width="78" height="34" rx="3" />
        <text x="6" y="14">
          go-live slipped
        </text>
        <text x="6" y="26">
          waiting on vendor
        </text>
      </g>
      <g className="lp-stack-note lp-stack-note-warn" transform="translate(8 176) rotate(-6)">
        <rect width="86" height="34" rx="3" />
        <text x="6" y="14">
          who owns mapping?
        </text>
        <text x="6" y="26">
          3 teams, 2 tickets
        </text>
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
            Multiple Custom Integrations
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
