import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { buildPricingPdf, downloadPricingPdf, isPricingEmail, type PlanQuote, type QuoteContact } from "./pricingQuote";

type QuoteStartDialogProps = {
  quote: PlanQuote;
  onClose: () => void;
};

export function QuoteStartDialog({ quote, onClose }: QuoteStartDialogProps) {
  const titleId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [contact, setContact] = useState<QuoteContact>({ name: "", role: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function update(field: keyof QuoteContact, value: string) {
    setContact((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = contact.name.trim();
    const role = contact.role.trim();
    const email = contact.email.trim();
    if (!name || !role || !isPricingEmail(email)) {
      setError("Name, role, and a company email are required.");
      return;
    }
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    downloadPricingPdf(buildPricingPdf(quote, email, dateLabel, { name, role, phone: contact.phone.trim() }));
    setSent(true);
  }

  return (
    <div
      className="lp-plan-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="lp-plan-dialog lp-quote-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
        <header className="lp-plan-head">
          <div>
            <h2 id={titleId}>{sent ? "Quote sent" : "Get started"}</h2>
            <p>
              {sent
                ? `The quote PDF has been prepared for ${contact.email.trim()}. A team member will be in touch within 48 hours via email.`
                : `${quote.core.plan}, ${quote.core.volume} samples. Name, role, and company email are required.`}
            </p>
          </div>
          <button type="button" className="lp-plan-close" onClick={onClose}>
            Close
          </button>
        </header>
        {sent ? (
          <div className="lp-quote-sent">
            <button type="button" className="lp-pill lp-pill-dark" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="lp-quote-form" onSubmit={onSubmit}>
            <label>
              Name
              <input ref={nameRef} name="name" autoComplete="name" value={contact.name} required onChange={(event) => update("name", event.target.value)} />
            </label>
            <label>
              Role
              <input name="role" autoComplete="organization-title" value={contact.role} required onChange={(event) => update("role", event.target.value)} />
            </label>
            <label>
              Company email
              <input name="email" type="email" autoComplete="email" value={contact.email} required onChange={(event) => update("email", event.target.value)} />
            </label>
            <label>
              Phone number
              <input name="phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(event) => update("phone", event.target.value)} />
            </label>
            {error ? (
              <p id={errorId} className="lp-plan-error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="lp-pill lp-pill-dark">
              Send quote
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
