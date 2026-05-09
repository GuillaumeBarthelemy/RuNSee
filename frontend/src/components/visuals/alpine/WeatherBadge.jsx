import { memo } from "react";

/**
 * WeatherBadge — Alpine Light (Lot 2-bis).
 *
 * Bandeau météo dans la topbar : icône + température + libellé + vent.
 *
 * **PLACEHOLDER DÉSACTIVABLE** — par défaut le composant retourne null.
 * Pour l'activer en dev, passer la prop `enabled={true}`.
 *
 * Le câblage API météo réel est journalisé dans
 * `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md` section 1.
 *
 * Props :
 * - enabled : boolean (défaut false) — affiche ou masque le composant
 * - data : { temperatureCelsius, conditionLabel, windKmh } — placeholder data
 */
function WeatherBadge({ enabled = false, data = null }) {
  if (!enabled) return null;

  const temperature = data?.temperatureCelsius != null ? `${Math.round(data.temperatureCelsius)}°C` : "—°C";
  const condition = data?.conditionLabel || "—";
  const wind = data?.windKmh != null ? `${Math.round(data.windKmh)} km/h` : "— km/h";

  return (
    <div className="alpine-weather-badge" role="status" aria-label="Météo locale">
      <span className="alpine-weather-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="var(--al-warning, #f59e0b)" />
          <g stroke="var(--al-warning, #f59e0b)" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="3" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="21" />
            <line x1="3" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="21" y2="12" />
            <line x1="5.5" y1="5.5" x2="7" y2="7" />
            <line x1="17" y1="17" x2="18.5" y2="18.5" />
            <line x1="5.5" y1="18.5" x2="7" y2="17" />
            <line x1="17" y1="7" x2="18.5" y2="5.5" />
          </g>
        </svg>
      </span>
      <div className="alpine-weather-text">
        <span className="alpine-weather-temp">{temperature} {condition}</span>
        <span className="alpine-weather-wind">Vent {wind}</span>
      </div>
    </div>
  );
}

export default memo(WeatherBadge);
