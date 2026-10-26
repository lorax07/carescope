import type { ReactElement, SVGProps } from "react";

export const MODULE_CARD_COLOR = {
  operations: "#e4dcf3",
  instruments: "#f4e7ae",
  compliance: "#f6cddd",
  client: "#c9e3f6",
  revenue: "#f8d4c2",
  insights: "#d5efe4",
} as const;

export type ModuleSlug = keyof typeof MODULE_CARD_COLOR;

const GLYPH: Record<ModuleSlug, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  operations: (props) => (
    <svg viewBox="0 0 32 32" {...props}>
      <path
        d="M12 5h8M13.5 5v8.2L8.2 24.2A4.2 4.2 0 0 0 12 30h8a4.2 4.2 0 0 0 3.8-5.8L18.5 13.2V5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 21h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  instruments: (props) => (
    <svg viewBox="0 0 32 32" {...props}>
      <rect x="6" y="8" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 13h6M10 17h6M20 12h6M20 16h6M20 20h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  compliance: (props) => (
    <svg viewBox="0 0 32 32" {...props}>
      <path
        d="M16 5.5 7.5 9v6.2c0 5.2 3.4 8.8 8.5 10.8 5.1-2 8.5-5.6 8.5-10.8V9L16 5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m12.2 16.2 2.6 2.6 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  client: (props) => (
    <svg viewBox="0 0 32 32" {...props}>
      <circle cx="16" cy="11" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 23.5c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 8.5h5M24.5 6v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  revenue: (props) => (
    <svg viewBox="0 0 32 32" {...props}>
      <rect x="8" y="5.5" width="16" height="21" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12h8M12 16h8M12 20h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  insights: (props) => (
    <svg viewBox="0 0 32 32" {...props}>
      <path d="M7 24V14M13 24V8M19 24v-6M25 24V11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function ModuleGlyph({ slug, size = 28 }: { slug: ModuleSlug; size?: number }) {
  const Icon = GLYPH[slug];
  return <Icon width={size} height={size} aria-hidden="true" />;
}

export function sectionToModuleSlug(section: string): ModuleSlug | null {
  if (section === "overview" || section === "home" || section === "testing" || section === "review" || section === "release") {
    return "operations";
  }
  if (section === "instruments") return "instruments";
  if (section === "quality") return "compliance";
  if (section === "connectivity") return "client";
  if (section === "billing") return "revenue";
  if (section === "insights") return "insights";
  return null;
}

export function pathToNavGroup(pathname: string): "operations" | "connectivity" | "billing" | "instruments" | "quality" | null {
  if (pathname.startsWith("/app/connectivity")) return "connectivity";
  if (pathname.startsWith("/app/billing")) return "billing";
  if (pathname.startsWith("/app/instruments")) return "instruments";
  if (pathname.startsWith("/app/quality")) return "quality";
  if (
    pathname.startsWith("/app/design") ||
    pathname.startsWith("/app/workflows") ||
    pathname.startsWith("/app/insights")
  ) {
    return null;
  }
  if (pathname.startsWith("/app")) return "operations";
  return null;
}

export function pathToModuleSlug(to: string): ModuleSlug | null {
  if (to === "/app" || to.startsWith("/app/ops/")) return "operations";
  if (to.startsWith("/app/instruments")) return "instruments";
  if (to.startsWith("/app/quality")) return "compliance";
  if (to.startsWith("/app/connectivity")) return "client";
  if (to.startsWith("/app/billing")) return "revenue";
  if (to.startsWith("/app/insights")) return "insights";
  return null;
}
