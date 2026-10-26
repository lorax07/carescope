import { useEffect, useRef, useState } from "react";
import { CONNECTION_TYPES, dropdownIcon, type NodeConnectionType } from "../connectionTypes";
import { ConnectionTypeIcon } from "./ConnectionTypeIcon";

export function ConnectionTypeSelect({
  value,
  onChange,
}: {
  value: NodeConnectionType;
  onChange: (next: NodeConnectionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    const close = (event: Event) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    place();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div className="connection-type-field">
      <span id="connection-type-label">Connection type</span>
      <div className={`connection-type-select${open ? " is-open" : ""}`} ref={rootRef}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="connection-type-label"
          onClick={() => setOpen((current) => !current)}
        >
          <ConnectionTypeIcon kind={dropdownIcon(value)} />
          <span>{value}</span>
          <i aria-hidden="true" />
        </button>
        {open && box ? (
          <ul className="connection-type-menu" role="listbox" aria-labelledby="connection-type-label" style={{ top: box.top, left: box.left, width: box.width }}>
            {CONNECTION_TYPES.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  role="option"
                  aria-selected={type === value}
                  onClick={() => {
                    onChange(type);
                    setOpen(false);
                  }}
                >
                  <ConnectionTypeIcon kind={dropdownIcon(type)} />
                  <span>{type}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
