import { useMemo, useState, type DragEvent } from "react";
import type { NodePlugin } from "@carescope/workflow-core";

const CATEGORY_ORDER = [
  "flow",
  "human",
  "logic",
  "laboratory",
  "communication",
  "integration",
  "data",
  "timing",
  "ai",
  "compliance",
  "advanced",
] as const;

interface Props {
  plugins: NodePlugin[];
}

export function NodePalette({ plugins }: Props) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = plugins.filter(
      (p) =>
        !q ||
        p.label.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
    const map = new Map<string, NodePlugin[]>();
    for (const p of filtered) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [plugins, query]);

  const onDragStart = (event: DragEvent, plugin: NodePlugin) => {
    event.dataTransfer.setData(
      "application/carescope-node",
      JSON.stringify({
        type: plugin.type,
        label: plugin.label,
        color: plugin.color,
        description: plugin.description,
      })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="palette">
      <div className="palette-header">Node Library</div>
      <div className="palette-search">
        <input
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="palette-body">
        {grouped.map((group) => (
          <div key={group.category} className="palette-category">
            <div className="palette-category-title">{group.category}</div>
            {group.items.map((plugin) => (
              <div
                key={plugin.type}
                className="palette-item"
                draggable
                onDragStart={(e) => onDragStart(e, plugin)}
                title={plugin.description}
              >
                <span
                  className="palette-swatch"
                  style={{ background: plugin.color ?? "#2dd4a8" }}
                />
                <span>{plugin.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
