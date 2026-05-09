import { memo } from "react";
import { TRAINING_MVP_KPI_INFO } from "../content/trainingMvpCopy.js";
import InfoTooltip from "./InfoTooltip.jsx";
import MicroBars from "./visuals/MicroBars.jsx";
import { freshnessTone, load7dTone } from "../utils/tonePicker.js";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatPoints(value, decimals = 0) {
  return `${toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} pts`;
}

function normalizeSeries(data = [], key = "value") {
  return (Array.isArray(data) ? data : [])
    .map((point) => toNumber(point?.[key]))
    .filter((value) => Number.isFinite(value));
}

function getFreshnessStatus(value) {
  if (value >= 5) return { label: "Frais", tone: "positive" };
  if (value >= -10) return { label: "Neutre", tone: "neutral" };
  if (value >= -25) return { label: "Fatigue", tone: "warning" };
  return { label: "Tres fatigue", tone: "danger" };
}

function getBaseStatus(value) {
  if (value >= 55) return { label: "Base solide", tone: "positive" };
  if (value >= 30) return { label: "Base correcte", tone: "neutral" };
  return { label: "Base a developper", tone: "warning" };
}

function getLoadStatus(value) {
  if (value >= 600) return { label: "Bloc tres dense", tone: "danger" };
  if (value >= 400) return { label: "Bloc dense", tone: "warning" };
  if (value >= 200) return { label: "Bloc standard", tone: "positive" };
  return { label: "Bloc leger", tone: "neutral" };
}

/**
 * Sparkline (ligne) → MicroBars (Phase F3, lot G).
 * Pour fraîcheur (TSB) : tone selon zone freshness.
 * Pour base (CTL) : tone neutre (croissance lente, peu d'info dans le delta court terme).
 */
function FormMicroBars({ data = [], dataKey = "value", toneFn = null }) {
  const values = normalizeSeries(data, dataKey);
  if (!values.length) {
    return <div className="empty-state compact-empty-state">Pas assez de données.</div>;
  }
  const tones = toneFn ? values.map(toneFn) : null;
  return (
    <MicroBars
      series={values}
      tones={tones}
      height="md"
      ariaLabel="Tendance récente"
    />
  );
}

function FormCard({ label = "", value = "", status = "", tone = "neutral", detail = "", info = [], children }) {
  return (
    <article className={`today-form-card today-form-card-${tone}`.trim()}>
      <header className="today-form-card-header">
        <div className="title-with-info">
          <h3>{label}</h3>
          <InfoTooltip title={label} content={info} label={`Afficher l'aide pour ${label}`} />
        </div>
        <span className={`today-form-status today-form-status-${tone}`.trim()}>{status}</span>
      </header>
      <div className="today-form-value">
        <strong>{value}</strong>
      </div>
      <div className="today-form-chart">{children}</div>
      <p className="today-form-copy">{detail}</p>
    </article>
  );
}

function TodayFormCards({ loadModel = {}, trendLoadModel = {} }) {
  const summary = loadModel?.summary || {};
  const chartData = Array.isArray(trendLoadModel?.chartData) && trendLoadModel.chartData.length
    ? trendLoadModel.chartData
    : Array.isArray(loadModel?.chartData) ? loadModel.chartData : [];
  const freshness = toNumber(summary.tsb);
  const base = toNumber(summary.ctl);
  const loadSeries = chartData.slice(-14);
  const todayLoad = toNumber(loadSeries[loadSeries.length - 1]?.load);
  // La carte affiche le cumul 7 jours (cohérent avec le barème glossaire :
  // < 200 = bloc léger, 200-400 = standard, 400-600 = dense, > 600 = très chargé).
  // La charge du jour J est mentionnée séparément en détail si elle est non nulle.
  const sevenDayLoad = loadSeries.slice(-7).reduce((sum, point) => sum + toNumber(point?.load), 0);
  const loadStatus = getLoadStatus(sevenDayLoad);
  const freshnessStatus = getFreshnessStatus(freshness);
  const baseStatus = getBaseStatus(base);
  const loadDetail = todayLoad > 0
    ? `Cumul des 7 derniers jours, dont ${formatPoints(todayLoad, 1)} aujourd'hui.`
    : "Cumul de charge des 7 derniers jours.";

  return (
    <section className="today-form-grid">
      <FormCard
        label="Fraîcheur"
        value={formatPoints(freshness, 1)}
        status={freshnessStatus.label}
        tone={freshnessStatus.tone}
        detail="Plus c'est haut, plus tu as de réserve."
        info={TRAINING_MVP_KPI_INFO.tsb}
      >
        <FormMicroBars data={chartData.slice(-14)} dataKey="tsb" toneFn={freshnessTone} />
      </FormCard>
      <FormCard
        label="Base de fond"
        value={formatPoints(base, 1)}
        status={baseStatus.label}
        tone={baseStatus.tone}
        detail="Plus c'est haut, plus ton bloc récent est solide."
        info={TRAINING_MVP_KPI_INFO.ctl}
      >
        <FormMicroBars data={chartData.slice(-14)} dataKey="ctl" />
      </FormCard>
      <FormCard
        label="Charge récente"
        value={formatPoints(sevenDayLoad, 0)}
        status={`cumul 7 j — ${loadStatus.label}`}
        tone={loadStatus.tone}
        detail={loadDetail}
        info={TRAINING_MVP_KPI_INFO.load}
      >
        <FormMicroBars data={loadSeries} dataKey="load" toneFn={load7dTone} />
      </FormCard>
    </section>
  );
}

export default memo(TodayFormCards);
