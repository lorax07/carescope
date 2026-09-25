import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type PinnedTab = {
  id: string;
  title: string;
  kind: "sample" | "instrument";
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
