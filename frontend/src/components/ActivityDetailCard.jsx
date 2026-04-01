import { getDisplaySportLabel } from "../utils/activityAggregations.js";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatDistance(meters) {
  if (meters === null || meters === undefined) return "-";
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "-";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  }

  return `${m} min ${String(s).padStart(2, "0")} s`;
}

function formatSpeed(speed) {
  if (speed === null || speed === undefined) return "-";
  return `${(speed * 3.6).toFixed(2)} km/h`;
}

function formatHeartRate(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)} bpm`;
}

function formatElevation(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)} m`;
}

function parseJsonSafe(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function renderLatLng(value) {
  const parsed = parseJsonSafe(value);
  if (!Array.isArray(parsed) || parsed.length !== 2) return "-";
  return `${parsed[0]}, ${parsed[1]}`;
}

export default function ActivityDetailCard({ activity, onEnrich, isEnriching = false }) {
  const hasDetailedPayload = Boolean(activity?.rawJson);
  const summaryPayload = parseJsonSafe(activity?.summaryJson);
  const detailedPayload = parseJsonSafe(activity?.rawJson);

  return (
    <section className="card detail-shell">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <div className="detail-chip">{getDisplaySportLabel(activity)}</div>
          <h2 className="card-title detail-title">{activity?.name || "Activité"}</h2>
          <p className="card-subtitle">{formatDate(activity?.startDateLocal || activity?.startDate)}</p>
        </div>
        <button className="button button-dark" onClick={onEnrich} disabled={isEnriching}>
          {isEnriching ? "Enrichissement en cours…" : "Enrichir depuis Strava"}
        </button>
      </div>

      <div className="grid kpi-grid top-gap-sm">
        <div className="metric-card premium-metric"><span className="metric-label">Distance</span><div className="metric-value">{formatDistance(activity?.distance)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Temps en mouvement</span><div className="metric-value medium-metric">{formatDuration(activity?.movingTime)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Temps écoulé</span><div className="metric-value medium-metric">{formatDuration(activity?.elapsedTime)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">D+</span><div className="metric-value">{formatElevation(activity?.totalElevationGain)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Vitesse moyenne</span><div className="metric-value medium-metric">{formatSpeed(activity?.averageSpeed)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">FC moyenne</span><div className="metric-value medium-metric">{formatHeartRate(activity?.averageHeartrate)}</div></div>
      </div>

      <div className="grid two-columns top-gap">
        <div className="subcard">
          <h3 className="subcard-title">Contexte</h3>
          <ul className="detail-list">
            <li><strong>Fuseau</strong><span>{activity?.timezone || "-"}</span></li>
            <li><strong>Départ</strong><span>{renderLatLng(activity?.startLatlngJson)}</span></li>
            <li><strong>Arrivée</strong><span>{renderLatLng(activity?.endLatlngJson)}</span></li>
            <li><strong>Équipement</strong><span>{activity?.gearId || "-"}</span></li>
            <li><strong>Trajet utilitaire</strong><span>{activity?.commute ? "Oui" : "Non"}</span></li>
            <li><strong>Entraîneur / intérieur</strong><span>{activity?.trainer ? "Oui" : "Non"}</span></li>
            <li><strong>Manuelle</strong><span>{activity?.manual ? "Oui" : "Non"}</span></li>
            <li><strong>Privée</strong><span>{activity?.private ? "Oui" : "Non"}</span></li>
          </ul>
        </div>

        <div className="subcard">
          <h3 className="subcard-title">Engagement</h3>
          <ul className="detail-list">
            <li><strong>Kudos</strong><span>{activity?.kudosCount ?? 0}</span></li>
            <li><strong>Commentaires</strong><span>{activity?.commentCount ?? 0}</span></li>
            <li><strong>PR</strong><span>{activity?.prCount ?? 0}</span></li>
            <li><strong>Récompenses</strong><span>{activity?.achievementCount ?? 0}</span></li>
            <li><strong>Photos</strong><span>{activity?.photoCount ?? 0}</span></li>
            <li><strong>Total photos</strong><span>{activity?.totalPhotoCount ?? 0}</span></li>
          </ul>
        </div>
      </div>

      <div className="top-gap-sm">
        <h3 className="subcard-title">Description</h3>
        <p className="muted">{activity?.description || "Aucune description disponible."}</p>
      </div>

      <details className="raw-payload top-gap-sm">
        <summary>Données JSON locales</summary>
        <div className="grid two-columns top-gap-sm">
          <div className="payload-box">
            <h4>Résumé local</h4>
            <pre>{JSON.stringify(summaryPayload, null, 2)}</pre>
          </div>
          <div className="payload-box">
            <h4>Détail local</h4>
            <pre>{JSON.stringify(detailedPayload, null, 2)}</pre>
          </div>
        </div>
        {!hasDetailedPayload ? <p className="small-text top-gap-sm">Le détail n'est pas encore stocké localement. Utilise le bouton d'enrichissement pour le charger.</p> : null}
      </details>
    </section>
  );
}
