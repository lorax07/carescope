import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filter01Color, filter01Match, rememberFilter01 } from "../filter01";

export type Filter01Option = {
  id: string;
  label: string;
  category: string;
};

function readSaved(scope: string): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`carescope.filter01.${scope}`) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

/**
 * Filter01. Selected values sit in the field as chips.
 * All opens the categories for this page, and the list under it is those items.
 */
export function Filter01({
  label = "Filter",
  options,
  selected,
  onChange,
  scope,
  query = "",
  onQuery,
  className,
}: {
  label?: string;
  className?: string;
  options: Filter01Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  scope?: string;
  query?: string;
  onQuery?: (query: string) => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [category, setCategory] = useState("All");
  const [draft, setDraft] = useState(query);
  const [saved, setSaved] = useState<string[]>(() => (scope ? readSaved(scope) : []));

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCategoriesOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCategoriesOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const searchOptions = useMemo(
    () => saved.map((item) => ({ id: `search:${item}`, label: item, category: "Search" })),
    [saved],
  );
  const allOptions = scope ? [...options, ...searchOptions] : options;
  const categories = [...new Set(allOptions.map((item) => item.category))];
  const chosen = allOptions.filter((item) => selected.includes(item.id));
  const visible = allOptions.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    return filter01Match(`${item.label} ${item.category}`, draft);
  });

  function store(next: string[]) {
    setSaved(next);
    if (!scope) return;
    try {
      sessionStorage.setItem(`carescope.filter01.${scope}`, JSON.stringify(next));
    } catch {
      /* The menu still keeps the ten searches in memory. */
    }
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  function commitSearch() {
    const cleaned = draft.trim();
    onQuery?.(cleaned);
    if (!scope || !cleaned) return;
    store(rememberFilter01(saved, cleaned));
    const id = `search:${cleaned}`;
    if (!selected.includes(id)) onChange([...selected, id]);
  }

  return (
    <div className={className ? `filter01 ${className}` : "filter01"} ref={rootRef}>
      <div className="filter01-field">
        <div className="filter01-chips">
          {chosen.length ? (
            chosen.map((item) => (
              <span key={item.id} className="filter01-chip">
                <i style={{ background: filter01Color(item.id) }} aria-hidden="true" />
                {item.label}
                <button type="button" aria-label={`Remove ${item.label}`} onClick={() => toggle(item.id)}>
                  ×
                </button>
              </span>
            ))
          ) : (
            <button type="button" className="filter01-placeholder" onClick={() => setOpen(true)}>
              All
            </button>
          )}
        </div>
        <button
          type="button"
          className="filter01-chevron"
          aria-label={label}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            setCategoriesOpen(false);
            setOpen((current) => !current);
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="filter01-menu" id={menuId}>
          <label className="filter01-search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.2" />
              <path d="m10.2 10.2 3 3" />
            </svg>
            <input
              value={draft}
              placeholder="Search"
              aria-label={`${label} search`}
              onChange={(event) => {
                setDraft(event.target.value);
                onQuery?.(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitSearch();
                }
              }}
            />
            {draft ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setDraft("");
                  onQuery?.("");
                }}
              >
                ×
              </button>
            ) : null}
          </label>
          <div className="filter01-all">
            <button type="button" onClick={() => { setCategory("All"); setCategoriesOpen(false); }}>
              {category}
            </button>
            <button
              type="button"
              aria-label="Filter categories"
              aria-expanded={categoriesOpen}
              onClick={() => setCategoriesOpen((current) => !current)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {categoriesOpen ? (
              <ul className="filter01-categories">
                {["All", ...categories].map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      aria-selected={category === item}
                      onClick={() => {
                        setCategory(item);
                        setCategoriesOpen(false);
                      }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ul role="listbox" aria-label={label} aria-multiselectable="true">
            {visible.length ? (
              visible.map((item) => {
                const on = selected.includes(item.id);
                return (
                  <li key={item.id}>
                    <button type="button" role="option" aria-selected={on} onClick={() => toggle(item.id)}>
                      <i style={{ background: filter01Color(item.id) }} aria-hidden="true" />
                      <span>{item.label}</span>
                      {on ? (
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path d="m3.2 8.2 3 3 6.6-6.8" />
                        </svg>
                      ) : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="filter01-empty">Nothing in {category === "All" ? "this list" : category}</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
