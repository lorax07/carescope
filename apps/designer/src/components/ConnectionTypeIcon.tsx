import type { ConnectionIconKind } from "../connectionTypes";

export function ConnectionTypeIcon({ kind }: { kind: ConnectionIconKind }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {kind === "trigger" ? (
        <path fill="currentColor" d="M9.15 1.05 3.05 8.85h4.05l-.85 6.1 6.55-8.35H8.55l.6-5.55Z" />
      ) : null}
      {kind === "decision" ? (
        <>
          <path d="M1.6 8h3.5M5.1 8 8.7 4.2h5.5M5.1 8 8.7 11.8h5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="1.7" cy="8" r="1.15" fill="currentColor" />
          <circle cx="14.2" cy="4.2" r="1.15" fill="currentColor" />
          <circle cx="14.2" cy="11.8" r="1.15" fill="currentColor" />
        </>
      ) : null}
      {kind === "start-end" ? (
        <>
          <circle cx="4.7" cy="8" r="3.15" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="9.15" y="4.85" width="6.1" height="6.3" rx="1.1" fill="currentColor" />
        </>
      ) : null}
      {kind === "start" ? (
        <>
          <circle cx="8" cy="8" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="8" cy="8" r="2.05" fill="currentColor" />
        </>
      ) : null}
      {kind === "end" ? (
        <>
          <rect x="2.35" y="2.35" width="11.3" height="11.3" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <rect x="5.35" y="5.35" width="5.3" height="5.3" rx="0.7" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}
