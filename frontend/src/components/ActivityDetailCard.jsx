import ActivityMapCard from "./ActivityMapCard.jsx";
import ActivitySplitsCard from "./ActivitySplitsCard.jsx";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";

const noop = () => {};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatDistance(meters) {
  const numeric = Number(meters);
  if (!Number.isFinite(numeric)) return "-";
  return `${(numeric / 1000).toFixed(2)} km`;
}

function formatDuration(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return "-";
  const h = Math.floor(numeric / 3600);
  const m = Math.floor((numeric % 3600) / 60);
  const s = numeric % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

function formatSpeed(speed) {
  const numeric = Number(speed);
  if (!Number.isFinite(numeric)) return "-";
  return `${(numeric * 3.6).toFixed(2)} km/h`;
}

function formatHeartRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  return `${Math.round(numeric)} bpm`;
}

function formatElevation(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${Math.round(numeric)} m`;
}

function parseJsonSafe(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function ActivityDetailCard({ activity = null, onEnrich = noop, isEnriching = false }) {
  const safeActivity = activity || {};
  const detailedPayload = parseJsonSafe(safeActivity.rawJson);
  const hasDetailedPayload = Boolean(detailedPayload);

  return (
    <section className="card detail-shell">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <div className="detail-chip">{getDisplaySportLabel(safeActivity, { groupSports: false })}</div>
          <h2 className="card-title detail-title">{safeActivity.name || "Activité"}</h2>
          <p className="card-subtitle">{formatDate(safeActivity.startDateLocal || safeActivity.startDate)}</p>
        </div>
        <button type="button" className="button button-dark" onClick={onEnrich} disabled={isEnriching}>
          {isEnriching ? "Enrichissement en cours..." : "Enrichir depuis Strava"}
        </button>
      </div>

      <div className="grid kpi-grid top-gap-sm">
        <div className="metric-card premium-metric"><span className="metric-label">Distance</span><div className="metric-value">{formatDistance(safeActivity.distance)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Temps en mouvement</span><div className="metric-value medium-metric">{formatDuration(safeActivity.movingTime)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Temps écoulé</span><div className="metric-value medium-metric">{formatDuration(safeActivity.elapsedTime)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Dénivelé positif</span><div className="metric-value">{formatElevation(safeActivity.totalElevationGain)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">Vitesse moyenne</span><div className="metric-value medium-metric">{formatSpeed(safeActivity.averageSpeed)}</div></div>
        <div className="metric-card premium-metric"><span className="metric-label">FC moyenne</span><div className="metric-value medium-metric">{formatHeartRate(safeActivity.averageHeartrate)}</div></div>
      </div>

      <div className="top-gap-sm">
        <h3 className="subcard-title">Description</h3>
        <p className="muted">{safeActivity.description || "Aucune description disponible."}</p>
      </div>

      <ActivityMapCard activity={safeActivity} detailedPayload={detailedPayload} />
      <ActivitySplitsCard detailedPayload={detailedPayload} />

      {!hasDetailedPayload ? (
        <div className="alert alert-info top-gap-sm">Les détails enrichis ne sont pas encore stockés localement. Utilise le bouton d'enrichissement pour récupérer la carte et les splits complets.</div>
      ) : null}
    </section>
  );
}
