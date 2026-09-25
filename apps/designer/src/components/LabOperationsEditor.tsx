import { useRef } from "react";
import {
  saveLabOperations,
  useLabOperations,
  type LabMenuItem,
  type LabOperationsConfig,
} from "../labOperations";

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function LabOperationsEditor() {
  const config = useLabOperations();
  const dragRef = useRef<{ list: "menu" | "priorities"; index: number } | null>(null);

  function update(next: LabOperationsConfig) {
    saveLabOperations(next);
  }

  function beginDrag(list: "menu" | "priorities", index: number) {
    const next = { list, index };
    dragRef.current = next;
  }

  function dropOn(list: "menu" | "priorities", index: number) {
    const current = dragRef.current;
    if (!current || current.list !== list) return;
    if (list === "menu") update({ ...config, menu: move(config.menu, current.index, index) });
    else update({ ...config, priorities: move(config.priorities, current.index, index) });
    dragRef.current = null;
  }

  function rename(id: string, label: string) {
    update({
      ...config,
      menu: config.menu.map((item) => (item.id === id ? { ...item, label } : item)),
    });
  }

  function toggle(item: LabMenuItem) {
    update({
      ...config,
      menu: config.menu.map((entry) =>
        entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry
      ),
    });
  }

  return (
    <section className="lab-ops-editor">
      <div>
        <h2>Lab operations</h2>
        <p>
          Drag to set the order the laboratory sees. Home lists samples from the top priority
          downward. Menu items here are the options under Lab Operations.
        </p>
      </div>
      <div className="lab-ops-editor-grid">
        <div>
          <h3>Sample priority</h3>
          <ol
            className="lab-ops-drag"
            onDragOver={(event) => event.preventDefault()}
          >
            {config.priorities.map((priority, index) => (
              <li
                key={priority}
                draggable
                onDragStart={() => beginDrag("priorities", index)}
                onDrop={() => dropOn("priorities", index)}
              >
                <span aria-hidden="true">⋮⋮</span>
                <b>{index + 1}</b>
                {priority}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>Menu</h3>
          <ol className="lab-ops-drag" onDragOver={(event) => event.preventDefault()}>
            {config.menu.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => beginDrag("menu", index)}
                onDrop={() => dropOn("menu", index)}
              >
                <span aria-hidden="true">⋮⋮</span>
                <input
                  aria-label={`${item.view} label`}
                  value={item.label}
                  onChange={(event) => rename(item.id, event.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => toggle(item)}
                  />
                  Show
                </label>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
