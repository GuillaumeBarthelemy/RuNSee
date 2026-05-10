import { memo } from "react";
import WeatherBadge from "./WeatherBadge.jsx";

/**
 * AlpineTopbar — Alpine Light (Lot 2-bis).
 *
 * Header de page : titre (avec emoji optionnel) + sous-titre/date à gauche,
 * météo + 3 actions icônes à droite.
 *
 * Props :
 * - title : string (ex: "Aujourd'hui 👋")
 * - subtitle : string (ex: "Mardi 6 mai 2025")
 * - weatherEnabled : boolean (défaut false) — placeholder désactivable
 * - weatherData : data météo si activée
 * - actions : ReactNode optionnel (override des 3 icônes par défaut)
 *
 * Les 3 icônes par défaut sont visuelles uniquement (calendrier, notif,
 * compte). Leur câblage fonctionnel viendra dans des chantiers ultérieurs.
 */
function DefaultActions() {
  return (
    <div className="alpine-topbar-actions" role="toolbar" aria-label="Actions rapides">
      <button
        type="button"
        className="alpine-topbar-icon-button is-disabled"
        aria-label="Calendrier — À venir"
        title="Calendrier — À venir"
        disabled
        aria-disabled="true"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="8" y1="3" x2="8" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="16" y1="3" x2="16" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        className="alpine-topbar-icon-button is-disabled"
        aria-label="Notifications — À venir"
        title="Notifications — À venir"
        disabled
        aria-disabled="true"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M6 17 V11 a6 6 0 0 1 12 0 V17 l1.5 2 H4.5 Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M10 20 a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <a
        className="alpine-topbar-icon-button"
        href="/admin#compte"
        aria-label="Compte"
        title="Compte"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5 19 a7 7 0 0 1 14 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </a>
    </div>
  );
}

function AlpineTopbar({
  title = "",
  subtitle = "",
  weatherEnabled = false,
  weatherData = null,
  actions = null,
}) {
  return (
    <header className="alpine-topbar">
      <div className="alpine-topbar-text">
        {title ? <h1 className="alpine-topbar-title">{title}</h1> : null}
        {subtitle ? <p className="alpine-topbar-subtitle">{subtitle}</p> : null}
      </div>
      <div className="alpine-topbar-right">
        <WeatherBadge enabled={weatherEnabled} data={weatherData} />
        {actions || <DefaultActions />}
      </div>
    </header>
  );
}

export default memo(AlpineTopbar);
