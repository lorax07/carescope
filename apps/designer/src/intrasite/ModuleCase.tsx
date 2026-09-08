import { useState } from "react";
import {
  ApiError,
  approveModuleRequest,
  createModuleRequest,
  removeLabModule,
  type Lab,
  type ModuleCatalogItem,
  type ModuleChangeRequest,
} from "./api";
import { ApprovalMap } from "./ApprovalMap";
import { moduleLabel } from "./catalog";

export function ModuleCase({
  clientId,
  lab,
  requests,
  catalog,
  onClose,
  onChanged,
}: {
  clientId: string;
  lab: Lab;
  requests: ModuleChangeRequest[];
  catalog: ModuleCatalogItem[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const labRequests = requests.filter((item) => item.labId === lab.id);
  const activeAdd =
    labRequests.find((item) => item.action === "add" && item.step !== "provisioned") ?? null;
  const pendingIds = new Set(
    labRequests.filter((item) => item.action === "add" && item.step !== "provisioned").map((item) => item.moduleId)
  );
  const available = catalog.filter((item) => !lab.modules.includes(item.id));

  async function run(key: string, work: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await work();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update modules");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="is-case-overlay" role="presentation" onClick={onClose}>
      <div
        className="is-case"
        role="dialog"
        aria-labelledby="module-case-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="is-case-head">
          <div>
            <p className="is-eyebrow">Lab modules</p>
            <h2 id="module-case-title">Add or remove modules</h2>
            <p>
              {lab.name} · <code>{lab.siteCode}</code>
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>

        <ApprovalMap step={activeAdd?.step ?? null} moduleLabel={activeAdd?.moduleLabel} />

        {error ? <p className="is-error">{error}</p> : null}

        {activeAdd ? (
          <div className="is-approval-actions">
            <p>
              <strong>{activeAdd.moduleLabel}</strong> is waiting in the approval chain. Requested by{" "}
              {activeAdd.requestedBy}.
            </p>
            {activeAdd.step === "requested" ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy !== null}
                onClick={() =>
                  run("secondary", async () => {
                    await approveModuleRequest(clientId, activeAdd.id, "secondary");
                  })
                }
              >
                {busy === "secondary" ? "Recording…" : "Record secondary approval"}
              </button>
            ) : null}
            {activeAdd.step === "secondary" ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy !== null}
                onClick={() =>
                  run("business", async () => {
                    await approveModuleRequest(clientId, activeAdd.id, "business");
                  })
                }
              >
                {busy === "business" ? "Recording…" : "Record business contact approval"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="is-muted">
            Open an add request below to start the chain. The map at the top tracks that case from
            request through both approvals to provision.
          </p>
        )}

        <section>
          <h3>Installed</h3>
          {lab.modules.length === 0 ? (
            <p className="is-muted">This lab has no modules installed.</p>
          ) : (
            <ul className="is-module-list">
              {lab.modules.map((id) => (
                <li key={id}>
                  <span>{moduleLabel(id)}</span>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`remove-${id}`, async () => {
                        await removeLabModule(clientId, lab.id, id);
                      })
                    }
                  >
                    {busy === `remove-${id}` ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>Add a module</h3>
          {available.length === 0 ? (
            <p className="is-muted">Every catalog module is already installed or in review.</p>
          ) : (
            <ul className="is-module-list">
              {available.map((item) => {
                const pending = pendingIds.has(item.id);
                return (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy !== null || pending}
                      onClick={() =>
                        run(`add-${item.id}`, async () => {
                          await createModuleRequest(clientId, lab.id, {
                            moduleId: item.id,
                            action: "add",
                          });
                        })
                      }
                    >
                      {pending ? "In approval" : busy === `add-${item.id}` ? "Requesting…" : "Request add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
