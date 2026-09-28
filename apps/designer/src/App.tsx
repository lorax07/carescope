import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
  { to: "/app/instruments", label: "Sequence Instruments" },
  { to: "/app/connectivity", label: "Sequence Client" },
  { to: "/app/quality", label: "Sequence Compliance" },
  { to: "/app/billing", label: "Sequence Revenue" },
  { to: "/app/insights", label: "Sequence Insights" },
] as const;

function useLocalClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

type OpenEdge = "left" | "right" | "top";

const LAUNCHER = 52;
const EDGE_PAD = 16;

const MAGNET = 168;

function edgeDistances(x: number, y: number, dockWidth: number, width: number): Record<OpenEdge, number> {
  return {
    top: Math.max(0, y),
    left: Math.max(0, x),
    right: Math.max(0, width - (x + dockWidth)),
  };
}

function nearestEdge(x: number, y: number, dockWidth: number, width: number, current: OpenEdge): OpenEdge {
  const distances = edgeDistances(x, y, dockWidth, width);
  let edge = current;
  let best = distances[current];
  for (const side of ["left", "right", "top"] as const) {
    if (distances[side] < best - 12) {
      best = distances[side];
      edge = side;
    }
  }
  return edge;
}

function snappedPos(edge: OpenEdge, width: number, dockWidth: number): { x: number; y: number } {
  if (edge === "right") return { x: Math.max(EDGE_PAD, width - EDGE_PAD - dockWidth), y: EDGE_PAD };
  return { x: EDGE_PAD, y: EDGE_PAD };
}

function panelPlacement(edge: OpenEdge, x: number, y: number, width: number, height: number): CSSProperties {
  if (edge === "left" || edge === "right") {
    const room = Math.max(180, height - y - 12);
    return {
      top: 0,
      width: 280,
      maxHeight: room,
      ...(edge === "left" ? { left: 0 } : { right: 0 }),
    };
  }
  const room = Math.max(280, width - x - 12);
  return {
    top: 0,
    left: 0,
    width: room,
    maxWidth: room,
    maxHeight: Math.round(height * 0.46),
  };
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
  if (name === "billing") {
    return (
      <svg {...common}>
        <rect x="6" y="4" width="12" height="16" rx="1.5" />
        <path d="M9 9h6M9 12h6M9 15h4" />
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
  const [navOpen, setNavOpen] = useState(true);
  const [navPos, setNavPos] = useState({ x: EDGE_PAD, y: EDGE_PAD });
  const [openEdge, setOpenEdge] = useState<OpenEdge>("left");
  const [docked, setDocked] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [nearEdge, setNearEdge] = useState(false);
  const navPosRef = useRef(navPos);
  const navOpenRef = useRef(true);
  const openEdgeRef = useRef<OpenEdge>("left");
  const draggingRef = useRef(false);
  const settleTimer = useRef(0);
  navPosRef.current = navPos;
  navOpenRef.current = navOpen;
  openEdgeRef.current = openEdge;
  draggingRef.current = dragging;
  const dockRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [insets, setInsets] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const now = useLocalClock();
  const edge = openEdge;
  const horizontal = edge === "top";
  const signedInName = lims?.username ?? "M. Chen";

  useEffect(() => {
    if (searchParams.get("signup") === "1") {
      setSignupOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  useLayoutEffect(() => {
    if (dragging || settling || !docked) {
      setInsets((current) =>
        current.left === 0 && current.right === 0 && current.top === 0 && current.bottom === 0
          ? current
          : { left: 0, right: 0, top: 0, bottom: 0 },
      );
      return;
    }
    const dock = dockRef.current;
    if (!dock) return;
    const gap = 12;
    if (!navOpen) {
      const box = dock.getBoundingClientRect();
      const next =
        edge === "left"
          ? { left: Math.ceil(box.right + gap), right: 0, top: 0, bottom: 0 }
          : edge === "right"
            ? { left: 0, right: Math.ceil(window.innerWidth - box.left + gap), top: 0, bottom: 0 }
            : { left: 0, right: 0, top: Math.ceil(box.bottom + gap), bottom: 0 };
      setInsets((current) =>
        current.left === next.left && current.right === next.right && current.top === next.top && current.bottom === next.bottom
          ? current
          : next,
      );
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const logo = dock.getBoundingClientRect();
    const menu = panel.getBoundingClientRect();
    const left = Math.min(logo.left, menu.left);
    const right = Math.max(logo.right, menu.right);
    const bottom = Math.max(logo.bottom, menu.bottom);
    const next =
      edge === "left"
        ? { left: Math.ceil(right + gap), right: 0, top: 0, bottom: 0 }
        : edge === "right"
          ? { left: 0, right: Math.ceil(window.innerWidth - left + gap), top: 0, bottom: 0 }
          : { left: 0, right: 0, top: Math.ceil(bottom + gap), bottom: 0 };
    setInsets((current) =>
      current.left === next.left && current.right === next.right && current.top === next.top && current.bottom === next.bottom
        ? current
        : next,
    );
  }, [navOpen, navPos, edge, viewport, infraOpen, horizontal, dragging, settling, docked]);

  useLayoutEffect(() => {
    if (!docked || dragging || settling) return;
    const measured = dockRef.current?.offsetWidth ?? LAUNCHER;
    const next = snappedPos(edge, viewport.width, measured);
    setNavPos((pos) => {
      if (pos.x === next.x && pos.y === next.y) return pos;
      navPosRef.current = next;
      return next;
    });
  }, [navOpen, edge, viewport.width, docked, dragging, settling]);

  function placeOpen(from: { x: number; y: number }) {
    const dockBox = dockRef.current?.getBoundingClientRect();
    const dockWidth = dockBox?.width ?? LAUNCHER;
    const nextEdge = nearestEdge(from.x, from.y, dockWidth, window.innerWidth, openEdgeRef.current);
    const next = snappedPos(nextEdge, window.innerWidth, dockWidth);
    openEdgeRef.current = nextEdge;
    navPosRef.current = next;
    setOpenEdge(nextEdge);
    setNavPos(next);
    setNavOpen(true);
    setDocked(true);
    setDragging(false);
    setSettling(false);
    setNearEdge(false);
  }

  function placeClosed() {
    setNavOpen(false);
    setDocked(true);
    setDragging(false);
    setSettling(false);
    setNearEdge(false);
  }

  function armDocked() {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (draggingRef.current) return;
      setSettling(false);
      setDocked(true);
      setNearEdge(false);
    }, 480);
  }

  function finishDrag(from: { x: number; y: number }) {
    setDragging(false);
    draggingRef.current = false;
    const dockBox = dockRef.current?.getBoundingClientRect();
    const dockWidth = dockBox?.width ?? LAUNCHER;
    const candidate = nearestEdge(from.x, from.y, dockWidth, window.innerWidth, openEdgeRef.current);
    const gap = edgeDistances(from.x, from.y, dockWidth, window.innerWidth)[candidate];
    if (gap > MAGNET) {
      window.clearTimeout(settleTimer.current);
      setDocked(false);
      setSettling(false);
      setNearEdge(false);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSettling(!reduce);
    setOpenEdge(candidate);
    openEdgeRef.current = candidate;
    const seat = () => {
      const measured = dockRef.current?.offsetWidth ?? dockWidth;
      const next = snappedPos(candidate, window.innerWidth, measured);
      const current = navPosRef.current;
      if (reduce || (Math.abs(next.x - current.x) < 1 && Math.abs(next.y - current.y) < 1)) {
        navPosRef.current = next;
        setNavPos(next);
        setSettling(false);
        setDocked(true);
        setNearEdge(false);
        return;
      }
      navPosRef.current = next;
      setNavPos(next);
      armDocked();
    };
    if (reduce) {
      seat();
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(seat));
  }

  function beginNavDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = navPosRef.current;
    const wasOpen = navOpenRef.current;
    let moved = false;
    function move(ev: { clientX: number; clientY: number }) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) <= 4) return;
        moved = true;
        window.clearTimeout(settleTimer.current);
        draggingRef.current = true;
        setDragging(true);
        setDocked(false);
        setSettling(false);
      }
      const bounds = dockRef.current?.getBoundingClientRect();
      const limitX = window.innerWidth - Math.ceil(bounds?.width ?? LAUNCHER) - 8;
      const limitY = window.innerHeight - Math.ceil(bounds?.height ?? LAUNCHER) - 8;
      const x = Math.min(Math.max(8, origin.x + dx), Math.max(8, limitX));
      const y = Math.min(Math.max(8, origin.y + dy), Math.max(8, limitY));
      const next = { x, y };
      navPosRef.current = next;
      const dockWidth = bounds?.width ?? LAUNCHER;
      const candidate = nearestEdge(x, y, dockWidth, window.innerWidth, openEdgeRef.current);
      const gap = edgeDistances(x, y, dockWidth, window.innerWidth)[candidate];
      setNearEdge(gap <= MAGNET);
      setNavPos(next);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseup", up);
      if (!moved) {
        draggingRef.current = false;
        setDragging(false);
        if (wasOpen) placeClosed();
        else placeOpen(origin);
        return;
      }
      finishDrag(navPosRef.current);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
  }

  function onMenuPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, input, select, textarea")) return;
    if (target.closest("button") && !target.closest(".sequence-wordmark")) return;
    beginNavDrag(event);
  }

  function closeSignup() {
    setSignupOpen(false);
    if (searchParams.get("signup") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("signup");
      setSearchParams(next, { replace: true });
    }
  }

  const panelStyle = panelPlacement(edge, navPos.x, navPos.y, viewport.width, viewport.height);

  return (
    <div
      className={`lims-shell is-${edge}${navOpen ? " is-nav-open" : ""}${dragging ? " is-nav-dragging" : ""}`}
      style={
        {
          "--nav-left": `${insets.left}px`,
          "--nav-right": `${insets.right}px`,
          "--nav-top": `${insets.top}px`,
          "--nav-bottom": `${insets.bottom}px`,
        } as CSSProperties
      }
    >
      <div
        ref={dockRef}
        className={`lims-nav-dock is-${edge}${navOpen ? " is-open" : ""}${settling ? " is-settling" : ""}${nearEdge ? " is-near" : ""}`}
        style={{ left: navPos.x, top: navPos.y }}
        onTransitionEnd={(event) => {
          if (event.target !== dockRef.current) return;
          if (event.propertyName !== "left" && event.propertyName !== "top") return;
          if (draggingRef.current) return;
          window.clearTimeout(settleTimer.current);
          setSettling(false);
          setDocked(true);
          setNearEdge(false);
        }}
      >
        {navOpen ? null : (
        <button
          type="button"
          className="lims-nav-launcher is-logo"
          aria-expanded={false}
          aria-label="Expand navigation"
          onPointerDown={beginNavDrag}
        >
          <img src="/sequence-logo.png" alt="" />
        </button>
      )}
      {navOpen ? (
      <aside ref={panelRef} className="lims-sidebar" style={panelStyle} onPointerDown={onMenuPointerDown}>
        <div className="lims-menu-brand">
          <button type="button" className="sequence-wordmark" aria-expanded aria-label="Close navigation">
            <img src="/sequence-logo.png" alt="" />
          </button>
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
        </div>

        <nav className="lims-nav" aria-label="LIMS modules">
          <p className="lims-nav-label">Sequence Operations</p>
          {labOps.menu
            .filter((item) => item.enabled && item.label.trim())
            .map((item) => (
              <NavLink
                key={item.id}
                to={labMenuPath(item.view)}
                end={item.view === "overview"}
                onClick={() => {
                  sectionTabs.showSection(item.view);
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
