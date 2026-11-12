import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCrm } from "../../crm";
import { PRIORITY_BOUNCE_MS, priorityBounceDue, priorityTotal, type PriorityCounts } from "../../topPriorities";
import { AllMessagesCard } from "./AllMessagesCard";

const COUNT_KEY = "carescope.crm.priority-count";
const TIME_KEY = "carescope.crm.priority-bounce-at";

const TILES: { id: keyof PriorityCounts; label: string; tone: string; to: string; detail: string }[] = [
  { id: "followUps", label: "Follow-ups", tone: "is-mint", to: "/app/connectivity/tasks", detail: "Open the tasks that are still due." },
  { id: "agreements", label: "Agreements", tone: "is-rose", to: "/app/connectivity/documents", detail: "Review contracts on the accounts." },
  { id: "projects", label: "Projects", tone: "is-amber", to: "/app/connectivity/opportunities", detail: "See work that is still moving." },
  { id: "watch", label: "Accounts to watch", tone: "is-pink", to: "/app/connectivity/health", detail: "Health signals with a next step." },
];

export function TopPriorities({
  defaultOpen = true,
  messages = true,
  hint = "Search uses the same accounts as the laboratory and Sequence Revenue.",
  ask = "Ask about an account, case, or project",
}: {
  defaultOpen?: boolean;
  messages?: boolean;
  hint?: string;
  ask?: string;
}) {
  const crm = useCrm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const [bouncing, setBouncing] = useState(false);
  const counts = useMemo<PriorityCounts>(() => {
    const followUps = crm.overlay.tasks.filter((task) => task.status !== "done").length;
    const agreements = crm.accounts.reduce((sum, account) => sum + account.agreements.filter((item) => item.status !== "Active").length, 0);
    const projects = crm.opportunities.filter((item) => item.stage !== "Won" && item.stage !== "Lost").length;
    const watch = crm.cards.filter((card) => card.health !== "Healthy").length;
    return { followUps, agreements, projects, watch };
  }, [crm.accounts, crm.cards, crm.opportunities, crm.overlay.tasks]);
  const total = priorityTotal(counts);

  useEffect(() => {
    let timer = 0;
    let frame = 0;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    function run() {
      const now = Date.now();
      const seen = Number(sessionStorage.getItem(COUNT_KEY) || "0");
      const last = Number(sessionStorage.getItem(TIME_KEY) || "0");
      const due = !reduced && priorityBounceDue({ total, seen, lastBounceAt: last, now });
      if (due) {
        frame = window.requestAnimationFrame(() => {
          sessionStorage.setItem(COUNT_KEY, String(total));
          sessionStorage.setItem(TIME_KEY, String(Date.now()));
          setBouncing(false);
          frame = window.requestAnimationFrame(() => setBouncing(true));
        });
      } else if (total !== seen) {
        sessionStorage.setItem(COUNT_KEY, String(total));
      }
      const nextLast = due ? now : Number(sessionStorage.getItem(TIME_KEY) || "0");
      const wait = total > 0 && nextLast ? Math.max(1000, PRIORITY_BOUNCE_MS - (Date.now() - nextLast)) : PRIORITY_BOUNCE_MS;
      timer = window.setTimeout(run, wait);
    }
    run();
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [total]);

  return (
    <section className={`client-card top-priorities${open ? " is-open" : ""}${bouncing ? " is-bouncing" : ""}`} onAnimationEnd={() => setBouncing(false)}>
      <button type="button" className="top-priorities-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <h2>Top Priorities</h2>
        <svg viewBox="0 0 16 16" aria-hidden="true" className={open ? "is-open" : undefined}>
          <path d="M4 6.2 8 10.2 12 6.2" />
        </svg>
      </button>
      {open ? (
        <div className="client-assist">
          <div className="client-assist-grid">
            {TILES.map((tile) => (
              <Link key={tile.id} to={tile.to}>
                <i className={tile.tone} />
                <span>{tile.label}</span>
                <small>{tile.detail}</small>
              </Link>
            ))}
          </div>
          <form
            className="client-assist-ask"
            onSubmit={(event) => {
              event.preventDefault();
              const query = draft.trim();
              if (!query) return;
              navigate(`/app/connectivity/clients?q=${encodeURIComponent(query)}`);
            }}
          >
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={ask} aria-label={ask} />
            <button type="submit" aria-label="Search accounts">↑</button>
          </form>
          <p className="client-assist-hint">{hint}</p>
          {messages ? <AllMessagesCard heading="Recent Messages" limit={4} /> : null}
        </div>
      ) : (
        <div className="top-priorities-counts">
          {TILES.map((tile) => (
            <span key={tile.id}>
              <i className={tile.tone} aria-hidden="true" />
              <b>{counts[tile.id]}</b>
              <span className="sr-only">{tile.label}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
