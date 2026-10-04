import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { initialsFor } from "../../auth";
import {
  clearEmployeeUser,
  isEmployeeSignedIn,
  readEmployeeUser,
} from "../../employeeAuth";
import "./internal.css";

export function InternalShell() {
  const navigate = useNavigate();
  const user = readEmployeeUser();

  if (!isEmployeeSignedIn() || !user) {
    return <Navigate to="/internal/login" replace />;
  }

  function handleSignOut() {
    clearEmployeeUser();
    navigate("/internal/login", { replace: true });
  }

  return (
    <div className="internal-shell">
      <aside className="internal-sidebar">
        <div className="internal-brand">
          <strong>CareScope</strong>
          <span>Employee Intrasite</span>
        </div>

        <nav className="internal-nav" aria-label="Intrasite">
          <NavLink to="/internal" end>
            Home
          </NavLink>
          <NavLink to="/internal/announcements">Announcements</NavLink>
          <NavLink to="/internal/people">People</NavLink>
          <NavLink to="/internal/resources">Resources</NavLink>
        </nav>

        <div className="internal-sidebar-foot">
          <div className="internal-user">
            <span className="internal-avatar" aria-hidden="true">
              {initialsFor(user.name)}
            </span>
            <div>
              <b>{user.name}</b>
              <small>{user.email}</small>
            </div>
          </div>
          <button
            type="button"
            className="internal-btn internal-btn-ghost"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="internal-main">
        <Outlet />
      </main>
    </div>
  );
}
