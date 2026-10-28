import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BuildPlanDialog } from "./BuildPlanDialog";
import { MARKETING_MODULES } from "./marketingModules";
import { CORE_PLANS, IMPLEMENTATION, SUPPORT, modulePriceLabel } from "./pricingQuote";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

export function PricingPage() {
  const [planOpen, setPlanOpen] = useState(false);
  const openPlanRef = useRef<HTMLButtonElement>(null);
  const closePlan = useCallback(() => {
    setPlanOpen(false);
    requestAnimationFrame(() => openPlanRef.current?.focus());
  }, []);

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
                  <tr key={row.id}>
                    <th scope="row">{row.plan}</th>
                    <td>{row.volume}</td>
                    <td>{row.priceLabel}</td>
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
                  <span className="lp-price-figure">{modulePriceLabel(module.slug)}</span>
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
              <li key={item.id}>
                <h3>{item.name}</h3>
                <strong>{item.priceLabel}</strong>
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
              <li key={tier.id}>
                <h3>{tier.name}</h3>
                <strong>{tier.priceLabel}</strong>
                <p>{tier.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-price-close">
          <h2>Match a plan to your laboratory</h2>
          <button type="button" className="lp-pill lp-pill-dark" ref={openPlanRef} onClick={() => setPlanOpen(true)}>
            Build your plan
          </button>
        </section>
      </main>
      {planOpen ? <BuildPlanDialog onClose={closePlan} /> : null}

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
