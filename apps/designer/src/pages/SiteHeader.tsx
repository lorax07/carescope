import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ModuleGlyph, type ModuleSlug } from "../sequenceModules";
import { MARKETING_MODULES } from "./marketingModules";

const PRODUCT_INDUSTRIES = [
  "Pharmaceutical",
  "Agriculture",
  "Manufacturing",
  "Chemicals",
  "Food & Beverage",
  "Environmental",
  "Clinical",
] as const;

function IndustryMark({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "Pharmaceutical") {
    return (
      <svg {...common}>
        <rect x="8" y="3" width="8" height="18" rx="4" />
        <path d="M8 12h8" />
      </svg>
    );
  }
  if (name === "Agriculture") {
    return (
      <svg {...common}>
        <path d="M12 21V10" />
        <path d="M12 14c-3-1-5-3.5-5-6 3 .2 5 2 5 6Z" />
        <path d="M12 12c3-1 5-3.5 5-6-3 .2-5 2-5 6Z" />
      </svg>
    );
  }
  if (name === "Manufacturing") {
    return (
      <svg {...common}>
        <path d="M4 20V10l5 3V10l5 3V8l6 3v9" />
        <path d="M4 20h16" />
      </svg>
    );
  }
  if (name === "Chemicals") {
    return (
      <svg {...common}>
        <path d="M9 3h6" />
        <path d="M10 3v6L6.5 18A3.2 3.2 0 0 0 9.4 22h5.2a3.2 3.2 0 0 0 2.9-4L14 9V3" />
      </svg>
    );
  }
  if (name === "Food & Beverage") {
    return (
      <svg {...common}>
        <path d="M8 3v8a4 4 0 0 0 8 0V3" />
        <path d="M8 21h8" />
      </svg>
    );
  }
  if (name === "Environmental") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2.2 2 3.4 4.6 3.4 8s-1.2 6-3.4 8c-2.2-2-3.4-4.6-3.4-8s1.2-6 3.4-8Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 21s-6.5-4-6.5-8.4a3.7 3.7 0 0 1 6.5-2 3.7 3.7 0 0 1 6.5 2C18.5 17 12 21 12 21Z" />
    </svg>
  );
}

export function SiteHeader() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPlan() {
    const event = new CustomEvent("carescope-build-plan", { cancelable: true });
    if (!window.dispatchEvent(event)) return;
    navigate("/pricing", { state: { buildPlan: true } });
  }

  return (
    <header className="lp-nav">
      <div className="lp-nav-bar">
        <div className="lp-brand">
          <Link to="/" className="lp-logo" aria-label="Carescope Sequence home">
            <img
              className="lp-header-logo"
              src="/carescope-mark.png"
              width={86}
              height={97}
              alt=""
            />
            <span className="lp-logo-rule" aria-hidden="true" />
            <img className="lp-logo-sequence" src="/sequence-logo.png" width={1790} height={291} alt="Sequence" />
          </Link>
        </div>

        <nav className="lp-nav-links" aria-label="Primary">
          <Link to="/" aria-current={pathname === "/" ? "page" : undefined}>
            Home
          </Link>
          <a href="/#less-friction">What we solve</a>
          <div className={`lp-modules${open ? " is-open" : ""}`} ref={rootRef}>
            <button
              type="button"
              className="lp-modules-btn"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-controls={menuId}
              aria-current={pathname.startsWith("/modules") ? "page" : undefined}
              onClick={() => setOpen((current) => !current)}
            >
              Product
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                <path
                  d="M2.2 4.3 6 8.1l3.8-3.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {open ? (
              <div className="lp-product-menu" id={menuId} role="menu">
                <div className="lp-product-main">
                  <p className="lp-product-kicker">Modules</p>
                  <div className="lp-product-grid">
                    {MARKETING_MODULES.map((item) => (
                      <Link key={item.slug} role="menuitem" to={`/modules/${item.slug}`} onClick={() => setOpen(false)}>
                        <ModuleGlyph slug={item.slug as ModuleSlug} size={18} />
                        {item.title.replace(/^Sequence /, "")}
                      </Link>
                    ))}
                  </div>
                  <p className="lp-product-kicker">By industry</p>
                  <div className="lp-product-grid">
                    {PRODUCT_INDUSTRIES.map((name) => (
                      <a key={name} role="menuitem" href="/#industries" onClick={() => setOpen(false)}>
                        <IndustryMark name={name} />
                        {name}
                      </a>
                    ))}
                  </div>
                </div>
                <aside className="lp-product-preview">
                  <div className="lp-product-stage">
                    <img src="/carescope-mark.png" width={86} height={97} alt="" />
                    <img src="/sequence-logo.png" width={1790} height={291} alt="Sequence" />
                  </div>
                  <div className="lp-product-note">
                    <strong>Sequence Operations</strong>
                    <p>The core LIMS for the laboratory queue. A sample is received, tested, reviewed, and released as one record.</p>
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
          <Link to="/pricing" aria-current={pathname === "/pricing" ? "page" : undefined}>
            Pricing
          </Link>
          <a href="/#compliance">About</a>
        </nav>

        <div className="lp-nav-actions">
          <Link to="/intrasite" className="lp-nav-login">
            Log in
          </Link>
          <button type="button" className="lp-nav-outline" onClick={openPlan}>
            Build your plan
          </button>
          <Link to="/app?signup=1" className="lp-nav-solid">
            Try free for 30 days
          </Link>
        </div>
      </div>
    </header>
  );
}
