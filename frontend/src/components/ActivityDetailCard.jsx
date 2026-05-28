import { useMemo, useState } from "react";
import ActivityDetailTabs from "./ActivityDetailTabs.jsx";
import ActivityHeaderKpis from "./ActivityHeaderKpis.jsx";
import ActivityIntensityCard from "./ActivityIntensityCard.jsx";
import ActivityPerformanceStrip from "./ActivityPerformanceStrip.jsx";
import ActivityClassificationModal from "./activity/ActivityClassificationModal.jsx";
import ActivityClassificationPills from "./activity/ActivityClassificationPills.jsx";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";
import { buildActivityTrainingInsights } from "../utils/trainingMetrics.js";
import { suggestSessionType } from "../constants/sessionTaxonomy.js";

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

function getActivitySourceLabel(activity) {
  const sourceProvider = String(activity?.sourceProvider || "strava").toLowerCase();
  const hasGarmin = Boolean(activity?.garminActivityEnrichment || activity?.hasExternalEnrichment);

  if (sourceProvider === "garmin") {
    const sport = String(activity?.sportType || activity?.type || "").toLowerCase();
    return sport.includes("hike") ? "Source : Garmin - Randonnee" : "Source : Garmin";
  }

  return hasGarmin ? "Source : Strava + Garmin" : "Source : Strava";
}

export default function ActivityDetailCard({
  activity = null,
  trainingAnalyticsSettings = null,
  onEnrich = noop,
  isEnriching = false,
  onActivityUpdated = noop,
  garminSnapshot = null,
  garminRecoveryContext = null,
  garminActivityEnrichment = null,
  onGarminActivityEnrich = noop,
  isGarminActivityEnriching = false,
}) {
  const safeActivity = useMemo(() => activity || {}, [activity]);
  const detailedPayload = useMemo(() => parseJsonSafe(safeActivity.rawJson), [safeActivity.rawJson]);
  const hasDetailedPayload = Boolean(detailedPayload);
  const canEnrichFromStrava = Boolean(safeActivity.stravaActivityId);
  const trainingInsights = useMemo(
    () => buildActivityTrainingInsights(safeActivity, trainingAnalyticsSettings),
    [safeActivity, trainingAnalyticsSettings],
  );

  const [classModalOpen, setClassModalOpen] = useState(false);
  const suggestedType = useMemo(
    () => suggestSessionType(safeActivity, { fcMax: trainingAnalyticsSettings?.heartRateMax }),
    [safeActivity, trainingAnalyticsSettings],
  );

  const handleClassificationSaved = (updated) => {
    onActivityUpdated(updated);
  };

  return (
    <section className="card detail-shell">
      <header className="card-header-row activity-detail-header wrap-on-mobile">
        <div>
          <div className="detail-chip">{getDisplaySportLabel(safeActivity, { groupSports: false })}</div>
          <div className="detail-chip detail-source-chip">{getActivitySourceLabel(safeActivity)}</div>
          <h2 className="card-title detail-title">{safeActivity.name || "Activite"}</h2>
          <p className="card-subtitle">{formatDate(safeActivity.startDateLocal || safeActivity.startDate)}</p>
        </div>
        {canEnrichFromStrava ? (
          <button type="button" className="button button-dark" onClick={onEnrich} disabled={isEnriching}>
            {isEnriching ? "Enrichissement en cours..." : "Enrichir depuis Strava"}
          </button>
        ) : null}
      </header>

      <ActivityClassificationPills
        activity={safeActivity}
        onEdit={() => setClassModalOpen(true)}
      />

      <ActivityClassificationModal
        open={classModalOpen}
        activity={safeActivity}
        suggestedType={suggestedType}
        onClose={() => setClassModalOpen(false)}
        onSaved={handleClassificationSaved}
      />

      <ActivityHeaderKpis activity={safeActivity} />

      <ActivityPerformanceStrip
        activity={safeActivity}
        trainingInsights={trainingInsights}
        trainingAnalyticsSettings={trainingAnalyticsSettings}
      />

      <ActivityIntensityCard
        activity={safeActivity}
        detailedPayload={detailedPayload}
        garminSnapshot={garminSnapshot}
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
        garminRecoveryContext={garminRecoveryContext}
        garminActivityEnrichment={garminActivityEnrichment}
        onGarminActivityEnrich={onGarminActivityEnrich}
        isGarminActivityEnriching={isGarminActivityEnriching}
      />
    </section>
  );
}
