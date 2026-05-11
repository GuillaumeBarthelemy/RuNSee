import KpiGrid from "./KpiGrid.jsx";
import { formatEfficiencyValue, formatTrainingLoadValue } from "../utils/trainingMetrics.js";
import { buildEfficiencyInterpretation, buildLoadKpiInterpretations } from "../utils/performanceNarratives.js";

function formatSignedPoints(value) {
  if (!Number.isFinite(Number(value))) {
    return "Pas assez d'historique";
  }

  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} pts`;
}

function formatSignedEfficiency(value) {
  if (!Number.isFinite(Number(value))) {
    return "Pas assez d'historique";
  }

  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} km/h/bpm`;
}

function getTrendTone(value, { higherIsBetter = true } = {}) {
  if (!Number.isFinite(Number(value)) || Number(value) === 0) {
    return "neutral";
  }

  const isPositive = higherIsBetter ? Number(value) > 0 : Number(value) < 0;
  return isPositive ? "positive" : "negative";
}

function buildTrend(label, value, formatter) {
  return `${label} ${formatter(value)}`;
}

export default function TrainingSummaryKpiGrid({
  loadModel = {},
  efficiencyModel = {},
  infoMap = {},
  className = "kpi-grid",
  includeEfficiency = true,
  showHints = true,
  showMeta = true,
}) {
  const loadSummary = loadModel?.summary || null;
  const efficiencySummary = efficiencyModel?.summary || null;
  const interpretations = buildLoadKpiInterpretations(loadModel);
  const efficiencyInterpretation = buildEfficiencyInterpretation(efficiencyModel);
  const rangeLabel = loadModel?.range?.label ? `Periode : ${loadModel.range.label}` : "";

  const items = [
    {
      label: "Charge du bloc",
      value: loadSummary ? formatTrainingLoadValue(loadSummary.load) : "-",
      trend: loadSummary ? buildTrend("vs période préc.", loadSummary.loadDeltaValue, formatSignedPoints) : "Pas assez d'historique",
      trendTone: getTrendTone(loadSummary?.loadDeltaValue, { higherIsBetter: true }),
      hint: interpretations.load,
      meta: rangeLabel,
      info: infoMap.load,
    },
    {
      label: "Base de fond",
      value: loadSummary ? formatTrainingLoadValue(loadSummary.ctl) : "-",
      trend: loadSummary ? buildTrend("vs période préc.", loadSummary.ctlDeltaValue, formatSignedPoints) : "Pas assez d'historique",
      trendTone: getTrendTone(loadSummary?.ctlDeltaValue, { higherIsBetter: true }),
      hint: interpretations.ctl,
      meta: rangeLabel,
      info: infoMap.ctl,
    },
    {
      label: "Fatigue recente",
      value: loadSummary ? formatTrainingLoadValue(loadSummary.atl) : "-",
      trend: loadSummary ? buildTrend("vs période préc.", loadSummary.atlDeltaValue, formatSignedPoints) : "Pas assez d'historique",
      trendTone: getTrendTone(loadSummary?.atlDeltaValue, { higherIsBetter: false }),
      hint: interpretations.atl,
      meta: rangeLabel,
      info: infoMap.atl,
    },
    {
      label: "Marge de fraîcheur",
      value: loadSummary ? formatTrainingLoadValue(loadSummary.tsb) : "-",
      trend: loadSummary ? buildTrend("vs période préc.", loadSummary.tsbDeltaValue, formatSignedPoints) : "Pas assez d'historique",
      trendTone: getTrendTone(loadSummary?.tsbDeltaValue, { higherIsBetter: true }),
      hint: interpretations.tsb,
      meta: rangeLabel,
      info: infoMap.tsb,
    },
  ];

  if (includeEfficiency) {
    items.push({
      label: "Efficience allure / FC",
      value: efficiencySummary ? formatEfficiencyValue(efficiencySummary.value) : "-",
      trend: efficiencySummary
        ? buildTrend("vs période préc.", efficiencySummary.deltaValue, formatSignedEfficiency)
        : "Pas assez d'activites comparables",
      trendTone: getTrendTone(efficiencySummary?.deltaValue, { higherIsBetter: true }),
      hint: efficiencyInterpretation.headline,
      meta: efficiencySummary
        ? `${efficiencySummary.activityCount || 0} activite(s) comparables`
        : efficiencyInterpretation.detail,
      info: infoMap.efficiency,
    });
  }

  return <KpiGrid items={items} className={className} showHints={showHints} showMeta={showMeta} />;
}
