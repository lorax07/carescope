import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, createClient, listClients, type Client } from "./api";
import { IntrasiteFormDialog } from "./FormDialog";

export function IntrasiteClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await listClients();
    setClients(result.clients);
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Unable to load accounts");
      })
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setName("");
    setDialogError(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    setSaving(true);
    setDialogError(null);
    try {
      await createClient({ name });
      setName("");
      setCreateOpen(false);
      await refresh();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="is-page">
      <header className="is-page-header">
        <div>
          <p className="is-eyebrow">Multi-tenancy</p>
          <h1>Accounts</h1>
          <p>
            Each account is provisioned with its own installations. Labs live inside that
            account as instances of the main tenant.
          </p>
        </div>
      </header>

      <section className="is-panel">
        <div className="is-panel-head">
          <div>
            <h2>Provision account</h2>
            <p className="is-muted">
              Use the create-account menu to open a dialog and provision a new tenant.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Create new account
          </button>
        </div>
      </section>

      {error ? <p className="is-error">{error}</p> : null}

      <section className="is-panel">
        <h2>Accounts</h2>
        {loading ? (
          <p className="is-muted">Loading accounts…</p>
        ) : clients.length === 0 ? (
          <p className="is-muted">No accounts yet. Use Create new account to provision the first tenant.</p>
        ) : (
          <table className="is-table">
            <thead>
              <tr>
                <th>Name</th>
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

      {createOpen ? (
        <IntrasiteFormDialog
          eyebrow="Accounts"
          title="Create new account"
          description="Name the tenant. Intrasite assigns the slug and isolated database from that name."
          submitLabel="Create account"
          savingLabel="Provisioning…"
          saving={saving}
          error={dialogError}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        >
          <label>
            Account name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
              placeholder="Apex Diagnostics"
            />
          </label>
        </IntrasiteFormDialog>
      ) : null}
    </div>
  );
}
