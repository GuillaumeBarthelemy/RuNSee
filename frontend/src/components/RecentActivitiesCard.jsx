import { useNavigate } from "react-router-dom";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";
import { formatPace } from "../utils/activityInsights.js";
import InfoTooltip from "./InfoTooltip.jsx";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDistance(distance) {
  const numeric = Number(distance);
  return Number.isFinite(numeric) && numeric > 0 ? `${(numeric / 1000).toFixed(1)} km` : "-";
}

function formatDuration(seconds) {
  const numeric = Number(seconds);
  return Number.isFinite(numeric) && numeric > 0 ? `${Math.round(numeric / 60)} min` : "-";
}

function buildPace(activity) {
  const distance = Number(activity?.distance || 0);
  const movingTime = Number(activity?.movingTime || 0);

  if (!distance || !movingTime) {
    return "-";
  }

  return formatPace(movingTime / (distance / 1000));
}

function persistReturnLocation(returnPath) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  sessionStorage.setItem(
    "runsee-return-location",
    JSON.stringify({
      pathname: returnPath || "/",
      hash: "",
    }),
  );
}

export default function RecentActivitiesCard({
  activities = [],
  returnPath = "/",
  title = "Activites recentes",
  subtitle = "Les dernieres seances utiles a relire avant de plonger dans l'analyse detaillee.",
  info = [],
}) {
  const navigate = useNavigate();
  const safeActivities = Array.isArray(activities) ? activities : [];

  return (
    <section className="card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>
        <button className="button button-outline" type="button" onClick={() => navigate("/activities")}>
          Voir toutes les activites
        </button>
      </div>

      {!safeActivities.length ? (
        <div className="empty-state">Aucune activite recente sur la selection courante.</div>
      ) : (
        <div className="recent-activity-list">
          {safeActivities.map((activity) => {
            const key = activity?.id || activity?.stravaActivityId || activity?.name;

            return (
              <button
                key={key}
                type="button"
                className="recent-activity-item"
                onClick={() => {
                  if (!activity?.stravaActivityId) return;

                  persistReturnLocation(returnPath);
                  navigate(`/activities/${activity.stravaActivityId}`, {
                    state: {
                      returnPath,
                      returnHash: "",
                    },
                  });
                }}
              >
                <div className="recent-activity-main">
                  <div className="recent-activity-title">{activity?.name || "Activite"}</div>
                  <div className="small-text">
                    {formatDate(activity?.startDate || activity?.startDateLocal)} · {getDisplaySportLabel(activity, { groupSports: true })}
                  </div>
                </div>
                <div className="recent-activity-metrics">
                  <span>{formatDistance(activity?.distance)}</span>
                  <span>{formatDuration(activity?.movingTime)}</span>
                  <span>{buildPace(activity)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
