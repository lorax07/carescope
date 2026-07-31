import { Link } from "react-router-dom";
import "./landing.css";
import "./company.css";

const CULTURE = [
  {
    title: "Science before software theater",
    body: "We build for the people who touch samples, instruments, and audits every day. If a feature doesn’t make laboratory work clearer or safer, it doesn’t ship.",
  },
  {
    title: "One platform, one truth",
    body: "Fragmented stacks create fragmented accountability. CareScope exists so labs can run operations, quality, and client experience from a single governed system of record.",
  },
  {
    title: "Compliance as a craft",
    body: "Regulated environments deserve elegance, not paperwork piles. We treat auditability, signatures, and chain of custody as product design problems — not afterthoughts.",
  },
  {
    title: "Partnership over pilots",
    body: "We stay close to laboratory directors, QA leads, and operators. Their constraints shape our roadmap more than trend charts ever will.",
  },
] as const;

const EXECUTIVE_TEAM = [
  {
    name: "Dr. Amara Okonkwo",
    role: "Chief Executive Officer",
    focus: "Laboratory operations strategy and customer outcomes",
    initials: "AO",
  },
  {
    name: "Julian Hart",
    role: "Chief Technology Officer",
    focus: "Platform architecture, interoperability, and reliability",
    initials: "JH",
  },
  {
    name: "Priya Natarajan",
    role: "Chief Product Officer",
    focus: "Module experience across sample lifecycle and analytics",
    initials: "PN",
  },
  {
    name: "Marcus Ellison",
    role: "Chief Quality & Compliance Officer",
    focus: "GxP readiness, validation, and controlled change",
    initials: "ME",
  },
  {
    name: "Elena Vargas",
    role: "Chief Customer Officer",
    focus: "Implementation, training, and long-term lab partnership",
    initials: "EV",
  },
] as const;

export function OurCompanyPage() {
  return (
    <div className="lp company">
      <div className="lp-frame">
        <header className="lp-nav">
          <Link to="/" className="lp-logo" aria-label="CareScope home">
            <span className="lp-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="28" height="28">
                <circle cx="16" cy="16" r="14" fill="#1B6EF3" />
                <path
                  d="M16 7.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 3.2a2.4 2.4 0 0 1 2.4 2.4v1.1l1.8.9a1 1 0 0 1 .05 1.75l-1.85.9v1.85a2.4 2.4 0 1 1-4.8 0v-1.85l-1.85-.9a1 1 0 0 1 .05-1.75l1.8-.9V13.1A2.4 2.4 0 0 1 16 10.7Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <span className="lp-logo-word">
              <span className="lp-brand-care">CareScope</span>
            </span>
          </Link>

          <nav className="lp-nav-links" aria-label="Primary">
            <Link to="/#capabilities">Capabilities</Link>
            <Link to="/#workflows">Workflows</Link>
            <Link to="/#compliance">Compliance</Link>
            <Link to="/company" className="is-active">
              Our Company
            </Link>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/app?signin=1" className="lp-link-quiet">
              Sign in
            </Link>
            <Link to="/app?signup=1" className="lp-btn lp-btn-primary">
              Try OneLab
            </Link>
          </div>
        </header>

        <section className="company-hero" aria-labelledby="company-brand">
          <p className="lp-brand-lockup" id="company-brand">
            <span className="lp-brand-care">CareScope</span>{" "}
            <span className="lp-brand-onelab">OneLab</span>
          </p>
          <h1 className="company-hero-title">Our company</h1>
          <p className="company-hero-lede">
            We build laboratory software that respects the craft of science —
            and the people who practice it.
          </p>
        </section>
      </div>

      <section className="lp-section" id="culture">
        <div className="lp-section-inner lp-section-wide">
          <p className="lp-eyebrow">Culture</p>
          <h2 className="lp-h2">What we hold ourselves to</h2>
          <p className="lp-section-lede company-culture-lede">
            These statements guide how we hire, ship, and support laboratories
            every week.
          </p>

          <ol className="company-culture-list">
            {CULTURE.map((item, index) => (
              <li
                key={item.title}
                className="company-culture-item"
                style={{ animationDelay: `${0.08 + index * 0.07}s` }}
              >
                <span className="company-culture-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-section lp-section-tint" id="team">
        <div className="lp-section-inner lp-section-wide">
          <p className="lp-eyebrow">Leadership</p>
          <h2 className="lp-h2">Executive team</h2>
          <p className="lp-section-lede company-team-lede">
            Five leaders accountable for product, quality, technology, and the
            laboratories we serve.
          </p>

          <ul className="company-team-list">
            {EXECUTIVE_TEAM.map((person, index) => (
              <li
                key={person.name}
                className="company-team-person"
                style={{ animationDelay: `${0.1 + index * 0.06}s` }}
              >
                <span className="company-team-avatar" aria-hidden="true">
                  {person.initials}
                </span>
                <div>
                  <h3>{person.name}</h3>
                  <p className="company-team-role">{person.role}</p>
                  <p className="company-team-focus">{person.focus}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-cta-band">
        <div className="lp-cta-band-inner lp-section-wide">
          <h2 className="lp-h2">Build with us.</h2>
          <p>
            Explore OneLab, or talk with our team about bringing CareScope into
            your laboratory network.
          </p>
          <Link to="/app?signup=1" className="lp-btn lp-btn-primary lp-btn-lg">
            Try OneLab
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner lp-section-wide">
          <span className="lp-logo-word">
            <span className="lp-brand-care">CareScope</span>
          </span>
          <span>Laboratory information management</span>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/app">LIMS</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
