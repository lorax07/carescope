import { NavLink, Outlet } from "react-router-dom";

/** Product shell for workflow library, catalog, and designer */
export function AppShell() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="brand-name">CareScope</span>
          <span className="brand-product">LIMS</span>
        </NavLink>
        <nav className="topbar-nav">
          <NavLink to="/app" end>
            Workflows
          </NavLink>
          <NavLink to="/app/catalog">Catalog</NavLink>
        </nav>
        <div className="topbar-spacer" />
        <NavLink to="/" className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
          Marketing site
        </NavLink>
      </header>
      <Outlet />
    </div>
  );
}
