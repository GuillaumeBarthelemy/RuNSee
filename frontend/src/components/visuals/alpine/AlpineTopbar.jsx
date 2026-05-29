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
 * - actions : ReactNode optionnel (rendu à droite si fourni)
 */
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
        {actions}
      </div>
    </header>
  );
}

export default memo(AlpineTopbar);
