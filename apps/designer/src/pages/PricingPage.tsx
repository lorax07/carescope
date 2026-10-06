import { Link } from "react-router-dom";
import { MARKETING_MODULES } from "./marketingModules";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

const CORE_PLANS = [
  { plan: "Starter", volume: "Under 10K", price: "1st year free, then $15K / year" },
  { plan: "Essential", volume: "10K–25K", price: "$50K / year" },
  { plan: "Professional", volume: "25K–50K", price: "$100K / year" },
  { plan: "Growth", volume: "50K–100K", price: "$200K / year" },
  { plan: "Scale", volume: "100K–250K", price: "$400K / year" },
  { plan: "Advanced", volume: "250K–500K", price: "$800K / year" },
  { plan: "Premier", volume: "500K–1M", price: "$1.6M / year" },
  { plan: "Enterprise", volume: "1M+", price: "Custom" },
] as const;

const MODULE_PRICES: Record<string, string> = {
  operations: "Included",
  instruments: "+$1,500/mo",
  compliance: "+$1,500/mo",
  client: "+$1,000/mo",
  revenue: "+$2,500/mo",
  insights: "+$1,000/mo",
};

const IMPLEMENTATION = [
  { name: "Database Transfer", price: "+$8,000" },
  { name: "Core System Installation", price: "+$5,000" },
  { name: "Validation Deliverables", price: "+$8,000" },
] as const;

const SUPPORT = [
  {
    name: "Standard",
    price: "Included",
    detail: "Monday to Friday, business hours, by email. A reply within one business day for the modules you subscribe to.",
  },
  {
    name: "Priority",
    price: "15% of the annual plan",
    detail: "Phone and email during business hours. Critical issues are answered within 4 hours.",
  },
  {
    name: "Premium",
    price: "22% of the annual plan",
    detail: "Critical issues are covered 24×7, with a reply within 1 hour, a named contact, and a quarterly review.",
  },
] as const;

export function PricingPage() {
  return (
    <div className="lp-page lp-pricing">
      <SiteHeader />
      <main className="lp-price">
        <header className="lp-price-intro">
          <h1 className="lp-display-head">Pricing</h1>
          <p>
            Sequence Operations is priced by the samples your laboratory runs in a year. Add modules,
            implementation, and support only when you need them.
          </p>
        </header>

        <section className="lp-price-block" aria-labelledby="core-price-heading">
          <div className="lp-section-head">
            <h2 id="core-price-heading" className="lp-display-head">Core product</h2>
            <p>Annual price for one laboratory. The band follows accessions in a year.</p>
          </div>
          <div className="lp-price-table-wrap">
            <table className="lp-price-table">
              <caption className="sr-only">Core Sequence price by annual sample volume</caption>
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Annual samples</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {CORE_PLANS.map((row) => (
                  <tr key={row.volume}>
                    <th scope="row">{row.plan}</th>
                    <td>{row.volume}</td>
                    <td>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lp-price-block" aria-labelledby="module-price-heading">
          <div className="lp-section-head">
            <h2 id="module-price-heading" className="lp-display-head">Modules</h2>
            <p>Sequence Operations is included in the core price. The other modules are a monthly add-on.</p>
          </div>
          <ul className="lp-price-modules">
            {MARKETING_MODULES.map((module) => (
              <li key={module.slug}>
                <Link to={`/modules/${module.slug}`} className={`lp-module-card is-${module.slug}`}>
                  <span className={`lp-platform-icon ${module.tone}`} aria-hidden="true">
                    {module.icon}
                  </span>
                  <strong>{module.title}</strong>
                  <span className="lp-price-figure">{MODULE_PRICES[module.slug]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-price-block" aria-labelledby="implementation-heading">
          <div className="lp-section-head">
            <h2 id="implementation-heading" className="lp-display-head">First-time implementation</h2>
            <p>Charged once, at the start. Each item can be taken on its own.</p>
          </div>
          <ul className="lp-price-fees">
            {IMPLEMENTATION.map((item) => (
              <li key={item.name}>
                <h3>{item.name}</h3>
                <strong>{item.price}</strong>
                <span>One time</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-price-block" aria-labelledby="support-heading">
          <div className="lp-section-head">
            <h2 id="support-heading" className="lp-display-head">Support</h2>
            <p>
              Standard support is included. Faster coverage is a share of the annual subscription, which is the usual
              range for enterprise software. On a $100K plan, Priority is $15K a year and Premium is $22K a year.
              Enterprise support is part of the custom quote. During the free year of Starter, Standard is included.
            </p>
          </div>
          <ul className="lp-price-support">
            {SUPPORT.map((tier) => (
              <li key={tier.name}>
                <h3>{tier.name}</h3>
                <strong>{tier.price}</strong>
                <p>{tier.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-price-close">
          <h2>Match a plan to your laboratory</h2>
          <Link to="/app?signup=1" className="lp-pill lp-pill-dark">
            Request a Demo
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner lp-section-wide">
          <p className="lp-copyright">© 2026 Carescope, All Rights Reserved</p>
          <nav>
            <a href="/intrasite" className="lp-footer-intrasite">
              Sequence Intrasite Access
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
