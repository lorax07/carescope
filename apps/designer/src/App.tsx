import { useEffect, useState } from "react";
import { SettingsDialog } from "./components/SettingsDialog";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SandboxSignupModal } from "./components/SandboxSignupModal";
import { findInstrument } from "./instruments";
import { labMenuPath, useLabOperations, type LabOperationsConfig } from "./labOperations";
import { readLimsSession } from "./limsSession";

const NAV = [
  { to: "/app/design", label: "Workflow design" },
  { to: "/app/instruments", label: "Instrument Interface" },
  { to: "/app/connectivity", label: "Healthcare CRM" },
  { to: "/app/quality", label: "Quality & Compliance" },
  { to: "/app/insights", label: "Insights" },
] as const;

type AppTab = { path: string; title: string };

function tabTitle(path: string, labOps: LabOperationsConfig): string {
  const menuLabel = (view: LabOperationsConfig["menu"][number]["view"]) =>
    labOps.menu.find((item) => item.view === view)?.label;
  if (path === "/app" || path === "/app/") return menuLabel("overview") || "Overview";
  if (path === labMenuPath("home") || path === "/app/samples") return menuLabel("home") || "Home";
  if (path === labMenuPath("testing")) return menuLabel("testing") || "Testing";
  if (path === labMenuPath("review")) return menuLabel("review") || "Review";
  if (path === labMenuPath("release")) return menuLabel("release") || "Release";
  if (path === "/app/instruments") return "Instrument Interface";
  const instrument = path.match(/^\/app\/instruments\/([^/]+)$/);
  if (instrument) return findInstrument(decodeURIComponent(instrument[1]))?.name || "Instrument";
  const sample = path.match(/^\/app\/samples\/([^/]+)$/);
  if (sample) return decodeURIComponent(sample[1]);
  return NAV.find((item) => item.to === path)?.label || "Sequence";
}

function useLocalClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function utcOffsetLabel(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "−";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

/** LIMS application shell */
export function AppShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signupOpen, setSignupOpen] = useState(
    () => searchParams.get("signup") === "1"
  );
  const lims = readLimsSession();
  const labOps = useLabOperations();
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<AppTab[]>([]);
  const [infraOpen, setInfraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const now = useLocalClock();
  const signedInName = lims?.username ?? "M. Chen";

  useEffect(() => {
    const path = location.pathname;
    if (!path.startsWith("/app")) return;
    const title = tabTitle(path, labOps);
    setTabs((current) => {
      const existing = current.find((tab) => tab.path === path);
      if (!existing) return [...current, { path, title }];
      if (existing.title === title) return current;
      return current.map((tab) => (tab.path === path ? { ...tab, title } : tab));
    });
  }, [location.pathname, labOps]);

  function closeTab(path: string) {
    setTabs((current) => {
      if (current.length < 2) return current;
      const index = current.findIndex((tab) => tab.path === path);
      const next = current.filter((tab) => tab.path !== path);
      if (location.pathname === path && next.length) {
        navigate(next[Math.max(0, index - 1)].path);
      }
      return next;
    });
  }

  useEffect(() => {
    if (searchParams.get("signup") === "1") {
      setSignupOpen(true);
    }
  }, [searchParams]);

  function closeSignup() {
    setSignupOpen(false);
    if (searchParams.get("signup") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("signup");
      setSearchParams(next, { replace: true });
    }
  }

  return (
    <div className="lims-shell">
      <aside className="lims-sidebar">
        <NavLink to="/" className="lims-brand">
          <img className="cs-mark" src="/carescope-mark.png" alt="" />
          <span>
            <strong>Sequence</strong>
          </span>
        </NavLink>

        <div className="lims-site-block">
          <div className="lims-site">
            <span className="lims-site-dot" />
            <span className="lims-site-name">
              {lims ? `${lims.labName} · ${lims.envLabel}` : "North Lab · Production"}
            </span>
            {lims ? (
              <button
                type="button"
                className="lims-site-expand"
                aria-expanded={infraOpen}
                aria-label="Backend infrastructure"
                onClick={() => setInfraOpen((open) => !open)}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d={infraOpen ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
          {lims && infraOpen ? (
            <dl className="lims-infra">
              <div>
                <dt>Connection speed</dt>
                <dd>{lims.connectionSpeed || "18 ms"}</dd>
              </div>
              <div>
                <dt>Database</dt>
                <dd>
                  <code>{lims.databaseName || "cs_apex_diagnostics_dev1"}</code>
                </dd>
              </div>
              <div>
                <dt>Error log</dt>
                <dd>{lims.errorLog || "Clear"}</dd>
              </div>
              <div>
                <dt>Last backup</dt>
                <dd>
                  {lims.lastBackup
                    ? new Date(lims.lastBackup).toLocaleString()
                    : new Date("2026-09-23T02:15:00.000Z").toLocaleString()}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>

        <nav className="lims-nav" aria-label="LIMS modules">
          <p className="lims-nav-label">Lab Operations</p>
          {labOps.menu
            .filter((item) => item.enabled && item.label.trim())
            .map((item) => (
              <NavLink
                key={item.id}
                to={labMenuPath(item.view)}
                end={item.view === "overview"}
                className={({ isActive }) =>
                  `lims-nav-item lims-nav-sub${isActive ? " active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
            <span className="lims-avatar">{lims ? "AD" : "MC"}</span>
            <div>
              <b>{lims ? lims.username : "M. Chen"}</b>
              <small>{lims ? `${lims.clientName} LIMS` : "Lab Analyst"}</small>
            </div>
            <button
              type="button"
              className="lims-settings"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.4a.5.5 0 0 0-.6-.2l-2.5 1a7.4 7.4 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4L9.1 4.2a7.4 7.4 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.6L4.6 11a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.4a.5.5 0 0 0 .6.2l2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.4a.5.5 0 0 0-.1-.6L19.4 13zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="lims-main">
        <header className="lims-topbar">
          <div className="lims-search">
            <input
              type="search"
              placeholder="Search accession, order, client…"
              aria-label="Search laboratory records"
            />
          </div>
          <div className="lims-topbar-meta">
            <time className="lims-chip" dateTime={now.toISOString()}>
              {signedInName} · {now.toLocaleString()}
            </time>
            <span className="lims-chip muted">{utcOffsetLabel(now)}</span>
          </div>
        </header>
        <div className="lims-tabs" role="tablist" aria-label="Open views">
          {tabs.map((tab) => (
            <div key={tab.path} className={`lims-tab${location.pathname === tab.path ? " active" : ""}`}>
              <button type="button" role="tab" aria-selected={location.pathname === tab.path} onClick={() => navigate(tab.path)}>
                {tab.title}
              </button>
              {tabs.length > 1 ? (
                <button type="button" className="lims-tab-close" aria-label={`Close ${tab.title}`} onClick={() => closeTab(tab.path)}>
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="lims-content">
          <Outlet />
        </div>
      </div>

      <SandboxSignupModal open={signupOpen} onClose={closeSignup} />
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
