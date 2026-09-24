import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  ApiError,
  assignAccountPerson,
  removeAccountPerson,
  type AccountPerson,
  type AccountPersonKind,
  type Client,
} from "./api";

export function AccountPeopleDialog({
  client,
  kind,
  directory,
  onClose,
  onUpdated,
}: {
  client: Client;
  kind: AccountPersonKind;
  directory: AccountPerson[];
  onClose: () => void;
  onUpdated: (client: Client) => void;
}) {
  const titleId = useId();
  const assigned = kind === "internal_resource" ? client.internalResources : client.businessContacts;
  const title = kind === "internal_resource" ? "Internal Resources" : "Business Account Contact";
  const [personId, setPersonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(
    () => directory.filter((person) => !assigned.some((item) => item.id === person.id)),
    [assigned, directory]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setPersonId(available[0]?.id ?? "");
  }, [available]);

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!personId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await assignAccountPerson(client.id, kind, personId);
      onUpdated(result.client);
    } catch (err) {
      setError(messageFrom(err, "Unable to assign"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await removeAccountPerson(client.id, kind, id);
      onUpdated(result.client);
    } catch (err) {
      setError(messageFrom(err, "Unable to remove"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="is-case-overlay" role="presentation" onClick={onClose}>
      <div
        className="is-form-dialog is-people-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="is-case-head">
          <div>
            <p className="is-eyebrow">Accounts</p>
            <h2 id={titleId}>{title}</h2>
            <p>
              {kind === "internal_resource"
                ? `Assign or remove CareScope staff on ${client.name}.`
                : `Assign or remove business contacts on ${client.name}.`}
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>

        <ul className="is-people-list">
          {assigned.length === 0 ? (
            <li className="is-muted">None assigned.</li>
          ) : (
            assigned.map((person) => (
              <li key={person.id}>
                <div>
                  <strong>{person.name}</strong>
                  <small>{person.roles.join(", ")}</small>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void remove(person.id)}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>

        <form className="is-people-assign" onSubmit={(event) => void assign(event)}>
          <label>
            Assign
            <select
              value={personId}
              onChange={(event) => setPersonId(event.target.value)}
              disabled={available.length === 0 || busy}
            >
              {available.length === 0 ? (
                <option value="">Everyone is assigned</option>
              ) : (
                available.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.roles.join(", ")}
                  </option>
                ))
              )}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy || available.length === 0}>
            Assign
          </button>
        </form>
        {error ? <p className="is-error">{error}</p> : null}
      </div>
    </div>
  );
}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
