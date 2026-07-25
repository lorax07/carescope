import { MODULE_INTEGRATIONS, SYSTEM_EVENT_CATALOG } from "@carescope/workflow-core";
import { workflowService } from "../platform";

export function CatalogPage() {
  const plugins = workflowService.nodePlugins();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="lims-eyebrow">Integration map</p>
          <h1>LIMS module catalog</h1>
          <p>
            Events, actions, and entity types exposed by each laboratory module for
            workflow automation and system integration.
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)" }}>
        Modules ({MODULE_INTEGRATIONS.length})
      </h2>
      <div className="modules-grid" style={{ marginBottom: "2rem" }}>
        {MODULE_INTEGRATIONS.map((m, i) => (
          <article key={m.module} className="module-card" style={{ animationDelay: `${i * 20}ms` }}>
            <h3>{m.label}</h3>
            <p>{m.description}</p>
            <div className="tag-row">
              {m.events.slice(0, 3).map((e) => (
                <span key={e} className="tag">
                  {e}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)" }}>
        Node types ({plugins.length})
      </h2>
      <div className="modules-grid" style={{ marginBottom: "2rem" }}>
        {plugins.map((p) => (
          <article key={p.type} className="module-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: p.color ?? "#2dd4a8",
                }}
              />
              <h3 style={{ margin: 0 }}>{p.label}</h3>
            </div>
            <p>{p.description}</p>
            <span className="badge">{p.category}</span>
          </article>
        ))}
      </div>

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)" }}>
        System events ({SYSTEM_EVENT_CATALOG.length})
      </h2>
      <div className="modules-grid">
        {SYSTEM_EVENT_CATALOG.map((e) => (
          <article key={e.type} className="module-card">
            <h3>{e.label}</h3>
            <p>{e.description}</p>
            <span className="tag">{e.type}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
