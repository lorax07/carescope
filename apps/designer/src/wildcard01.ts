/** Wildcard01 keeps the last 10 wildcard searches and matches `*` as any text. */
export const WILDCARD01_LIMIT = 10;

export function wildcard01Match(text: string, query: string): boolean {
  const cleaned = query.trim();
  if (!cleaned) return true;
  const pattern = cleaned.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(pattern, "i").test(text);
}

/** Newest search first. A repeat moves to the front. The oldest drops after 10. */
export function rememberWildcard01(saved: readonly string[], query: string): string[] {
  const cleaned = query.trim();
  if (!cleaned) return [...saved];
  return [cleaned, ...saved.filter((item) => item !== cleaned)].slice(0, WILDCARD01_LIMIT);
}
