import { randomUUID } from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return randomUUID();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

export function assertSlug(slug: string): void {
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(slug)) {
    throw Object.assign(new Error("Slug must be 2–48 lowercase letters, numbers, or hyphens"), {
      status: 400,
    });
  }
}

export function databaseNameForSlug(slug: string): string {
  return `cs_${slug.replace(/-/g, "_")}`.slice(0, 63);
}

export function siteCodeForName(name: string, index: number): string {
  const letters = name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  return `${letters}-${String(index + 1).padStart(2, "0")}`;
}
