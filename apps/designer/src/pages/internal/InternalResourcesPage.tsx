const RESOURCES = [
  {
    title: "Employee handbook",
    body: "Conduct, time off, and workplace guidelines.",
  },
  {
    title: "Benefits overview",
    body: "Health, retirement, and wellness programs.",
  },
  {
    title: "Security & compliance",
    body: "Access rules, phishing reporting, and device policy.",
  },
  {
    title: "Onboarding checklist",
    body: "First-week setup for new CareScope teammates.",
  },
] as const;

export function InternalResourcesPage() {
  return (
    <div className="internal-page">
      <header className="internal-page-header">
        <p className="internal-kicker">Library</p>
        <h1>Resources</h1>
        <p>Internal documents and guides for employees.</p>
      </header>

      <ul className="internal-resources">
        {RESOURCES.map((item) => (
          <li key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
