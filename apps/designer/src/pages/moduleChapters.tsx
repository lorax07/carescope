import { NavLink, useLocation } from "react-router-dom";

export type ChapterTool = {
  to: string;
  label: string;
  /** Path prefix that marks this page as the current tool. */
  match: string;
};

export type ModuleChapter = {
  id: string;
  to: string;
  label: string;
  question: string;
  end?: boolean;
  /** Keep the tools for routing without a second row of links. */
  hideTools?: boolean;
  tools: ChapterTool[];
};

/**
 * Sequence Client, as an account manager would use it.
 * The briefing stays on the module home. These four are the places you work.
 */
export const CLIENT_CHAPTERS: ModuleChapter[] = [
  {
    id: "client",
    to: "/app/connectivity/clients",
    label: "Client",
    question: "The people and accounts you work with.",
    hideTools: true,
    tools: [
      { to: "/app/connectivity/clients", label: "Client", match: "/app/connectivity/clients" },
      { to: "/app/connectivity/contacts", label: "People", match: "/app/connectivity/contacts" },
      { to: "/app/connectivity/documents", label: "Agreements", match: "/app/connectivity/documents" },
      { to: "/app/connectivity/health", label: "Health", match: "/app/connectivity/health" },
    ],
  },
  {
    id: "tasks",
    to: "/app/connectivity/tasks",
    label: "Tasks",
    question: "What is due for a client.",
    hideTools: true,
    tools: [
      { to: "/app/connectivity/tasks", label: "Tasks", match: "/app/connectivity/tasks" },
      { to: "/app/connectivity/communications", label: "Messages", match: "/app/connectivity/communications" },
      { to: "/app/connectivity/activities", label: "Activity", match: "/app/connectivity/activities" },
      { to: "/app/connectivity/issues", label: "Issues", match: "/app/connectivity/issues" },
    ],
  },
  {
    id: "projects",
    to: "/app/connectivity/opportunities",
    label: "Projects",
    question: "Work moving through the laboratory.",
    hideTools: true,
    tools: [{ to: "/app/connectivity/opportunities", label: "Projects", match: "/app/connectivity/opportunities" }],
  },
  {
    id: "growth",
    to: "/app/connectivity/analytics",
    label: "Growth Hub",
    question: "Where the book of business can grow.",
    hideTools: true,
    tools: [{ to: "/app/connectivity/analytics", label: "Growth Hub", match: "/app/connectivity/analytics" }],
  },
];

/**
 * Sequence Revenue, as a billing lead would use it.
 * Setup stays off this row. Performance is the only reporting stop.
 */
export const REVENUE_CHAPTERS: ModuleChapter[] = [
  {
    id: "claims",
    to: "/app/billing/claims",
    label: "Claims",
    question: "Every claim, from charge capture to submission.",
    tools: [
      { to: "/app/billing/claims", label: "Claims", match: "/app/billing/claims" },
      { to: "/app/billing/capture", label: "Charge capture", match: "/app/billing/capture" },
    ],
  },
  {
    id: "exceptions",
    to: "/app/billing/queues",
    label: "Exceptions",
    question: "What is blocked until someone acts.",
    tools: [{ to: "/app/billing/queues", label: "Exceptions", match: "/app/billing/queues" }],
  },
  {
    id: "cash",
    to: "/app/billing/payments",
    label: "Cash",
    question: "What was paid, refused, or still owed.",
    tools: [
      { to: "/app/billing/payments", label: "Payments", match: "/app/billing/payments" },
      { to: "/app/billing/denials", label: "Denials", match: "/app/billing/denials" },
      { to: "/app/billing/ar", label: "Receivables", match: "/app/billing/ar" },
    ],
  },
  {
    id: "performance",
    to: "/app/billing/analytics",
    label: "Performance",
    question: "The patterns behind the money.",
    tools: [{ to: "/app/billing/analytics", label: "Performance", match: "/app/billing/analytics" }],
  },
];

function pathHits(pathname: string, match: string): boolean {
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function chapterForPath(chapters: readonly ModuleChapter[], pathname: string): ModuleChapter | null {
  let best: { chapter: ModuleChapter; length: number } | null = null;
  for (const chapter of chapters) {
    const matches = [chapter.to, ...chapter.tools.map((tool) => tool.match)];
    for (const match of matches) {
      if (!pathHits(pathname, match)) continue;
      if (!best || match.length > best.length) best = { chapter, length: match.length };
    }
  }
  return best?.chapter ?? null;
}

export function toolForPath(chapter: ModuleChapter | null, pathname: string): ChapterTool | null {
  if (!chapter) return null;
  return chapter.tools.find((tool) => pathHits(pathname, tool.match)) ?? null;
}

/** Four work areas. This is not the app’s screen-tab strip. */
export function ModuleChapters({
  chapters,
  label,
}: {
  chapters: readonly ModuleChapter[];
  label: string;
}) {
  const { pathname } = useLocation();
  const current = chapterForPath(chapters, pathname);
  const tools = current && !current.hideTools && current.tools.length > 1 ? current.tools : [];

  return (
    <>
      <nav className="module-chapters" aria-label={label}>
        {chapters.map((chapter) => {
          const on = current?.id === chapter.id;
          return (
            <NavLink key={chapter.id} to={chapter.to} end={chapter.end} className={on ? "is-on" : undefined} aria-current={on ? "page" : undefined}>
              <strong>{chapter.label}</strong>
              <span>{chapter.question}</span>
            </NavLink>
          );
        })}
      </nav>
      {tools.length ? (
        <nav className="chapter-tools" aria-label={`${current?.label ?? "Chapter"} pages`}>
          {tools.map((tool) => {
            const on = pathHits(pathname, tool.match);
            return (
              <NavLink key={tool.match} to={tool.to} className={on ? "is-on" : undefined} aria-current={on ? "page" : undefined}>
                {tool.label}
              </NavLink>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
