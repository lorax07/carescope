import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  isEmployeeSignedIn,
  writeEmployeeUser,
} from "../../employeeAuth";
import "./internal.css";

export function InternalLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (isEmployeeSignedIn()) {
    return <Navigate to="/internal" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    if (!email.endsWith("@carescope.com") && !email.endsWith("@onelab.internal")) {
      setError("Use your CareScope employee email to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Enter your employee password.");
      return;
    }

    writeEmployeeUser({
      name: name || email.split("@")[0] || "Employee",
      email,
      department: "People & Operations",
    });
    navigate("/internal", { replace: true });
  }

  return (
    <div className="internal-login">
      <div className="internal-login-panel">
        <p className="internal-kicker">CareScope Internal</p>
        <h1>Employee intrasite</h1>
        <p className="internal-login-lede">
          Sign in with your company credentials to access announcements, people
          resources, and internal tools.
        </p>

        <form className="internal-login-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input name="name" type="text" autoComplete="name" />
          </label>
          <label>
            Work email
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@carescope.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="internal-login-error">{error}</p> : null}

          <button type="submit" className="internal-btn internal-btn-primary">
            Sign in to intrasite
          </button>
        </form>

        <p className="internal-login-foot">
          <Link to="/company">Back to Our Company</Link>
        </p>
      </div>
    </div>
  );
}
