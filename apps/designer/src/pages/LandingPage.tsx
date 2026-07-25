import { Link } from "react-router-dom";
import "./landing.css";

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
            <span className="lp-logo-word">CareScope</span>
          </Link>

          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#platform">Platform</a>
            <a href="#workflows">Workflows</a>
            <a href="#compliance">Compliance</a>
            <Link to="/app">Open LIMS</Link>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/app" className="lp-link-quiet">
              Sign in
            </Link>
            <Link to="/app" className="lp-btn lp-btn-primary">
              Open LIMS
            </Link>
          </div>
        </header>

        <section className="lp-hero" aria-labelledby="hero-brand">
          <div className="lp-hero-copy">
            <p className="lp-brand-lockup" id="hero-brand">
              CareScope
            </p>
            <h1 className="lp-hero-title">
              Laboratory operations with the confidence of pedigree systems.
            </h1>
            <p className="lp-hero-lede">
              A modern LIMS for regulated labs — sample lifecycle, chain of custody,
              and visual workflow automation without custom code.
            </p>
            <div className="lp-hero-cta">
              <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg">
                Open the LIMS
              </Link>
              <a href="#workflows" className="lp-btn lp-btn-ghost lp-btn-lg">
                See workflows
              </a>
            </div>
          </div>

          <div className="lp-hero-visual" aria-hidden="true">
            <HeroProductVisual />
          </div>
        </section>
      </div>

      <section className="lp-section" id="platform">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">Platform</p>
          <h2 className="lp-h2">Built for the full laboratory continuum.</h2>
          <p className="lp-section-lede">
            From intake to CoA release, CareScope keeps every sample, result, and
            signature in one governed system of record.
          </p>

          <div className="lp-split">
            <article className="lp-feature">
              <h3>Sample lifecycle</h3>
              <p>
                Receive, aliquot, assign, and release with barcode/QR custody and
                complete audit history at every handoff.
              </p>
            </article>
            <article className="lp-feature">
              <h3>Results & review</h3>
              <p>
                Structured entry, scientific calculations, peer review, and
                electronic signatures aligned to laboratory practice.
              </p>
            </article>
            <article className="lp-feature">
              <h3>Quality & CAPA</h3>
              <p>
                Quality events, non-conformances, and CAPA chains that stay linked
                to the samples and methods that triggered them.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-tint" id="workflows">
        <div className="lp-section-inner lp-workflow-block">
          <div>
            <p className="lp-eyebrow">Workflow engine</p>
            <h2 className="lp-h2">Automate laboratory process by design.</h2>
            <p className="lp-section-lede">
              A visual, no-code orchestration layer for approvals, instrument
              actions, notifications, and compliance checks — configurable for
              every module.
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
        <div className="lp-section-inner">
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
        <div className="lp-cta-band-inner">
          <h2 className="lp-h2">Bring pedigree to your laboratory stack.</h2>
          <p>
            Configure CareScope around your methods, sites, and quality system —
            then automate the rest through the workflow engine.
          </p>
          <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg">
            Open the LIMS
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-logo-word">CareScope</span>
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

function HeroProductVisual() {
  return (
    <div className="lp-product-stage">
      <div className="lp-product-glow" />
      <div className="lp-product-window">
        <div className="lp-product-chrome">
          <span />
          <span />
          <span />
          <em>Sample · SCP-20491</em>
        </div>
        <div className="lp-product-body">
          <aside className="lp-product-rail">
            <strong>Lifecycle</strong>
            <ol>
              <li className="done">Received</li>
              <li className="done">Assigned</li>
              <li className="active">In testing</li>
              <li>Review</li>
              <li>CoA release</li>
            </ol>
          </aside>
          <div className="lp-product-main">
            <header>
              <div>
                <small>Method</small>
                <b>HPLC Assay · USP</b>
              </div>
              <div>
                <small>Priority</small>
                <b className="stat">STAT</b>
              </div>
              <div>
                <small>Site</small>
                <b>North Lab</b>
              </div>
            </header>
            <div className="lp-product-chart">
              <svg viewBox="0 0 360 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B6EF3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#1B6EF3" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 110 C40 104, 60 70, 90 78 C120 86, 140 40, 180 48 C220 56, 240 24, 280 32 C310 38, 330 60, 360 44 L360 140 L0 140 Z"
                  fill="url(#chartFill)"
                />
                <path
                  d="M0 110 C40 104, 60 70, 90 78 C120 86, 140 40, 180 48 C220 56, 240 24, 280 32 C310 38, 330 60, 360 44"
                  fill="none"
                  stroke="#1B6EF3"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="lp-product-rows">
              <div>
                <span>Analyst</span>
                <span>M. Chen</span>
              </div>
              <div>
                <span>Instrument</span>
                <span>Agilent 1260</span>
              </div>
              <div>
                <span>Custody</span>
                <span>Verified · QR</span>
              </div>
            </div>
          </div>
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
