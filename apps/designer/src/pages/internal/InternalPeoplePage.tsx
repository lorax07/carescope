const PEOPLE = [
  { name: "Dr. Amara Okonkwo", team: "Executive", role: "CEO" },
  { name: "Julian Hart", team: "Engineering", role: "CTO" },
  { name: "Priya Natarajan", team: "Product", role: "CPO" },
  { name: "Marcus Ellison", team: "Quality", role: "CQO" },
  { name: "Elena Vargas", team: "Customer", role: "CCO" },
  { name: "Sam Rivera", team: "Engineering", role: "Platform Lead" },
  { name: "Nora Kim", team: "Design", role: "Design Lead" },
  { name: "Chris Adeyemi", team: "People Ops", role: "HR Business Partner" },
] as const;

export function InternalPeoplePage() {
  return (
    <div className="internal-page">
      <header className="internal-page-header">
        <p className="internal-kicker">Directory</p>
        <h1>People</h1>
        <p>Find teammates across CareScope.</p>
      </header>

      <ul className="internal-people">
        {PEOPLE.map((person) => (
          <li key={person.name}>
            <strong>{person.name}</strong>
            <span>{person.role}</span>
            <small>{person.team}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
