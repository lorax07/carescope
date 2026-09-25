import { useRef } from "react";
import {
  saveLabOperations,
  useLabOperations,
  type LabButton,
  type LabMenuItem,
  type LabOperationsConfig,
  type SampleColumn,
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
  const dragRef = useRef<{ list: "menu" | "priorities" | "columns" | "buttons"; index: number } | null>(null);

  function update(next: LabOperationsConfig) {
    saveLabOperations(next);
  }

  function beginDrag(list: "menu" | "priorities" | "columns" | "buttons", index: number) {
    dragRef.current = { list, index };
  }

  function dropOn(list: "menu" | "priorities" | "columns" | "buttons", index: number) {
    const current = dragRef.current;
    if (!current || current.list !== list) return;
    if (list === "menu") update({ ...config, menu: move(config.menu, current.index, index) });
    else if (list === "priorities") {
      update({ ...config, priorities: move(config.priorities, current.index, index) });
    } else if (list === "columns") update({ ...config, columns: move(config.columns, current.index, index) });
    else update({ ...config, buttons: move(config.buttons, current.index, index) });
    dragRef.current = null;
  }

  function rename(id: string, label: string) {
    update({
      ...config,
      menu: config.menu.map((item) => (item.id === id ? { ...item, label } : item)),
    });
  }

  function renameColumn(id: string, label: string) {
    update({
      ...config,
      columns: config.columns.map((column) => (column.id === id ? { ...column, label } : column)),
    });
  }

  function toggleColumn(column: SampleColumn) {
    update({
      ...config,
      columns: config.columns.map((entry) =>
        entry.id === column.id ? { ...entry, enabled: !entry.enabled } : entry
      ),
    });
  }

  function recolor(button: LabButton, color: string) {
    update({
      ...config,
      buttons: config.buttons.map((entry) => (entry.id === button.id ? { ...entry, color } : entry)),
    });
  }

  function toggleButton(button: LabButton) {
    update({
      ...config,
      buttons: config.buttons.map((entry) =>
        entry.id === button.id ? { ...entry, enabled: !entry.enabled } : entry
      ),
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
          downward. Menu items here are the options under Lab Operations. Column names and
          visibility control the sample list. Matrix stays off until you show it. Drag buttons
          to place them, pick a color, or hide one. Create a batch starts on Testing.
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
        <div>
          <h3>Sample list columns</h3>
          <ol className="lab-ops-drag" onDragOver={(event) => event.preventDefault()}>
            {config.columns.map((column, index) => (
              <li
                key={column.id}
                draggable
                onDragStart={() => beginDrag("columns", index)}
                onDrop={() => dropOn("columns", index)}
              >
                <span aria-hidden="true">⋮⋮</span>
                <input
                  aria-label={`${column.id} column name`}
                  value={column.label}
                  onChange={(event) => renameColumn(column.id, event.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={column.enabled}
                    onChange={() => toggleColumn(column)}
                  />
                  Show
                </label>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <h3>Buttons</h3>
      <ol className="lab-ops-drag" onDragOver={(event) => event.preventDefault()}>
        {config.buttons.map((button, index) => (
          <li
            key={button.id}
            draggable
            onDragStart={() => beginDrag("buttons", index)}
            onDrop={() => dropOn("buttons", index)}
          >
            <span aria-hidden="true">⋮⋮</span>
            <b>{index + 1}</b>
            {button.label}
            <input
              type="color"
              aria-label={`${button.label} color`}
              value={button.color}
              onChange={(event) => recolor(button, event.target.value)}
            />
            <label>
              <input type="checkbox" checked={button.enabled} onChange={() => toggleButton(button)} />
              Show
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
