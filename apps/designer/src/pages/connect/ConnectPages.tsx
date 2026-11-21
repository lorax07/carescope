import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SectionTabStrip, useSectionTabs } from "../../sectionTabs";
import { currentLabId, currentLabName, labIdFromSite } from "../../storageScope";
import { ModuleHeader } from "../ModuleHeader";
import {
  APP_CONNECTORS,
  CONNECTOR_CATEGORIES,
  CONNECT_TARGETS,
  INSTRUMENT_CATALOG,
  INSTRUMENT_CATEGORIES,
  attentionMessages,
  interfaceHealth,
  matchesQuery,
  type AppConnector,
  type ConnectMessage,
  type MessageStatus,
} from "./connectModel";
import {
  quarantineFile,
  replaceToken,
  replayMessage,
  retryMessage,
  selectMessage,
  setTransformTarget,
  startAppConnection,
  startInstrumentIntegration,
  useConnect,
} from "./connectStore";

const INTERFACE_TABS = [
  { to: "/app/connect/interfaces", label: "Interfaces", key: "interfaces" },
  { to: "/app/connect/messages", label: "Messages", key: "messages" },
  { to: "/app/connect/mapping", label: "Mapping", key: "mapping" },
  { to: "/app/connect/failures", label: "Attention", key: "failures" },
] as const;

const COPY: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: "Sequence Connect",
    subtitle: "What happened to every message, and what still needs a person.",
  },
  interfaces: {
    title: "Interfaces",
    subtitle: "HL7, FHIR, REST, webhooks, the instrument gateway, file drops, and known apps.",
  },
  messages: {
    title: "Message audit",
    subtitle: "Search the trail. Each message keeps every attempt.",
  },
  mapping: {
    title: "Transformation",
    subtitle: "Reusable maps from a partner field to a Sequence field.",
  },
  failures: {
    title: "Needs attention",
    subtitle: "Failed and retrying messages, with the next action that can actually clear them.",
  },
  instruments: {
    title: "Instrument integration",
    subtitle: "Analyzers connected to this lab instance.",
  },
};

function Pill({ tone, children }: { tone: string; children: string }) {
  return <span className={`migration-pill is-${tone}`}>{children}</span>;
}

function statusTone(status: MessageStatus): string {
  if (status === "delivered") return "ok";
  if (status === "retrying") return "warn";
  if (status === "held") return "wait";
  return "block";
}

function statusLabel(status: MessageStatus): string {
  if (status === "delivered") return "Delivered";
  if (status === "retrying") return "Retrying";
  if (status === "held") return "Held";
  return "Failed";
}

function InterfaceTabs({ current }: { current: string }) {
  return (
    <nav className="subtab01 connect-interface-tabs" role="tablist" aria-label="Interface pages">
      {INTERFACE_TABS.map((tab) => (
        <Link key={tab.key} to={tab.to} role="tab" aria-selected={tab.key === current} className={tab.key === current ? "is-on" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function MessageActions({ message }: { message: ConnectMessage }) {
  return (
    <div className="migration-actions">
      {message.credential && !message.recoverable ? (
        <button type="button" className="btn" onClick={() => replaceToken(message.id)}>Replace token</button>
      ) : null}
      {message.interfaceId === "ref-file" && message.status === "failed" ? (
        <button type="button" className="btn" onClick={() => quarantineFile(message.id)}>Quarantine file</button>
      ) : null}
      <button type="button" className="btn btn-primary" onClick={() => retryMessage(message.id)}>Retry now</button>
      <button type="button" className="btn" onClick={() => replayMessage(message.id)}>Replay</button>
    </div>
  );
}

function Trail({ message }: { message: ConnectMessage }) {
  return (
    <ol className="connect-trail">
      {message.steps.map((item, index) => (
        <li key={`${item.label}-${index}`} className={`is-${item.state}`}>
          <div>
            <strong>{item.label}</strong>
            <span>{item.at}</span>
          </div>
          <p>{item.detail}</p>
        </li>
      ))}
    </ol>
  );
}

function MessageDetail({ messageId }: { messageId: string }) {
  const state = useConnect();
  const message = state.messages.find((item) => item.id === messageId) ?? state.messages[0];
  const channel = state.interfaces.find((item) => item.id === message.interfaceId);
  if (!message) return null;
  return (
    <article className="lims-panel migration-panel connect-detail">
      <div className="migration-panel-head">
        <div>
          <Pill tone={statusTone(message.status)}>{statusLabel(message.status)}</Pill>
          <h2>{message.id} · {message.messageType}</h2>
          <p>{channel?.name} · {channel?.kind} · {message.summary}</p>
        </div>
        <MessageActions message={message} />
      </div>
      {message.attention ? <p className="connect-attention">{message.attention}</p> : null}
      {message.action ? <p className="connect-action">{message.action}</p> : null}
      <h3>What happened</h3>
      <Trail message={message} />
      {message.mapped.length ? (
        <>
          <h3>Fields written</h3>
          <table className="lims-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Sequence</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {message.mapped.map((row) => (
                <tr key={row.source}>
                  <td>{row.source}</td>
                  <td>{row.target}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <h3>Payload</h3>
      <pre className="migration-evidence">{message.payload}</pre>
    </article>
  );
}

function OverviewView() {
  const state = useConnect();
  const attention = attentionMessages(state.messages);
  const retrying = state.messages.filter((message) => message.status === "retrying").length;
  const delivered = state.messages.filter((message) => message.status === "delivered").length;
  const held = state.messages.filter((message) => message.status === "held").length;
  return (
    <>
      <section className="lims-kpi-row" aria-label="Integration status">
        <article className="lims-kpi"><span>Needs attention</span><strong>{attention.length}</strong><small>Failed or waiting on a retry</small></article>
        <article className="lims-kpi"><span>Retrying</span><strong>{retrying}</strong><small>Payload unchanged, destination did not reject it</small></article>
        <article className="lims-kpi"><span>Delivered</span><strong>{delivered}</strong><small>Accepted by Sequence or the partner</small></article>
        <article className="lims-kpi"><span>Held</span><strong>{held}</strong><small>Stopped before anything was sent</small></article>
      </section>
      <section className="lims-panel migration-panel">
        <h2>What needs a person</h2>
        <ul className="connect-attention-list">
          {attention.map((message) => {
            const channel = state.interfaces.find((item) => item.id === message.interfaceId);
            return (
              <li key={message.id}>
                <div>
                  <Pill tone={statusTone(message.status)}>{statusLabel(message.status)}</Pill>
                  <strong>{message.id} · {channel?.name}</strong>
                  <p>{message.attention}</p>
                  <p>{message.action}</p>
                </div>
                <Link to="/app/connect/messages" onClick={() => selectMessage(message.id)}>Open trail</Link>
              </li>
            );
          })}
          {attention.length === 0 ? <li>Nothing is waiting. Delivered messages stay in the audit.</li> : null}
        </ul>
      </section>
    </>
  );
}

function ConnectorDialog({ connector, onClose, onStarted }: { connector: AppConnector; onClose: () => void; onStarted: (interfaceId: string) => void }) {
  const state = useConnect();
  const existing = state.connections.find((item) => item.connectorId === connector.id);
  const [account, setAccount] = useState(existing?.account ?? "");
  const [done, setDone] = useState(Boolean(existing));
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = account.trim();

  useEffect(() => {
    if (!done) inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, onClose]);

  function start() {
    if (!trimmed || existing) return;
    startAppConnection(connector.id, trimmed);
    setDone(true);
    onStarted(`app-${connector.id}`);
  }

  return (
    <div className="lims-modal-backdrop" onClick={onClose}>
      <div className="lims-modal connect-connector-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-app-title" onClick={(event) => event.stopPropagation()}>
        <div className="lims-dialog-bar">
          <div>
            <p className="lims-eyebrow">{connector.category}</p>
            <h2 id="connect-app-title">{done ? `${connector.name} API connected` : `Connect ${connector.name}`}</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="connect-connector-body">
          <p>{connector.summary}</p>
          <p>
            {connector.kind} · {connector.direction}. {trimmed
              ? `Sequence calls ${connector.endpoint.replaceAll("{account}", trimmed)}.`
              : `Enter the ${connector.accountLabel.toLowerCase()} and Sequence will call the ${connector.name} API.`}
          </p>
          {done ? (
            <p className="connect-action">The handshake is in the message audit, and {connector.name} is in the channel list for {trimmed}.</p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                start();
              }}
            >
              <label className="migration-select">
                {connector.accountLabel}
                <input ref={inputRef} aria-label={connector.accountLabel} value={account} placeholder={connector.accountHint} onChange={(event) => setAccount(event.target.value)} />
              </label>
              <div className="connect-connector-actions">
                <button type="submit" className="btn btn-primary" disabled={!trimmed}>Start API connection</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function InterfacesView() {
  const state = useConnect();
  const [selected, setSelected] = useState(state.interfaces[1]?.id ?? state.interfaces[0].id);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const channel = state.interfaces.find((item) => item.id === selected) ?? state.interfaces[0];
  const health = interfaceHealth(state.messages, state.transforms, channel);
  const recent = state.messages.filter((message) => message.interfaceId === channel.id);
  const needle = query.trim().toLowerCase();
  const openConnector = APP_CONNECTORS.find((item) => item.id === openId) ?? null;
  const closeConnector = useCallback(() => setOpenId(null), []);
  return (
    <>
    <div className="connect-split">
      <section className="lims-panel migration-panel">
        <h2>Channels</h2>
        <ul className="connect-channel-list">
          {state.interfaces.map((item) => {
            const itemHealth = interfaceHealth(state.messages, state.transforms, item);
            return (
              <li key={item.id}>
                <button type="button" className={item.id === channel.id ? "is-current" : undefined} aria-pressed={item.id === channel.id} onClick={() => setSelected(item.id)}>
                  <strong>{item.name}</strong>
                  <span>{item.kind} · {item.direction}</span>
                  <Pill tone={itemHealth.tone}>{itemHealth.label}</Pill>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="lims-panel migration-panel">
        <Pill tone={health.tone}>{health.label}</Pill>
        <h2>{channel.name}</h2>
        <p>{channel.note}</p>
        <p>{channel.endpoint}</p>
        <p className="connect-attention">{health.detail}</p>
        <table className="lims-table">
          <thead>
            <tr>
              <th>Message</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((message) => (
              <tr key={message.id}>
                <td><Link to="/app/connect/messages" onClick={() => selectMessage(message.id)}>{message.id}</Link></td>
                <td>{message.messageType}</td>
                <td><Pill tone={statusTone(message.status)}>{statusLabel(message.status)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
    <section className="lims-panel migration-panel connect-catalog" aria-labelledby="app-connectors-heading">
      <div className="migration-panel-head">
        <div>
          <h2 id="app-connectors-heading">App connectors</h2>
          <p>Known apps, grouped by what they do. Open one to start its API connection.</p>
        </div>
        <label className="migration-select">
          Find an app
          <input aria-label="Find an app" value={query} placeholder="Slack, CRM, email" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      {CONNECTOR_CATEGORIES.map((category) => {
        const apps = APP_CONNECTORS.filter((item) => item.category === category && (!needle || `${item.name} ${item.category} ${item.summary} ${item.kind}`.toLowerCase().includes(needle)));
        if (!apps.length) return null;
        return (
          <div className="connect-catalog-group" key={category}>
            <h3>{category}</h3>
            <ul>
              {apps.map((app) => {
                const connection = state.connections.find((item) => item.connectorId === app.id);
                return (
                  <li key={app.id}>
                    <button type="button" onClick={() => setOpenId(app.id)}>
                      <strong>{app.name}</strong>
                      <span>{app.kind} · {app.summary}</span>
                      {connection ? <Pill tone="ok">{`Connected · ${connection.account}`}</Pill> : <span className="connect-catalog-start">Start API connection</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {needle && !APP_CONNECTORS.some((item) => `${item.name} ${item.category} ${item.summary} ${item.kind}`.toLowerCase().includes(needle)) ? <p>No app matches that search.</p> : null}
    </section>
    {openConnector ? (
      <ConnectorDialog
        key={openConnector.id}
        connector={openConnector}
        onClose={closeConnector}
        onStarted={(interfaceId) => setSelected(interfaceId)}
      />
    ) : null}
    </>
  );
}

function MessagesView() {
  const state = useConnect();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | MessageStatus>("all");
  const rows = useMemo(() => state.messages.filter((message) => {
    const channel = state.interfaces.find((item) => item.id === message.interfaceId);
    if (status !== "all" && message.status !== status) return false;
    return matchesQuery(message, channel?.name ?? "", query);
  }), [state, query, status]);
  const selected = rows.find((message) => message.id === state.selectedId) ?? rows[0];
  return (
    <div className="connect-split connect-audit">
      <section className="lims-panel migration-panel">
        <label className="migration-select">
          Search messages
          <input aria-label="Search messages" value={query} placeholder="Id, MRN, error, payload" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="migration-filters" role="group" aria-label="Message status">
          {(["all", "failed", "retrying", "held", "delivered"] as const).map((key) => (
            <button key={key} type="button" className={status === key ? "is-current" : undefined} aria-pressed={status === key} onClick={() => setStatus(key)}>
              {key === "all" ? "All" : statusLabel(key)}
            </button>
          ))}
        </div>
        <ul className="connect-channel-list">
          {rows.map((message) => {
            const channel = state.interfaces.find((item) => item.id === message.interfaceId);
            return (
              <li key={message.id}>
                <button type="button" className={selected?.id === message.id ? "is-current" : undefined} aria-pressed={selected?.id === message.id} onClick={() => selectMessage(message.id)}>
                  <strong>{message.id} · {message.messageType}</strong>
                  <span>{channel?.name} · {message.summary}</span>
                  <Pill tone={statusTone(message.status)}>{statusLabel(message.status)}</Pill>
                </button>
              </li>
            );
          })}
          {rows.length === 0 ? <li>No messages match that search.</li> : null}
        </ul>
      </section>
      {selected ? <MessageDetail messageId={selected.id} /> : null}
    </div>
  );
}

function MappingView() {
  const state = useConnect();
  const [interfaceId, setInterfaceId] = useState("fhir-patient");
  const rows = state.transforms.filter((row) => row.interfaceId === interfaceId);
  const channel = state.interfaces.find((item) => item.id === interfaceId);
  return (
    <section className="lims-panel migration-panel">
      <div className="migration-panel-head">
        <div>
          <h2>{channel?.name}</h2>
          <p>{channel?.kind}. This map is reused the next time the same profile arrives.</p>
        </div>
        <label className="migration-select">
          Interface
          <select aria-label="Interface map" value={interfaceId} onChange={(event) => setInterfaceId(event.target.value)}>
            {state.interfaces.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <table className="lims-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Sample</th>
            <th>Sequence field</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.target ? undefined : "is-diff"}>
              <td>{row.source}</td>
              <td>{row.sample}</td>
              <td>
                <select aria-label={`Sequence field for ${row.source}`} value={row.target} onChange={(event) => setTransformTarget(row.id, event.target.value)}>
                  <option value="">Leave unmapped</option>
                  {CONNECT_TARGETS.map((field) => (
                    <option key={field.id} value={field.id}>{field.label}</option>
                  ))}
                </select>
              </td>
              <td>{row.note || (row.target ? "" : "Unmapped. The message stays held.")}</td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={4}>This interface has no map rows yet.</td></tr> : null}
        </tbody>
      </table>
      <p>{rows.some((row) => !row.target) ? "Unmapped fields hold the message until someone maps them." : "Every field on this profile has a Sequence field."}</p>
    </section>
  );
}

function FailuresView() {
  const state = useConnect();
  const rows = state.messages.filter((message) => message.status !== "delivered");
  return (
    <section className="lims-panel migration-panel">
      <h2>Open messages</h2>
      <ul className="connect-failure-list">
        {rows.map((message) => {
          const channel = state.interfaces.find((item) => item.id === message.interfaceId);
          return (
            <li key={message.id}>
              <div>
                <Pill tone={statusTone(message.status)}>{statusLabel(message.status)}</Pill>
                <strong>{message.id} · {channel?.kind} · {message.messageType}</strong>
                <p>{message.attention}</p>
                <p>{message.action}</p>
                <Link to="/app/connect/messages" onClick={() => selectMessage(message.id)}>Open the full trail</Link>
              </div>
              <MessageActions message={message} />
            </li>
          );
        })}
        {rows.length === 0 ? <li>Every message has delivered. The audit still has the attempts.</li> : null}
      </ul>
    </section>
  );
}

function InstrumentsView() {
  const state = useConnect();
  const labId = currentLabId();
  const labName = currentLabName() || "this lab instance";
  const rows = labId ? state.instruments.filter((item) => item.labId === labId) : state.instruments;
  return (
    <section className="lims-panel migration-panel">
      <h2>Connected to {labName}</h2>
      <p>{rows.length ? "These analyzers already have a gateway on this instance." : "No analyzer is connected to this lab instance yet."}</p>
      <table className="lims-table">
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Category</th>
            <th>Protocol</th>
            <th>Site</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.protocol}</td>
              <td>{item.site}</td>
              <td><Pill tone={item.status === "Online" ? "ok" : "wait"}>{item.status}</Pill></td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={5}>Use Add connection to start an integration.</td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}

export function InstrumentCatalogScreen() {
  const state = useConnect();
  const labId = currentLabId();
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [site, setSite] = useState(currentLabName() || "North Lab");
  const [started, setStarted] = useState("");
  const needle = query.trim().toLowerCase();
  const picked = INSTRUMENT_CATALOG.find((item) => item.id === pickedId) ?? null;
  const scopedLab = labId || labIdFromSite(site);
  const already = picked ? state.instruments.some((item) => item.catalogId === picked.id && item.labId === scopedLab) : false;

  function start() {
    if (!picked || already || !site.trim()) return;
    startInstrumentIntegration(picked.id, site, scopedLab);
    setStarted(picked.name);
  }

  return (
    <section className="lims-panel migration-panel connect-instrument-catalog">
      <h2>Add an instrument</h2>
      <p>Choose an analyzer. Starting the integration opens its gateway on this lab instance.</p>
      <label className="migration-select">
        Find an instrument
        <input aria-label="Find an instrument" value={query} placeholder="Chemistry, Sysmex, HPLC" onChange={(event) => setQuery(event.target.value)} />
      </label>
      {INSTRUMENT_CATEGORIES.map((category) => {
        const items = INSTRUMENT_CATALOG.filter((item) => item.category === category && (!needle || `${item.maker} ${item.name} ${item.category} ${item.protocol}`.toLowerCase().includes(needle)));
        if (!items.length) return null;
        return (
          <div className="connect-instrument-group" key={category}>
            <h3>{category}</h3>
            <ul>
              {items.map((item) => {
                const connected = state.instruments.some((row) => row.catalogId === item.id && (!labId || row.labId === labId));
                return (
                  <li key={item.id}>
                    <button type="button" className={pickedId === item.id ? "is-current" : undefined} aria-pressed={pickedId === item.id} onClick={() => { setPickedId(item.id); setStarted(""); }}>
                      <strong>{item.maker} {item.name}</strong>
                      <span>{item.protocol} · {item.summary}</span>
                      {connected ? <Pill tone="ok">Connected</Pill> : <span className="connect-catalog-start">Select</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {picked ? (
        <form
          className="connect-instrument-start"
          onSubmit={(event) => {
            event.preventDefault();
            start();
          }}
        >
          <h3>{picked.maker} {picked.name}</h3>
          {already || started === picked.name ? (
            <p>{picked.name} is connected for {site.trim() || "this lab"}. The gateway is on the channel list.</p>
          ) : (
            <>
              <label className="migration-select">
                Site
                <select aria-label="Instrument site" value={site} onChange={(event) => setSite(event.target.value)}>
                  <option>North Lab</option>
                  <option>East Lab</option>
                </select>
              </label>
              <button type="submit" className="btn btn-primary">Start integration</button>
            </>
          )}
        </form>
      ) : null}
    </section>
  );
}

export function ConnectPage({ section }: { section?: string }) {
  const sectionTabs = useSectionTabs();
  const view = section && section in COPY ? section : "overview";
  const interfaceView = view === "interfaces" || view === "messages" || view === "mapping" || view === "failures";
  const copy = interfaceView ? { title: "Interfaces", subtitle: COPY[view].subtitle } : COPY[view];
  return (
    <div className="lims-page connect-studio">
      <ModuleHeader
        name={view === "instruments" ? "instruments" : interfaceView ? "interfaces" : undefined}
        title={copy.title}
        subtitle={copy.subtitle}
        action={view === "instruments" ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => sectionTabs.pin({ kind: "instrument-catalog", recordId: "new", title: "Add instrument" })}
          >
            Add connection
          </button>
        ) : undefined}
      />
      {view === "instruments" ? <SectionTabStrip mainLabel="Instrument integration" /> : null}
      {interfaceView ? <InterfaceTabs current={view} /> : null}
      {view === "overview" ? <OverviewView /> : null}
      {view === "interfaces" ? <InterfacesView /> : null}
      {view === "messages" ? <MessagesView /> : null}
      {view === "mapping" ? <MappingView /> : null}
      {view === "failures" ? <FailuresView /> : null}
      {view === "instruments" ? <InstrumentsView /> : null}
    </div>
  );
}
