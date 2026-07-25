import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { workflowService } from "../platform";

export function LibraryPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const workflows = useMemo(() => {
    void tick;
    return workflowService.list();
  }, [tick]);

  const templates = workflows.filter((w) => w.isTemplate);
  const definitions = workflows.filter((w) => !w.isTemplate);

  const createNew = () => {
    const wf = workflowService.create({
      name: "Untitled Workflow",
      description: "Custom laboratory workflow",
    });
    navigate(`/app/workflows/${wf.id}`);
  };

  const useTemplate = (id: string, name: string) => {
    const instance = workflowService.createFromTemplate(id, `${name}`);
    if (instance) navigate(`/app/workflows/${instance.id}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Workflow Library</h1>
          <p>
            Design, simulate, and publish laboratory workflows across sample lifecycle,
            quality, and compliance — without writing custom code.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={createNew}>
          New workflow
        </button>
      </div>

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>
        Your workflows
      </h2>
      {definitions.length === 0 ? (
        <div className="empty-state">
          <h2>No workflows yet</h2>
          <p>Start from a template or create a blank canvas.</p>
        </div>
      ) : (
        <div className="grid-cards" style={{ marginBottom: "2rem" }}>
          {definitions.map((wf, i) => (
            <article key={wf.id} className="wf-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="wf-card-meta">
                <span className={`badge badge-${wf.status}`}>{wf.status}</span>
                <span className="badge">v{wf.version}</span>
                <span className="badge">{wf.nodes.length} nodes</span>
              </div>
              <h3>{wf.name}</h3>
              <p>{wf.description || "No description"}</p>
              <div className="wf-card-actions">
                <Link className="btn btn-primary" to={`/app/workflows/${wf.id}`}>
                  Open designer
                </Link>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    workflowService.clone(wf.id);
                    setTick((t) => t + 1);
                  }}
                >
                  Clone
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>
        Templates
      </h2>
      <div className="grid-cards">
        {templates.map((wf, i) => (
          <article key={wf.id} className="wf-card" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="wf-card-meta">
              <span className="badge badge-template">template</span>
              <span className="badge">{wf.nodes.length} nodes</span>
            </div>
            <h3>{wf.name}</h3>
            <p>{wf.description}</p>
            <div className="tag-row">
              {wf.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            <div className="wf-card-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => useTemplate(wf.id, wf.name)}
              >
                Use template
              </button>
              <Link className="btn" to={`/app/workflows/${wf.id}`}>
                Preview
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
