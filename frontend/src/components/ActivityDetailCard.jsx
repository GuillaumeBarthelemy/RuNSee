import ActivityMapCard from "./ActivityMapCard.jsx";
import ActivitySplitsCard from "./ActivitySplitsCard.jsx";
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
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
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

export default function ActivityDetailCard({ activity, onEnrich, isEnriching = false }) {
  const detailedPayload = parseJsonSafe(activity?.rawJson);
  const hasDetailedPayload = Boolean(detailedPayload);

  return (
    <section className="card detail-shell">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <div className="detail-chip">{getDisplaySportLabel(activity, { groupSports: false })}</div>
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
        <div className="metric-card premium-metric"><span className="metric-label">Dénivelé positif</span><div className="metric-value">{formatElevation(activity?.totalElevationGain)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Vitesse moyenne</span><div className="metric-value medium-metric">{formatSpeed(activity?.averageSpeed)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">FC moyenne</span><div className="metric-value medium-metric">{formatHeartRate(activity?.averageHeartrate)}</div></div>
      </div>

      <div className="top-gap-sm">
        <h3 className="subcard-title">Description</h3>
        <p className="muted">{activity?.description || "Aucune description disponible."}</p>
      </div>

      <ActivityMapCard activity={activity} detailedPayload={detailedPayload} />
      <ActivitySplitsCard detailedPayload={detailedPayload} />

      {!hasDetailedPayload ? (
        <div className="alert alert-info top-gap-sm">Les détails enrichis ne sont pas encore stockés localement. Utilise le bouton d'enrichissement pour récupérer la carte et les splits complets.</div>
      ) : null}
    </section>
  );
}
