import { NavIcon } from "./navIcons";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { BookmarkMenu } from "./components/BookmarkMenu";
import { SettingsDialog } from "./components/SettingsDialog";
import { NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { InstrumentRecordView } from "./components/InstrumentRecordView";
import { SandboxSignupModal } from "./components/SandboxSignupModal";
import { findInstrument } from "./instruments";
import { labMenuPath, useLabOperations, type LabMenuItem } from "./labOperations";
import { LAB_RESOURCES, LAB_RESOURCE_ACCESS_EVENT, userCanSeeLabResources } from "./labResourceAccess";
import { readLimsSession } from "./limsSession";
import { SampleDetailBody } from "./pages/SampleDetailPage";
import { findSample, getSamples } from "./samples";
import { SectionTabStrip, SectionTabsProvider, sectionFromPath, useSectionTabs, type PinnedTab } from "./sectionTabs";
import { CLIENT_CHAPTERS, COMPLIANCE_CHAPTERS, REVENUE_CHAPTERS, chapterForPath } from "./pages/moduleChapters";
import { INSTRUMENT_CHAPTERS } from "./pages/instruments/InstrumentChrome";
import { ModuleGlyph, pathToModuleSlug, pathToNavGroup, sectionToModuleSlug, type ModuleSlug } from "./sequenceModules";
import { findRunSequence, RunSequenceView } from "./testingRuns";
import { StartTestingWorkflow } from "./components/StartTestingWorkflow";

const NAV = [
  { to: "/app/design", label: "Workflow design" },
  { to: "/app/instruments", label: "Sequence Instruments" },
  { to: "/app/connectivity", label: "Sequence CRM" },
  { to: "/app/quality", label: "Sequence Compliance" },
  { to: "/app/billing", label: "Sequence Revenue" },
  { to: "/app/insights", label: "Sequence Insights" },
] as const;

function shortNavLabel(label: string): string {
  const known: Record<string, string> = {
    "Operations Overview": "Home",
    "Sequence CRM": "CRM",
    "Sequence Instruments": "Lab Ops",
    "Sequence Insights": "Insights",
    "Sequence Compliance": "Compliance",
    "Sequence Revenue": "Revenue",
    "Workflow design": "Design",
    "Lab Resources": "Resources",
    "Growth Hub": "Growth",
    "Laboratories & sites": "Sites",
    "Storage locations": "Storage",
    "Lots & materials": "Lots",
    "Shared reference data": "Reference",
  };
  return known[label] ?? label;
}

function nestedNavFor(to: string) {
  if (to === "/app/billing") return REVENUE_CHAPTERS;
  if (to === "/app/connectivity") return CLIENT_CHAPTERS;
  if (to === "/app/instruments") return INSTRUMENT_CHAPTERS;
  if (to === "/app/quality") return COMPLIANCE_CHAPTERS;
  return [];
}

function navGlyph(to: string, fallback: string) {
  return to.split("/").filter(Boolean).at(-1) ?? fallback;
}

function useLocalClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

type OpenEdge = "left" | "right" | "top";

const LAUNCHER = 64;
const EDGE_PAD = 0;

const MAGNET = 168;

function pointerDistances(x: number, y: number, width: number): Record<OpenEdge, number> {
  return {
    top: Math.max(0, y),
    left: Math.max(0, x),
    right: Math.max(0, width - x),
  };
}

function nearestEdge(x: number, y: number, width: number, current: OpenEdge): OpenEdge {
  const distances = pointerDistances(x, y, width);
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

function utcOffsetLabel(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "−";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function ParentMark({ slug, fallback }: { slug: ModuleSlug | null; fallback: string }) {
  if (slug) return <ModuleGlyph slug={slug} size={16} />;
  return <NavIcon name={fallback} />;
}

function NavCaret({ open, label, onToggle }: { open: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`lims-nav-caret${open ? " is-open" : ""}`}
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M4 6.2 8 10l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ShellNav({
  compact,
  stacked = false,
  includeNested,
  operationLinks,
  openGroups,
  currentGroup,
  onToggleGroup,
  showResources,
}: {
  compact: boolean;
  stacked?: boolean;
  includeNested: boolean;
  operationLinks: LabMenuItem[];
  openGroups: Record<string, boolean>;
  currentGroup: ReturnType<typeof pathToNavGroup>;
  onToggleGroup: (key: string) => void;
  showResources: boolean;
}) {
  const sectionTabs = useSectionTabs();
  const { pathname } = useLocation();
  const overviewLink = operationLinks.find((item) => item.view === "overview");
  const coreLinks = operationLinks.filter((item) => item.view !== "overview");
  const groupOpen = (key: string) => openGroups[key] ?? currentGroup === key;
  const showNested = (key: string) => (stacked || includeNested) && groupOpen(key);
  const showCaret = stacked || includeNested;
  const moduleActive = (slug: ModuleSlug | null) => Boolean(slug && sectionToModuleSlug(sectionTabs.section) === slug);

  function parentClass(slug: ModuleSlug | null, hasChildren: boolean, isActive: boolean) {
    return `lims-nav-item${hasChildren ? " is-core-parent" : ""}${isActive ? " active" : ""}${moduleActive(slug) ? " is-module-active" : ""}`;
  }

  return (
    <>
      {overviewLink ? (
        <div className={`lims-nav-group${groupOpen("operations") ? " is-expanded" : ""}`}>
          <div className="lims-nav-parent-row">
            <NavLink
              to={labMenuPath(overviewLink.view)}
              end
              title={compact ? overviewLink.label : undefined}
              aria-label={compact ? overviewLink.label : undefined}
              onClick={() => sectionTabs.showSection(overviewLink.view)}
              className={({ isActive }) => parentClass("operations", true, isActive)}
            >
              <span className="lims-nav-icon">
                <ParentMark slug="operations" fallback="overview" />
              </span>
              {stacked ? <span className="client-rail-label">{shortNavLabel(overviewLink.label)}</span> : compact ? null : overviewLink.label}
            </NavLink>
            {showCaret && coreLinks.length > 0 ? (
              <NavCaret open={groupOpen("operations")} label={overviewLink.label} onToggle={() => onToggleGroup("operations")} />
            ) : null}
          </div>
          {showNested("operations") && coreLinks.length > 0 ? (
            <div className="lims-nav-children" role="group" aria-label={`${overviewLink.label} pages`}>
              {coreLinks.map((item) => (
                <NavLink
                  key={item.id}
                  to={labMenuPath(item.view)}
                  title={compact ? item.label : undefined}
                  aria-label={compact ? item.label : undefined}
                  onClick={() => sectionTabs.showSection(item.view)}
                  className={({ isActive }) => `lims-nav-item is-core-child${isActive ? " active" : ""}`}
                >
                  <span className="lims-nav-icon">
                    <NavIcon name={item.view} />
                  </span>
                  {stacked ? <span className="client-rail-label">{shortNavLabel(item.label)}</span> : compact ? null : item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {showResources ? (
        <div className={`lims-nav-group${groupOpen("resources") ? " is-expanded" : ""}`}>
          <div className="lims-nav-parent-row">
            <NavLink
              to="/app/resources"
              end
              title={compact ? "Lab Resources" : undefined}
              aria-label={compact ? "Lab Resources" : undefined}
              onClick={() => sectionTabs.showSection("resources")}
              className={({ isActive }) => parentClass(null, true, isActive || pathname.startsWith("/app/resources"))}
            >
              <span className="lims-nav-icon">
                <NavIcon name="resources" />
              </span>
              {stacked ? <span className="client-rail-label">Resources</span> : compact ? null : "Lab Resources"}
            </NavLink>
            {showCaret ? (
              <NavCaret open={groupOpen("resources")} label="Lab Resources" onToggle={() => onToggleGroup("resources")} />
            ) : null}
          </div>
          {showNested("resources") ? (
            <div className="lims-nav-children" role="group" aria-label="Lab Resources pages">
              {LAB_RESOURCES.map((item) => (
                <NavLink
                  key={item.id}
                  to={`/app/resources/${item.id}`}
                  title={compact ? item.label : undefined}
                  aria-label={compact ? item.label : undefined}
                  onClick={() => sectionTabs.showSection("resources")}
                  className={({ isActive }) => `lims-nav-item is-core-child${isActive ? " active" : ""}`}
                >
                  <span className="lims-nav-icon">
                    <NavIcon name={item.id} />
                  </span>
                  {stacked ? <span className="client-rail-label">{shortNavLabel(item.label)}</span> : compact ? null : item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {NAV.map((item) => {
        const nested = nestedNavFor(item.to);
        const section = sectionFromPath(item.to);
        const slug = pathToModuleSlug(item.to);
        const group = item.to === "/app/billing" ? "billing" : item.to === "/app/connectivity" ? "connectivity" : item.to === "/app/instruments" ? "instruments" : item.to === "/app/quality" ? "quality" : null;
        const hasChildren = nested.length > 0;
        const open = Boolean(group && groupOpen(group));
        return (
          <div key={item.to} className={`lims-nav-group${open ? " is-expanded" : ""}`}>
            <div className="lims-nav-parent-row">
              <NavLink
                to={item.to}
                title={compact ? item.label : undefined}
                aria-label={compact ? item.label : undefined}
                end={hasChildren}
                onClick={() => sectionTabs.showSection(section)}
                className={({ isActive }) => parentClass(slug, hasChildren, isActive)}
              >
                <span className="lims-nav-icon">
                  <ParentMark slug={slug} fallback={section} />
                </span>
                {stacked ? <span className="client-rail-label">{shortNavLabel(item.label)}</span> : compact ? null : item.label}
              </NavLink>
              {showCaret && hasChildren && group ? <NavCaret open={open} label={item.label} onToggle={() => onToggleGroup(group)} /> : null}
            </div>
            {hasChildren && group && showNested(group) ? (
              <div className="lims-nav-children" role="group" aria-label={`${item.label} pages`}>
                {nested.map((sub) => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    end={sub.end}
                    title={compact ? sub.question : sub.label}
                    aria-label={compact ? sub.label : undefined}
                    onClick={() => sectionTabs.showSection(section)}
                    className={() => {
                      const chapters = group === "billing" ? REVENUE_CHAPTERS : group === "instruments" ? INSTRUMENT_CHAPTERS : group === "quality" ? COMPLIANCE_CHAPTERS : CLIENT_CHAPTERS;
                      const on = chapterForPath(chapters, pathname)?.id === sub.id;
                      return `lims-nav-item is-core-child${on ? " active" : ""}`;
                    }}
                  >
                    <span className="lims-nav-icon">
                      <NavIcon name={navGlyph(sub.to, section)} />
                    </span>
                    {stacked ? <span className="client-rail-label">{shortNavLabel(sub.label)}</span> : compact ? null : sub.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function workspaceTabLabel(section: string, menu: { view: string; label: string }[]): string {
  if (section === "instruments") return "Instruments";
  return (
    menu.find((item) => item.view === section)?.label ??
    {
      design: "Workflow design",
      connectivity: "Sequence CRM",
      quality: "Sequence Compliance",
      billing: "Sequence Revenue",
      insights: "Sequence Insights",
      resources: "Lab Resources",
    }[section] ??
    "Workspace"
  );
}

function PinnedScreen({ tab }: { tab: PinnedTab }) {
  if (tab.kind === "sample") {
    const sample = findSample(tab.recordId);
    return sample ? <SampleDetailBody sample={sample} showBack={false} /> : null;
  }
  if (tab.kind === "run") {
    const run = findRunSequence(tab.recordId);
    return run ? <RunSequenceView run={run} /> : null;
  }
  if (tab.kind === "testing") {
    return <div className="lims-page"><section className="lims-panel"><StartTestingWorkflow pool={getSamples().filter((sample) => sample.status === "testing" || sample.status === "received" || sample.status === "accessioning" || sample.status === "processing")} /></section></div>;
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
  const location = useLocation();
  const clientModule = location.pathname.startsWith("/app/connectivity");
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [dockWidth, setDockWidth] = useState(440);
  const [resizingDock, setResizingDock] = useState(false);
  const [signupOpen, setSignupOpen] = useState(
    () => searchParams.get("signup") === "1"
  );
  const lims = readLimsSession();
  const [showResources, setShowResources] = useState(() => userCanSeeLabResources(lims?.labId, lims?.userId));
  useEffect(() => {
    const sync = () => {
      const session = readLimsSession();
      setShowResources(userCanSeeLabResources(session?.labId, session?.userId));
    };
    window.addEventListener("storage", sync);
    window.addEventListener(LAB_RESOURCE_ACCESS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LAB_RESOURCE_ACCESS_EVENT, sync);
    };
  }, []);
  const labOps = useLabOperations();
  const sectionTabs = useSectionTabs();
  const [infraOpen, setInfraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const currentGroup = pathToNavGroup(location.pathname);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [navPos, setNavPos] = useState({ x: EDGE_PAD, y: EDGE_PAD });
  const [openEdge, setOpenEdge] = useState<OpenEdge>("left");
  const [docked, setDocked] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [nearEdge, setNearEdge] = useState(false);
  const navPosRef = useRef(navPos);
  const openEdgeRef = useRef<OpenEdge>("left");
  const draggingRef = useRef(false);
  const settleTimer = useRef(0);
  navPosRef.current = navPos;
  openEdgeRef.current = openEdge;
  draggingRef.current = dragging;
  const dockRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [insets, setInsets] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const [headerH, setHeaderH] = useState(62);
  const [logoW, setLogoW] = useState(72);
  const [logoStack, setLogoStack] = useState(52);
  const [topSlot, setTopSlot] = useState(0);
  const now = useLocalClock();
  const edge = openEdge;
  const signedInName = lims?.displayName ?? lims?.username ?? "M. Chen";
  const railInitials =
    signedInName
      .split(/\s+/)
      .map((part) => part.replace(/[^a-z0-9]/gi, "").charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MC";

  useEffect(() => {
    if (searchParams.get("signup") === "1") {
      setSignupOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!currentGroup) return;
    setOpenGroups((current) => ({ ...current, [currentGroup]: true }));
  }, [currentGroup]);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const [dockTick, setDockTick] = useState(0);
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const observer = new ResizeObserver(() => setDockTick((tick) => tick + 1));
    observer.observe(dock);
    return () => observer.disconnect();
  }, [navOpen, edge]);

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
    const gap = navOpen ? 6 : 0;
    const box = dock.getBoundingClientRect();
    const next =
      edge === "left"
        ? { left: Math.ceil(box.right + gap), right: 0, top: 0, bottom: 0 }
        : edge === "right"
          ? { left: 0, right: Math.ceil(window.innerWidth - box.left + gap), top: 0, bottom: 0 }
          : { left: 0, right: 0, top: 0, bottom: 0 };
    setInsets((current) =>
      current.left === next.left && current.right === next.right && current.top === next.top && current.bottom === next.bottom
        ? current
        : next,
    );
  }, [navOpen, navPos, edge, viewport, infraOpen, dragging, settling, docked, dockTick]);

  useLayoutEffect(() => {
    const measure = () => {
      const header = headerRef.current;
      const logo = logoRef.current;
      const dock = dockRef.current;
      const brand = brandRef.current;
      const logoRight = Math.ceil((brand ?? logo)?.getBoundingClientRect().right ?? 72);
      const gap = navOpen && edge === "top" ? 20 : 14;
      setLogoW(logoRight + gap);
      if (edge === "top" && logo && header) {
        setLogoStack(Math.max(36, Math.ceil(logo.getBoundingClientRect().bottom - header.getBoundingClientRect().top + 4)));
      }
      if (edge === "top" && docked && !dragging && !settling && dock) {
        setTopSlot(Math.max(0, Math.ceil(dock.getBoundingClientRect().width)));
        const dockH = Math.ceil(dock.getBoundingClientRect().height);
        const headerHgt = header?.offsetHeight ?? 62;
        setHeaderH(Math.max(headerHgt, dockH));
      } else {
        setTopSlot(0);
        if (header) setHeaderH(header.offsetHeight);
      }
    };
    measure();
    const timer = window.setTimeout(measure, 340);
    return () => window.clearTimeout(timer);
  }, [navOpen, edge, viewport, infraOpen, dragging, settling, docked, dockTick]);

  useLayoutEffect(() => {
    if (!docked || dragging || settling) return;
    const measured = dockRef.current?.offsetWidth ?? LAUNCHER;
    const next = snappedPos(edge, viewport.width, measured);
    setNavPos((pos) => {
      if (pos.x === next.x && pos.y === next.y) return pos;
      navPosRef.current = next;
      return next;
    });
  }, [navOpen, edge, viewport.width, docked, dragging, settling, dockTick]);

  function armDocked() {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (draggingRef.current) return;
      setSettling(false);
      setDocked(true);
      setNearEdge(false);
    }, 480);
  }

  function finishDrag(pointer: { x: number; y: number }) {
    setDragging(false);
    draggingRef.current = false;
    const dockBox = dockRef.current?.getBoundingClientRect();
    const dockWidth = dockBox?.width ?? LAUNCHER;
    const candidate = nearestEdge(pointer.x, pointer.y, window.innerWidth, openEdgeRef.current);
    const gap = pointerDistances(pointer.x, pointer.y, window.innerWidth)[candidate];
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

  function returnToLastEdge() {
    const side = openEdgeRef.current;
    const measured = dockRef.current?.offsetWidth ?? LAUNCHER;
    const next = snappedPos(side, window.innerWidth, measured);
    const current = navPosRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const same = Math.abs(next.x - current.x) < 1 && Math.abs(next.y - current.y) < 1;
    if (reduce || same) {
      navPosRef.current = next;
      setNavPos(next);
      setSettling(false);
      setDocked(true);
      setNearEdge(false);
      return;
    }
    setSettling(true);
    navPosRef.current = next;
    setNavPos(next);
    armDocked();
  }

  function beginNavDrag(event: ReactPointerEvent<HTMLElement>, options?: { toggle?: boolean }) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (!target.closest("a")) event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = navPosRef.current;
    let moved = false;
    let pointerX = startX;
    let pointerY = startY;
    function move(ev: { clientX: number; clientY: number }) {
      pointerX = ev.clientX;
      pointerY = ev.clientY;
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
      const x = Math.min(Math.max(0, origin.x + dx), Math.max(0, limitX));
      const y = Math.min(Math.max(0, origin.y + dy), Math.max(0, limitY));
      const next = { x, y };
      navPosRef.current = next;
      const candidate = nearestEdge(ev.clientX, ev.clientY, window.innerWidth, openEdgeRef.current);
      const gap = pointerDistances(ev.clientX, ev.clientY, window.innerWidth)[candidate];
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
        if (options?.toggle) setNavOpen((open) => !open);
        return;
      }
      suppressClick.current = true;
      window.getSelection()?.removeAllRanges();
      finishDrag({ x: pointerX, y: pointerY });
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
  }

  function toggleNavGroup(key: string) {
    setOpenGroups((current) => ({
      ...current,
      [key]: !(current[key] ?? currentGroup === key),
    }));
  }

  function onShellClickCapture(event: ReactMouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function onWorkspaceClick(event: ReactMouseEvent) {
    if (docked || draggingRef.current) return;
    if (dockRef.current?.contains(event.target as Node)) return;
    returnToLastEdge();
  }

  function closeSignup() {
    setSignupOpen(false);
    if (searchParams.get("signup") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("signup");
      setSearchParams(next, { replace: true });
    }
  }

  const operationLinks = labOps.menu.filter((item) => item.enabled && item.label.trim());

  const labEnvironment = (
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
  );

  return (
    <div
      className={`lims-shell is-app-rail is-${edge}${navOpen ? " is-nav-open" : ""}${dragging ? " is-nav-dragging" : ""}${clientModule ? " is-client" : ""}`}
      style={
        {
          "--nav-left": `${insets.left}px`,
          "--nav-right": `${insets.right}px`,
          "--nav-top": `${insets.top}px`,
          "--nav-bottom": `${insets.bottom}px`,
          "--header-h": `${headerH}px`,
          "--header-logo-w": `${logoW}px`,
          "--brand-logo-stack": `${logoStack}px`,
          "--top-nav-slot": `${topSlot}px`,
        } as CSSProperties
      }
      onClickCapture={onShellClickCapture}
      onClick={onWorkspaceClick}
    >
      <div
        ref={dockRef}
        className={`lims-nav-dock is-${edge}${navOpen ? " is-open" : ""}${docked ? " is-docked" : " is-floating"}${settling ? " is-settling" : ""}${nearEdge ? " is-near" : ""}`}
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
        <div
            className="lims-icon-rail"
            inert={navOpen ? true : undefined}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a, button, input, select, textarea")) return;
              setNavOpen(true);
            }}
          >
            <button type="button" className="client-rail-logo" aria-expanded={navOpen} aria-label={navOpen ? "Collapse navigation" : "Expand navigation"} onClick={() => setNavOpen((open) => !open)}>
              <img src="/sequence-logo-light.png" alt="Sequence" />
            </button>
            <nav className="lims-nav" aria-label="LIMS modules">
              <ShellNav
                compact
                stacked
                includeNested={false}
                operationLinks={operationLinks}
                openGroups={openGroups}
                currentGroup={currentGroup}
                onToggleGroup={toggleNavGroup}
                showResources={showResources}
              />
            </nav>
            <button type="button" className="lims-rail-user" aria-label={`Settings for ${signedInName}`} title={signedInName} onClick={() => setSettingsOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
      <aside
        className="lims-sidebar"
        inert={!navOpen ? true : undefined}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("a, button, input, select, textarea")) return;
          setNavOpen((open) => !open);
        }}
      >
        <button type="button" className="client-rail-logo" aria-expanded={navOpen} aria-label={navOpen ? "Collapse navigation" : "Expand navigation"} onClick={() => setNavOpen((open) => !open)}>
          <img src="/sequence-logo-light.png" alt="Sequence" />
        </button>

        <nav className="lims-nav" aria-label="LIMS modules">
          <ShellNav
            compact={false}
            includeNested={edge !== "top"}
            operationLinks={operationLinks}
            openGroups={openGroups}
            currentGroup={currentGroup}
            onToggleGroup={toggleNavGroup}
            showResources={showResources}
          />
        </nav>

        <div className="lims-sidebar-foot">
          <div className="lims-user">
            <span className="lims-avatar">{railInitials}</span>
            <div>
              <b>{signedInName}</b>
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
      </div>

      <header className={clientModule ? "lims-topbar client-topbar" : "lims-topbar"} ref={headerRef}>
        {clientModule ? (
          <>
            <label className="client-search-pill">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <input type="search" aria-label="Search" placeholder="Building better healthcare for everyone" />
            </label>
            <div className="client-top-actions">
              <button type="button" aria-label="Notifications">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V10a6 6 0 1 1 12 0v6l1.4 2H4.6L6 16Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                <i />
              </button>
              <button type="button" className="client-avatar" aria-label={`Account for ${signedInName}`} onClick={() => setSettingsOpen(true)}>
                {railInitials}
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 4.4 6 8l3.8-3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          </>
        ) : null}
        {clientModule ? null : (
        <>
        <div className="lims-topbar-brand" ref={brandRef}>
        <button
          ref={logoRef}
          type="button"
          className="sequence-nav-toggle"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Minimize navigation" : "Expand navigation"}
          onPointerDown={(event) => {
            event.stopPropagation();
            beginNavDrag(event, { toggle: true });
          }}
        >
          <span className="sequence-nav-wordmark" aria-hidden="true"><img src="/sequence-logo.png" alt="" /></span>
          <span className="sequence-stage-mark" aria-hidden="true"><img src="/sequence-q.png" alt="" /></span>
        </button>
        {edge === "top" ? <div className="lims-topbar-site">{labEnvironment}</div> : null}
        </div>
        <div className="lims-topbar-nav-slot" aria-hidden="true" />
        <div className="lims-search">
          <input
            type="search"
            placeholder="Search accession, order, client…"
            aria-label="Search laboratory records"
          />
        </div>
        <div className="lims-topbar-meta">
          <BookmarkMenu userId={lims?.userId || lims?.username || "M. Chen"} />
          <time className="lims-chip" dateTime={now.toISOString()}>
            {signedInName} · {now.toLocaleString()}
          </time>
          <span className="lims-chip muted">{utcOffsetLabel(now)}</span>
        </div>
        </>
        )}
      </header>

      <div className="lims-main">
        <div
          ref={workspaceRef}
          className={`lims-workspace${sectionTabs.presentation === "tab" && sectionTabs.activeId ? " has-dock" : ""}${sectionTabs.presentation === "screen" && sectionTabs.activeId ? " is-screen" : ""}${resizingDock ? " is-resizing" : ""}`}
          style={{ "--screen-dock-width": `${dockWidth}px` } as CSSProperties}
        >
          {sectionTabs.presentation === "screen" && sectionTabs.activeId ? (
            <div className="lims-content">
              <div className="lims-page screen-view-page">
                <SectionTabStrip mainLabel={workspaceTabLabel(sectionTabs.section, labOps.menu)} />
                <div className="screen-view-body">
                  {sectionTabs.tabs
                    .filter((tab) => tab.id === sectionTabs.activeId)
                    .map((tab) => (
                      <PinnedScreen key={tab.id} tab={tab} />
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="lims-content">
              <Outlet />
            </div>
          )}
          {sectionTabs.presentation === "tab"
            ? sectionTabs.tabs
            .filter((tab) => tab.id === sectionTabs.activeId)
            .map((tab) => (
              <div key={tab.id} className="lims-screen-dock-wrap">
                <div
                  className="lims-screen-resizer"
                  role="separator"
                  aria-label="Resize tabbed screen"
                  aria-orientation="vertical"
                  aria-valuemin={320}
                  aria-valuenow={Math.round(dockWidth)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? window.innerWidth;
                    const minMain = Math.min(520, workspaceWidth * 0.42);
                    const maxDock = Math.max(320, workspaceWidth - minMain);
                    const change = event.key === "ArrowLeft" ? 32 : -32;
                    setDockWidth((current) => Math.min(maxDock, Math.max(320, current + change)));
                  }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    const handle = event.currentTarget;
                    handle.setPointerCapture(event.pointerId);
                    setResizingDock(true);
                    const resize = (clientX: number) => {
                      const rect = workspaceRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const minMain = Math.min(520, rect.width * 0.42);
                      const maxDock = Math.max(320, rect.width - minMain);
                      setDockWidth(Math.min(maxDock, Math.max(320, rect.right - clientX)));
                    };
                    const onMove = (moveEvent: PointerEvent) => resize(moveEvent.clientX);
                    const onEnd = () => {
                      handle.removeEventListener("pointermove", onMove);
                      handle.removeEventListener("pointerup", onEnd);
                      handle.removeEventListener("pointercancel", onEnd);
                      setResizingDock(false);
                    };
                    handle.addEventListener("pointermove", onMove);
                    handle.addEventListener("pointerup", onEnd);
                    handle.addEventListener("pointercancel", onEnd);
                  }}
                >
                  <span />
                </div>
                <aside className="lims-screen-dock" aria-label={tab.title}>
                  <div className="lims-screen-dock-head">
                    <strong>{tab.title}</strong>
                    <button type="button" className="btn" onClick={() => sectionTabs.showSection()}>
                      Main screen
                    </button>
                  </div>
                  <PinnedScreen tab={tab} />
                </aside>
              </div>
            ))
            : null}
        </div>
      </div>

      <SandboxSignupModal open={signupOpen} onClose={closeSignup} />
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
