import { memo, useMemo } from "react";
import { TRAINING_MVP_TODAY_VOLUME_INFO } from "../content/trainingMvpCopy.js";
import { buildTodayVolumeSummary } from "../utils/todayVolumeSummary.js";
import InfoTooltip from "./InfoTooltip.jsx";

function formatDecimal(value, decimals = 1) {
  return Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatHours(value) {
  const totalMinutes = Math.round(Number(value || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return minutes > 0 ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
}

function formatPercentDelta(value) {
  if (!Number.isFinite(Number(value))) {
    return "vs sem. prec. -";
  }

  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `vs sem. prec. ${sign}${numeric.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`;
}

function formatSessionDelta(value) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `vs sem. prec. ${sign}${numeric.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;
}

function TodayVolumeCard({ label = "", value = "", delta = "", tone = "neutral", info = [] }) {
  return (
    <article className={`today-volume-card today-volume-card-${tone}`.trim()}>
      <div className="metric-label-row">
        <span className="metric-label">{label}</span>
        <InfoTooltip title={label} content={info} label={`Afficher l'aide pour ${label}`} />
      </div>
      <div className="today-volume-value">
        <strong>{value}</strong>
      </div>
      <span className={`today-volume-delta today-volume-delta-${tone}`.trim()}>{delta}</span>
    </article>
  );
}

function TodayVolumeStrip({ weeklySummary = {} }) {
  const model = useMemo(() => buildTodayVolumeSummary(weeklySummary), [weeklySummary]);
  const items = [
    {
      key: "distanceKm",
      label: "Distance hebdo",
      value: `${formatDecimal(model.current.distanceKm)} km`,
      delta: formatPercentDelta(model.deltas.distanceKm),
    },
    {
      key: "count",
      label: "Seances hebdo",
      value: `${model.current.count.toLocaleString("fr-FR")} seance${model.current.count > 1 ? "s" : ""}`,
      delta: formatSessionDelta(model.deltas.count),
    },
    {
      key: "movingHours",
      label: "Duree hebdo",
      value: formatHours(model.current.movingHours),
      delta: formatPercentDelta(model.deltas.movingHours),
    },
    {
      key: "elevationGain",
      label: "Denivele hebdo",
      value: `${model.current.elevationGain.toLocaleString("fr-FR")} m`,
      delta: formatPercentDelta(model.deltas.elevationGain),
    },
  ];

  return (
    <section className="today-volume-strip">
      {items.map((item) => (
        <TodayVolumeCard
          key={item.key}
          label={item.label}
          value={item.value}
          delta={model.hasData ? item.delta : "Pas assez d'historique"}
          tone={model.hasData ? model.tones[item.key] : "neutral"}
          info={TRAINING_MVP_TODAY_VOLUME_INFO[item.key]}
        />
      ))}
    </section>
  );
}

export default memo(TodayVolumeStrip);
