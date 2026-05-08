import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { getActivityPublicId } from "../utils/activityLinks.js";
import { buildActivityTrainingInsights, formatTrainingLoadValue } from "../utils/trainingMetrics.js";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value) {
  const date = toDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(left, right) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function formatDistance(activity = {}) {
  const rawDistance = toNumber(activity.distance);
  const distanceKm = rawDistance > 1000 ? rawDistance / 1000 : rawDistance;
  return distanceKm > 0 ? `${distanceKm.toFixed(1).replace(".", ",")} km` : "-";
}

function formatDuration(activity = {}) {
  const seconds = toNumber(activity.movingTime ?? activity.movingSeconds);
  if (seconds <= 0) {
    return "-";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function getActivityId(activity = {}) {
  return getActivityPublicId(activity) || activity.activityId || "";
}

function getActivityTitle(activity = {}) {
  return activity.name || activity.title || "Activite du jour";
}

function getDominantLabel(activity = {}, insights = {}) {
  return activity.dominantIntensityLabel
    || insights.dominantIntensityLabel
    || insights.primaryZoneLabel
    || "Intensite a confirmer";
}

function getTodayActivities(activities = [], referenceDate) {
  return activities
    .filter((activity) => isSameDay(activity.startDateLocal || activity.startDate, referenceDate))
    .sort((left, right) => {
      const leftTime = toDate(left.startDateLocal || left.startDate)?.getTime() || 0;
      const rightTime = toDate(right.startDateLocal || right.startDate)?.getTime() || 0;
      return rightTime - leftTime;
    });
}

function TodaySnapshotToday({
  activities = [],
  referenceDate = new Date(),
  trainingAnalyticsSettings = {},
}) {
  const todayActivities = useMemo(
    () => getTodayActivities(activities, referenceDate),
    [activities, referenceDate],
  );
  const primaryActivity = todayActivities[0] || null;
  const insights = useMemo(
    () => (primaryActivity ? buildActivityTrainingInsights(primaryActivity, trainingAnalyticsSettings) : null),
    [primaryActivity, trainingAnalyticsSettings],
  );

  if (!primaryActivity) {
    return (
      <section className="today-snapshot-card today-snapshot-empty">
        <div>
          <p className="section-kicker">Seance du jour</p>
          <h2 className="section-title">Aucune seance aujourd'hui</h2>
          <p className="card-subtitle">
            La page reste centree sur tes donnees recentes. Lance une synchro apres ta sortie pour mettre a jour la charge du jour.
          </p>
        </div>
      </section>
    );
  }

  const activityId = getActivityId(primaryActivity);
  const loadLabel = insights?.load > 0 ? formatTrainingLoadValue(insights.load) : "-";

  return (
    <section className="today-snapshot-card">
      <div className="today-snapshot-head">
        <div>
          <p className="section-kicker">Seance du jour</p>
          <h2 className="section-title">{getActivityTitle(primaryActivity)}</h2>
          <p className="card-subtitle">
            {todayActivities.length > 1
              ? `${todayActivities.length} seances detectees aujourd'hui.`
              : "Seance detectee aujourd'hui."}
          </p>
        </div>
        {activityId ? (
          <Link className="button button-secondary" to={`/activities/${activityId}`}>
            Ouvrir le detail
          </Link>
        ) : null}
      </div>

      <div className="today-snapshot-metrics">
        <div>
          <span>Distance</span>
          <strong>{formatDistance(primaryActivity)}</strong>
        </div>
        <div>
          <span>Duree</span>
          <strong>{formatDuration(primaryActivity)}</strong>
        </div>
        <div>
          <span>Charge</span>
          <strong>{loadLabel}</strong>
        </div>
        <div>
          <span>Dominante</span>
          <strong>{getDominantLabel(primaryActivity, insights)}</strong>
        </div>
      </div>
    </section>
  );
}

export default memo(TodaySnapshotToday);
