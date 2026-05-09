import { NavLink } from "react-router-dom";

// Ordre validé selon mockup Alpine Light :
// Accueil / Activités / Analyse / Performance / Progression / Réglages / Glossaire
const NAV_ITEMS = [
  {
    to: "/",
    label: "Accueil",
    shortLabel: "Accueil",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    to: "/activities",
    label: "Activités",
    shortLabel: "Activités",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h10M7 12h10M7 18h10M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
  {
    to: "/analytics",
    label: "Analyse",
    shortLabel: "Analyse",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19h14M7 16V9m5 7V5m5 11v-4" />
      </svg>
    ),
  },
  {
    to: "/performance",
    label: "Performance",
    shortLabel: "Niveau",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h8m-6 0v4a2 2 0 0 0 4 0V5m-7 1H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4m-4 2v4m-4 0h8m-10 3h12" />
      </svg>
    ),
  },
  {
    to: "/progression",
    label: "Progression",
    shortLabel: "Progression",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16M7 19V11m5 8V7m5 12v-5" />
      </svg>
    ),
  },
  {
    to: "/admin",
    label: "Réglages",
    shortLabel: "Réglages",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    to: "/glossaire",
    label: "Glossaire",
    shortLabel: "Glossaire",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zm4 4h8m-8 4h6" />
      </svg>
    ),
  },
];

export default function AppNavigation() {
  return (
    <nav className="app-nav" aria-label="Navigation principale">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          aria-label={item.label}
          className={({ isActive }) => `app-nav-link ${isActive ? "is-active" : ""}`}
        >
          <span className="app-nav-icon">{item.icon}</span>
          <span className="app-nav-label">{item.label}</span>
          <span className="app-nav-short-label">{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}
