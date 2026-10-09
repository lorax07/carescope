import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { SettingsDialog } from "./components/SettingsDialog";
import { NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { InstrumentRecordView } from "./components/InstrumentRecordView";
import { SandboxSignupModal } from "./components/SandboxSignupModal";
import { findInstrument } from "./instruments";
import { labMenuPath, useLabOperations, type LabMenuItem } from "./labOperations";
import { readLimsSession } from "./limsSession";
import { SampleDetailBody } from "./pages/SampleDetailPage";
import { SequenceStageMark } from "./components/StageConditionCell";
import { findSample, getSamples } from "./samples";
import { SectionTabStrip, SectionTabsProvider, sectionFromPath, useSectionTabs, type PinnedTab } from "./sectionTabs";
import { CLIENT_CHAPTERS, REVENUE_CHAPTERS, chapterForPath } from "./pages/moduleChapters";
import { MODULE_CARD_COLOR, ModuleGlyph, pathToModuleSlug, pathToNavGroup, sectionToModuleSlug, type ModuleSlug } from "./sequenceModules";
import { findRunSequence, RunSequenceView } from "./testingRuns";
import { StartTestingWorkflow } from "./components/StartTestingWorkflow";
import { DEFAULT_WORKFLOW_STAGES, useWorkflowStages } from "./workflowStages";

const NAV = [
  { to: "/app/design", label: "Workflow design" },
  { to: "/app/instruments", label: "Sequence Instruments" },
  { to: "/app/connectivity", label: "Sequence Client" },
  { to: "/app/quality", label: "Sequence Compliance" },
  { to: "/app/billing", label: "Sequence Revenue" },
  { to: "/app/insights", label: "Sequence Insights" },
] as const;

function nestedNavFor(to: string) {
  if (to === "/app/billing") return REVENUE_CHAPTERS;
  if (to === "/app/connectivity") return CLIENT_CHAPTERS;
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
  if (name === "clients") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="2.1" />
        <circle cx="16" cy="9" r="1.8" />
        <path d="M4.6 18.5a4.2 4.2 0 0 1 8.4 0M13.2 18.5a3.4 3.4 0 0 1 6.2 0" />
      </svg>
    );
  }
  if (name === "contacts") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="2.4" />
        <path d="M6 19a6 6 0 0 1 12 0" />
      </svg>
    );
  }
  if (name === "activities") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5L15 14" />
      </svg>
    );
  }
  if (name === "tasks") {
    return (
      <svg {...common}>
        <path d="M8 6h11M8 12h11M8 18h11" />
        <path d="m4 6 1.2 1.2L7.2 5M4 12l1.2 1.2L7.2 11M4 18l1.2 1.2L7.2 17" />
      </svg>
    );
  }
  if (name === "opportunities") {
    return (
      <svg {...common}>
        <path d="M5 16 10 10l3 3 6-7" />
        <path d="M15 6h4v4" />
      </svg>
    );
  }
  if (name === "health") {
    return (
      <svg {...common}>
        <path d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 2.8C19 14.6 12 19 12 19z" />
      </svg>
    );
  }
  if (name === "communications") {
    return (
      <svg {...common}>
        <path d="M5 6h14v9H8l-3 3V6z" />
      </svg>
    );
  }
  if (name === "issues") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5M12 16.5h.01" />
      </svg>
    );
  }
  if (name === "documents") {
    return (
      <svg {...common}>
        <path d="M7 4h7l4 4v12H7V4z" />
        <path d="M14 4v4h4" />
      </svg>
    );
  }
  if (name === "analytics") {
    return (
      <svg {...common}>
        <path d="M5 19V10M10 19V5M15 19v-7M20 19V8" />
      </svg>
    );
  }
  if (name === "claims") {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="16" rx="1.5" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (name === "queues") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    );
  }
  if (name === "payments") {
    return (
      <svg {...common}>
        <rect x="3.5" y="6" width="17" height="12" rx="2" />
        <path d="M3.5 10h17" />
      </svg>
    );
  }
  if (name === "denials") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (name === "ar") {
    return (
      <svg {...common}>
        <path d="M5 19 9.5 8h5L19 19M7.2 14h9.6" />
      </svg>
    );
  }
  if (name === "config") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.4 6.4l1.6 1.6M16 16l1.6 1.6M17.6 6.4 16 8M8 16l-1.6 1.6" />
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
  includeNested,
  operationLinks,
  openGroups,
  currentGroup,
  onToggleGroup,
}: {
  compact: boolean;
  includeNested: boolean;
  operationLinks: LabMenuItem[];
  openGroups: Record<string, boolean>;
  currentGroup: ReturnType<typeof pathToNavGroup>;
  onToggleGroup: (key: string) => void;
}) {
  const sectionTabs = useSectionTabs();
  const { pathname } = useLocation();
  const overviewLink = operationLinks.find((item) => item.view === "overview");
  const coreLinks = operationLinks.filter((item) => item.view !== "overview");
  const groupOpen = (key: string) => openGroups[key] ?? currentGroup === key;
  const moduleActive = (slug: ModuleSlug | null) => Boolean(slug && sectionToModuleSlug(sectionTabs.section) === slug);

  function parentClass(slug: ModuleSlug | null, hasChildren: boolean, isActive: boolean) {
    return `lims-nav-item${hasChildren ? " is-core-parent" : ""}${isActive ? " active" : ""}${moduleActive(slug) ? " is-module-active" : ""}`;
  }

  function parentStyle(slug: ModuleSlug | null): CSSProperties | undefined {
    return slug ? ({ "--module-color": MODULE_CARD_COLOR[slug] } as CSSProperties) : undefined;
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
              style={parentStyle("operations")}
            >
              <span className="lims-nav-icon">
                <ParentMark slug="operations" fallback="overview" />
              </span>
              {compact ? null : overviewLink.label}
            </NavLink>
            {includeNested && coreLinks.length > 0 ? (
              <NavCaret open={groupOpen("operations")} label={overviewLink.label} onToggle={() => onToggleGroup("operations")} />
            ) : null}
          </div>
          {includeNested && groupOpen("operations") ? (
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
                  {compact ? null : item.label}
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
        const group = item.to === "/app/billing" ? "billing" : item.to === "/app/connectivity" ? "connectivity" : null;
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
                style={parentStyle(slug)}
              >
                <span className="lims-nav-icon">
                  <ParentMark slug={slug} fallback={section} />
                </span>
                {compact ? null : item.label}
              </NavLink>
              {includeNested && hasChildren && group ? <NavCaret open={open} label={item.label} onToggle={() => onToggleGroup(group)} /> : null}
            </div>
            {includeNested && open ? (
              <div className="lims-nav-children" role="group" aria-label={`${item.label} pages`}>
                {nested.map((sub) => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    title={compact ? sub.question : sub.label}
                    aria-label={compact ? sub.label : undefined}
                    onClick={() => sectionTabs.showSection(section)}
                    className={() => {
                      const chapters = group === "billing" ? REVENUE_CHAPTERS : CLIENT_CHAPTERS;
                      const on = chapterForPath(chapters, pathname)?.id === sub.id;
                      return `lims-nav-item is-core-child${on ? " active" : ""}`;
                    }}
                  >
                    <span className="lims-nav-icon">
                      <NavIcon name={navGlyph(sub.to, section)} />
                    </span>
                    {compact ? null : sub.label}
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
      connectivity: "Sequence Client",
      quality: "Sequence Compliance",
      billing: "Sequence Revenue",
      insights: "Sequence Insights",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [dockWidth, setDockWidth] = useState(440);
  const [resizingDock, setResizingDock] = useState(false);
  const [signupOpen, setSignupOpen] = useState(
    () => searchParams.get("signup") === "1"
  );
  const lims = readLimsSession();
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
  const stages = useWorkflowStages();
  const edge = openEdge;
  const signedInName = lims?.username ?? "M. Chen";
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

  function onMenuPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, input, select, textarea")) return;
    if (target.closest("button") && !target.closest(".sequence-wordmark")) return;
    beginNavDrag(event, { toggle: true });
  }

  function onRailPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".lims-rail-user, .lims-nav-caret")) return;
    beginNavDrag(event, { toggle: Boolean(target.closest(".lims-rail-logo")) });
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
      className={`lims-shell is-${edge}${navOpen ? " is-nav-open" : ""}${dragging ? " is-nav-dragging" : ""}`}
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
        {navOpen ? null : (
          <div className="lims-icon-rail" onPointerDown={onRailPointerDown}>
            <nav className="lims-nav" aria-label="LIMS modules">
              <ShellNav
                compact
                includeNested={edge !== "top"}
                operationLinks={operationLinks}
                openGroups={openGroups}
                currentGroup={currentGroup}
                onToggleGroup={toggleNavGroup}
              />
            </nav>
            <button type="button" className="lims-rail-user" aria-label={`Settings for ${signedInName}`} title={signedInName} onClick={() => setSettingsOpen(true)}>
              {railInitials}
            </button>
          </div>
        )}
      {navOpen ? (
      <aside className="lims-sidebar" onPointerDown={onMenuPointerDown}>
        {edge === "top" ? null : (
        <div className="lims-menu-brand">
        {labEnvironment}
        </div>
        )}

        <nav className="lims-nav" aria-label="LIMS modules">
          <ShellNav
            compact={false}
            includeNested={edge !== "top"}
            operationLinks={operationLinks}
            openGroups={openGroups}
            currentGroup={currentGroup}
            onToggleGroup={toggleNavGroup}
          />
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

      <header className="lims-topbar" ref={headerRef}>
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
          <SequenceStageMark stages={stages.length ? stages : DEFAULT_WORKFLOW_STAGES} />
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
          <time className="lims-chip" dateTime={now.toISOString()}>
            {signedInName} · {now.toLocaleString()}
          </time>
          <span className="lims-chip muted">{utcOffsetLabel(now)}</span>
        </div>
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
