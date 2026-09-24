import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClient, type Lab, type QueryEnvironment } from "../intrasite/api";
import { demoGetClient } from "../intrasite/demo";
import { LIMS_PASSWORD, LIMS_USERNAME, writeLimsSession } from "../limsSession";

export function LimsEnvironmentPage() {
  const { clientId = "", labId = "", envId = "" } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState(LIMS_USERNAME);
  const [password, setPassword] = useState(LIMS_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<{
    clientName: string;
    labName: string;
    envLabel: string;
    connectionSpeed: string;
    databaseName: string;
    errorLog: string;
    lastBackup: string;
  } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const detail = await loadClient(clientId);
        const lab = detail.labs.find((item) => item.id === labId);
        const env = detail.dossier.infrastructure.environments.find((item) => item.id === envId);
        if (!lab || !env) {
          if (!cancelled) setMissing(true);
          return;
        }
        if (!cancelled) {
          setContext({
            clientName: detail.client.name,
            labName: lab.name,
            envLabel: env.label,
            connectionSpeed: connectionSpeedFor(env.id),
            databaseName: env.databaseName,
            errorLog: env.id === "qa" ? "1 warning · driver retry" : "Clear",
            lastBackup: lastBackupFor(env.id),
          });
        }
      } catch {
        if (!cancelled) setMissing(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId, labId, envId]);

  function signIn(event: FormEvent) {
    event.preventDefault();
    if (username.trim() !== LIMS_USERNAME || password !== LIMS_PASSWORD) {
      setError("Use admin and password to enter this environment.");
      return;
    }
    if (!context) return;
    writeLimsSession({
      username: LIMS_USERNAME,
      clientName: context.clientName,
      labName: context.labName,
      envLabel: context.envLabel,
      connectionSpeed: context.connectionSpeed,
      databaseName: context.databaseName,
      errorLog: context.errorLog,
      lastBackup: context.lastBackup,
    });
    navigate("/app");
  }

  return (
    <div className="is-login">
      <div className="is-login-card">
        <h1>Enter LIMS environment</h1>
        {missing ? (
          <p className="is-error">That client environment could not be found.</p>
        ) : (
          <>
            <p className="is-login-lede">
              {context
                ? `${context.clientName} · ${context.labName} · ${context.envLabel}`
                : "Loading environment…"}
            </p>
            <p className="is-login-hint">
              Sign in with <code>admin</code> / <code>password</code>.
            </p>
            <form onSubmit={signIn}>
              <label>
                User
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {error ? <p className="is-error">{error}</p> : null}
              <button type="submit" className="btn btn-primary" disabled={!context}>
                Sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function connectionSpeedFor(envId: string): string {
  if (envId === "dev2") return "27 ms";
  if (envId === "qa") return "22 ms";
  return "18 ms";
}

function lastBackupFor(envId: string): string {
  if (envId === "dev2") return "2026-09-23T03:40:00.000Z";
  if (envId === "qa") return "2026-09-23T01:05:00.000Z";
  return "2026-09-23T02:15:00.000Z";
}

async function loadClient(clientId: string): Promise<{
  client: { name: string };
  labs: Lab[];
  dossier: { infrastructure: { environments: QueryEnvironment[] } };
}> {
  try {
    return await getClient(clientId);
  } catch {
    return demoGetClient(clientId);
  }
}
