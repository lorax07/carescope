import { FormEvent, useEffect, useState } from "react";
import { writeAuthUser } from "../auth";

export type AuthModalMode = "signup" | "signin";

type SandboxSignupModalProps = {
  open: boolean;
  mode?: AuthModalMode;
  onClose: () => void;
  onNotNow?: () => void;
  onAuthenticated?: () => void;
  onSwitchMode?: (mode: AuthModalMode) => void;
};

export function SandboxSignupModal({
  open,
  mode = "signup",
  onClose,
  onNotNow,
  onAuthenticated,
  onSwitchMode,
}: SandboxSignupModalProps) {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) setSubmitted(false);
  }, [open, mode]);

  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const name =
      mode === "signup"
        ? String(data.get("name") ?? "").trim()
        : email.split("@")[0] || "OneLab user";
    const organization =
      mode === "signup"
        ? String(data.get("organization") ?? "").trim()
        : undefined;

    writeAuthUser({ name, email, organization });
    setSubmitted(true);
    onAuthenticated?.();
  }

  function handleNotNow() {
    if (onNotNow) onNotNow();
    else onClose();
  }

  const isSignup = mode === "signup";

  return (
    <div className="signup-modal-root" role="presentation">
      <button
        type="button"
        className="signup-modal-backdrop"
        aria-label={`Close ${isSignup ? "signup" : "sign in"} dialog`}
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
            {isSignup ? (
              <>
                Signup for a 30 day Sandbox Access to{" "}
                <span className="signup-modal-brand">OneLab</span>
              </>
            ) : (
              <>
                Sign in to <span className="signup-modal-brand">OneLab</span>
              </>
            )}
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
              {isSignup ? (
                <>
                  Account ready. Your{" "}
                  <span className="signup-modal-brand">OneLab</span> sandbox is
                  unlocked.
                </>
              ) : (
                <>
                  Welcome back to{" "}
                  <span className="signup-modal-brand">OneLab</span>.
                </>
              )}
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Continue to app
            </button>
          </div>
        ) : (
          <form className="signup-modal-form" onSubmit={handleSubmit}>
            <p className="signup-modal-lede">
              {isSignup
                ? "Create an account to explore OneLab with full sandbox access for 30 days."
                : "Sign in with your work email to continue exploring OneLab."}
            </p>

            {isSignup ? (
              <label>
                Full name
                <input name="name" type="text" required autoComplete="name" />
              </label>
            ) : null}

            <label>
              Work email
              <input name="email" type="email" required autoComplete="email" />
            </label>

            {isSignup ? (
              <label>
                Organization
                <input
                  name="organization"
                  type="text"
                  required
                  autoComplete="organization"
                />
              </label>
            ) : null}

            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </label>

            <div className="signup-modal-actions">
              <button type="button" className="btn" onClick={handleNotNow}>
                Not now
              </button>
              <button type="submit" className="btn btn-primary">
                {isSignup ? "Create account" : "Sign in"}
              </button>
            </div>

            {onSwitchMode ? (
              <p className="signup-modal-switch">
                {isSignup ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="signup-modal-switch-btn"
                      onClick={() => onSwitchMode("signin")}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Need a sandbox?{" "}
                    <button
                      type="button"
                      className="signup-modal-switch-btn"
                      onClick={() => onSwitchMode("signup")}
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
