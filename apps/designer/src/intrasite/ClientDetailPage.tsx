import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  createLab,
  getClient,
  type Client,
  type ClientRouting,
  type Lab,
} from "./api";

export function IntrasiteClientDetailPage() {
  const { id = "" } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [routing, setRouting] = useState<ClientRouting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await getClient(id);
    setClient(result.client);
    setLabs(result.labs);
    setRouting(result.routing);
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
            <Link to="/intrasite">Clients</Link> / instance
          </p>
          <h1>{client?.name ?? "Client"}</h1>
          <p>
            Labs in this account are stored in the client’s dedicated database and
            routed as instances of the main tenant.
          </p>
        </div>
      </header>

      {error ? <p className="is-error">{error}</p> : null}

      {client && routing ? (
        <section className="is-meta-grid">
          <article>
            <span>Isolated database</span>
            <strong>
              <code>{client.databaseName}</code>
            </strong>
          </article>
          <article>
            <span>Tenant header</span>
            <strong>
              <code>
                {routing.tenantHeader}: {routing.tenantValue}
              </code>
            </strong>
          </article>
          <article>
            <span>Instance host</span>
            <strong>
              <code>{routing.host}</code>
            </strong>
          </article>
        </section>
      ) : null}

      <section className="is-panel">
        <h2>Add lab instance</h2>
        <form className="is-inline-form" onSubmit={handleCreate}>
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
          <p className="is-muted">No labs in this tenant database yet.</p>
        ) : (
          <table className="is-table">
            <thead>
              <tr>
                <th>Lab</th>
                <th>Slug</th>
                <th>Site code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((lab) => (
                <tr key={lab.id}>
                  <td>{lab.name}</td>
                  <td>
                    <code>{lab.slug}</code>
                  </td>
                  <td>
                    <code>{lab.siteCode}</code>
                  </td>
                  <td>
                    <span className={`is-pill ${lab.status}`}>{lab.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
