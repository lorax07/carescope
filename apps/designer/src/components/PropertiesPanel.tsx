import { useState } from "react";
import type { NodePlugin, WorkflowTrigger, SystemEventType } from "@carescope/workflow-core";
import { SYSTEM_EVENT_CATALOG } from "@carescope/workflow-core";
import type { WfFlowNode } from "./WorkflowNode";

interface Props {
  selected: WfFlowNode | null;
  plugin: NodePlugin | undefined;
  triggers: WorkflowTrigger[];
  onChangeNode: (
    id: string,
    patch: { label?: string; description?: string; config?: Record<string, unknown> }
  ) => void;
  onChangeTriggers: (triggers: WorkflowTrigger[]) => void;
  onDeleteNode: (id: string) => void;
}

export function PropertiesPanel({
  selected,
  plugin,
  triggers,
  onChangeNode,
  onChangeTriggers,
  onDeleteNode,
}: Props) {
  const [tab, setTab] = useState<"node" | "triggers">(selected ? "node" : "triggers");

  return (
    <aside className="props-panel">
      <div className="props-header">Inspector</div>
      <div className="props-body">
        <div className="tabs">
          <button
            type="button"
            className={tab === "node" ? "active" : ""}
            onClick={() => setTab("node")}
          >
            Node
          </button>
          <button
            type="button"
            className={tab === "triggers" ? "active" : ""}
            onClick={() => setTab("triggers")}
          >
            Triggers
          </button>
        </div>

        {tab === "node" && (
          <>
            {!selected ? (
              <div className="props-empty">
                Select a node on the canvas, or drag a node from the library to begin designing.
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Label</label>
                  <input
                    value={selected.data.label}
                    onChange={(e) => onChangeNode(selected.id, { label: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Type</label>
                  <input value={selected.data.nodeType} disabled />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    value={selected.data.description ?? ""}
                    onChange={(e) =>
                      onChangeNode(selected.id, { description: e.target.value })
                    }
                  />
                </div>
                {plugin?.configSchema.fields.map((field) => {
                  const value = selected.data.config?.[field.name];
                  const common = {
                    value:
                      value === undefined || value === null
                        ? field.default !== undefined
                          ? String(field.default)
                          : ""
                        : typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value),
                  };
                  return (
                    <div className="field" key={field.name}>
                      <label>
                        {field.label}
                        {field.required ? " *" : ""}
                      </label>
                      {field.type === "textarea" ||
                      field.type === "expression" ||
                      field.type === "json" ? (
                        <textarea
                          {...common}
                          placeholder={field.placeholder}
                          onChange={(e) => {
                            let parsed: unknown = e.target.value;
                            if (field.type === "json") {
                              try {
                                parsed = JSON.parse(e.target.value);
                              } catch {
                                parsed = e.target.value;
                              }
                            }
                            onChangeNode(selected.id, {
                              config: {
                                ...selected.data.config,
                                [field.name]:
                                  field.type === "expression" || field.type === "textarea"
                                    ? e.target.value
                                    : parsed,
                              },
                            });
                          }}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={String(value ?? field.default ?? "")}
                          onChange={(e) =>
                            onChangeNode(selected.id, {
                              config: {
                                ...selected.data.config,
                                [field.name]: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">—</option>
                          {(field.options ?? []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <select
                          value={String(value ?? field.default ?? false)}
                          onChange={(e) =>
                            onChangeNode(selected.id, {
                              config: {
                                ...selected.data.config,
                                [field.name]: e.target.value === "true",
                              },
                            })
                          }
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          value={Number(value ?? field.default ?? 0)}
                          onChange={(e) =>
                            onChangeNode(selected.id, {
                              config: {
                                ...selected.data.config,
                                [field.name]: Number(e.target.value),
                              },
                            })
                          }
                        />
                      ) : (
                        <input
                          {...common}
                          placeholder={field.placeholder}
                          onChange={(e) =>
                            onChangeNode(selected.id, {
                              config: {
                                ...selected.data.config,
                                [field.name]: e.target.value,
                              },
                            })
                          }
                        />
                      )}
                      {field.description ? (
                        <div className="field-hint">{field.description}</div>
                      ) : null}
                    </div>
                  );
                })}
                {selected.data.nodeType !== "start" &&
                  selected.data.nodeType !== "end" && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onDeleteNode(selected.id)}
                    >
                      Delete node
                    </button>
                  )}
              </>
            )}
          </>
        )}

        {tab === "triggers" && (
          <TriggersEditor triggers={triggers} onChange={onChangeTriggers} />
        )}
      </div>
    </aside>
  );
}

function TriggersEditor({
  triggers,
  onChange,
}: {
  triggers: WorkflowTrigger[];
  onChange: (t: WorkflowTrigger[]) => void;
}) {
  const add = () => {
    onChange([
      ...triggers,
      {
        id: crypto.randomUUID(),
        type: "event",
        eventType: "sample.created",
        enabled: true,
      },
    ]);
  };

  return (
    <div>
      <p className="props-empty" style={{ padding: 0, marginBottom: "0.75rem" }}>
        Event-driven triggers start this workflow when matching LIMS events occur.
      </p>
      {triggers.map((t, idx) => (
        <div
          key={t.id}
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            padding: "0.65rem",
            marginBottom: "0.65rem",
          }}
        >
          <div className="field">
            <label>Event</label>
            <select
              value={t.eventType ?? ""}
              onChange={(e) => {
                const next = [...triggers];
                next[idx] = {
                  ...t,
                  eventType: e.target.value as SystemEventType,
                };
                onChange(next);
              }}
            >
              {SYSTEM_EVENT_CATALOG.map((ev) => (
                <option key={ev.type} value={ev.type}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Filter expression</label>
            <input
              value={t.filter ?? ""}
              placeholder="priority == 'STAT'"
              onChange={(e) => {
                const next = [...triggers];
                next[idx] = { ...t, filter: e.target.value || undefined };
                onChange(next);
              }}
            />
          </div>
          <div className="field">
            <label>Enabled</label>
            <select
              value={String(t.enabled)}
              onChange={(e) => {
                const next = [...triggers];
                next[idx] = { ...t, enabled: e.target.value === "true" };
                onChange(next);
              }}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onChange(triggers.filter((x) => x.id !== t.id))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={add}>
        Add trigger
      </button>
    </div>
  );
}
