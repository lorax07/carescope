import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MARKETING_MODULES } from "./marketingModules";

export function SiteHeader() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <header className={`lp-nav${solid ? " is-solid" : ""}`}>
      <div className="lp-nav-bar">
        <Link to="/" className="lp-logo" aria-label="CareScope Sequence home">
          <img
            className="lp-header-logo"
            src="/carescope-header-logo.png"
            width={224}
            height={56}
            alt="CareScope. Building Better Healthcare for Everyone."
          />
          <span className="lp-logo-rule" aria-hidden="true" />
          <img className="lp-logo-sequence" src="/sequence-logo.png" width={1400} height={318} alt="Sequence" />
        </Link>

        <div className="lp-nav-end">
          <nav className="lp-nav-links" aria-label="Primary">
            <a href="/">Home</a>
            <a href="/#less-friction">What we solve</a>
            <div className={`lp-modules${open ? " is-open" : ""}`} ref={rootRef}>
              <button
                type="button"
                className="lp-modules-btn"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={menuId}
                onClick={() => setOpen((current) => !current)}
              >
                Modules
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                  <path d="M2.2 4.2 6 8l3.8-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
            <a href="/#compliance">About</a>
            <Link to="/intrasite">Sign in</Link>
          </nav>
          <Link to="/app?signup=1" className="lp-pill lp-pill-dark">
            Request a Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
