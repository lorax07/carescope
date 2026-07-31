import { FormEvent, useState } from "react";

type SandboxSignupModalProps = {
  open: boolean;
  onClose: () => void;
  onNotNow?: () => void;
};

export function SandboxSignupModal({
  open,
  onClose,
  onNotNow,
}: SandboxSignupModalProps) {
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function handleNotNow() {
    if (onNotNow) onNotNow();
    else onClose();
  }

  return (
    <div className="signup-modal-root" role="presentation">
      <button
        type="button"
        className="signup-modal-backdrop"
        aria-label="Close signup dialog"
        onClick={onClose}
      />
      <div
        className="signup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
      >
        <header className="signup-modal-header">
          <h2 id="signup-modal-title">
            Signup for a 30 day Sandbox Access to{" "}
            <span className="signup-modal-brand">OneLab</span>
          </h2>
          <button
            type="button"
            className="signup-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {submitted ? (
          <div className="signup-modal-success">
            <p>
              Account request received. Your{" "}
              <span className="signup-modal-brand">OneLab</span> sandbox will be
              ready shortly.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Continue to app
            </button>
          </div>
        ) : (
          <form className="signup-modal-form" onSubmit={handleSubmit}>
            <p className="signup-modal-lede">
              Create an account to explore OneLab with full sandbox access for 30
              days.
            </p>

            <label>
              Full name
              <input name="name" type="text" required autoComplete="name" />
            </label>
            <label>
              Work email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Organization
              <input
                name="organization"
                type="text"
                required
                autoComplete="organization"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <div className="signup-modal-actions">
              <button type="button" className="btn" onClick={handleNotNow}>
                Not now
              </button>
              <button type="submit" className="btn btn-primary">
                Create account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
