import { FormEvent, useMemo, useState } from "react";
import {
  queryClientDatabase,
  type Client,
  type ClientDossier,
  type InstallationNode,
  type Lab,
  type QueryEnvironment,
  type QueryResult,
} from "./api";

export type ClientCaseId =
  | "infrastructure"
  | "architecture"
  | "contacts"
  | "support";

const CASES: Array<{
  id: ClientCaseId;
  label: string;
  blurb: string;
}> = [
  {
    id: "infrastructure",
    label: "Backend Infrastructure",
    blurb: "System backend, database information, and a query IDE",
  },
  {
    id: "architecture",
    label: "Installation Architecture",
    blurb: "Mapping of the lab installation",
  },
  {
    id: "contacts",
    label: "Business contacts",
    blurb: "Business contacts and roles",
  },
  {
    id: "support",
    label: "Account History",
    blurb: "Overall account history, filterable by lab or staff",
  },
];

function CaseIcon({ id }: { id: ClientCaseId }) {
  if (id === "infrastructure") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="5" y="7" width="22" height="18" rx="3" fill="#1B6EF3" />
        <path d="M9 13h14M9 17h10M9 21h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "architecture") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle cx="16" cy="7" r="3" fill="#1B6EF3" />
        <circle cx="7" cy="24" r="3" fill="#1B6EF3" />
        <circle cx="25" cy="24" r="3" fill="#1B6EF3" />
        <path d="M16 10v6M16 16L8 22M16 16l8 6" stroke="#1B6EF3" strokeWidth="1.8" />
      </svg>
    );
  }
  if (id === "contacts") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="#1B6EF3" />
        <circle cx="22" cy="13" r="3" fill="#7aa7f7" />
        <path d="M5 24c1.2-4 4-6 7-6s5.8 2 7 6M19 24c.4-2.2 1.8-3.8 4-4.2 2.4.3 3.8 1.8 4.2 4.2" fill="#1B6EF3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="6" y="6" width="20" height="20" rx="4" fill="#1B6EF3" />
      <path d="M11 12h10M11 16h10M11 20h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArchitectureMap({ nodes }: { nodes: InstallationNode[] }) {
  const width = Math.max(520, ...nodes.map((node) => node.x + 180));
  const height = Math.max(380, ...nodes.map((node) => node.y + 80));
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

  return (
    <div className="is-arch-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="is-arch-svg" role="img" aria-label="Lab installation map">
        {nodes.flatMap((node) =>
          node.connectsTo.flatMap((targetId) => {
            const target = byId[targetId];
            if (!target) return [];
            return [
              <line
                key={`${node.id}-${targetId}`}
                x1={node.x + 70}
                y1={node.y + 18}
                x2={target.x + 70}
                y2={target.y + 18}
                stroke="#94a3b8"
                strokeWidth="1.6"
              />,
            ];
          })
        )}
        {nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <rect width="140" height="36" rx="8" className={`is-arch-node ${node.kind}`} />
            <text x="70" y="23" textAnchor="middle" className={`is-arch-label ${node.kind}`}>
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function InfrastructureCase({
  client,
  dossier,
}: {
  client: Client;
  dossier: ClientDossier;
}) {
  const [sql, setSql] = useState("SHOW TABLES");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [environment, setEnvironment] = useState<QueryEnvironment["id"]>("dev1");
  const infra = dossier.infrastructure;
  const environments = infra.environments ?? [];
  const selected = environments.find((item) => item.id === environment) ?? environments[0];

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      setResult(await queryClientDatabase(client.id, sql, environment));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="is-case-body is-infra-layout">
      <aside className="is-env-picker">
        <h3>Environment</h3>
        <p className="is-muted">Choose which installation to query.</p>
        <div className="is-env-list">
          {environments.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`is-env-btn${environment === item.id ? " active" : ""}`}
              onClick={() => {
                setEnvironment(item.id);
                setResult(null);
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.purpose}</span>
            </button>
          ))}
        </div>
      </aside>
      <div>
      <div className="is-infra-meta">
        <article>
          <span>Engine</span>
          <strong>{infra.engine}</strong>
        </article>
        <article>
          <span>Database</span>
          <strong>
            <code>{selected?.databaseName ?? infra.databaseName}</code>
          </strong>
        </article>
        <article>
          <span>Host</span>
          <strong>
            <code>{selected?.host ?? infra.host}</code>
          </strong>
        </article>
        <article>
          <span>Region</span>
          <strong>{infra.region}</strong>
        </article>
      </div>
      <form className="is-sql-ide" onSubmit={run}>
        <div className="is-sql-head">
          <h3>Database IDE</h3>
          <div className="is-sql-chips">
            {["SHOW TABLES", "SELECT * FROM labs", "SELECT * FROM samples", "SELECT * FROM instruments", "SELECT * FROM contacts"].map(
              (example) => (
                <button key={example} type="button" className="is-chip-btn" onClick={() => setSql(example)}>
                  {example}
                </button>
              )
            )}
          </div>
        </div>
        <textarea
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          spellCheck={false}
          aria-label="SQL query"
        />
        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? "Running…" : "Run query"}
        </button>
      </form>
      {error ? <p className="is-error">{error}</p> : null}
      {result ? (
        <table className="is-table">
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <tr key={index}>
                {result.columns.map((column) => (
                  <td key={column}>{String(row[column] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="is-muted">Run SHOW TABLES or SELECT * FROM a known table to inspect this environment.</p>
      )}
      </div>
    </div>
  );
}

export function AccountHistoryPanel({
  dossier,
  labs,
  lockedLabId,
}: {
  dossier: ClientDossier;
  labs: Lab[];
  lockedLabId?: string;
}) {
  const [labId, setLabId] = useState(lockedLabId ?? "all");
  const [staff, setStaff] = useState("all");
  const staffNames = useMemo(
    () => [...new Set(dossier.support.map((ticket) => ticket.staff))],
    [dossier.support]
  );
  const tickets = dossier.support.filter((ticket) => {
    const labOk = lockedLabId
      ? ticket.labId === lockedLabId
      : labId === "all" || ticket.labId === labId || (labId === "account" && !ticket.labId);
    const staffOk = staff === "all" || ticket.staff === staff;
    return labOk && staffOk;
  });

  return (
    <div className="is-case-body">
      <div className="is-filter-row">
        {lockedLabId ? null : (
        <label>
          Lab
          <select value={labId} onChange={(event) => setLabId(event.target.value)}>
            <option value="all">All labs</option>
            <option value="account">Account-wide</option>
            {labs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
          </select>
        </label>
        )}
        <label>
          Staff who helped
          <select value={staff} onChange={(event) => setStaff(event.target.value)}>
            <option value="all">All staff</option>
            {staffNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tickets.length === 0 ? (
        <p className="is-muted">No account history matches those filters.</p>
      ) : (
        <table className="is-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Lab</th>
              <th>Staff</th>
              <th>Opened</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <strong>{ticket.title}</strong>
                  <div className="is-muted">{ticket.summary}</div>
                </td>
                <td>{ticket.labName ?? "Account"}</td>
                <td>{ticket.staff}</td>
                <td>{new Date(ticket.openedAt).toLocaleDateString()}</td>
                <td>
                  <span className={`is-pill ${ticket.status === "open" ? "suspended" : "active"}`}>
                    {ticket.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ClientCases({
  client,
  labs,
  dossier,
}: {
  client: Client;
  labs: Lab[];
  dossier: ClientDossier;
}) {
  const [open, setOpen] = useState<ClientCaseId | null>(null);
  const active = CASES.find((item) => item.id === open);

  return (
    <section>
      <div className="is-icon-grid" role="list">
        {CASES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={`is-icon-tile${open === item.id ? " active" : ""}`}
            onClick={() => setOpen((current) => (current === item.id ? null : item.id))}
            aria-expanded={open === item.id}
          >
            <span className="is-icon-mark">
              <CaseIcon id={item.id} />
            </span>
            <strong>{item.label}</strong>
            <span>{item.blurb}</span>
          </button>
        ))}
      </div>

      {active && open === "infrastructure" ? (
        <section className="is-panel is-case-panel">
          <h2>{active.label}</h2>
          <InfrastructureCase client={client} dossier={dossier} />
        </section>
      ) : null}

      {active && open === "architecture" ? (
        <section className="is-panel is-case-panel">
          <h2>{active.label}</h2>
          <p className="is-muted">
            How this account’s labs map across the Dev1, Dev2, and QA installations.
          </p>
          <ArchitectureMap nodes={dossier.architecture} />
        </section>
      ) : null}

      {active && open === "contacts" ? (
        <section className="is-panel is-case-panel">
          <h2>{active.label}</h2>
          <div className="is-contact-grid">
            {dossier.contacts.map((contact) => (
              <article key={contact.id} className="is-contact-card">
                <span>{contact.role}</span>
                <strong>{contact.name}</strong>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
                <small>{contact.phone}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {active && open === "support" ? (
        <section className="is-panel is-case-panel">
          <h2>{active.label}</h2>
          <AccountHistoryPanel dossier={dossier} labs={labs} />
        </section>
      ) : null}
    </section>
  );
}
