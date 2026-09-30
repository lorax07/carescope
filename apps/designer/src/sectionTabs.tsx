import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type PinnedTab = {
  id: string;
  title: string;
  kind: "sample" | "instrument" | "run" | "testing";
  recordId: string;
};

type SectionTabsValue = {
  section: string;
  tabs: PinnedTab[];
  activeId: string | null;
  pin: (tab: Omit<PinnedTab, "id">) => void;
  select: (id: string) => void;
  close: (id: string) => void;
  showSection: (sectionId?: string) => void;
};

const SectionTabsContext = createContext<SectionTabsValue | null>(null);

export function sectionFromPath(path: string): string {
  if (path.startsWith("/app/ops/testing")) return "testing";
  if (path.startsWith("/app/ops/review")) return "review";
  if (path.startsWith("/app/ops/release")) return "release";
  if (path.startsWith("/app/instruments")) return "instruments";
  if (path.startsWith("/app/design") || path.startsWith("/app/workflows")) return "design";
  if (path.startsWith("/app/connectivity")) return "connectivity";
  if (path.startsWith("/app/quality")) return "quality";
  if (path.startsWith("/app/billing")) return "billing";
  if (path.startsWith("/app/insights")) return "insights";
  if (path === "/app" || path === "/app/") return "overview";
  return "home";
}

export function SectionTabsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const section = sectionFromPath(location.pathname);
  const [bySection, setBySection] = useState<Record<string, PinnedTab[]>>({});
  const [active, setActive] = useState<Record<string, string | null>>({});

  const value = useMemo<SectionTabsValue>(() => {
    const tabs = bySection[section] ?? [];
    return {
      section,
      tabs,
      activeId: active[section] ?? null,
      pin(tab) {
        const id = `${tab.kind}:${tab.recordId}`;
        setBySection((current) => {
          const list = current[section] ?? [];
          if (list.some((item) => item.id === id)) return current;
          return { ...current, [section]: [...list, { ...tab, id }] };
        });
        setActive((current) => ({ ...current, [section]: id }));
      },
      select(id) {
        setActive((current) => ({ ...current, [section]: id }));
      },
      close(id) {
        setBySection((current) => ({
          ...current,
          [section]: (current[section] ?? []).filter((tab) => tab.id !== id),
        }));
        setActive((current) => ({ ...current, [section]: current[section] === id ? null : current[section] }));
      },
      showSection(sectionId) {
        const key = sectionId ?? section;
        setActive((current) => ({ ...current, [key]: null }));
      },
    };
  }, [section, bySection, active]);

  return <SectionTabsContext.Provider value={value}>{children}</SectionTabsContext.Provider>;
}

export function useSectionTabs(): SectionTabsValue {
  const value = useContext(SectionTabsContext);
  if (!value) throw new Error("Section tabs are unavailable");
  return value;
}

function TabGlyph({ name }: { name: "main" | PinnedTab["kind"] }) {
  const common = {
    viewBox: "0 0 16 16",
    width: 15,
    height: 15,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "main") {
    return (
      <svg {...common}>
        <rect x="1.6" y="1.6" width="5" height="5" rx="1" />
        <rect x="9.4" y="1.6" width="5" height="5" rx="1" />
        <rect x="1.6" y="9.4" width="5" height="5" rx="1" />
        <rect x="9.4" y="9.4" width="5" height="5" rx="1" />
      </svg>
    );
  }
  if (name === "instrument" || name === "run" || name === "testing") {
    return (
      <svg {...common}>
        <rect x="1.8" y="3.2" width="12.4" height="8" rx="1.4" />
        <path d="M5 3.2V2.2h6v1M5 11.2v1.2M11 11.2v1.2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 3.2h10M3 6.6h10M3 10h7M3 13.2h5" />
    </svg>
  );
}

/** The section stays the first tab. Tab Screen adds the next one. */
export function SectionTabStrip({ mainLabel }: { mainLabel: string }) {
  const tabs = useSectionTabs();
  if (tabs.tabs.length === 0) return null;
  const mainOn = tabs.activeId == null;

  return (
    <div className="lims-screen-tabs" role="tablist" aria-label="Tabbed screens">
      <button type="button" role="tab" aria-selected={mainOn} className={mainOn ? "is-on" : undefined} onClick={() => tabs.showSection()}>
        <TabGlyph name="main" />
        {mainLabel}
      </button>
      {tabs.tabs.map((tab) => {
        const selected = tabs.activeId === tab.id;
        return (
          <div key={tab.id} className={`lims-screen-tab${selected ? " is-on" : ""}`}>
            <button type="button" role="tab" aria-selected={selected} onClick={() => tabs.select(tab.id)}>
              <TabGlyph name={tab.kind} />
              {tab.title}
            </button>
            <button type="button" className="lims-screen-tab-close" aria-label={`Close ${tab.title}`} onClick={() => tabs.close(tab.id)}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
