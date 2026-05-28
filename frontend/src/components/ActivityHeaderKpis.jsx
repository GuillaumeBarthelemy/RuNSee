import { memo } from "react";
import { buildInfoBlocks } from "../content/analyticsCopy.js";
import InfoTooltip from "./InfoTooltip.jsx";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDistance(meters) {
  const numeric = Number(meters);
  return Number.isFinite(numeric) && numeric > 0 ? `${(numeric / 1000).toFixed(2)} km` : "-";
}

function formatDuration(seconds) {
  const numeric = Number(seconds);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "-";
  }

  const hours = Math.floor(numeric / 3600);
  const minutes = Math.floor((numeric % 3600) / 60);
  const remainingSeconds = Math.round(numeric % 60);

  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  }

  return `${minutes} min ${String(remainingSeconds).padStart(2, "0")} s`;
}

function formatElevation(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)} m` : "-";
}

function formatHeartRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? `${Math.round(numeric)} bpm` : "-";
}

const KPI_INFO = {
  distance: buildInfoBlocks({
    role: "Distance totale enregistree pour cette activite.",
    calculation: "On reprend la distance source de Strava, exprimee en kilometres.",
    interpretation: "Lis cette valeur comme le volume brut de la seance, sans correction de pente.",
  }),
  movingTime: buildInfoBlocks({
    role: "Temps reel passe en mouvement.",
    calculation: "On utilise le temps de mouvement fourni par Strava, qui exclut les pauses detectees.",
    interpretation: "C'est le meilleur repere pour comparer la charge active de deux seances.",
  }),
  elevation: buildInfoBlocks({
    role: "Denivele positif cumule.",
    calculation: "On reprend le D+ source de l'activite.",
    interpretation: "A distance egale, plus le D+ augmente, plus la seance peut etre musculairement exigeante.",
  }),
  heartRate: buildInfoBlocks({
    role: "Frequence cardiaque moyenne de la seance.",
    calculation: "Moyenne cardio fournie par la source, si le capteur etait disponible.",
    interpretation: "A interpreter avec le type de seance, la chaleur, la fatigue et le terrain.",
  }),
};

function HeaderKpi({ label, value, hint, info, icon, iconClass }) {
  return (
    <div className="activity-header-kpi">
      <div className="metric-label-row">
        {icon ? <span className={`activity-header-kpi-icon ${iconClass || ""}`} aria-hidden="true">{icon}</span> : null}
        <span className="metric-label">{label}</span>
        <InfoTooltip title={label} content={info} label={`Afficher l'aide pour ${label}`} />
      </div>
      <strong>{value}</strong>
      <span>{hint}</span>
    </div>
  );
}

function ActivityHeaderKpis({ activity = {} }) {
  const distanceKm = toNumber(activity?.distance) / 1000;

  return (
    <div className="activity-header-kpi-grid">
      <HeaderKpi
        label="Distance"
        icon="🏔"
        iconClass="icon-tone-blue"
        value={formatDistance(activity?.distance)}
        hint={distanceKm > 0 ? `${distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km bruts` : "Non disponible"}
        info={KPI_INFO.distance}
      />
      <HeaderKpi
        label="Temps mouvement"
        icon="⏱"
        iconClass="icon-tone-violet"
        value={formatDuration(activity?.movingTime)}
        hint="Hors pauses detectees"
        info={KPI_INFO.movingTime}
      />
      <HeaderKpi
        label="D+"
        icon="⛰"
        iconClass="icon-tone-green"
        value={formatElevation(activity?.totalElevationGain)}
        hint="Charge terrain"
        info={KPI_INFO.elevation}
      />
      <HeaderKpi
        label="FC moy."
        icon="❤"
        iconClass="icon-tone-red"
        value={formatHeartRate(activity?.averageHeartrate)}
        hint="Capteur cardio"
        info={KPI_INFO.heartRate}
      />
    </div>
  );
}

export default memo(ActivityHeaderKpis);
