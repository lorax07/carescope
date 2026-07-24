import { NavLink, Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">CareScope</span>
          <span className="brand-product">Workflows</span>
        </div>
        <nav className="topbar-nav">
          <NavLink to="/" end>
            Library
          </NavLink>
          <NavLink to="/catalog">Catalog</NavLink>
        </nav>
        <div className="topbar-spacer" />
        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
          demo-lab · visual automation
        </span>
      </header>
      <Outlet />
    </div>
  );
}
