import { Link } from "react-router-dom";
import { readEmployeeUser } from "../../employeeAuth";

const QUICK_LINKS = [
  {
    to: "/internal/announcements",
    title: "Announcements",
    body: "Company updates, releases, and all-hands notes.",
  },
  {
    to: "/internal/people",
    title: "People directory",
    body: "Find teammates, teams, and org contacts.",
  },
  {
    to: "/internal/resources",
    title: "Resources",
    body: "Policies, benefits, and onboarding guides.",
  },
] as const;

export function InternalHomePage() {
  const user = readEmployeeUser();

  return (
    <div className="internal-page">
      <header className="internal-page-header">
        <p className="internal-kicker">Welcome</p>
        <h1>Hello{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p>
          This is the CareScope employee intrasite — internal-only tools and
          updates for the people who build and support OneLab.
        </p>
      </header>

      <section className="internal-grid" aria-label="Quick links">
        {QUICK_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="internal-tile">
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
