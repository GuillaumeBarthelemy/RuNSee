import { Link } from "react-router-dom";
import { formatMetricValue } from "../utils/activityAggregations.js";
import { formatPace } from "../utils/activityInsights.js";
import { buildActivityDetailPath, getActivityPublicId } from "../utils/activityLinks.js";
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

function formatRecordDuration(seconds) {
  const totalSeconds = Math.round(Number(seconds || 0));

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "-";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function EffortList({
  title,
  subtitle,
  info = [],
  items = [],
  metric = "distanceKm",
  returnPath = "/analytics",
  scopeLabel = "Periode active",
}) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="subcard">
      <div className="title-with-info">
        <h3 className="subcard-title">{title}</h3>
        <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
      </div>
      <span className="best-effort-scope-chip">{scopeLabel}</span>
      <p className="card-subtitle">{subtitle}</p>
      {!safeItems.length ? (
        <div className="empty-state compact-empty">Aucune activite disponible sur ce critere.</div>
      ) : (
        <div className="effort-list top-gap-sm">
          {safeItems.map((item) => {
            const activity = item.activity || {};
            const detailPath = buildActivityDetailPath(activity);
            const value = metric === "pace"
              ? formatPace(item.value)
              : formatMetricValue(item.value, metric);
            const content = (
              <>
                <div className="effort-item-main">
                  <strong>{activity?.name || "Activite"}</strong>
                  <span className="small-text">{formatDate(activity?.startDate || activity?.startDateLocal)}</span>
                </div>
                <div className="effort-item-value">{value}</div>
              </>
            );

            if (!detailPath) {
              return (
                <div key={getActivityPublicId(activity) || `${title}-${activity?.name}`} className="effort-item effort-item-static">
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={getActivityPublicId(activity) || `${title}-${activity?.name}`}
                className="effort-item"
                to={detailPath}
                state={{ returnPath, returnHash: "" }}
                onClick={() => persistReturnLocation(returnPath)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecordList({
  title,
  subtitle,
  info = [],
  items = [],
  returnPath = "/analytics",
  scopeLabel = "Historique global",
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const resolvedSubtitle = title === "Records"
    ? "Records 5 km, 10 km, semi et marathon rattaches a la course support la plus credible."
    : subtitle;

  return (
    <div className="subcard">
      <div className="title-with-info">
        <h3 className="subcard-title">{title}</h3>
        <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
      </div>
      <span className="best-effort-scope-chip">{scopeLabel}</span>
      <p className="card-subtitle">{resolvedSubtitle}</p>
      {!safeItems.length ? (
        <div className="empty-state compact-empty">Aucun record route officiel retrouve dans l'historique enrichi.</div>
      ) : (
        <div className="effort-list top-gap-sm">
          {safeItems.map((item) => {
            const activity = item.activity || {};
            const detailPath = buildActivityDetailPath(activity);
            const publicId = getActivityPublicId(activity);
            const hasLink = Boolean(item.isAvailable && detailPath);
            const metadata = item.isAvailable
              ? [
                  activity?.name || null,
                  formatDate(activity?.startDate || activity?.startDateLocal),
                  item.paceSecondsPerKm > 0 ? formatPace(item.paceSecondsPerKm) : null,
                ]
                  .filter(Boolean)
                  .join(" - ")
              : "Record non reconcilie localement pour cette distance.";
            const content = (
              <>
                <div className="effort-item-main">
                  <strong>{item.recordLabel || "Record"}</strong>
                  <span className="small-text">{metadata}</span>
                </div>
                <div className="effort-item-value">
                  {item.isAvailable ? formatRecordDuration(item.elapsedSeconds || item.value) : "-"}
                </div>
              </>
            );

            if (!hasLink) {
              return (
                <div key={item.recordKey || item.recordLabel} className="effort-item effort-item-static">
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={item.recordKey || publicId}
                className="effort-item"
                to={detailPath}
                state={{ returnPath, returnHash: "" }}
                onClick={() => persistReturnLocation(returnPath)}
              >
                {content}
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
      <div className="grid four-columns">
        <EffortList
          title="Plus longues"
          subtitle="Plus grosse sortie de la periode active."
          info={definitions.longest}
          items={efforts.longest}
          metric="distanceKm"
          returnPath={returnPath}
          scopeLabel="Periode active"
        />
        <EffortList
          title="Meilleure allure recente"
          subtitle="Sorties les plus rapides sur la periode, avec seuil mini de 5 km."
          info={definitions.fastest}
          items={efforts.fastest}
          metric="pace"
          returnPath={returnPath}
          scopeLabel="Periode active"
        />
        <EffortList
          title="Plus gros D+ recent"
          subtitle="Sorties les plus exigeantes en elevation sur la periode active."
          info={definitions.climbing}
          items={efforts.climbing}
          metric="elevationGain"
          returnPath={returnPath}
          scopeLabel="Periode active"
        />
        <RecordList
          title="Records"
          subtitle="Repères absolus 5 km, 10 km, semi et marathon raccordés à la bonne course support."
          info={definitions.records}
          items={efforts.records}
          returnPath={returnPath}
          scopeLabel="Historique global"
        />
      </div>
    </section>
  );
}
