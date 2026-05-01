import { memo } from "react";
import { TRAINING_MVP_KPI_INFO } from "../content/trainingMvpCopy.js";
import InfoTooltip from "./InfoTooltip.jsx";

const SPARK_WIDTH = 260;
const SPARK_HEIGHT = 78;
const SPARK_PADDING = 8;

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

function buildLinePath(values = [], minValue, maxValue) {
  if (!values.length) {
    return "";
  }

  const span = Math.max(1, maxValue - minValue);
  const usableWidth = SPARK_WIDTH - (SPARK_PADDING * 2);
  const usableHeight = SPARK_HEIGHT - (SPARK_PADDING * 2);

  return values
    .map((value, index) => {
      const x = SPARK_PADDING + (values.length === 1 ? usableWidth : (index / (values.length - 1)) * usableWidth);
      const y = SPARK_PADDING + ((maxValue - value) / span) * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function getLastPoint(values = [], minValue, maxValue) {
  if (!values.length) {
    return null;
  }

  const span = Math.max(1, maxValue - minValue);
  const usableWidth = SPARK_WIDTH - (SPARK_PADDING * 2);
  const usableHeight = SPARK_HEIGHT - (SPARK_PADDING * 2);
  const value = values[values.length - 1];

  return {
    x: SPARK_PADDING + usableWidth,
    y: SPARK_PADDING + ((maxValue - value) / span) * usableHeight,
  };
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

function LineSparkline({ data = [], dataKey = "value", color = "#355886", withFreshnessZones = false }) {
  const values = normalizeSeries(data, dataKey);
  const naturalMin = Math.min(...values, 0);
  const naturalMax = Math.max(...values, 10);
  const minValue = withFreshnessZones ? Math.min(-30, naturalMin) : naturalMin;
  const maxValue = withFreshnessZones ? Math.max(20, naturalMax) : naturalMax;
  const path = buildLinePath(values, minValue, maxValue);
  const lastPoint = getLastPoint(values, minValue, maxValue);

  if (!values.length) {
    return <div className="empty-state compact-empty-state">Pas assez de donnees.</div>;
  }

  return (
    <svg className="today-form-sparkline" viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} role="img" aria-label="Tendance recente">
      {withFreshnessZones ? (
        <>
          <rect x="0" y="0" width={SPARK_WIDTH} height={SPARK_HEIGHT * 0.34} className="spark-zone-positive" />
          <rect x="0" y={SPARK_HEIGHT * 0.34} width={SPARK_WIDTH} height={SPARK_HEIGHT * 0.25} className="spark-zone-neutral" />
          <rect x="0" y={SPARK_HEIGHT * 0.59} width={SPARK_WIDTH} height={SPARK_HEIGHT * 0.41} className="spark-zone-warning" />
        </>
      ) : null}
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {lastPoint ? <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={color} /> : null}
    </svg>
  );
}

function BarSparkline({ data = [], dataKey = "value" }) {
  const values = normalizeSeries(data, dataKey);
  const maxValue = Math.max(...values, 1);
  const barGap = 4;
  const barWidth = Math.max(5, (SPARK_WIDTH - (SPARK_PADDING * 2) - (barGap * Math.max(0, values.length - 1))) / Math.max(1, values.length));

  if (!values.length) {
    return <div className="empty-state compact-empty-state">Pas assez de donnees.</div>;
  }

  return (
    <svg className="today-form-sparkline" viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} role="img" aria-label="Charge recente">
      {values.map((value, index) => {
        const height = Math.max(2, (value / maxValue) * (SPARK_HEIGHT - SPARK_PADDING * 2));
        const x = SPARK_PADDING + index * (barWidth + barGap);
        const y = SPARK_HEIGHT - SPARK_PADDING - height;

        return (
          <rect
            key={`${value}-${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            rx="4"
            className={index === values.length - 1 ? "spark-bar-current" : "spark-bar"}
          />
        );
      })}
    </svg>
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
  const sevenDayLoad = loadSeries.slice(-7).reduce((sum, point) => sum + toNumber(point?.load), 0);
  const loadValue = todayLoad > 0 ? todayLoad : sevenDayLoad;
  const loadStatus = getLoadStatus(sevenDayLoad);
  const freshnessStatus = getFreshnessStatus(freshness);
  const baseStatus = getBaseStatus(base);

  return (
    <section className="today-form-grid">
      <FormCard
        label="Fraicheur"
        value={formatPoints(freshness, 1)}
        status={freshnessStatus.label}
        tone={freshnessStatus.tone}
        detail="Plus c'est haut, plus tu as de reserve."
        info={TRAINING_MVP_KPI_INFO.tsb}
      >
        <LineSparkline data={chartData.slice(-28)} dataKey="tsb" color="#16a34a" withFreshnessZones />
      </FormCard>
      <FormCard
        label="Base de fond"
        value={formatPoints(base, 1)}
        status={baseStatus.label}
        tone={baseStatus.tone}
        detail="Plus c'est haut, plus ton bloc recent est solide."
        info={TRAINING_MVP_KPI_INFO.ctl}
      >
        <LineSparkline data={chartData.slice(-28)} dataKey="ctl" color="#355886" />
      </FormCard>
      <FormCard
        label="Charge recente"
        value={formatPoints(loadValue, todayLoad > 0 ? 1 : 0)}
        status={todayLoad > 0 ? loadStatus.label : `cumul 7 j - ${loadStatus.label}`}
        tone={loadStatus.tone}
        detail="Charge des derniers jours, avec le jour courant mis en avant si une sortie est detectee."
        info={TRAINING_MVP_KPI_INFO.load}
      >
        <BarSparkline data={loadSeries} dataKey="load" />
      </FormCard>
    </section>
  );
}

export default memo(TodayFormCards);
