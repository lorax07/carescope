import { useEffect, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import {
  AuthUser,
  clearAuthUser,
  initialsFor,
  isSignedIn,
  readAuthUser,
} from "./auth";
import { FeatureDemoCarousel } from "./components/FeatureDemoCarousel";
import {
  AuthModalMode,
  SandboxSignupModal,
} from "./components/SandboxSignupModal";

const NAV = [
  { to: "/app", label: "Dashboard", end: true },
  { to: "/app/samples", label: "Samples" },
  { to: "/app/tests", label: "Tests" },
  { to: "/app/results", label: "Results" },
  { to: "/app/instruments", label: "Instruments" },
  { to: "/app/inventory", label: "Inventory" },
  { to: "/app/quality", label: "Quality" },
  { to: "/app/workflows", label: "Workflows" },
  { to: "/app/catalog", label: "Catalog" },
] as const;

/** LIMS application shell */
export function AppShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readAuthUser());
  const [authMode, setAuthMode] = useState<AuthModalMode>(() =>
    searchParams.get("signin") === "1" ? "signin" : "signup"
  );
  const [authOpen, setAuthOpen] = useState(
    () =>
      !isSignedIn() &&
      (searchParams.get("signup") === "1" || searchParams.get("signin") === "1")
  );
  const [demoCarouselOpen, setDemoCarouselOpen] = useState(false);

  useEffect(() => {
    if (isSignedIn()) return;
    if (searchParams.get("signup") === "1") {
      setAuthMode("signup");
      setAuthOpen(true);
    } else if (searchParams.get("signin") === "1") {
      setAuthMode("signin");
      setAuthOpen(true);
    }
  }, [searchParams]);

  function clearAuthParams() {
    if (
      searchParams.get("signup") === "1" ||
      searchParams.get("signin") === "1"
    ) {
      const next = new URLSearchParams(searchParams);
      next.delete("signup");
      next.delete("signin");
      setSearchParams(next, { replace: true });
    }
  }

  function closeAuth() {
    setAuthOpen(false);
    clearAuthParams();
  }

  function openAuth(mode: AuthModalMode) {
    setAuthMode(mode);
    setAuthOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete(mode === "signup" ? "signin" : "signup");
    next.set(mode === "signup" ? "signup" : "signin", "1");
    setSearchParams(next, { replace: true });
  }

  function handleAuthNotNow() {
    setAuthOpen(false);
    clearAuthParams();
    setDemoCarouselOpen(true);
  }

  function closeDemoCarousel() {
    setDemoCarouselOpen(false);
    if (!isSignedIn()) {
      openAuth(authMode);
    }
  }

  function handleAuthenticated() {
    setAuthUser(readAuthUser());
  }

  function handleSignOut() {
    clearAuthUser();
    setAuthUser(null);
  }

  const displayName = authUser?.name ?? "Guest";
  const displayRole = authUser ? "Sandbox user" : "Not signed in";

  return (
    <div className="lims-shell">
      <aside className="lims-sidebar">
        <NavLink to="/" className="lims-brand">
          <span className="lims-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26">
              <circle cx="16" cy="16" r="14" fill="#1B6EF3" />
              <path
                d="M10 16.5h4.2L16 10l1.8 6.5H22"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <strong>CareScope</strong>
            <small>LIMS</small>
          </span>
        </NavLink>

        <div className="lims-site">
          <span className="lims-site-dot" />
          North Lab · Production
        </div>

        <nav className="lims-nav" aria-label="LIMS modules">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `lims-nav-item${isActive ? " active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="lims-sidebar-foot">
          <div className="lims-user">
            <span className="lims-avatar">{initialsFor(displayName)}</span>
            <div>
              <b>{displayName}</b>
              <small>{displayRole}</small>
            </div>
          </div>
          {authUser ? (
            <button
              type="button"
              className="lims-auth-btn"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className="lims-auth-btn"
              onClick={() => openAuth("signin")}
            >
              Sign in
            </button>
          )}
        </div>
      </aside>

      <div className="lims-main">
        <header className="lims-topbar">
          <div className="lims-search">
            <input
              type="search"
              placeholder="Search accession, sample ID, batch…"
              aria-label="Search laboratory records"
            />
          </div>
          <div className="lims-topbar-meta">
            <span className="lims-chip warn">3 STAT</span>
            <span className="lims-chip">Shift B</span>
            <span className="lims-chip muted">UTC−5</span>
          </div>
        </header>
        <div className="lims-content">
          <Outlet />
        </div>
      </div>

      <SandboxSignupModal
        open={authOpen}
        mode={authMode}
        onClose={closeAuth}
        onNotNow={handleAuthNotNow}
        onAuthenticated={handleAuthenticated}
        onSwitchMode={openAuth}
      />
      <FeatureDemoCarousel
        open={demoCarouselOpen}
        onClose={closeDemoCarousel}
      />
    </div>
  );
}
