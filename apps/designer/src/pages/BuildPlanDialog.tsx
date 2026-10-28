import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CORE_PLANS,
  IMPLEMENTATION,
  MODULE_OFFERS,
  SUPPORT,
  buildPricingPdf,
  downloadPricingPdf,
  isPricingEmail,
  quotePlan,
} from "./pricingQuote";

type BuildPlanDialogProps = {
  onClose: () => void;
};

export function BuildPlanDialog({ onClose }: BuildPlanDialogProps) {
  const titleId = useId();
  const emailId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [coreId, setCoreId] = useState(CORE_PLANS[0].id);
  const [modules, setModules] = useState<string[]>(["operations"]);
  const [implementation, setImplementation] = useState<string[]>([]);
  const [supportId, setSupportId] = useState(SUPPORT[0].id);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const quote = useMemo(
    () => quotePlan({ coreId, modules, implementation, supportId }),
    [coreId, modules, implementation, supportId],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input")].filter(
        (item) => !item.hasAttribute("disabled"),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function toggle(list: string[], id: string, setList: (next: string[]) => void) {
    setSentTo("");
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!isPricingEmail(address)) {
      setEmailError("Enter an email address for the pricing PDF.");
      setSentTo("");
      emailRef.current?.focus();
      return;
    }
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    downloadPricingPdf(buildPricingPdf(quote, address, dateLabel));
    setEmailError("");
    setSentTo(address);
  }

  return (
    <div
      className="lp-plan-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="lp-plan-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="lp-plan-head">
          <div>
            <h2 id={titleId}>Build your plan</h2>
            <p>Choose a core plan, modules, implementation, and support. Every price is the one published on this page.</p>
          </div>
          <button type="button" className="lp-plan-close" onClick={onClose}>
            Close
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="lp-plan-body">
            <div>
              <fieldset>
                <legend>Core product</legend>
                <div className="lp-plan-options">
                  {CORE_PLANS.map((plan) => (
                    <label key={plan.id} className="lp-plan-option">
                      <input
                        type="radio"
                        name="plan-core"
                        value={plan.id}
                        checked={coreId === plan.id}
                        onChange={() => {
                          setCoreId(plan.id);
                          setSentTo("");
                        }}
                      />
                      <span>
                        <strong>{plan.plan}</strong>
                        <small>{plan.volume} samples</small>
                      </span>
                      <b>{plan.priceLabel}</b>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Modules</legend>
                <div className="lp-plan-options">
                  {MODULE_OFFERS.map((offer) => (
                    <label key={offer.slug} className="lp-plan-option">
                      <input
                        type="checkbox"
                        name="plan-module"
                        value={offer.slug}
                        checked={modules.includes(offer.slug) || offer.included}
                        disabled={offer.included}
                        onChange={() => toggle(modules, offer.slug, setModules)}
                      />
                      <span>
                        <strong>{offer.title}</strong>
                        {offer.included ? <small>Included with the core product</small> : null}
                      </span>
                      <b>{offer.priceLabel}</b>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>First-time implementation</legend>
                <div className="lp-plan-options">
                  {IMPLEMENTATION.map((item) => (
                    <label key={item.id} className="lp-plan-option">
                      <input
                        type="checkbox"
                        name="plan-implementation"
                        value={item.id}
                        checked={implementation.includes(item.id)}
                        onChange={() => toggle(implementation, item.id, setImplementation)}
                      />
                      <span>
                        <strong>{item.name}</strong>
                        <small>One time</small>
                      </span>
                      <b>{item.priceLabel}</b>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Support</legend>
                <div className="lp-plan-options">
                  {SUPPORT.map((tier) => (
                    <label key={tier.id} className="lp-plan-option">
                      <input
                        type="radio"
                        name="plan-support"
                        value={tier.id}
                        checked={supportId === tier.id}
                        onChange={() => {
                          setSupportId(tier.id);
                          setSentTo("");
                        }}
                      />
                      <span>
                        <strong>{tier.name}</strong>
                        <small>{tier.detail}</small>
                      </span>
                      <b>{tier.priceLabel}</b>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <aside className="lp-plan-summary" aria-live="polite">
              <h3>This plan</h3>
              <dl>
                <div>
                  <dt>{quote.lines.core.label}</dt>
                  <dd>{quote.lines.core.value}</dd>
                </div>
                {quote.lines.modules.map((line) => (
                  <div key={line.label}>
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
                <div>
                  <dt>Support, {quote.lines.support.label}</dt>
                  <dd>{quote.lines.support.value}</dd>
                </div>
                {quote.lines.implementation.length === 0 ? (
                  <div>
                    <dt>Implementation</dt>
                    <dd>None</dd>
                  </div>
                ) : (
                  quote.lines.implementation.map((line) => (
                    <div key={line.label}>
                      <dt>{line.label}</dt>
                      <dd>{line.value}</dd>
                    </div>
                  ))
                )}
              </dl>
              {quote.custom ? (
                <p className="lp-plan-note">Core and support are quoted for Enterprise. Module and implementation prices stay as published.</p>
              ) : null}
              <dl className="lp-plan-totals">
                {quote.lines.totals.map((line) => (
                  <div key={line.label}>
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
              </dl>
              <label className="lp-plan-email" htmlFor={emailId}>
                Email
                <input
                  id={emailId}
                  ref={emailRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@laboratory.com"
                  value={email}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? errorId : undefined}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                    setSentTo("");
                  }}
                />
              </label>
              {emailError ? (
                <p id={errorId} className="lp-plan-error" role="alert">
                  {emailError}
                </p>
              ) : (
                <p className="lp-plan-note">A one-page PDF of this plan, with the prices from this page.</p>
              )}
              <button type="submit" className="lp-pill lp-pill-dark">
                Send pricing PDF
              </button>
              {sentTo ? <p className="lp-plan-sent">The one-page pricing PDF for {sentTo} is downloading.</p> : null}
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
