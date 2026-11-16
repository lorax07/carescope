/** Filter01 keeps the last 10 wildcard searches and matches `*` as any text. */
export const FILTER01_LIMIT = 10;

const DOTS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#6d5efc", "#14b8a6", "#f97316", "#ec4899"];

export function filter01Match(text: string, query: string): boolean {
  const cleaned = query.trim();
  if (!cleaned) return true;
  const pattern = cleaned.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(pattern, "i").test(text);
}

/** Newest search first. A repeat moves to the front. The oldest drops after 10. */
export function rememberFilter01(saved: readonly string[], query: string): string[] {
  const cleaned = query.trim();
  if (!cleaned) return [...saved];
  return [cleaned, ...saved.filter((item) => item !== cleaned)].slice(0, FILTER01_LIMIT);
}

export type Filter01Pin = {
  label: string;
  selected: string[];
  query: string;
};

export function filter01PinKey(pin: Pick<Filter01Pin, "selected" | "query">): string {
  return `${[...pin.selected].sort().join("\n")}\u0000${pin.query.trim()}`;
}

/** Newest pin first. The same selection and search replaces the older copy. */
export function rememberFilter01Pin(saved: readonly Filter01Pin[], pin: Filter01Pin): Filter01Pin[] {
  const key = filter01PinKey(pin);
  return [pin, ...saved.filter((item) => filter01PinKey(item) !== key)].slice(0, FILTER01_LIMIT);
}

export function filter01Color(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return DOTS[hash % DOTS.length] ?? DOTS[0];
}

export const wildcard01Match = filter01Match;
export const rememberWildcard01 = rememberFilter01;
