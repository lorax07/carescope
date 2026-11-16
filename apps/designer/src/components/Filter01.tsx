import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filter01Color, filter01PinKey, filter01Match, rememberFilter01, rememberFilter01Pin, type Filter01Pin } from "../filter01";

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

function readPins(scope: string): Filter01Pin[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`carescope.filter01.pins.${scope}`) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const pin = item as Partial<Filter01Pin>;
      if (typeof pin.label !== "string" || typeof pin.query !== "string" || !Array.isArray(pin.selected)) return [];
      const selected = pin.selected.filter((id): id is string => typeof id === "string");
      return [{ label: pin.label, query: pin.query, selected }];
    }).slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Filter01. Selected values sit in the field as chips.
 * All opens the categories for this page, and Apply commits the checks.
 * A pin saves the current filter as a pill beside the field.
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
  const [pending, setPending] = useState(selected);
  const [saved, setSaved] = useState<string[]>(() => (scope ? readSaved(scope) : []));
  const [pins, setPins] = useState<Filter01Pin[]>(() => (scope ? readPins(scope) : []));

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    if (!open) setPending(selected);
  }, [open, selected]);

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
  const appliedKey = filter01PinKey({ selected, query });

  function store(next: string[]) {
    setSaved(next);
    if (!scope) return;
    try {
      sessionStorage.setItem(`carescope.filter01.${scope}`, JSON.stringify(next));
    } catch {
      /* The menu still keeps the ten searches in memory. */
    }
  }

  function storePins(next: Filter01Pin[]) {
    setPins(next);
    if (!scope) return;
    try {
      sessionStorage.setItem(`carescope.filter01.pins.${scope}`, JSON.stringify(next));
    } catch {
      /* The pins stay beside the field for this visit. */
    }
  }

  function toggle(id: string) {
    setPending((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function remove(id: string) {
    const next = selected.filter((item) => item !== id);
    onChange(next);
    setPending(next);
  }

  function apply(nextSelected = pending, nextQuery = draft) {
    const cleaned = nextQuery.trim();
    let next = nextSelected;
    onQuery?.(cleaned);
    if (scope && cleaned) {
      store(rememberFilter01(saved, cleaned));
      const id = `search:${cleaned}`;
      if (!next.includes(id)) next = [...next, id];
    }
    onChange(next);
    setDraft(cleaned);
    setPending(next);
    setOpen(false);
    setCategoriesOpen(false);
  }

  function pinFilter() {
    const names = chosen.map((item) => item.label);
    const labelText = names.length ? names.join(", ") : query.trim() || "All";
    storePins(rememberFilter01Pin(pins, { label: labelText, selected: [...selected], query: query.trim() }));
  }

  function applyPin(pin: Filter01Pin) {
    setDraft(pin.query);
    setPending(pin.selected);
    onQuery?.(pin.query);
    onChange(pin.selected);
    setOpen(false);
    setCategoriesOpen(false);
  }

  return (
    <div className={className ? `filter01 ${className}` : "filter01"} ref={rootRef}>
      <div className="filter01-row">
        <div className="filter01-field">
          <div className="filter01-chips">
            {chosen.length ? (
              chosen.map((item) => (
                <span key={item.id} className="filter01-chip">
                  <i style={{ background: filter01Color(item.id) }} aria-hidden="true" />
                  {item.label}
                  <button type="button" aria-label={`Remove ${item.label}`} onClick={() => remove(item.id)}>
                    ×
                  </button>
                </span>
              ))
            ) : (
              <button type="button" className="filter01-placeholder" onClick={() => { setPending(selected); setOpen(true); }}>
                All
              </button>
            )}
          </div>
          <button
            type="button"
            className={pins.some((pin) => filter01PinKey(pin) === appliedKey) ? "filter01-pin is-on" : "filter01-pin"}
            aria-label="Pin this filter"
            onClick={pinFilter}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6.1 2.1h3.8l-.7 3.2 2.3 2.2H4.5l2.3-2.2-.7-3.2Z" />
              <path d="M8 7.5v6.4" />
            </svg>
          </button>
          <button
            type="button"
            className="filter01-chevron"
            aria-label={label}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => {
              setCategoriesOpen(false);
              setPending(selected);
              setOpen((current) => !current);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
        </div>
        {pins.map((pin) => (
          <span key={filter01PinKey(pin)} className={filter01PinKey(pin) === appliedKey ? "filter01-pinned is-on" : "filter01-pinned"}>
            <button type="button" onClick={() => applyPin(pin)}>
              <span>{pin.label}</span>
            </button>
            <button type="button" aria-label={`Remove pinned filter ${pin.label}`} onClick={() => storePins(pins.filter((item) => filter01PinKey(item) !== filter01PinKey(pin)))}>
              ×
            </button>
          </span>
        ))}
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
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
            />
            {draft ? (
              <button type="button" aria-label="Clear search" onClick={() => setDraft("")}>
                ×
              </button>
            ) : null}
          </label>
          <div className="filter01-all">
            <button type="button" className="filter01-category" onClick={() => { setCategory("All"); setCategoriesOpen(false); }}>
              {category}
            </button>
            <button
              type="button"
              className="filter01-category-chevron"
              aria-label="Filter categories"
              aria-expanded={categoriesOpen}
              onClick={() => setCategoriesOpen((current) => !current)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            <button type="button" className="filter01-apply" onClick={() => apply()}>
              Apply
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
                const on = pending.includes(item.id);
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
