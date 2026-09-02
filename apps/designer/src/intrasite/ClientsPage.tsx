import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, createClient, listClients, type Client } from "./api";

export function IntrasiteClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await listClients();
    setClients(result.clients);
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Unable to load clients");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createClient({ name, slug: slug || undefined });
      setName("");
      setSlug("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="is-page">
      <header className="is-page-header">
        <div>
          <p className="is-eyebrow">Multi-tenancy</p>
          <h1>Client accounts</h1>
          <p>
            Each client is provisioned with an isolated database. Labs live inside that
            tenant database as instances of the main account.
          </p>
        </div>
      </header>

      <section className="is-panel">
        <h2>Provision client</h2>
        <form className="is-inline-form" onSubmit={handleCreate}>
          <label>
            Client name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Apex Diagnostics"
            />
          </label>
          <label>
            Slug
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="apex-diagnostics"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Provisioning…" : "Create client"}
          </button>
        </form>
      </section>

      {error ? <p className="is-error">{error}</p> : null}

      <section className="is-panel">
        <h2>Accounts</h2>
        {loading ? (
          <p className="is-muted">Loading clients…</p>
        ) : clients.length === 0 ? (
          <p className="is-muted">No clients yet. Provision the first tenant above.</p>
        ) : (
          <table className="is-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Slug</th>
                <th>Isolated database</th>
                <th>Labs</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link to={`/intrasite/clients/${client.id}`}>{client.name}</Link>
                  </td>
                  <td>
                    <code>{client.slug}</code>
                  </td>
                  <td>
                    <code>{client.databaseName}</code>
                  </td>
                  <td>{client.labCount}</td>
                  <td>
                    <span className={`is-pill ${client.status}`}>{client.status}</span>
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
