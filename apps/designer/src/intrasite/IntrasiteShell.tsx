import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useIntrasiteAuth } from "./AuthContext";

export function IntrasiteShell() {
  const { user, loading, logout } = useIntrasiteAuth();

  if (loading) {
    return (
      <div className="is-boot">
        <p>Loading Intrasite…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/intrasite/login" replace />;
  }

  return (
    <div className="is-shell">
      <aside className="is-sidebar">
        <div className="is-brand">
          <span className="is-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26">
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
        </div>
        <nav aria-label="Intrasite">
          <NavLink
            to="/intrasite"
            end
            className={({ isActive }) => `is-nav-item${isActive ? " active" : ""}`}
          >
            Clients
          </NavLink>
        </nav>
        <div className="is-sidebar-foot">
          <div>
            <b>{user.name}</b>
            <small>{user.role.replace("_", " ")}</small>
          </div>
          <button type="button" className="btn" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="is-main">
        <Outlet />
      </div>
    </div>
  );
}
