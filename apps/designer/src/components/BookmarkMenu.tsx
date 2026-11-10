import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BOOKMARK_LIMIT,
  bookmarkTarget,
  deleteBookmark,
  loadBookmarks,
  saveBookmark,
  type BookmarkRecord,
} from "../bookmarks";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.5a1 1 0 0 1 1-1z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookmarkMenu({ userId }: { userId: string }) {
  const location = useLocation();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const [open, setOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [limit, setLimit] = useState(BOOKMARK_LIMIT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const target = bookmarkTarget(location.pathname);
  const saved = target ? bookmarks.some((item) => item.kind === target.kind && item.objectId === target.objectId) : false;

  useEffect(() => {
    const ticket = ++revision.current;
    loadBookmarks(userId)
      .then((result) => {
        if (ticket !== revision.current) return;
        setBookmarks(result.bookmarks);
        setLimit(result.limit);
        setError("");
      })
      .catch(() => {
        if (ticket === revision.current) setError("Bookmarks are unavailable.");
      });
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function addCurrent() {
    if (!target || saved || busy) return;
    const ticket = ++revision.current;
    setBusy(true);
    setError("");
    try {
      const created = await saveBookmark(userId, target);
      if (ticket !== revision.current) return;
      setBookmarks((current) => (current.some((item) => item.id === created.id) ? current : [created, ...current]));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `A user can keep ${limit} bookmarks.`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: BookmarkRecord) {
    const ticket = ++revision.current;
    setError("");
    const previous = bookmarks;
    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== item.id));
    try {
      await deleteBookmark(userId, item.id);
      if (ticket !== revision.current) return;
    } catch (cause) {
      if (ticket !== revision.current) return;
      setBookmarks(previous);
      setError(cause instanceof Error ? cause.message : "The bookmark could not be removed.");
    }
  }

  return (
    <div className="lims-bookmarks" ref={rootRef}>
      <button
        type="button"
        className={`lims-bookmark-btn${saved ? " is-saved" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Bookmarks"
        onClick={() => setOpen((current) => !current)}
      >
        <BookmarkIcon filled={saved} />
      </button>
      {open ? (
        <div className="lims-bookmark-menu" id={menuId} role="menu">
          {target ? (
            <button type="button" className="lims-bookmark-add" disabled={saved || busy || (!saved && bookmarks.length >= limit)} onClick={() => void addCurrent()}>
              {saved ? `${target.title} is bookmarked` : `Bookmark ${target.title}`}
            </button>
          ) : null}
          {error ? <p className="lims-bookmark-error">{error}</p> : null}
          {!error && target && !saved && bookmarks.length >= limit ? (
            <p className="lims-bookmark-error">A user can keep {limit} bookmarks.</p>
          ) : null}
          {bookmarks.length === 0 ? (
            <p className="lims-bookmark-empty">No bookmarks yet.</p>
          ) : (
            <ul>
              {bookmarks.map((item) => (
                <li key={item.id}>
                  <Link to={item.path} role="menuitem" onClick={() => setOpen(false)}>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </Link>
                  <button type="button" aria-label={`Remove ${item.title}`} onClick={() => void remove(item)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
