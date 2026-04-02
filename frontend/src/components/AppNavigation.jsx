import { NavLink } from "react-router-dom";

export default function AppNavigation() {
  return (
    <nav className="app-nav" aria-label="Navigation principale">
      <NavLink to="/" end className={({ isActive }) => `app-nav-link ${isActive ? "is-active" : ""}`}>
        Tableau de bord
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => `app-nav-link ${isActive ? "is-active" : ""}`}>
        Administration
      </NavLink>
    </nav>
  );
}
