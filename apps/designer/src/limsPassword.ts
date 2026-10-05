import { LIMS_PASSWORD } from "./limsSession";

const KEY = "carescope.lims.password";

function hashPassword(password: string): string {
  let hash = 0;
  for (const char of password) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}

function savedHash(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function hasCustomPassword(): boolean {
  return savedHash() !== null;
}

export function passwordMatches(password: string): boolean {
  const saved = savedHash();
  if (!saved) return password === LIMS_PASSWORD;
  return hashPassword(password) === saved;
}

export function saveLimsPassword(password: string): void {
  localStorage.setItem(KEY, hashPassword(password));
}
