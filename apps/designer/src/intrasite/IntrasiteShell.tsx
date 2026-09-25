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
          <img className="cs-mark" src="/carescope-mark.png" alt="" />
          <span>
            <strong>Sequence</strong>
            <small>Intrasite</small>
          </span>
        </div>
        <nav aria-label="Intrasite">
          <NavLink
            to="/intrasite"
            end
            className={({ isActive }) => `is-nav-item${isActive ? " active" : ""}`}
          >
            Accounts
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
