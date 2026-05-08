import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";
import { getActivityPublicId } from "../utils/activityLinks.js";
import { formatPace } from "../utils/activityInsights.js";
import InfoTooltip from "./InfoTooltip.jsx";

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value, referenceDate = new Date()) {
  const date = toDate(value);
  const reference = toDate(referenceDate) || new Date();

  if (!date) {
    return "Date inconnue";
  }

  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startReference = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const dayDelta = Math.round((startReference - startDate) / 86400000);

  if (dayDelta === 0) return "Aujourd'hui";
  if (dayDelta === 1) return "Hier";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDistance(meters) {
  const distanceKm = toNumber(meters) / 1000;
  return distanceKm > 0 ? `${distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : "";
}

function formatDuration(seconds) {
  const minutes = Math.round(toNumber(seconds) / 60);
  if (minutes <= 0) return "";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours} h ${String(remainingMinutes).padStart(2, "0")}` : `${minutes} min`;
}

function formatPaceFromActivity(activity = {}) {
  const distanceKm = toNumber(activity.distance) / 1000;
  const movingTime = toNumber(activity.movingTime);

  if (distanceKm <= 0 || movingTime <= 0) {
    return "";
  }

  return formatPace(movingTime / distanceKm);
}

function getSourceLabel(activity = {}) {
  const source = String(activity.provider || activity.sourceProvider || activity.source || "").toLowerCase();
  const hasGarmin = Boolean(activity.garminActivityId || activity.garminEnrichmentStatus || source.includes("garmin"));
  const hasStrava = Boolean(activity.stravaActivityId || source.includes("strava"));
  const sport = getDisplaySportLabel(activity, { groupSports: true });

  if (hasGarmin && hasStrava) return "Strava + Garmin";
  if (hasGarmin) return sport?.toLowerCase().includes("randonn") ? "Garmin · Randonnée" : "Garmin";
  if (hasStrava) return "Strava";
  return "Source disponible";
}

function scoreActivity(activity = {}) {
  const elevationGain = toNumber(activity.elevationGain ?? activity.totalElevationGain);
  const sportLabel = getDisplaySportLabel(activity, { groupSports: true }).toLowerCase();
  const loadTone = activity.loadBandTone || "neutral";
  const intensityTone = activity.dominantIntensityTone || "neutral";
  let score = 0;

  if (loadTone === "negative") score += 60;
  if (loadTone === "warning") score += 40;
  if (intensityTone === "warning") score += 20;
  if (sportLabel.includes("trail") || elevationGain >= 250) score += 28;
  if (activity.microTag) score += 8;
  if (activity.estimatedSessionLabel) score += 8;

  const date = toDate(activity.startDateLocal || activity.startDate);
  if (date) {
    score += Math.max(0, 12 - Math.floor((Date.now() - date.getTime()) / 86400000));
  }

  return score;
}

function buildReason(activity = {}) {
  const parts = [
    activity.estimatedSessionLabel,
    activity.loadBandLabel,
    activity.dominantIntensityLabel,
    activity.microTag,
  ].filter(Boolean);

  if (parts.length) {
    return parts.slice(0, 3).join(" · ");
  }

  return "Séance récente utile à relire.";
}

function persistReturnLocation(returnPath = "/") {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  sessionStorage.setItem(
    "runsee-return-location",
    JSON.stringify({
      pathname: returnPath,
      hash: "",
    }),
  );
}

function TodayUsefulActivities({
  activities = [],
  referenceDate = new Date(),
  returnPath = "/",
  info = [],
}) {
  const navigate = useNavigate();
  const selectedActivities = useMemo(
    () => (Array.isArray(activities) ? activities : [])
      .filter((activity) => getActivityPublicId(activity))
      .map((activity, index) => ({ activity, index, score: scoreActivity(activity) }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        const rightDate = toDate(right.activity.startDateLocal || right.activity.startDate)?.getTime() || 0;
        const leftDate = toDate(left.activity.startDateLocal || left.activity.startDate)?.getTime() || 0;
        return rightDate - leftDate || left.index - right.index;
      })
      .slice(0, 3)
      .map((entry) => entry.activity),
    [activities],
  );

  return (
    <section className="card today-useful-card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Activités à relire</h2>
            <InfoTooltip title="Activités à relire" content={info} label="Afficher l'aide pour Activités à relire" compact />
          </div>
          <p className="card-subtitle">Les 3 séances qui expliquent le mieux la lecture du jour.</p>
        </div>
        <button className="button button-outline" type="button" onClick={() => navigate("/activities")}>
          Voir toutes les activités
        </button>
      </div>

      {!selectedActivities.length ? (
        <div className="empty-state">Aucune activité utile à relire sur le périmètre du jour.</div>
      ) : (
        <div className="today-useful-list">
          {selectedActivities.map((activity) => {
            const routeId = getActivityPublicId(activity);
            const metrics = [
              formatDistance(activity.distance),
              formatDuration(activity.movingTime),
              formatPaceFromActivity(activity),
              activity.activityLoadLabel,
            ].filter(Boolean);

            return (
              <button
                key={routeId}
                type="button"
                className="today-useful-item"
                onClick={() => {
                  persistReturnLocation(returnPath);
                  navigate(`/activities/${routeId}`, {
                    state: {
                      returnPath,
                      returnHash: "",
                    },
                  });
                }}
              >
                <div className="today-useful-main">
                  <span className="today-useful-date">{formatDate(activity.startDateLocal || activity.startDate, referenceDate)}</span>
                  <strong>{activity.name || "Activité"}</strong>
                  <span className="today-useful-context">
                    {getDisplaySportLabel(activity, { groupSports: true })} · {getSourceLabel(activity)}
                  </span>
                  <span className="today-useful-reason">{buildReason(activity)}</span>
                </div>
                <div className="today-useful-metrics">
                  {metrics.map((metric) => (
                    <span key={metric}>{metric}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default memo(TodayUsefulActivities);
