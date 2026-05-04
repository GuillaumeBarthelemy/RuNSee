import { useMemo } from "react";
import ActivityDetailTabs from "./ActivityDetailTabs.jsx";
import ActivityHeaderKpis from "./ActivityHeaderKpis.jsx";
import ActivityPerformanceStrip from "./ActivityPerformanceStrip.jsx";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";
import { buildActivityTrainingInsights } from "../utils/trainingMetrics.js";

const noop = () => {};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function parseJsonSafe(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function ActivityDetailCard({
  activity = null,
  trainingAnalyticsSettings = null,
  onEnrich = noop,
  isEnriching = false,
  onActivityUpdated = noop,
  garminSnapshot = null,
}) {
  const safeActivity = useMemo(() => activity || {}, [activity]);
  const detailedPayload = useMemo(() => parseJsonSafe(safeActivity.rawJson), [safeActivity.rawJson]);
  const hasDetailedPayload = Boolean(detailedPayload);
  const trainingInsights = useMemo(
    () => buildActivityTrainingInsights(safeActivity, trainingAnalyticsSettings),
    [safeActivity, trainingAnalyticsSettings],
  );

  return (
    <section className="card detail-shell">
      <header className="card-header-row activity-detail-header wrap-on-mobile">
        <div>
          <div className="detail-chip">{getDisplaySportLabel(safeActivity, { groupSports: false })}</div>
          <h2 className="card-title detail-title">{safeActivity.name || "Activite"}</h2>
          <p className="card-subtitle">{formatDate(safeActivity.startDateLocal || safeActivity.startDate)}</p>
        </div>
        <button type="button" className="button button-dark" onClick={onEnrich} disabled={isEnriching}>
          {isEnriching ? "Enrichissement en cours..." : "Enrichir depuis Strava"}
        </button>
      </header>

      <ActivityHeaderKpis activity={safeActivity} />

      <ActivityPerformanceStrip
        activity={safeActivity}
        trainingInsights={trainingInsights}
        trainingAnalyticsSettings={trainingAnalyticsSettings}
      />

      {!hasDetailedPayload ? (
        <div className="alert alert-info activity-detail-alert">
          Les details enrichis ne sont pas encore stockes localement. Utilise le bouton d'enrichissement pour recuperer la carte et les splits complets.
        </div>
      ) : null}

      <ActivityDetailTabs
        activity={safeActivity}
        detailedPayload={detailedPayload}
        trainingAnalyticsSettings={trainingAnalyticsSettings}
        onActivityUpdated={onActivityUpdated}
        garminSnapshot={garminSnapshot}
      />
    </section>
  );
}
