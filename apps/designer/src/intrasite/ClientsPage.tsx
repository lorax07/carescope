import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AccountPeopleDialog } from "./AccountPeopleDialog";
import {
  ApiError,
  createClient,
  listAccountPeople,
  listClients,
  type AccountPerson,
  type AccountPersonKind,
  type Client,
} from "./api";
import { IntrasiteFormDialog } from "./FormDialog";

export function IntrasiteClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [directory, setDirectory] = useState<{
    internalResources: AccountPerson[];
    businessContacts: AccountPerson[];
  }>({ internalResources: [], businessContacts: [] });
  const [peopleDialog, setPeopleDialog] = useState<{
    clientId: string;
    kind: AccountPersonKind;
  } | null>(null);

  async function refresh() {
    const result = await listClients();
    setClients(result.clients);
  }

  useEffect(() => {
    Promise.all([refresh(), listAccountPeople().then(setDirectory)])
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Unable to load accounts");
      })
      .finally(() => setLoading(false));
  }, []);

  function replaceClient(next: Client) {
    setClients((current) => current.map((client) => (client.id === next.id ? next : client)));
  }

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
                <th>Internal Resources</th>
                <th>Business Account Contact</th>
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
                    <PeopleCell
                      people={client.internalResources}
                      label="Internal resources"
                      onOpen={() => setPeopleDialog({ clientId: client.id, kind: "internal_resource" })}
                    />
                  </td>
                  <td>
                    <PeopleCell
                      people={client.businessContacts}
                      label="Business account contacts"
                      onOpen={() => setPeopleDialog({ clientId: client.id, kind: "business_contact" })}
                    />
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

      {peopleDialog ? (
        <AccountPeopleDialog
          client={clients.find((client) => client.id === peopleDialog.clientId)!}
          kind={peopleDialog.kind}
          directory={
            peopleDialog.kind === "internal_resource"
              ? directory.internalResources
              : directory.businessContacts
          }
          onClose={() => setPeopleDialog(null)}
          onUpdated={replaceClient}
        />
      ) : null}

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

function PeopleCell({
  people,
  label,
  onOpen,
}: {
  people: AccountPerson[];
  label: string;
  onOpen: () => void;
}) {
  const names = people.map((person) => person.name).join(", ");
  return (
    <button type="button" className="is-people-link" onClick={onOpen} aria-label={label}>
      {names || "Assign"}
    </button>
  );
}
