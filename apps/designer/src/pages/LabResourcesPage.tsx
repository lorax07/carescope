import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LAB_RESOURCES, labResourceById, userCanSeeLabResources } from "../labResourceAccess";
import { readLimsSession } from "../limsSession";

function ResourceIcon({ id }: { id: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<string, ReactNode> = {
    patients: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    inventory: (
      <>
        <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
        <path d="M12 12.2 20 8M12 12.2 4 8M12 12.2V20.5" />
      </>
    ),
    sites: (
      <>
        <path d="M4 20.5h16" />
        <path d="M6.5 20.5V8.5L12 4.5l5.5 4v12" />
        <path d="M10 20.5v-4h4v4" />
      </>
    ),
    storage: (
      <>
        <path d="M12 21s6-5.2 6-9.2A6 6 0 0 0 6 11.8C6 15.8 12 21 12 21Z" />
        <circle cx="12" cy="11.5" r="1.6" />
      </>
    ),
    lots: (
      <>
        <path d="M5 7h14M5 12h14M5 17h14" />
        <path d="M8 7v10M16 7v10" />
      </>
    ),
    reference: (
      <>
        <circle cx="7" cy="12" r="2.2" />
        <circle cx="17" cy="7.5" r="2.2" />
        <circle cx="17" cy="16.5" r="2.2" />
        <path d="M9 11.2 14.8 8.4M9 12.8l5.8 2.8" />
      </>
    ),
  };
  return <svg {...common}>{paths[id] ?? paths.reference}</svg>;
}

export function LabResourcesPage() {
  const { resourceId } = useParams();
  const session = readLimsSession();
  if (!userCanSeeLabResources(session?.labId, session?.userId)) {
    return <Navigate to="/app" replace />;
  }
  const resource = resourceId ? labResourceById(resourceId) : null;
  if (resourceId && !resource) return <Navigate to="/app/resources" replace />;

  if (resource) {
    return (
      <div className="lims-page">
        <div className="lims-page-header">
          <div>
            <p className="lims-eyebrow">Lab resources</p>
            <h1>{resource.label}</h1>
            <p className="lims-page-lede">{resource.detail}</p>
          </div>
          <Link to="/app/resources" className="btn">
            All lab resources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lims-page">
      <section className="lab-resources" aria-labelledby="lab-resources-heading">
        <header>
          <span className="lab-resources-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <div>
            <h1 id="lab-resources-heading">Lab Resources</h1>
            <p>One place to manage the things your lab uses and references.</p>
          </div>
        </header>
        <div className="lab-resources-grid">
          {LAB_RESOURCES.map((item) => (
            <Link key={item.id} to={`/app/resources/${item.id}`}>
              <ResourceIcon id={item.id} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
