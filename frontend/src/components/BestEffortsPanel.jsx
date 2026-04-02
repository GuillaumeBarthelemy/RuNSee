import { Link } from "react-router-dom";
import { formatMetricValue } from "../utils/activityAggregations.js";
import { formatPace } from "../utils/activityInsights.js";
import InfoTooltip from "./InfoTooltip.jsx";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function persistReturnLocation(returnPath) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  sessionStorage.setItem(
    "runsee-return-location",
    JSON.stringify({
      pathname: returnPath || "/analytics",
      hash: "",
    }),
  );
}

function EffortList({
  title,
  subtitle,
  info = [],
  items = [],
  metric = "distanceKm",
  returnPath = "/analytics",
}) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="subcard">
      <div className="title-with-info">
        <h3 className="subcard-title">{title}</h3>
        <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
      </div>
      <p className="card-subtitle">{subtitle}</p>
      {!safeItems.length ? (
        <div className="empty-state compact-empty">Aucune activite disponible sur ce critere.</div>
      ) : (
        <div className="effort-list top-gap-sm">
          {safeItems.map((item) => {
            const activity = item.activity || {};
            const value = metric === "pace"
              ? formatPace(item.value)
              : formatMetricValue(item.value, metric);

            return (
              <Link
                key={activity?.stravaActivityId || `${title}-${activity?.id || activity?.name}`}
                className="effort-item"
                to={`/activities/${activity?.stravaActivityId}`}
                state={{ returnPath, returnHash: "" }}
                onClick={() => persistReturnLocation(returnPath)}
              >
                <div className="effort-item-main">
                  <strong>{activity?.name || "Activite"}</strong>
                  <span className="small-text">{formatDate(activity?.startDate || activity?.startDateLocal)}</span>
                </div>
                <div className="effort-item-value">{value}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BestEffortsPanel({
  efforts = {},
  returnPath = "/analytics",
  info = [],
  definitions = {},
}) {
  return (
    <section className="card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Best efforts</h2>
            <InfoTooltip title="Best efforts" content={info} label="Afficher l'aide pour Best efforts" />
          </div>
          <p className="card-subtitle">Les sorties qui ressortent le plus vite pour une revue rapide de la selection.</p>
        </div>
      </div>
      <div className="grid three-columns">
        <EffortList
          title="Plus longues"
          subtitle="Top distance sur la selection courante."
          info={definitions.longest}
          items={efforts.longest}
          metric="distanceKm"
          returnPath={returnPath}
        />
        <EffortList
          title="Plus rapides"
          subtitle="Triees a l'allure avec un seuil mini de 5 km."
          info={definitions.fastest}
          items={efforts.fastest}
          metric="pace"
          returnPath={returnPath}
        />
        <EffortList
          title="Plus de D+"
          subtitle="Les sorties les plus exigeantes en elevation."
          info={definitions.climbing}
          items={efforts.climbing}
          metric="elevationGain"
          returnPath={returnPath}
        />
      </div>
    </section>
  );
}
