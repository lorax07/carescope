import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCrm } from "../../crm";
import { closePriorityFlyout, consumeArrival, pinPriorities, unpinPriorities, usePriorityPanel } from "../../priorityPanel";
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

function PinButton({ pinned, onPin }: { pinned: boolean; onPin: () => void }) {
  return (
    <button type="button" className={`top-priorities-pin${pinned ? " is-on" : ""}`} aria-pressed={pinned} aria-label={pinned ? "Unpin priorities" : "Pin priorities on this page"} onClick={onPin}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4.5h6l-.8 5.2 2.3 2.3H7.5l2.3-2.3L9 4.5Z" />
        <path d="M12 12v7.5" />
      </svg>
    </button>
  );
}

export function PriorityFlyout() {
  const { open, closing } = usePriorityPanel();
  const [place, setPlace] = useState({ top: 64, right: 16, width: 420 });
  useLayoutEffect(() => {
    if (!open) return;
    function placeFlyout() {
      const bell = document.querySelector("[data-priority-bell]");
      const rect = bell?.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(420, window.innerWidth - margin * 2);
      const bellRight = rect ? Math.max(margin, window.innerWidth - rect.right) : margin;
      const right = Math.max(margin, Math.min(bellRight, window.innerWidth - width - margin));
      setPlace({ top: (rect?.bottom ?? 56) + 8, right, width });
    }
    placeFlyout();
    window.addEventListener("resize", placeFlyout);
    return () => window.removeEventListener("resize", placeFlyout);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closePriorityFlyout();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".priority-flyout") || target.closest("[data-priority-bell]")) return;
      closePriorityFlyout();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);
  if (!open) return null;
  return (
    <div id="top-priorities-flyout" className={`priority-flyout${closing ? " is-closing" : ""}`} style={{ top: place.top, right: place.right, width: place.width }}>
      <TopPriorities surface="flyout" />
    </div>
  );
}

export function TopPriorities({
  defaultOpen = true,
  messages = true,
  hint = "Search uses the same accounts as the laboratory and Sequence Revenue.",
  ask = "Ask about an account, case, or project",
  surface = "page",
}: {
  defaultOpen?: boolean;
  messages?: boolean;
  hint?: string;
  ask?: string;
  surface?: "page" | "flyout";
}) {
  const panel = usePriorityPanel();
  const crm = useCrm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const [leaving, setLeaving] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [entering] = useState(() => surface === "page" && consumeArrival());
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

  useEffect(() => {
    if (!panel.pulse || surface !== "page") return;
    setPulsing(true);
  }, [panel.pulse, surface]);

  function onPin() {
    if (!panel.pinned) {
      pinPriorities();
      return;
    }
    if (surface === "flyout" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      unpinPriorities();
      return;
    }
    setLeaving(true);
  }

  return (
    <section
      className={`client-card top-priorities${open ? " is-open" : ""}${bouncing ? " is-bouncing" : ""}${leaving ? " is-unpinning" : ""}${pulsing ? " is-bell-pulse" : ""}${entering ? " is-pinning" : ""}`}
      data-priorities-slot={surface === "page" ? "" : undefined}
      onAnimationEnd={() => {
        setBouncing(false);
        setPulsing(false);
        if (leaving) {
          setLeaving(false);
          unpinPriorities();
        }
      }}
    >
      <div className="top-priorities-bar">
        {open ? (
          <div className="top-priorities-toggle">
            <h2>Top Priorities</h2>
          </div>
        ) : (
          <button type="button" className="top-priorities-toggle" aria-expanded={false} onClick={() => setOpen(true)}>
            <h2>Top Priorities</h2>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6.2 8 10.2 12 6.2" />
            </svg>
          </button>
        )}
        <PinButton pinned={panel.pinned} onPin={onPin} />
      </div>
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
