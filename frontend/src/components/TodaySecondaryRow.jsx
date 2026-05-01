import { memo } from "react";
import {
  TRAINING_MVP_ADVANCED_SIGNAL_INFO,
  TRAINING_MVP_KPI_INFO,
} from "../content/trainingMvpCopy.js";
import InfoTooltip from "./InfoTooltip.jsx";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getRegularityTone(value) {
  if (value >= 75) return "positive";
  if (value >= 50) return "neutral";
  if (value > 0) return "warning";
  return "neutral";
}

function getDensityTone(value) {
  if (value >= 1600) return "danger";
  if (value >= 900) return "warning";
  if (value > 0) return "neutral";
  return "neutral";
}

function SecondaryItem({ label = "", value = "", detail = "", tone = "neutral", info = [] }) {
  return (
    <article className={`today-secondary-item today-secondary-item-${tone}`.trim()}>
      <div className="today-secondary-head">
        <span className="metric-label">{label}</span>
        <InfoTooltip title={label} content={info} label={`Afficher l'aide pour ${label}`} />
      </div>
      <div className="today-secondary-value">
        <strong>{value}</strong>
      </div>
      <p className={`today-secondary-copy today-secondary-tone-${tone}`.trim()}>{detail}</p>
    </article>
  );
}

function TodaySecondaryRow({ weeklySummary = {}, loadVarianceModel = {} }) {
  const regularity = toNumber(weeklySummary?.activeWeeksRatio);
  const density = toNumber(loadVarianceModel?.strain);

  return (
    <section className="today-secondary-row">
      <SecondaryItem
        label="Constance"
        value={`${regularity.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`}
        detail="Semaines actives recentes"
        tone={getRegularityTone(regularity)}
        info={TRAINING_MVP_KPI_INFO.regularity}
      />
      <SecondaryItem
        label="Pression cumulee"
        value={`${density.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} pts`}
        detail="Charge recente et repetition des efforts"
        tone={getDensityTone(density)}
        info={TRAINING_MVP_ADVANCED_SIGNAL_INFO.strain}
      />
    </section>
  );
}

export default memo(TodaySecondaryRow);
