import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ApiError } from "./api";
import { useIntrasiteAuth } from "./AuthContext";

export function IntrasiteLoginPage() {
  const { user, loading, login } = useIntrasiteAuth();
  const [email, setEmail] = useState("admin@carescope.local");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/intrasite" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Sign-in failed. Use admin@carescope.local and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="is-login">
      <div className="is-login-card">
        <Link to="/" className="is-login-brand">
          <img className="cs-mark" src="/carescope-mark.png" alt="" />
          <span>
            <strong>Sequence</strong>
            <small>Intrasite</small>
          </span>
        </Link>
        <h1>Business control plane</h1>
        <p className="is-login-lede">
          Sign in to manage client accounts, isolated tenant databases, and lab
          instances.
        </p>
        <p className="is-login-hint">
          For now use <code>admin@carescope.local</code> / <code>password</code>.
        </p>
        <form onSubmit={handleSubmit} autoComplete="off">
          <label>
            Work email
            <input
              type="email"
              name="intrasite-email"
              autoComplete="off"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="intrasite-password"
              autoComplete="off"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="is-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
