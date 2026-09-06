import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  getClient,
  type Client,
  type ClientDossier,
  type Lab,
  type ModuleCatalogItem,
  type ModuleChangeRequest,
} from "./api";
import { AccountHistoryPanel } from "./ClientCases";
import { LAB_MODULE_CATALOG, moduleLabel } from "./catalog";
import { ModuleCase } from "./ModuleCase";

export function IntrasiteLabDetailPage() {
  const { id = "", labId = "" } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [dossier, setDossier] = useState<ClientDossier | null>(null);
  const [requests, setRequests] = useState<ModuleChangeRequest[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>(LAB_MODULE_CATALOG);
  const [error, setError] = useState<string | null>(null);
  const [moduleOpen, setModuleOpen] = useState(false);

  async function refresh() {
    const result = await getClient(id);
    const found = result.labs.find((item) => item.id === labId) ?? null;
    setClient(result.client);
    setLab(found);
    setDossier(result.dossier);
    setRequests(result.requests);
    if (result.moduleCatalog?.length) setCatalog(result.moduleCatalog);
  }

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : "Unable to load lab instance");
    });
  }, [id, labId]);

  if (!lab && !error) {
    return (
      <div className="is-page">
        <p className="is-muted">Loading lab instance…</p>
      </div>
    );
  }

  return (
    <div className="is-page">
      <header className="is-page-header is-page-header-split">
        <div>
          <p className="is-eyebrow">
            <Link to="/intrasite">Accounts</Link>
            {" / "}
            <Link to={`/intrasite/clients/${id}`}>{client?.name ?? "Name"}</Link>
            {" / lab instance"}
          </p>
          <h1>{lab?.name ?? "Lab instance"}</h1>
          <p>
            Instance details for this lab, including the modules it runs and the Dev1, Dev2, and QA
            installations it is mapped to.
          </p>
        </div>
        {lab ? (
          <button type="button" className="btn btn-primary" onClick={() => setModuleOpen(true)}>
            Add or remove modules
          </button>
        ) : null}
      </header>

      {error ? <p className="is-error">{error}</p> : null}

      {lab ? (
        <>
          <section className="is-infra-meta">
            <article>
              <span>Site</span>
              <strong>
                <code>{lab.siteCode}</code>
              </strong>
            </article>
            <article>
              <span>Slug</span>
              <strong>
                <code>{lab.slug}</code>
              </strong>
            </article>
            <article>
              <span>Status</span>
              <strong>
                <span className={`is-pill ${lab.status}`}>{lab.status}</span>
              </strong>
            </article>
            <article>
              <span>Account</span>
              <strong>{client?.name}</strong>
            </article>
          </section>

          <section className="is-panel">
            <h2>Modules</h2>
            <div className="is-module-chips">
              {lab.modules.length === 0 ? (
                <span className="is-muted">None</span>
              ) : (
                lab.modules.map((moduleId) => (
                  <span key={moduleId} className="is-module-chip">
                    {moduleLabel(moduleId)}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="is-panel">
            <h2>Installations</h2>
            <p className="is-muted">This lab instance is mapped onto Dev1, Dev2, and QA.</p>
            <div className="is-contact-grid">
              {(dossier?.infrastructure.environments ?? []).map((env) => (
                <article key={env.id} className="is-contact-card">
                  <span>{env.label}</span>
                  <strong>
                    {lab.name} · {env.label}
                  </strong>
                  <small>{env.purpose}</small>
                  <code>{env.host}</code>
                </article>
              ))}
            </div>
          </section>

          {dossier ? (
            <section className="is-panel">
              <h2>Account History</h2>
              <AccountHistoryPanel dossier={dossier} labs={[lab]} lockedLabId={lab.id} />
            </section>
          ) : null}
        </>
      ) : (
        <p className="is-error">Lab instance not found.</p>
      )}

      {moduleOpen && lab ? (
        <ModuleCase
          clientId={id}
          lab={lab}
          requests={requests}
          catalog={catalog}
          onClose={() => setModuleOpen(false)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
