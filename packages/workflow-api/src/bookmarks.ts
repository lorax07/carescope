import { v4 as uuid } from "uuid";

export const BOOKMARK_LIMIT = 10;

export type Bookmark = {
  id: string;
  userId: string;
  kind: string;
  objectId: string;
  title: string;
  detail: string;
  path: string;
  createdAt: string;
};

export type BookmarkInput = {
  kind: string;
  objectId: string;
  title: string;
  detail?: string;
  path: string;
};

export class BookmarkLimitError extends Error {
  readonly status = 409;
  readonly limit = BOOKMARK_LIMIT;

  constructor() {
    super(`A user can keep ${BOOKMARK_LIMIT} bookmarks.`);
    this.name = "BookmarkLimitError";
  }
}

export class BookmarkInputError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "BookmarkInputError";
  }
}

const byUser = new Map<string, Bookmark[]>();

export function resetBookmarks(): void {
  byUser.clear();
}

export function listBookmarks(userId: string): Bookmark[] {
  return [...(byUser.get(userId) ?? [])];
}

function clean(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") throw new BookmarkInputError(`${field} is required.`);
  const text = value.trim();
  if (!text || text.length > max) throw new BookmarkInputError(`${field} is required.`);
  return text;
}

function objectPath(value: unknown): string {
  const path = clean(value, "path", 240);
  if (!path.startsWith("/app/") && path !== "/app") {
    throw new BookmarkInputError("path must open an app object.");
  }
  if (path.includes("..") || /\s/.test(path)) {
    throw new BookmarkInputError("path must open an app object.");
  }
  return path;
}

export function addBookmark(userId: string, input: BookmarkInput): { bookmark: Bookmark; created: boolean } {
  const kind = clean(input.kind, "kind", 32);
  if (!/^[a-z0-9-]+$/.test(kind)) throw new BookmarkInputError("kind is required.");
  const objectId = clean(input.objectId, "objectId", 120);
  const title = clean(input.title, "title", 160);
  const detail = typeof input.detail === "string" ? input.detail.trim().slice(0, 200) : "";
  const path = objectPath(input.path);
  const current = byUser.get(userId) ?? [];
  const existing = current.find((item) => item.kind === kind && item.objectId === objectId);
  if (existing) return { bookmark: existing, created: false };
  if (current.length >= BOOKMARK_LIMIT) throw new BookmarkLimitError();
  const bookmark: Bookmark = {
    id: uuid(),
    userId,
    kind,
    objectId,
    title,
    detail,
    path,
    createdAt: new Date().toISOString(),
  };
  byUser.set(userId, [bookmark, ...current]);
  return { bookmark, created: true };
}

export function removeBookmark(userId: string, id: string): boolean {
  const current = byUser.get(userId) ?? [];
  const next = current.filter((item) => item.id !== id);
  if (next.length === current.length) return false;
  byUser.set(userId, next);
  return true;
}
