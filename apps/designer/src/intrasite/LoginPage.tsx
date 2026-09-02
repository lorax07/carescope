import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ApiError } from "./api";
import { useIntrasiteAuth } from "./AuthContext";

export function IntrasiteLoginPage() {
  const { user, loading, login } = useIntrasiteAuth();
  const location = useLocation();
  const [email, setEmail] = useState("admin@carescope.local");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from || "/intrasite"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Cannot reach the Intrasite API. Start it with pnpm dev:api or Docker Compose.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="is-login">
      <div className="is-login-card">
        <Link to="/" className="is-login-brand">
          <span className="is-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <circle cx="16" cy="16" r="14" fill="#1B6EF3" />
              <path
                d="M10 16.5h4.2L16 10l1.8 6.5H22"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <strong>CareScope</strong>
            <small>Intrasite</small>
          </span>
        </Link>
        <h1>Business control plane</h1>
        <p className="is-login-lede">
          Sign in to manage client accounts, isolated tenant databases, and lab
          instances.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Work email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="is-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
