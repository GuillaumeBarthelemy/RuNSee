import {
  buildActivityItems,
  buildReferencePace,
  formatPace,
  getItemsWithinRange,
  summarizeActivityItems,
} from "./activityInsights.js";
import { getAnalyticsGranularity, getComparisonRange, getPreviousYearRange } from "./analyticsPeriods.js";

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function roundValue(value, decimals = 1) {
  return Number(Number(value || 0).toFixed(decimals));
}

function metricValue(item, metric) {
  switch (metric) {
    case "distanceKm":
      return item.__distanceKm;
    case "movingHours":
      return item.__movingHours;
    case "elevationGain":
      return item.__elevationGain;
    case "load":
      return item.__load;
    case "count":
      return 1;
    default:
      return item.__distanceKm;
  }
}

function buildPeriodSummary(items, range, allowRunOnlyMetrics) {
  const rangeItems = getItemsWithinRange(items, range.start, range.end);
  const summary = summarizeActivityItems(rangeItems);
  const referencePace = allowRunOnlyMetrics
    ? buildReferencePace(rangeItems, {
      endDate: range.end,
      lookbackDays: range.days,
    })
    : null;

  return {
    ...summary,
    referencePaceSecondsPerKm: referencePace?.hasData ? referencePace.paceSecondsPerKm : 0,
    referencePaceLabel: referencePace?.hasData ? formatPace(referencePace.paceSecondsPerKm) : "-",
    referenceSampleSize: referencePace?.sampleSize || 0,
  };
}

function buildMetricRow(label, key, currentValue, previousValue, yearValue = null) {
  const deltaPercent = previousValue > 0
    ? roundValue(((currentValue - previousValue) / previousValue) * 100, 1)
    : null;
  const yearDeltaPercent = yearValue > 0
    ? roundValue(((currentValue - yearValue) / yearValue) * 100, 1)
    : null;

  return {
    key,
    label,
    currentValue,
    previousValue,
    yearValue,
    deltaPercent,
    yearDeltaPercent,
  };
}

function buildMetricRows(currentSummary, previousSummary, yearSummary, allowRunOnlyMetrics) {
  const yearValue = (key) => (yearSummary ? yearSummary[key] : null);

  return [
    buildMetricRow("Distance", "distanceKm", currentSummary.distanceKm, previousSummary.distanceKm, yearValue("distanceKm")),
    buildMetricRow("Temps", "movingHours", currentSummary.movingHours, previousSummary.movingHours, yearValue("movingHours")),
    buildMetricRow("D+", "elevationGain", currentSummary.elevationGain, previousSummary.elevationGain, yearValue("elevationGain")),
    buildMetricRow("Charge", "load", currentSummary.load, previousSummary.load, yearValue("load")),
    buildMetricRow("Seances", "count", currentSummary.count, previousSummary.count, yearValue("count")),
    buildMetricRow(
      "Allure de reference",
      "referencePaceSecondsPerKm",
      allowRunOnlyMetrics ? currentSummary.referencePaceSecondsPerKm : 0,
      allowRunOnlyMetrics ? previousSummary.referencePaceSecondsPerKm : 0,
      allowRunOnlyMetrics && yearSummary ? yearSummary.referencePaceSecondsPerKm : null,
    ),
  ];
}

function buildDailyCumulativeData(periods, metric, days) {
  return Array.from({ length: days }, (_, index) => {
    const row = {
      label: periods[0].range.days <= 31
        ? addDays(periods[0].range.start, index).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
        : `J${index + 1}`,
    };

    periods.forEach((period) => {
      const cursor = addDays(period.range.start, index);
      const cumulative = period.items
        .filter((item) => item.__date <= cursor)
        .reduce((sum, item) => sum + metricValue(item, metric), 0);

      row[period.key] = roundValue(cumulative, metric === "count" || metric === "elevationGain" ? 0 : 1);
    });

    return row;
  });
}

function buildWeeklyCumulativeData(periods, metric) {
  const weeks = Math.max(1, Math.ceil(periods[0].range.days / 7));

  return Array.from({ length: weeks }, (_, index) => {
    const slotStart = addDays(periods[0].range.start, index * 7);
    const slotEnd = addDays(slotStart, 6);
    const row = {
      label: `${slotStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`,
    };

    periods.forEach((period) => {
      const cursor = addDays(period.range.start, (index * 7) + 6);
      const cappedCursor = cursor > period.range.end ? period.range.end : cursor;
      const cumulative = period.items
        .filter((item) => item.__date <= cappedCursor)
        .reduce((sum, item) => sum + metricValue(item, metric), 0);

      row[period.key] = roundValue(cumulative, metric === "count" || metric === "elevationGain" ? 0 : 1);
    });

    if (slotEnd >= periods[0].range.end) {
      row.label = periods[0].range.end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }

    return row;
  });
}

export function buildPeriodComparisonModel(activities = [], options = {}) {
  const currentRange = options.currentRange;
  if (!currentRange?.start || !currentRange?.end) {
    return {
      metrics: [],
      periods: [],
      chartData: [],
      insight: "",
      hasYearComparison: false,
      chartMetric: options.chartMetric || "distanceKm",
    };
  }

  const items = buildActivityItems(activities);
  const chartMetric = options.chartMetric || "distanceKm";
  const allowRunOnlyMetrics = Boolean(options.allowRunOnlyMetrics);
  const previousRange = getComparisonRange(currentRange);
  const yearRange = getPreviousYearRange(currentRange);

  const periods = [
    {
      key: "current",
      label: "Periode selectionnee",
      range: currentRange,
      color: "#F97316",
      items: getItemsWithinRange(items, currentRange.start, currentRange.end),
    },
    {
      key: "previous",
      label: "Periode precedente",
      range: previousRange,
      color: "#355886",
      items: getItemsWithinRange(items, previousRange.start, previousRange.end),
    },
  ];

  const yearItems = getItemsWithinRange(items, yearRange.start, yearRange.end);
  const hasYearComparison = yearItems.length > 0;

  if (hasYearComparison) {
    periods.push({
      key: "year",
      label: "Meme periode N-1",
      range: yearRange,
      color: "#22C55E",
      items: yearItems,
    });
  }

  const currentSummary = buildPeriodSummary(items, currentRange, allowRunOnlyMetrics);
  const previousSummary = buildPeriodSummary(items, previousRange, allowRunOnlyMetrics);
  const yearSummary = hasYearComparison ? buildPeriodSummary(items, yearRange, allowRunOnlyMetrics) : null;
  const metrics = buildMetricRows(currentSummary, previousSummary, yearSummary, allowRunOnlyMetrics);
  const granularity = getAnalyticsGranularity(currentRange);
  const chartData = granularity === "daily"
    ? buildDailyCumulativeData(periods, chartMetric, currentRange.days)
    : buildWeeklyCumulativeData(periods, chartMetric);
  const chartCurrent = metrics.find((metric) => metric.key === chartMetric);
  const insight = chartCurrent?.deltaPercent === null
    ? ""
    : `${chartCurrent.label} ${chartCurrent.deltaPercent >= 0 ? "en hausse" : "en retrait"} de ${Math.abs(chartCurrent.deltaPercent).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % vs periode precedente.`;

  return {
    metrics,
    periods,
    chartData,
    insight,
    hasYearComparison,
    chartMetric,
    currentRangeLabel: currentRange.label,
    previousRangeLabel: previousRange.label,
    yearRangeLabel: yearRange.label,
  };
}
