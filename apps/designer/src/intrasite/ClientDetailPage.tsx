import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  createLab,
  getClient,
  type Client,
  type ClientDossier,
  type Lab,
  type ModuleCatalogItem,
  type ModuleChangeRequest,
} from "./api";
import { ClientCases } from "./ClientCases";
import { ModuleCase } from "./ModuleCase";
import { LAB_MODULE_CATALOG, moduleLabel } from "./catalog";

export function IntrasiteClientDetailPage() {
  const { id = "" } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [dossier, setDossier] = useState<ClientDossier | null>(null);
  const [requests, setRequests] = useState<ModuleChangeRequest[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>(LAB_MODULE_CATALOG);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [moduleLab, setModuleLab] = useState<Lab | null>(null);

  async function refresh() {
    const result = await getClient(id);
    setClient(result.client);
    setLabs(result.labs);
    setDossier(result.dossier);
    setRequests(result.requests);
    if (result.moduleCatalog?.length) setCatalog(result.moduleCatalog);
    setModuleLab((current) => current ? result.labs.find((lab) => lab.id === current.id) ?? null : null);
  }

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : "Unable to load client");
    });
  }, [id]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createLab(id, { name });
      setName("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create lab");
    } finally {
      setSaving(false);
    }
  }

  if (!client && !error) {
    return (
      <div className="is-page">
        <p className="is-muted">Loading client…</p>
      </div>
    );
  }

  return (
    <div className="is-page">
      <header className="is-page-header">
        <div>
          <p className="is-eyebrow">
            <Link to="/intrasite">Clients</Link> / account
          </p>
          <h1>{client?.name ?? "Client"}</h1>
          <p>
            Open a case for infrastructure, installation mapping, business contacts, or support.
            Each lab lists its modules and can request additions through dual approval.
          </p>
        </div>
      </header>

      {error ? <p className="is-error">{error}</p> : null}

      {client && dossier ? <ClientCases client={client} labs={labs} dossier={dossier} /> : null}

      <section className="is-panel">
        <h2>Add lab instance</h2>
        <form className="is-inline-form is-lab-form" onSubmit={handleCreate}>
          <label>
            Lab name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="North Lab"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving || !client}>
            {saving ? "Creating…" : "Create lab"}
          </button>
        </form>
      </section>

      <section className="is-panel">
        <h2>Labs</h2>
        {labs.length === 0 ? (
          <p className="is-muted">No labs in this account yet.</p>
        ) : (
          <table className="is-table">
            <thead>
              <tr>
                <th>Lab</th>
                <th>Site</th>
                <th>Status</th>
                <th>Modules</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {labs.map((lab) => (
                <tr key={lab.id}>
                  <td>
                    <strong>{lab.name}</strong>
                    <div className="is-muted">
                      <code>{lab.slug}</code>
                    </div>
                  </td>
                  <td>
                    <code>{lab.siteCode}</code>
                  </td>
                  <td>
                    <span className={`is-pill ${lab.status}`}>{lab.status}</span>
                  </td>
                  <td>
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
                  </td>
                  <td>
                    <button type="button" className="btn" onClick={() => setModuleLab(lab)}>
                      Add or remove modules
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {moduleLab ? (
        <ModuleCase
          clientId={id}
          lab={moduleLab}
          requests={requests}
          catalog={catalog}
          onClose={() => setModuleLab(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
