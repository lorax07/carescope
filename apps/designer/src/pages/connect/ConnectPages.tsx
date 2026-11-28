import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Filter01, type Filter01Option } from "../../components/Filter01";
import { filter01Match } from "../../filter01";
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
  CHANNEL_PAYLOADS,
  channelFromSetup,
  EHR_PRODUCTS,
  emptyChannelSetup,
  INTERACTION_MODELS,
  isInterfaceChannel,
  matchesQuery,
  messageIsSuccess,
  messageOn,
  suggestInteraction,
  type AppConnector,
  type ChannelPayload,
  type ChannelSetup,
  type ConnectMessage,
  type InteractionModel,
  type InterfaceKind,
  type MessageStatus,
} from "./connectModel";
import {
  configureChannel,
  saveInstrumentConnection,
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
  { to: "/app/connect/interfaces", label: "Integrations", key: "channels" },
  { to: "/app/connect/failures", label: "Attention", key: "failures" },
] as const;

const CHANNEL_KINDS: InterfaceKind[] = ["HL7 v2", "FHIR R4", "REST", "Webhook", "File"];
const HL7_VERSIONS = ["2.3", "2.5", "2.5.1", "2.8"];

type ChannelSession = {
  setup: ChannelSetup;
  step: "form" | "validation";
  error: string;
  savedId: string;
};

const COPY: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: "Sequence Connect",
    subtitle: "What happened to every message, and what still needs a person.",
  },
  interfaces: {
    title: "EHR Integration",
    subtitle: "Connections between Sequence and the other systems that exchange lab data.",
  },
  apps: {
    title: "App connectors",
    subtitle: "Known apps, grouped by what they do. Open one to start its API connection.",
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
    title: "Instrument Manager",
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

function channelTabOn(key: string, view: string): boolean {
  if (key === "channels") return view === "interfaces" || view === "messages" || view === "mapping";
  return key === view;
}

function InterfaceTabs({ current, configureLabel, onCloseConfigure }: { current: string; configureLabel?: string; onCloseConfigure?: () => void }) {
  return (
    <nav className="subtab01 connect-interface-tabs" role="tablist" aria-label="EHR Integration">
      {INTERFACE_TABS.map((tab) => {
        const on = channelTabOn(tab.key, current);
        return (
          <Link key={tab.key} to={tab.to} role="tab" aria-selected={on} className={on ? "is-on" : undefined}>
            {tab.label}
          </Link>
        );
      })}
      {configureLabel ? (
        <span className={current === "configure" ? "is-on" : undefined}>
          <Link to="/app/connect/configure" role="tab" aria-selected={current === "configure"}>
            {configureLabel}
          </Link>
          <button type="button" aria-label={`Close ${configureLabel}`} onClick={onCloseConfigure}>×</button>
        </span>
      ) : null}
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
  const channels = state.interfaces.filter(isInterfaceChannel);
  const openMessages = attentionMessages(state.messages).filter((message) => channels.some((channel) => channel.id === message.interfaceId));
  const labId = currentLabId();
  const instruments = labId ? state.instruments.filter((item) => item.labId === labId) : state.instruments;
  const online = instruments.filter((item) => item.status === "Online").length;
  const connectedApps = state.connections;
  const retrying = state.messages.filter((message) => message.status === "retrying").length;
  const delivered = state.messages.filter((message) => message.status === "delivered").length;
  const held = state.messages.filter((message) => message.status === "held").length;
  return (
    <>
      <section className="lims-kpi-row" aria-label="Integration status">
        <article className="lims-kpi"><span>Needs attention</span><strong>{openMessages.length}</strong><small>Interface messages waiting on a person</small></article>
        <article className="lims-kpi"><span>Retrying</span><strong>{retrying}</strong><small>Payload unchanged, destination did not reject it</small></article>
        <article className="lims-kpi"><span>Delivered</span><strong>{delivered}</strong><small>Accepted by Sequence or the partner</small></article>
        <article className="lims-kpi"><span>Held</span><strong>{held}</strong><small>Stopped before anything was sent</small></article>
      </section>
    <section className="connect-home-modules" aria-label="Connect modules">
      <article className="lims-panel migration-panel">
        <h2>EHR Integration</h2>
        <p>System connections that exchange lab data with Sequence.</p>
        <ul>
          <li><Link to="/app/connect/interfaces">{channels.length} {channels.length === 1 ? "channel" : "channels"}</Link></li>
          <li><Link to="/app/connect/failures">{openMessages.length} {openMessages.length === 1 ? "message needs" : "messages need"} a person</Link></li>
          {channels.map((channel) => (
            <li key={channel.id}>
              <Link to={`/app/connect/interfaces?channel=${channel.id}`}>{channel.fromSystem} → {channel.toSystem}</Link>
              <span>{channel.kind}</span>
            </li>
          ))}
        </ul>
      </article>
      <article className="lims-panel migration-panel">
        <h2>Instrument Manager</h2>
        <p>Analyzers connected to this lab instance.</p>
        <ul>
          <li><Link to="/app/connect/instruments">{instruments.length} {instruments.length === 1 ? "analyzer" : "analyzers"} on this instance</Link></li>
          <li><Link to="/app/connect/instruments">{online} online · {instruments.length - online} idle</Link></li>
          {instruments.map((item) => (
            <li key={item.id}>
              <Link to="/app/connect/instruments">{item.name}</Link>
              <span>{item.category} · {item.status}</span>
            </li>
          ))}
        </ul>
      </article>
      <article className="lims-panel migration-panel">
        <h2>App connectors</h2>
        <p>Known apps you can connect with an API handshake.</p>
        <ul>
          <li><Link to="/app/connect/apps">{connectedApps.length} connected · {APP_CONNECTORS.length} known apps</Link></li>
          {CONNECTOR_CATEGORIES.map((category) => (
            <li key={category}>
              <Link to="/app/connect/apps">{category}</Link>
              <span>{APP_CONNECTORS.filter((item) => item.category === category).length} apps</span>
            </li>
          ))}
          {connectedApps.map((item) => {
            const connector = APP_CONNECTORS.find((app) => app.id === item.connectorId);
            return (
              <li key={item.connectorId}>
                <Link to="/app/connect/apps">{connector?.name ?? item.connectorId}</Link>
                <span>Connected · {item.account}</span>
              </li>
            );
          })}
        </ul>
      </article>
    </section>
    </>
  );
}

function ConnectorDialog({ connector, onClose, onStarted }: { connector: AppConnector; onClose: () => void; onStarted?: (interfaceId: string) => void }) {
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
    onStarted?.(`app-${connector.id}`);
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
            <p className="connect-action">The handshake is recorded. {connector.name} is connected for {trimmed}.</p>
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

function ChannelsView({ initialPane, onConfigure }: { initialPane: "messages" | "mapping"; onConfigure: () => void }) {
  const state = useConnect();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const channels = useMemo(() => state.interfaces.filter(isInterfaceChannel), [state.interfaces]);
  const requested = params.get("channel");
  const opened = state.messages.find((message) => message.id === state.selectedId);
  const openedChannel = channels.some((item) => item.id === requested) ? requested : channels.some((item) => item.id === opened?.interfaceId) ? opened?.interfaceId : channels[0]?.id;
  const [selected, setSelected] = useState(openedChannel ?? "");
  const [pane, setPane] = useState(initialPane);
  const [filters, setFilters] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [messageStatus, setMessageStatus] = useState<"all" | "success" | MessageStatus>("all");
  const [rangeOn, setRangeOn] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  useEffect(() => setPane(initialPane), [initialPane]);
  const filterOptions = useMemo<Filter01Option[]>(() => {
    const kinds = [...new Set(channels.map((item) => item.kind))];
    const partners = [...new Set(channels.flatMap((item) => [item.fromSystem, item.toSystem]).filter((name) => name !== "Sequence"))];
    return [
      ...kinds.map((kind) => ({ id: `kind:${kind}`, label: kind, category: "Protocol" })),
      ...partners.map((partner) => ({ id: `partner:${partner}`, label: partner, category: "System" })),
    ];
  }, [channels]);
  const visible = channels.filter((item) => {
    const kinds = filters.filter((id) => id.startsWith("kind:")).map((id) => id.slice(5));
    const partners = filters.filter((id) => id.startsWith("partner:")).map((id) => id.slice(8));
    if (kinds.length && !kinds.includes(item.kind)) return false;
    if (partners.length && !partners.some((partner) => item.fromSystem === partner || item.toSystem === partner)) return false;
    const searches = [query, ...filters.filter((id) => id.startsWith("search:")).map((id) => id.slice(7))].map((item) => item.trim()).filter(Boolean);
    const text = `${item.fromSystem} ${item.toSystem} ${item.name} ${item.kind} ${item.endpoint} ${item.note}`;
    return searches.every((search) => filter01Match(text, search));
  });
  const channel = visible.find((item) => item.id === selected) ?? visible[0];
  const channelMessages = channel ? state.messages.filter((message) => message.interfaceId === channel.id).filter((message) => {
    if (messageStatus === "success") {
      if (!messageIsSuccess(message)) return false;
    } else if (messageStatus !== "all" && message.status !== messageStatus) return false;
    if (rangeOn && (rangeFrom || rangeTo)) {
      const day = messageOn(message);
      if (!day || (rangeFrom && day < rangeFrom) || (rangeTo && day > rangeTo)) return false;
    }
    return matchesQuery(message, channel.name, messageQuery);
  }) : [];
  const openMessage = channelMessages.find((message) => message.id === state.selectedId) ?? channelMessages[0];
  const mapRows = channel ? state.transforms.filter((row) => row.interfaceId === channel.id) : [];
  function showPane(next: "messages" | "mapping") {
    setPane(next);
    navigate(next === "mapping" ? "/app/connect/mapping" : "/app/connect/messages");
  }

  return (
    <>
    <div className="connect-channel-toolbar">
      <Filter01
        className="connect-channel-filter"
        label="Integrations"
        scope="connect-channels"
        options={filterOptions}
        selected={filters}
        onChange={setFilters}
        query={query}
        onQuery={setQuery}
      />
      <button type="button" className="btn btn-primary" onClick={onConfigure}>Configure a new Channel</button>
    </div>
    <div className="connect-split connect-channel-screen">
      <section className="lims-panel migration-panel" aria-label="Integrations">
        <h2>{visible.length} {visible.length === 1 ? "channel" : "channels"}</h2>
        <ul className="connect-channel-board">
          {visible.map((item) => (
              <li key={item.id}>
                <button type="button" className={item.id === channel?.id ? "is-current" : undefined} aria-pressed={item.id === channel?.id} onClick={() => setSelected(item.id)}>
                  <strong className="connect-channel-title">{item.fromSystem} → {item.toSystem}</strong>
                  <span className="connect-channel-kind">{item.kind} · {item.name}</span>
                </button>
              </li>
            ))}
        </ul>
        {visible.length === 0 ? <p>No channel matches that filter.</p> : null}
      </section>
      {channel ? (
        <section className="lims-panel migration-panel connect-channel-pane" aria-label={`${channel.fromSystem} to ${channel.toSystem}`}>
          <h2 className="connect-channel-title">{channel.fromSystem} → {channel.toSystem}</h2>
          <p className="connect-channel-kind">{channel.kind} · {channel.name}</p>
          <dl className="connect-connection-details">
            <div><dt>From</dt><dd>{channel.fromSystem}</dd></div>
            <div><dt>To</dt><dd>{channel.toSystem}</dd></div>
            <div><dt>Protocol</dt><dd>{channel.kind}</dd></div>
            <div><dt>Interaction model</dt><dd>{channel.interaction}</dd></div>
            <div><dt>Endpoint</dt><dd>{channel.endpoint}</dd></div>
            <div><dt>What it carries</dt><dd>{channel.note}</dd></div>
          </dl>
          <nav className="subtab01" role="tablist" aria-label={`${channel.name} menus`}>
            <button type="button" role="tab" aria-selected={pane === "messages"} className={pane === "messages" ? "is-on" : undefined} onClick={() => showPane("messages")}>Messages</button>
            <button type="button" role="tab" aria-selected={pane === "mapping"} className={pane === "mapping" ? "is-on" : undefined} onClick={() => showPane("mapping")}>Mapping</button>
          </nav>
          {pane === "messages" ? (
            <div className="connect-channel-menu">
              <label className="migration-select">
                Search this channel
                <input aria-label="Search this channel" value={messageQuery} placeholder="Id, MRN, error, payload" onChange={(event) => setMessageQuery(event.target.value)} />
              </label>
              <div className="migration-filters" role="group" aria-label="Message status">
                {(["all", "success", "failed", "retrying", "held", "delivered"] as const).map((key) => (
                  <button key={key} type="button" className={messageStatus === key ? "is-current" : undefined} aria-pressed={messageStatus === key} onClick={() => setMessageStatus(key)}>
                    {key === "all" ? "All" : key === "success" ? "Success" : statusLabel(key)}
                  </button>
                ))}
                <button type="button" className={rangeOn ? "is-current" : undefined} aria-pressed={rangeOn} onClick={() => setRangeOn((current) => !current)}>Date range</button>
              </div>
              {rangeOn ? (
                <div className="connect-date-range">
                  <label>From <input type="date" aria-label="Messages from" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label>
                  <label>To <input type="date" aria-label="Messages to" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /></label>
                </div>
              ) : null}
              <ul className="connect-channel-list">
                {channelMessages.map((message) => (
                  <li key={message.id}>
                    <button type="button" className={openMessage?.id === message.id ? "is-current" : undefined} aria-pressed={openMessage?.id === message.id} onClick={() => selectMessage(message.id)}>
                      <strong>{message.id} · {message.messageType}</strong>
                      <span>{message.summary}</span>
                      <Pill tone={statusTone(message.status)}>{statusLabel(message.status)}</Pill>
                    </button>
                  </li>
                ))}
                {channelMessages.length === 0 ? <li>No messages on this channel match.</li> : null}
              </ul>
              {openMessage ? <MessageDetail messageId={openMessage.id} /> : null}
            </div>
          ) : (
            <div className="connect-channel-menu">
              <p>This map is reused the next time the same profile arrives.</p>
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
                  {mapRows.map((row) => (
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
                  {mapRows.length === 0 ? <tr><td colSpan={4}>This channel has no map rows yet.</td></tr> : null}
                </tbody>
              </table>
              <p>{mapRows.some((row) => !row.target) ? "Unmapped fields hold the message until someone maps them." : "Every field on this profile has a Sequence field."}</p>
            </div>
          )}
        </section>
      ) : (
        <section className="lims-panel migration-panel">
          <h2>Channel</h2>
          <p>Choose a channel to see its messages and mapping.</p>
        </section>
      )}
    </div>
    </>
  );
}

function ChannelConfigureView({ session, onChange, onValidate }: { session: ChannelSession; onChange: (next: ChannelSession) => void; onValidate: () => void }) {
  const setup = session.setup;
  function patch(partial: Partial<ChannelSetup>) {
    const next = { ...setup, ...partial };
    if (partial.kind || partial.flow) next.interaction = suggestInteraction(next.kind, next.flow);
    onChange({ ...session, setup: next, error: "" });
  }
  function togglePayload(payload: ChannelPayload) {
    const payloads = setup.payloads.includes(payload) ? setup.payloads.filter((item) => item !== payload) : [...setup.payloads, payload];
    patch({ payloads });
  }
  if (session.step === "validation") {
    const saved = channelFromSetup(setup);
    const input = saved.ok ? saved.input : null;
    return (
      <section className="lims-panel migration-panel connect-validate" aria-labelledby="channel-validation-title">
        <h2 id="channel-validation-title">Validation</h2>
        <p>The connection is saved.</p>
        {input ? (
          <dl className="connect-connection-details">
            <div><dt>Channel</dt><dd>{input.name}</dd></div>
            <div><dt>From</dt><dd>{input.fromSystem}</dd></div>
            <div><dt>To</dt><dd>{input.toSystem}</dd></div>
            <div><dt>Protocol</dt><dd>{input.kind}</dd></div>
            <div><dt>Interaction model</dt><dd>{input.interaction}</dd></div>
            <div><dt>Endpoint</dt><dd>{input.endpoint}</dd></div>
            <div><dt>What it carries</dt><dd>{input.note}</dd></div>
          </dl>
        ) : null}
        <button type="button" className="btn btn-primary">Publish</button>
      </section>
    );
  }
  return (
    <form
      className="lims-panel migration-panel connect-channel-form"
      aria-labelledby="configure-channel-title"
      onSubmit={(event) => {
        event.preventDefault();
        onValidate();
      }}
    >
      <h2 id="configure-channel-title">Configure a new channel</h2>
      <p>Tell Sequence which EHR this is, what clinical data moves, and how the two systems connect.</p>
      <div className="connect-channel-form-grid">
        <label className="migration-select">Channel name
          <input aria-label="Channel name" value={setup.name} placeholder="North Hospital orders" onChange={(event) => patch({ name: event.target.value })} />
        </label>
        <label className="migration-select">EHR system
          <input aria-label="EHR system" value={setup.ehrSystem} placeholder="North Hospital Epic" onChange={(event) => patch({ ehrSystem: event.target.value })} />
        </label>
        <label className="migration-select">EHR product
          <select aria-label="EHR product" value={setup.product} onChange={(event) => patch({ product: event.target.value as ChannelSetup["product"] })}>
            {EHR_PRODUCTS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="migration-select">Direction
          <select aria-label="Direction" value={setup.flow} onChange={(event) => patch({ flow: event.target.value as ChannelSetup["flow"] })}>
            <option value="into-sequence">EHR sends into Sequence</option>
            <option value="out-of-sequence">Sequence sends to the EHR</option>
          </select>
        </label>
      </div>
      <fieldset className="connect-channel-choices">
        <legend>What it carries</legend>
        {CHANNEL_PAYLOADS.map((payload) => (
          <label key={payload}>
            <input type="checkbox" checked={setup.payloads.includes(payload)} onChange={() => togglePayload(payload)} />
            {payload === "Registration" ? "Registration (ADT / Patient)" : payload === "Orders" ? "Orders (ORM / ServiceRequest)" : "Results (ORU / DiagnosticReport)"}
          </label>
        ))}
      </fieldset>
      <div className="connect-channel-form-grid">
        <label className="migration-select">Protocol
          <select aria-label="Protocol" value={setup.kind} onChange={(event) => patch({ kind: event.target.value as InterfaceKind })}>
            {CHANNEL_KINDS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="migration-select">Interaction model
          <select aria-label="Interaction model" value={setup.interaction} onChange={(event) => onChange({ ...session, setup: { ...setup, interaction: event.target.value as InteractionModel }, error: "" })}>
            {INTERACTION_MODELS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        {setup.kind === "HL7 v2" ? (
          <>
            <label className="migration-select">HL7 version
              <select aria-label="HL7 version" value={setup.hl7Version} onChange={(event) => patch({ hl7Version: event.target.value })}>
                {HL7_VERSIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="migration-select">MLLP host
              <input aria-label="MLLP host" value={setup.host} placeholder="10.4.1.20" onChange={(event) => patch({ host: event.target.value })} />
            </label>
            <label className="migration-select">MLLP port
              <input aria-label="MLLP port" value={setup.port} inputMode="numeric" onChange={(event) => patch({ port: event.target.value })} />
            </label>
            <label className="migration-select">Sending application (MSH-3)
              <input aria-label="Sending application" value={setup.sendingApp} placeholder="EPIC" onChange={(event) => patch({ sendingApp: event.target.value })} />
            </label>
            <label className="migration-select">Sending facility (MSH-4)
              <input aria-label="Sending facility" value={setup.sendingFacility} placeholder="NORTH" onChange={(event) => patch({ sendingFacility: event.target.value })} />
            </label>
            <label className="migration-select">Receiving application (MSH-5)
              <input aria-label="Receiving application" value={setup.receivingApp} onChange={(event) => patch({ receivingApp: event.target.value })} />
            </label>
            <label className="migration-select">Receiving facility (MSH-6)
              <input aria-label="Receiving facility" value={setup.receivingFacility} onChange={(event) => patch({ receivingFacility: event.target.value })} />
            </label>
          </>
        ) : null}
        {setup.kind === "FHIR R4" ? (
          <label className="migration-select connect-channel-span">FHIR base URL
            <input aria-label="FHIR base URL" value={setup.fhirBase} placeholder="https://epic.north.example/fhir/R4" onChange={(event) => patch({ fhirBase: event.target.value })} />
          </label>
        ) : null}
        {setup.kind === "REST" ? (
          <>
            <label className="migration-select">HTTP method
              <select aria-label="HTTP method" value={setup.restMethod} onChange={(event) => patch({ restMethod: event.target.value as ChannelSetup["restMethod"] })}>
                <option>POST</option>
                <option>GET</option>
              </select>
            </label>
            <label className="migration-select">REST URL
              <input aria-label="REST URL" value={setup.restUrl} placeholder="https://north.example/api/orders" onChange={(event) => patch({ restUrl: event.target.value })} />
            </label>
          </>
        ) : null}
        {setup.kind === "Webhook" ? (
          <label className="migration-select connect-channel-span">Webhook URL
            <input aria-label="Webhook URL" value={setup.webhookUrl} placeholder="https://north.example/hooks/results" onChange={(event) => patch({ webhookUrl: event.target.value })} />
          </label>
        ) : null}
        {setup.kind === "File" ? (
          <label className="migration-select connect-channel-span">File drop
            <input aria-label="File drop" value={setup.filePath} placeholder="sftp /inbound/ehr" onChange={(event) => patch({ filePath: event.target.value })} />
          </label>
        ) : null}
      </div>
      {session.error ? <p className="connect-attention" role="alert">{session.error}</p> : null}
      <div className="connect-connector-actions">
        <button type="submit" className="btn btn-primary">Proceed to validation</button>
      </div>
    </form>
  );
}

function AppsView() {
  const state = useConnect();
  const [catalogQuery, setCatalogQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const needle = catalogQuery.trim().toLowerCase();
  const openConnector = APP_CONNECTORS.find((item) => item.id === openId) ?? null;
  const closeConnector = useCallback(() => setOpenId(null), []);
  return (
    <>
      <section className="lims-panel migration-panel connect-catalog" aria-labelledby="app-connectors-heading">
        <div className="migration-panel-head">
          <div>
            <h2 id="app-connectors-heading">{state.connections.length} connected · {APP_CONNECTORS.length} known apps</h2>
            <p>Grouped by what they do. Open one to start its API connection.</p>
          </div>
          <label className="migration-select">
            Find an app
            <input aria-label="Find an app" value={catalogQuery} placeholder="Slack, CRM, email" onChange={(event) => setCatalogQuery(event.target.value)} />
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
      {openConnector ? <ConnectorDialog key={openConnector.id} connector={openConnector} onClose={closeConnector} /> : null}
    </>
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
  const sectionTabs = useSectionTabs();
  const labId = currentLabId();
  const labName = currentLabName() || "this lab instance";
  const rows = labId ? state.instruments.filter((item) => item.labId === labId) : state.instruments;
  const open = sectionTabs.presentation === "tab" ? sectionTabs.tabs.find((tab) => tab.id === sectionTabs.activeId) : undefined;
  const sideTab = open?.kind === "instrument-connection" || open?.kind === "instrument-catalog" ? open : undefined;
  return (
    <div className={sideTab ? "instrument-manager-row" : undefined}>
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
              <td>
                <button
                  type="button"
                  className="connect-record-link"
                  onClick={() => sectionTabs.pin({ kind: "instrument-connection", recordId: item.id, title: item.name })}
                >
                  {item.name}
                </button>
              </td>
              <td>{item.category}</td>
              <td>{item.protocol}</td>
              <td>{item.site}</td>
              <td><Pill tone={item.status === "Online" ? "ok" : "wait"}>{item.status}</Pill></td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={5}>Use New Instrument Connection to start an integration.</td></tr> : null}
        </tbody>
      </table>
    </section>
    {sideTab ? (
      <div className="instrument-tab-screen tabview01">
        <button type="button" className="tabview01-close" aria-label={`Close ${sideTab.title}`} onClick={() => sectionTabs.close(sideTab.id)}>×</button>
        {sideTab.kind === "instrument-connection" ? <InstrumentConnectionScreen recordId={sideTab.recordId} /> : <InstrumentCatalogScreen />}
      </div>
    ) : null}
    </div>
  );
}

const INSTRUMENT_PROTOCOLS = ["ASTM", "HL7", "Result file", "File drop"];

type InstrumentDraft = { protocol: string; site: string; status: "Online" | "Idle" };
const instrumentDrafts = new Map<string, InstrumentDraft>();

export function InstrumentConnectionScreen({ recordId }: { recordId: string }) {
  const state = useConnect();
  const tabs = useSectionTabs();
  const navigate = useNavigate();
  const instrument = state.instruments.find((item) => item.id === recordId);
  const stored = instrumentDrafts.get(recordId);
  const tabId = `instrument-connection:${recordId}`;
  const [editing, setEditing] = useState(Boolean(stored));
  const [protocol, setProtocol] = useState(stored?.protocol ?? instrument?.protocol ?? "");
  const [site, setSite] = useState(stored?.site ?? instrument?.site ?? "North Lab");
  const [status, setStatus] = useState<"Online" | "Idle">(stored?.status ?? instrument?.status ?? "Idle");
  const [dialog, setDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const protocols = instrument && INSTRUMENT_PROTOCOLS.includes(instrument.protocol) ? INSTRUMENT_PROTOCOLS : [instrument?.protocol, ...INSTRUMENT_PROTOCOLS].filter((item): item is string => Boolean(item));

  useEffect(() => {
    if (editing) instrumentDrafts.set(recordId, { protocol, site, status });
    else instrumentDrafts.delete(recordId);
  }, [editing, protocol, site, status, recordId]);

  const setDirtyRef = useRef(tabs.setDirty);
  setDirtyRef.current = tabs.setDirty;
  useEffect(() => {
    setDirtyRef.current(tabId, editing);
    return () => setDirtyRef.current(tabId, false);
  }, [editing, tabId]);

  useEffect(() => {
    if (tabs.leaveRequest?.tabId === tabId) setDialog(true);
  }, [tabs.leaveRequest, tabId]);

  useEffect(() => {
    if (!editing) return;
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]");
      if (!link || link.closest(".instrument-connection") || link.closest(".instrument-leave-dialog")) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(link.getAttribute("href"));
      setDialog(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [editing]);

  if (!instrument) {
    return (
      <section className="lims-panel migration-panel">
        <h2>Instrument</h2>
        <p>This connection is not on the lab instance.</p>
      </section>
    );
  }
  const maker = INSTRUMENT_CATALOG.find((item) => item.id === instrument.catalogId)?.maker;
  const gateway = state.interfaces.find((item) => item.id === instrument.interfaceId);

  function persist() {
    saveInstrumentConnection(instrument!.id, { protocol, site, status });
    setEditing(false);
    tabs.setDirty(tabId, false);
  }

  function keepEditing() {
    setPendingHref(null);
    setDialog(false);
    tabs.cancelLeave();
  }

  function saveAndLeave() {
    persist();
    const href = pendingHref;
    setPendingHref(null);
    setDialog(false);
    tabs.acceptLeave();
    if (href) navigate(href);
  }

  return (
    <section className="lims-panel migration-panel instrument-connection" aria-labelledby="instrument-connection-title">
      <h2 id="instrument-connection-title" className="connect-channel-title">{instrument.name}</h2>
      <p className="connect-channel-kind">{maker ? `${maker} · ` : ""}{instrument.category}</p>
      <div className="connect-channel-form-grid">
        <label className="migration-select">Protocol
          <select aria-label="Connection protocol" value={protocol} disabled={!editing} onChange={(event) => setProtocol(event.target.value)}>
            {protocols.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="migration-select">Site
          <select aria-label="Connection site" value={site} disabled={!editing} onChange={(event) => setSite(event.target.value)}>
            {[site, "North Lab", "East Lab"].filter((item, index, list) => list.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="migration-select">Status
          <select aria-label="Connection status" value={status} disabled={!editing} onChange={(event) => setStatus(event.target.value as "Online" | "Idle")}>
            <option>Online</option>
            <option>Idle</option>
          </select>
        </label>
        <label className="migration-select">Gateway
          <input aria-label="Gateway" value={editing ? `Agent LAB-GW · ${protocol} · ${site}` : gateway?.endpoint ?? ""} readOnly />
        </label>
      </div>
      <div className="connect-connector-actions">
        <button type="button" className="btn btn-primary" onClick={() => (editing ? persist() : setEditing(true))}>
          {editing ? "Save" : "Edit connection"}
        </button>
      </div>
      {dialog ? (
        <div className="lims-modal-backdrop instrument-leave-dialog" role="presentation">
          <div className="lims-modal instrument-leave-modal" role="dialog" aria-modal="true" aria-labelledby="instrument-save-title">
            <h2 id="instrument-save-title">Save this connection</h2>
            <p>This tab stays open until the connection is saved.</p>
            <div className="connect-connector-actions">
              <button type="button" className="btn" onClick={keepEditing}>Keep editing</button>
              <button type="button" className="btn btn-primary" onClick={saveAndLeave}>Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function InstrumentCatalogScreen() {
  const state = useConnect();
  const sectionTabs = useSectionTabs();
  const labId = currentLabId();
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [site, setSite] = useState(currentLabName() || "North Lab");
  const needle = query.trim().toLowerCase();
  const picked = INSTRUMENT_CATALOG.find((item) => item.id === pickedId) ?? null;
  const scopedLab = labId || labIdFromSite(site);
  const already = picked ? state.instruments.some((item) => item.catalogId === picked.id && item.labId === scopedLab) : false;

  function connectInstrument(item = picked) {
    if (!item || !site.trim()) return;
    const itemLab = labId || labIdFromSite(site);
    const connected = state.instruments.some((row) => row.catalogId === item.id && row.labId === itemLab);
    if (!connected) startInstrumentIntegration(item.id, site, itemLab);
    sectionTabs.pin({ kind: "instrument-connection", recordId: `conn-${item.id}`, title: item.name });
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
                    <button type="button" className={pickedId === item.id ? "is-current" : undefined} aria-pressed={pickedId === item.id} onClick={() => setPickedId(item.id)} onDoubleClick={() => connectInstrument(item)}>
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
            connectInstrument();
          }}
        >
          <h3>{picked.maker} {picked.name}</h3>
          {already ? <p>{picked.name} is already connected for {site.trim() || "this lab"}.</p> : (
            <label className="migration-select">
              Site
              <select aria-label="Instrument site" value={site} onChange={(event) => setSite(event.target.value)}>
                <option>North Lab</option>
                <option>East Lab</option>
              </select>
            </label>
          )}
          <button type="submit" className="btn btn-primary">Connect Instrument</button>
        </form>
      ) : null}
    </section>
  );
}

export function ConnectPage({ section }: { section?: string }) {
  const sectionTabs = useSectionTabs();
  const navigate = useNavigate();
  const [session, setSession] = useState<ChannelSession | null>(null);
  const configureClosed = useRef(false);
  useEffect(() => {
    if (section === "configure" && !session && !configureClosed.current) {
      setSession({ setup: emptyChannelSetup(), step: "form", error: "", savedId: "" });
    }
    if (section !== "configure") configureClosed.current = false;
  }, [section, session]);
  const view = section === "configure" ? "configure" : section && section in COPY ? section : "overview";
  const channelScreen = view === "interfaces" || view === "messages" || view === "mapping";
  const interfaceView = channelScreen || view === "failures" || view === "configure";
  const copy = interfaceView
    ? { title: "EHR Integration", subtitle: view === "failures" ? COPY.failures.subtitle : view === "configure" ? "Name the EHR, the data that moves, and how the connection is made." : COPY.interfaces.subtitle }
    : COPY[view];
  function openConfigure() {
    configureClosed.current = false;
    if (!session) setSession({ setup: emptyChannelSetup(), step: "form", error: "", savedId: "" });
    navigate("/app/connect/configure");
  }
  function closeConfigure() {
    configureClosed.current = true;
    setSession(null);
    if (view === "configure") navigate("/app/connect/interfaces");
  }
  function validateChannel() {
    if (!session) return;
    const built = channelFromSetup(session.setup);
    if (!built.ok) {
      setSession({ ...session, error: built.error });
      return;
    }
    const id = session.savedId || configureChannel(built.input);
    if (!id) {
      setSession({ ...session, error: "A channel with that name is already configured." });
      return;
    }
    setSession({ ...session, step: "validation", error: "", savedId: id });
  }
  return (
    <div className="lims-page connect-studio">
      <ModuleHeader
        name={view === "instruments" ? "instruments" : view === "apps" ? "apps" : interfaceView ? "interfaces" : undefined}
        title={copy.title}
        subtitle={copy.subtitle}
        action={view === "instruments" ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => sectionTabs.pin({ kind: "instrument-catalog", recordId: "new", title: "New Instrument Connection" })}
          >
            New Instrument Connection
          </button>
        ) : undefined}
      />
      {view === "instruments" ? <SectionTabStrip mainLabel="Instruments" always /> : null}
      {interfaceView ? <InterfaceTabs current={view} configureLabel={session ? session.setup.name.trim() || "New channel" : undefined} onCloseConfigure={closeConfigure} /> : null}
      {view === "overview" ? <OverviewView /> : null}
      {channelScreen ? <ChannelsView initialPane={view === "mapping" ? "mapping" : "messages"} onConfigure={openConfigure} /> : null}
      {view === "configure" && session ? <ChannelConfigureView session={session} onChange={setSession} onValidate={validateChannel} /> : null}
      {view === "failures" ? <FailuresView /> : null}
      {view === "instruments" ? <InstrumentsView /> : null}
      {view === "apps" ? <AppsView /> : null}
    </div>
  );
}
