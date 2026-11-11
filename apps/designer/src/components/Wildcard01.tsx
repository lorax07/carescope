import { useEffect, useId, useRef, useState } from "react";
import { rememberWildcard01 } from "../wildcard01";

function readSaved(scope: string): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`carescope.wildcard01.${scope}`) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

/**
 * Wildcard01. Double-click to type a search, then press Enter.
 * The search is kept on this button, up to 10, with the oldest removed.
 */
export function Wildcard01({
  scope,
  active,
  query = "",
  onSearch,
}: {
  scope: string;
  active: boolean;
  query?: string;
  onSearch: (query: string) => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<string[]>(() => readSaved(scope));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function store(next: string[]) {
    setSaved(next);
    try {
      sessionStorage.setItem(`carescope.wildcard01.${scope}`, JSON.stringify(next));
    } catch {
      /* The menu still keeps the ten searches in memory. */
    }
  }

  function run(query: string) {
    const cleaned = query.trim();
    if (!cleaned) return;
    store(rememberWildcard01(saved, cleaned));
    setDraft("");
    setEditing(false);
    setOpen(false);
    onSearch(cleaned);
  }

  return (
    <div className={`wildcard01${active ? " is-on" : ""}`} ref={rootRef}>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          aria-label="Custom Filter wildcard search"
          placeholder="*account*"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              run(draft);
            }
            if (event.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="wildcard01-trigger"
          role="tab"
          aria-selected={active}
          title="Double-click to wildcard search"
          onDoubleClick={() => {
            setDraft(query);
            setOpen(false);
            setEditing(true);
          }}
        >
          {active && query ? query : "Custom Filter"}
        </button>
      )}
      <button
        type="button"
        className="wildcard01-menu-btn"
        aria-label="Saved wildcard searches"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <ul className="wildcard01-menu" id={menuId}>
          {saved.length ? (
            saved.map((item) => (
              <li key={item}>
                <button type="button" onClick={() => run(item)}>
                  {item}
                </button>
              </li>
            ))
          ) : (
            <li className="wildcard01-empty">No saved searches</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
