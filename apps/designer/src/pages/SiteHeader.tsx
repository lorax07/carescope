import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MARKETING_MODULES } from "./marketingModules";

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
              Modules
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
              <ul className="lp-modules-menu" id={menuId} role="menu">
                {MARKETING_MODULES.map((item) => (
                  <li key={item.slug} role="none">
                    <Link role="menuitem" to={`/modules/${item.slug}`} onClick={() => setOpen(false)}>
                      {item.title}
                      <small>{item.detail}</small>
                    </Link>
                  </li>
                ))}
              </ul>
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
