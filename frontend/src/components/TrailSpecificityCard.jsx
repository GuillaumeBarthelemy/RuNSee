import { memo } from "react";
import InfoTooltip from "./InfoTooltip.jsx";

function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (!safe) return "-";
  const hours = Math.floor(safe / 3600);
  const minutes = Math.round((safe % 3600) / 60);
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")}`;
  return `${minutes} min`;
}

function formatMeters(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("fr-FR")} m`;
}

function TrailStat({ label, value, detail = "" }) {
  return (
    <div className="trail-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function TrailSpecificityCard({
  model = {},
  title = "Specificite trail",
  info = [],
}) {
  const safeModel = model || {};

  return (
    <section className="card trail-specificity-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <div className="title-with-info">
            <h3 className="card-title">{title}</h3>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} compact />
          </div>
          <p className="card-subtitle">Denivele, temps en pente et exposition descente sur la selection.</p>
        </div>
      </div>

      <div className={`insight-banner insight-banner-${safeModel.downhillTone || "neutral"}`.trim()}>
        {safeModel.insight || "Pas assez de donnees altitude exploitables sur la selection."}
      </div>

      <div className="trail-stat-grid">
        <TrailStat label="D+" value={formatMeters(safeModel.elevationGain)} detail={`${safeModel.elevationGainPerKm || 0} m/km`} />
        <TrailStat label="D-" value={formatMeters(safeModel.elevationLoss)} detail={`${safeModel.elevationLossPerKm || 0} m/km`} />
        <TrailStat label="Temps montee" value={formatDuration(safeModel.ascentTimeSeconds)} />
        <TrailStat label="Temps descente" value={formatDuration(safeModel.descentTimeSeconds)} />
        <TrailStat label="Plus longue montee" value={formatMeters(safeModel.longestClimbMeters)} />
        <TrailStat label="Plus longue descente" value={formatMeters(safeModel.longestDescentMeters)} />
        <TrailStat
          label="Part trail"
          value={`${safeModel.trailSharePercent || 0} %`}
          detail={`${safeModel.trailActivities || 0}/${safeModel.totalActivities || 0} activite(s)`}
        />
      </div>
    </section>
  );
}

export default memo(TrailSpecificityCard);
