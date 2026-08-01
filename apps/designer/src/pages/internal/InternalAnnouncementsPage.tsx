const ANNOUNCEMENTS = [
  {
    date: "Jul 28, 2026",
    title: "OneLab sandbox signup flow is live for customer trials",
    body: "Product and GTM aligned on the new trial path. Share feedback in #product-feedback.",
  },
  {
    date: "Jul 21, 2026",
    title: "Q3 all-hands recording posted",
    body: "Strategy update, hiring plan, and lab partnership wins are available under Resources.",
  },
  {
    date: "Jul 14, 2026",
    title: "Security awareness refresh due by Aug 15",
    body: "Complete the short module in People Ops. Managers will receive completion reports.",
  },
] as const;

export function InternalAnnouncementsPage() {
  return (
    <div className="internal-page">
      <header className="internal-page-header">
        <p className="internal-kicker">Internal</p>
        <h1>Announcements</h1>
        <p>Company-wide updates for CareScope employees.</p>
      </header>

      <ul className="internal-feed">
        {ANNOUNCEMENTS.map((item) => (
          <li key={item.title}>
            <time>{item.date}</time>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
