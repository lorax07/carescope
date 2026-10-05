import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { ApiError, setLabAdministrator, type AccountPerson, type Lab } from "./api";

export function LabAdministratorDialog({
  clientId,
  lab,
  directory,
  onClose,
  onUpdated,
}: {
  clientId: string;
  lab: Lab;
  directory: AccountPerson[];
  onClose: () => void;
  onUpdated: (lab: Lab) => void;
}) {
  const titleId = useId();
  const assigned = directory.find((person) => person.name === lab.administrator) ?? null;
  const [personId, setPersonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = useMemo(
    () => directory.filter((person) => person.id !== assigned?.id),
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
      const result = await setLabAdministrator(clientId, lab.id, personId);
      onUpdated(result.lab);
    } catch (err) {
      setError(messageFrom(err, "Unable to assign"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const result = await setLabAdministrator(clientId, lab.id, null);
      onUpdated(result.lab);
    } catch (err) {
      setError(messageFrom(err, "Unable to remove"));
    } finally {
      setBusy(false);
    }
  }

  const shownName = assigned?.name ?? (lab.administrator && lab.administrator !== "Unassigned" ? lab.administrator : "");

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
            <p className="is-eyebrow">Lab</p>
            <h2 id={titleId}>Lab Administrator</h2>
            <p>Assign or remove the business contact for {lab.name}.</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>

        <ul className="is-people-list">
          {!shownName ? (
            <li className="is-muted">None assigned.</li>
          ) : (
            <li>
              <div>
                <strong>{shownName}</strong>
                <small>{assigned?.roles.join(", ") || "Business contact"}</small>
              </div>
              <button type="button" className="btn" disabled={busy} onClick={() => void remove()}>
                Remove
              </button>
            </li>
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
