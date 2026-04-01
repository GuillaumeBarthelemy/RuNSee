import { NavLink } from "react-router-dom";

export default function AppTopbar({ title, subtitle, actions, badge = "RuNSee" }) {
  return (
    <header className="topbar premium-topbar app-topbar">
      <div>
        <div className="brand-line">
          <span className="brand-badge">{badge}</span>
          <nav className="topnav-links" aria-label="Navigation principale">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `topnav-link ${isActive ? "is-active" : ""}`}
            >
              Tableau de bord
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => `topnav-link ${isActive ? "is-active" : ""}`}
            >
              Administration
            </NavLink>
          </nav>
        </div>
        <h1 className="topbar-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="topbar-actions">{actions}</div> : null}
    </header>
  );
}
