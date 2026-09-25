import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SettingsDialog } from "./components/SettingsDialog";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { InstrumentRecordView } from "./components/InstrumentRecordView";
import { SandboxSignupModal } from "./components/SandboxSignupModal";
import { findInstrument } from "./instruments";
import { labMenuPath, useLabOperations } from "./labOperations";
import { readLimsSession } from "./limsSession";
import { SampleDetailBody } from "./pages/SampleDetailPage";
import { findSample } from "./samples";
import { SectionTabsProvider, sectionFromPath, useSectionTabs, type PinnedTab } from "./sectionTabs";

const NAV = [
  { to: "/app/design", label: "Workflow design" },
  { to: "/app/instruments", label: "Instrument Interface" },
  { to: "/app/connectivity", label: "Healthcare CRM" },
  { to: "/app/quality", label: "Quality & Compliance" },
  { to: "/app/insights", label: "Insights" },
] as const;

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

function NavIcon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "overview") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M7 10.5V19h10v-8.5" />
      </svg>
    );
  }
  if (name === "testing") {
    return (
      <svg {...common}>
        <path d="M9 3h6" />
        <path d="M10 3v5.5L6.5 18A3.2 3.2 0 0 0 9.4 22h5.2a3.2 3.2 0 0 0 2.9-4L14 8.5V3" />
      </svg>
    );
  }
  if (name === "review") {
    return (
      <svg {...common}>
        <rect x="6" y="3.5" width="12" height="17" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (name === "release") {
    return (
      <svg {...common}>
        <path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </svg>
    );
  }
  if (name === "design") {
    return (
      <svg {...common}>
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="17" cy="6" r="2.2" />
        <circle cx="12" cy="17" r="2.2" />
        <path d="M8 8.2 10.4 15M15.2 7.6 13.4 15" />
      </svg>
    );
  }
  if (name === "instruments") {
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="10" rx="2" />
        <path d="M8 7V5h8v2M8 17v2M16 17v2" />
      </svg>
    );
  }
  if (name === "connectivity") {
    return (
      <svg {...common}>
        <circle cx="8" cy="9" r="2.2" />
        <circle cx="16" cy="9" r="2.2" />
        <path d="M4.8 18a3.4 3.4 0 0 1 6.4 0M12.8 18a3.4 3.4 0 0 1 6.4 0" />
      </svg>
    );
  }
  if (name === "quality") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 16.5 9 12l3 2.5 6-7" />
      <path d="M14 7.5h4.5V12" />
    </svg>
  );
}

function PinnedScreen({ tab }: { tab: PinnedTab }) {
  if (tab.kind === "sample") {
    const sample = findSample(tab.recordId);
    return sample ? <SampleDetailBody sample={sample} withTabs /> : null;
  }
  const instrument = findInstrument(tab.recordId);
  if (!instrument) return null;
  return (
    <div className="lims-page">
      <section className="lims-panel">
        <InstrumentRecordView instrument={instrument} />
      </section>
    </div>
  );
}

/** LIMS application shell */
export function AppShell() {
  return (
    <SectionTabsProvider>
      <AppFrame />
    </SectionTabsProvider>
  );
}

function AppFrame() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signupOpen, setSignupOpen] = useState(
    () => searchParams.get("signup") === "1"
  );
  const lims = readLimsSession();
  const labOps = useLabOperations();
  const sectionTabs = useSectionTabs();
  const [infraOpen, setInfraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [navPos, setNavPos] = useState({ x: 16, y: 16 });
  const navPosRef = useRef(navPos);
  navPosRef.current = navPos;
  const now = useLocalClock();
  const signedInName = lims?.username ?? "M. Chen";

  useEffect(() => {
    if (searchParams.get("signup") === "1") {
      setSignupOpen(true);
    }
  }, [searchParams]);

  function beginNavDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = navPosRef.current;
    let moved = false;
    function move(ev: { clientX: number; clientY: number }) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      const x = Math.min(Math.max(8, origin.x + dx), window.innerWidth - 68);
      const y = Math.min(Math.max(8, origin.y + dy), window.innerHeight - 68);
      const next = { x, y };
      navPosRef.current = next;
      setNavPos(next);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseup", up);
      if (!moved) setNavOpen((open) => !open);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
  }

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
      <div className={`lims-nav-dock${navOpen ? " is-open" : ""}`} style={{ left: navPos.x, top: navPos.y }}>
        <button
          type="button"
          className="lims-nav-launcher"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Collapse navigation" : "Expand navigation"}
          onPointerDown={beginNavDrag}
        >
          <img src="/carescope-mark.png" alt="" />
        </button>
      {navOpen ? (
      <aside className="lims-sidebar" style={{ maxHeight: `calc(100vh - ${navPos.y + 76}px)` }}>
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
                onClick={() => {
                  sectionTabs.showSection(item.view);
                  setNavOpen(false);
                }}
                className={({ isActive }) =>
                  `lims-nav-item lims-nav-sub${isActive ? " active" : ""}`
                }
              >
                <span className="lims-nav-icon">
                  <NavIcon name={item.view} />
                </span>
                {item.label}
              </NavLink>
            ))}
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                sectionTabs.showSection(sectionFromPath(item.to));
                setNavOpen(false);
              }}
              className={({ isActive }) =>
                `lims-nav-item${isActive ? " active" : ""}`
              }
            >
              <span className="lims-nav-icon">
                <NavIcon name={sectionFromPath(item.to)} />
              </span>
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
      ) : null}
      </div>

      <div className="lims-main">
        <header className="lims-topbar">
          <div className="lims-search">
            <input
              type="search"
              placeholder="Search sample ID, accession, order, client…"
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
        {sectionTabs.tabs.length > 0 && sectionTabs.tabs.find((tab) => tab.id === sectionTabs.activeId)?.kind !== "sample" ? (
          <div className="lims-tabs" role="tablist" aria-label="Screens for this section">
            {sectionTabs.tabs.map((tab) => (
              <div key={tab.id} className={`lims-tab${sectionTabs.activeId === tab.id ? " active" : ""}`}>
                <button type="button" role="tab" aria-selected={sectionTabs.activeId === tab.id} onClick={() => sectionTabs.select(tab.id)}>
                  {tab.title}
                </button>
                <button type="button" className="lims-tab-close" aria-label={`Close ${tab.title}`} onClick={() => sectionTabs.close(tab.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="lims-content" hidden={Boolean(sectionTabs.activeId)}>
          <Outlet />
        </div>
        {sectionTabs.tabs
          .filter((tab) => tab.id === sectionTabs.activeId)
          .map((tab) => (
            <div key={tab.id} className="lims-content">
              <PinnedScreen tab={tab} />
            </div>
          ))}
      </div>

      <SandboxSignupModal open={signupOpen} onClose={closeSignup} />
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
