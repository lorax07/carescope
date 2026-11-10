import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BuildPlanDialog } from "./BuildPlanDialog";
import { MARKETING_MODULES } from "./marketingModules";
import { QuoteStartDialog } from "./QuoteStartDialog";
import {
  CORE_PLANS,
  IMPLEMENTATION,
  MODULE_OFFERS,
  SUPPORT,
  formatMoney,
  modulePriceLabel,
  quotePlan,
  type PlanQuote,
} from "./pricingQuote";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

type CardDraft = {
  coreId: string;
  modules: string[];
  supportId: string;
  addonsOpen: boolean;
};

function cardPrice(quote: PlanQuote): { amount: string; unit: string; aside: string } {
  if (quote.custom || quote.yearOne == null || quote.ongoing == null) {
    return { amount: "Custom", unit: "", aside: "Quoted for this volume" };
  }
  if (quote.yearOne !== quote.ongoing) {
    return {
      amount: formatMoney(quote.yearOne),
      unit: "first year",
      aside: `then ${formatMoney(quote.ongoing)} / year`,
    };
  }
  return { amount: formatMoney(quote.yearOne), unit: "/ year", aside: "" };
}

export function PricingPage() {
  const location = useLocation();
  const [planOpen, setPlanOpen] = useState(Boolean((location.state as { buildPlan?: boolean } | null)?.buildPlan));
  const [cards, setCards] = useState<CardDraft[]>(() =>
    CORE_PLANS.map((plan) => ({ coreId: plan.id, modules: [], supportId: SUPPORT[0].id, addonsOpen: false })),
  );
  const [quoteIndex, setQuoteIndex] = useState<number | null>(null);
  const openPlanRef = useRef<HTMLButtonElement>(null);
  const closePlan = useCallback(() => {
    setPlanOpen(false);
    requestAnimationFrame(() => openPlanRef.current?.focus());
  }, []);

  useEffect(() => {
    function onPlan(event: Event) {
      event.preventDefault();
      setPlanOpen(true);
    }
    window.addEventListener("carescope-build-plan", onPlan);
    return () => window.removeEventListener("carescope-build-plan", onPlan);
  }, []);

  const quotes = useMemo(
    () => cards.map((card) => quotePlan({ coreId: card.coreId, modules: card.modules, implementation: [], supportId: card.supportId })),
    [cards],
  );

  function patchCard(index: number, patch: Partial<CardDraft>) {
    setCards((current) => current.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)));
  }

  function toggleModule(index: number, slug: string) {
    setCards((current) =>
      current.map((card, cardIndex) => {
        if (cardIndex !== index) return card;
        const modules = card.modules.includes(slug) ? card.modules.filter((item) => item !== slug) : [...card.modules, slug];
        return { ...card, modules };
      }),
    );
  }

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
            <p>Annual price for one laboratory. Choose the sample band on the card, then add modules and support.</p>
          </div>
          <div className="lp-price-cards">
            {quotes.map((quote, index) => {
              const card = cards[index];
              const price = cardPrice(quote);
              const added = quote.modules.filter((offer) => !offer.included);
              return (
                <article className="lp-price-card" key={CORE_PLANS[index].id}>
                  <h3>{quote.core.plan}</h3>
                  <p>{quote.core.volume} samples a year</p>
                  <p className="lp-price-amount">
                    {price.amount}
                    {price.unit ? <span> {price.unit}</span> : null}
                  </p>
                  {price.aside ? <p className="lp-price-aside">{price.aside}</p> : <p className="lp-price-aside" />}
                  <label className="lp-price-samples">
                    <span className="sr-only">Annual samples for {quote.core.plan}</span>
                    <select
                      value={card.coreId}
                      aria-label={`Annual samples for ${CORE_PLANS[index].plan}`}
                      onChange={(event) => patchCard(index, { coreId: event.target.value })}
                    >
                      {CORE_PLANS.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.volume} samples
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="lp-price-start" onClick={() => setQuoteIndex(index)}>
                    Get started
                  </button>
                  <button
                    type="button"
                    className="lp-price-addon"
                    aria-expanded={card.addonsOpen}
                    onClick={() => patchCard(index, { addonsOpen: !card.addonsOpen })}
                  >
                    Add an add-on
                  </button>
                  {card.addonsOpen ? (
                    <div className="lp-price-addon-panel">
                      <fieldset>
                        <legend>Modules</legend>
                        {MODULE_OFFERS.map((offer) => (
                          <label key={offer.slug}>
                            <input
                              type="checkbox"
                              checked={offer.included || card.modules.includes(offer.slug)}
                              disabled={offer.included}
                              onChange={() => toggleModule(index, offer.slug)}
                            />
                            <span>
                              {offer.title.replace(/^Sequence /, "")}
                              <small>{offer.priceLabel}</small>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                      <fieldset>
                        <legend>Support</legend>
                        {SUPPORT.map((tier) => (
                          <label key={tier.id}>
                            <input
                              type="radio"
                              name={`support-${index}`}
                              checked={card.supportId === tier.id}
                              onChange={() => patchCard(index, { supportId: tier.id })}
                            />
                            <span>
                              {tier.name}
                              <small>{tier.detail}</small>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    </div>
                  ) : null}
                  {added.length > 0 || quote.support.percent > 0 ? (
                    <ul className="lp-price-picked">
                      {added.map((offer) => (
                        <li key={offer.slug}>{offer.title.replace(/^Sequence /, "")}</li>
                      ))}
                      {quote.support.percent > 0 ? <li>{quote.support.name}</li> : null}
                    </ul>
                  ) : null}
                </article>
              );
            })}
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
              72 hour response is included. Standard is a reply within 24 hours, at 15% of the annual plan. Premium is a
              reply within 4 hours, at 22% of the annual plan. On a $100K plan, Standard is $15K a year and Premium is
              $22K a year. Enterprise support is part of the custom quote.
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
      {quoteIndex != null ? (
        <QuoteStartDialog quote={quotes[quoteIndex]} onClose={() => setQuoteIndex(null)} />
      ) : null}

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
