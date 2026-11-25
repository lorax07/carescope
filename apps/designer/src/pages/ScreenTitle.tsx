import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavIcon } from "../navIcons";
import { ModuleGlyph, pathToModuleSlug } from "../sequenceModules";

const SUBMODULE_GLYPHS: [string, string][] = [
  ["/app/connectivity/clients", "clients"],
  ["/app/connectivity/contacts", "contacts"],
  ["/app/connectivity/documents", "documents"],
  ["/app/connectivity/health", "health"],
  ["/app/connectivity/tasks", "tasks"],
  ["/app/connectivity/activities", "activities"],
  ["/app/connectivity/issues", "issues"],
  ["/app/connectivity/opportunities", "opportunities"],
  ["/app/connectivity/analytics", "analytics"],
  ["/app/connectivity/inbox", "inbox"],
  ["/app/connectivity/communications", "communications"],
  ["/app/instruments/queue", "queues"],
  ["/app/instruments/acquire", "testing"],
  ["/app/instruments/review", "review"],
  ["/app/instruments", "instruments"],
  ["/app/quality/deviations", "deviations"],
  ["/app/quality/capa", "capa"],
  ["/app/quality/documents", "documents"],
  ["/app/quality/changes", "changes"],
  ["/app/quality/audits", "audits"],
  ["/app/billing/claims", "claims"],
  ["/app/billing/capture", "claims"],
  ["/app/billing/queues", "queues"],
  ["/app/billing/payments", "payments"],
  ["/app/billing/denials", "denials"],
  ["/app/billing/ar", "ar"],
  ["/app/billing/analytics", "analytics"],
  ["/app/billing/config", "config"],
  ["/app/ops/home", "home"],
  ["/app/ops/testing", "testing"],
  ["/app/ops/review", "review"],
  ["/app/ops/release", "release"],
  ["/app/resources/patients", "patients"],
  ["/app/resources/inventory", "inventory"],
  ["/app/resources/sites", "sites"],
  ["/app/resources/storage", "storage"],
  ["/app/resources/lots", "lots"],
  ["/app/resources/reference", "reference"],
  ["/app/resources", "resources"],
  ["/app/connect/workflows", "workflows"],
  ["/app/connect/instruments", "instruments"],
  ["/app/connect/interfaces", "interfaces"],
  ["/app/connect/messages", "messages"],
  ["/app/connect/mapping", "mapping"],
  ["/app/connect/failures", "failures"],
  ["/app/connect", "connect"],
  ["/app/migration/import", "import"],
  ["/app/migration/mapping", "mapping"],
  ["/app/migration/issues", "issues"],
  ["/app/migration/duplicates", "duplicates"],
  ["/app/migration/reconcile", "reconcile"],
  ["/app/migration/evidence", "evidence"],
  ["/app/migration/templates", "templates"],
  ["/app/migration", "migration"],
  ["/app/design", "design"],
  ["/app/workflows", "design"],
];

function glyphForPath(pathname: string): string | null {
  const match = SUBMODULE_GLYPHS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match?.[1] ?? null;
}

export function ScreenTitle({
  children,
  name,
  id,
  className,
}: {
  children: ReactNode;
  name?: string;
  id?: string;
  className?: string;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const glyph = name ?? glyphForPath(pathname);
  const module = glyph ? null : pathToModuleSlug(pathname);

  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx <= 0) {
      if (pathname !== "/app") navigate("/app");
      return;
    }
    navigate(-1);
  }

  return (
    <h1 id={id} className={["screen-title", className].filter(Boolean).join(" ")}>
      <button type="button" className="screen-back" aria-label="Back to previous screen" onClick={goBack}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10.2 3.1 5 8l5.2 4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="screen-title-icon" aria-hidden="true">
        {module ? <ModuleGlyph slug={module} size={20} /> : <NavIcon name={glyph ?? "overview"} />}
      </span>
      <span className="screen-title-text">{children}</span>
    </h1>
  );
}
