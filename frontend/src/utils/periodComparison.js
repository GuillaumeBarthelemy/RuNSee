import {
  buildActivityItems,
  getItemsWithinRange,
  summarizeActivityItems,
} from "./activityInsights.js";
import { formatMetricValue } from "./activityAggregations.js";

const AVERAGE_MONTH_DAYS = 365.25 / 12;
const YEAR_COLOR_PALETTE = [
  "#F97316",
  "#22C55E",
  "#355886",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#D7962A",
  "#14B8A6",
];

export const PERIOD_COMPARISON_METRIC_OPTIONS = [
  { value: "distanceKm", label: "Distance", baseMetric: "distanceKm", decimals: 1, chartMode: "cumulative" },
  { value: "movingHours", label: "Temps", baseMetric: "movingHours", decimals: 1, chartMode: "cumulative" },
  { value: "elevationGain", label: "D+", baseMetric: "elevationGain", decimals: 0, chartMode: "cumulative" },
  { value: "load", label: "Charge", baseMetric: "load", decimals: 1, chartMode: "cumulative" },
  { value: "distancePerWeekKm", label: "Km / semaine", baseMetric: "distanceKm", decimals: 1, chartMode: "normalized", normalizationDays: 7 },
  { value: "distancePerMonthKm", label: "Km / mois", baseMetric: "distanceKm", decimals: 1, chartMode: "normalized", normalizationDays: AVERAGE_MONTH_DAYS },
];

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundValue(value, decimals = 1) {
  return Number(toNumber(value).toFixed(decimals));
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function resolveDateInYear(year, month, day) {
  const candidate = new Date(year, month, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month || candidate.getDate() !== day) {
    return null;
  }

  return candidate;
}

function resolveClampedDateInYear(year, month, day) {
  return resolveDateInYear(year, month, day) || new Date(year, month + 1, 0);
}

function formatRangeLabel(start, end) {
  return `${start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
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
    default:
      return item.__distanceKm;
  }
}

function normalizeDistanceAverage(distanceKm, periodDays, windowDays) {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(periodDays) || periodDays <= 0 || windowDays <= 0) {
    return 0;
  }

  return roundValue((distanceKm / periodDays) * windowDays, 1);
}

function buildPeriodSummary(items, range) {
  const rangeItems = getItemsWithinRange(items, range.start, range.end);
  const summary = summarizeActivityItems(rangeItems);

  return {
    ...summary,
    periodDays: Math.max(1, Number(range?.days || 1)),
    distancePerWeekKm: normalizeDistanceAverage(summary.distanceKm, range?.days, 7),
    distancePerMonthKm: normalizeDistanceAverage(summary.distanceKm, range?.days, AVERAGE_MONTH_DAYS),
  };
}

export function getPeriodComparisonMetricConfig(metric = "distanceKm") {
  return PERIOD_COMPARISON_METRIC_OPTIONS.find((option) => option.value === metric) || PERIOD_COMPARISON_METRIC_OPTIONS[0];
}

export function normalizePeriodComparisonMetric(metric = "distanceKm") {
  return getPeriodComparisonMetricConfig(metric).value;
}

export function formatPeriodComparisonMetricValue(value, metric = "distanceKm", options = {}) {
  const { signed = false, emptyValue = "-" } = options;
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return emptyValue;
  }

  const config = getPeriodComparisonMetricConfig(metric);
  const numeric = Number(value);
  const epsilon = config.decimals === 0 ? 0.5 : 0.05;

  if (signed && Math.abs(numeric) < epsilon) {
    return "Ø";
  }

  const formatted = formatMetricValue(Math.abs(numeric), config.baseMetric);
  if (!signed) {
    return formatMetricValue(numeric, config.baseMetric);
  }

  return `${numeric > 0 ? "+" : "-"} ${formatted}`;
}

function buildYearToDateRange(year, referenceEndDate) {
  const safeEndDate = startOfDay(referenceEndDate);
  const start = new Date(year, 0, 1);
  const end = resolveClampedDateInYear(year, safeEndDate.getMonth(), safeEndDate.getDate());

  return {
    year,
    start,
    end,
    days: Math.max(1, Math.round((end - start) / 86400000) + 1),
    label: formatRangeLabel(start, end),
  };
}

function buildAvailableYears(items, anchorYear) {
  if (!Number.isInteger(anchorYear)) {
    return [];
  }

  if (!items.length) {
    return [anchorYear];
  }

  const availableYears = items
    .map((item) => item.__date?.getFullYear())
    .filter((year) => Number.isInteger(year) && year <= anchorYear);

  const minYear = availableYears.length ? Math.min(...availableYears) : anchorYear;

  return Array.from({ length: Math.max(1, anchorYear - minYear + 1) }, (_, index) => anchorYear - index);
}

function buildDefaultSelectedYears(availableYears, anchorYear) {
  const defaults = availableYears.slice(0, Math.min(4, availableYears.length));
  return Array.from(new Set([anchorYear, ...defaults])).sort((left, right) => right - left);
}

function normalizeSelectedYears(selectedYears, availableYears, anchorYear) {
  const allowedYears = new Set(availableYears);
  const safeYears = Array.isArray(selectedYears)
    ? selectedYears
      .map((year) => Number(year))
      .filter((year) => Number.isInteger(year) && allowedYears.has(year))
    : [];

  const mergedYears = Array.from(new Set([anchorYear, ...safeYears])).sort((left, right) => right - left);
  return mergedYears.length ? mergedYears : buildDefaultSelectedYears(availableYears, anchorYear);
}

function getSummaryMetricValue(summary, metric) {
  switch (metric) {
    case "distanceKm":
      return summary.distanceKm;
    case "movingHours":
      return summary.movingHours;
    case "elevationGain":
      return summary.elevationGain;
    case "load":
      return summary.load;
    case "distancePerWeekKm":
      return summary.distancePerWeekKm;
    case "distancePerMonthKm":
      return summary.distancePerMonthKm;
    default:
      return summary.distanceKm;
  }
}

function buildDeltaValue(currentValue, previousValue, metric) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return null;
  }

  const config = getPeriodComparisonMetricConfig(metric);
  const delta = roundValue(currentValue - previousValue, config.decimals);
  const epsilon = config.decimals === 0 ? 0.5 : 0.05;

  if (Math.abs(delta) < epsilon && Math.abs(currentValue) < epsilon && Math.abs(previousValue) < epsilon) {
    return null;
  }

  if (Math.abs(delta) < epsilon) {
    return null;
  }

  return delta;
}

function buildReferenceTimeline(referenceEndDate, years) {
  const safeEndDate = startOfDay(referenceEndDate);
  const includesLeapSlot = (safeEndDate.getMonth() > 1 || (safeEndDate.getMonth() === 1 && safeEndDate.getDate() === 29))
    && years.some((year) => isLeapYear(year));
  const referenceYear = includesLeapSlot ? 2024 : 2025;
  const start = new Date(referenceYear, 0, 1);
  const end = resolveClampedDateInYear(referenceYear, safeEndDate.getMonth(), safeEndDate.getDate());
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

  return Array.from({ length: totalDays }, (_, index) => addDays(start, index));
}

function formatProgressValue(rawCumulative, elapsedDays, metric) {
  const config = getPeriodComparisonMetricConfig(metric);

  if (config.chartMode === "normalized") {
    if (elapsedDays <= 0) {
      return 0;
    }

    return normalizeDistanceAverage(rawCumulative, elapsedDays, config.normalizationDays);
  }

  return roundValue(rawCumulative, config.decimals);
}

function buildPeriodChartSeries(period, metric, timelineDates) {
  const config = getPeriodComparisonMetricConfig(metric);
  const dailyMetricMap = new Map();

  period.items.forEach((item) => {
    const key = formatDayKey(item.__date);
    dailyMetricMap.set(key, (dailyMetricMap.get(key) || 0) + metricValue(item, config.baseMetric));
  });

  let cumulative = 0;
  let lastElapsedDays = 0;

  return timelineDates.map((referenceDate) => {
    const actualDate = resolveDateInYear(period.year, referenceDate.getMonth(), referenceDate.getDate());

    if (actualDate && actualDate <= period.range.end) {
      cumulative += dailyMetricMap.get(formatDayKey(actualDate)) || 0;
      lastElapsedDays = Math.max(1, Math.round((actualDate - period.range.start) / 86400000) + 1);
    }

    return formatProgressValue(cumulative, lastElapsedDays, metric);
  });
}

function buildChartData(periods, metric, referenceEndDate) {
  const timelineDates = buildReferenceTimeline(referenceEndDate, periods.map((period) => period.year));
  const periodSeries = new Map(
    periods.map((period) => [period.key, buildPeriodChartSeries(period, metric, timelineDates)]),
  );

  return timelineDates.map((date, index) => {
    const row = {
      label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      fullLabel: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      periodDate: formatDayKey(date),
    };

    periods.forEach((period) => {
      row[period.key] = periodSeries.get(period.key)?.[index] ?? 0;
    });

    return row;
  });
}

function buildInsight(anchorYear, metric, anchorSummary, previousSummary) {
  if (!anchorSummary || !previousSummary) {
    return "";
  }

  const currentValue = getSummaryMetricValue(anchorSummary, metric);
  const previousValue = getSummaryMetricValue(previousSummary, metric);
  const delta = buildDeltaValue(currentValue, previousValue, metric);

  if (delta === null) {
    return "";
  }

  return `${getPeriodComparisonMetricConfig(metric).label} YTD ${anchorYear} ${delta > 0 ? "au-dessus" : "en dessous"} de ${formatPeriodComparisonMetricValue(Math.abs(delta), metric)} vs ${anchorYear - 1}.`;
}

export function buildPeriodComparisonModel(activities = [], options = {}) {
  const referenceEndDate = options.currentRange?.end ? startOfDay(options.currentRange.end) : null;
  if (!referenceEndDate) {
    return {
      availableYears: [],
      selectedYears: [],
      rows: [],
      periods: [],
      chartData: [],
      chartGranularity: "daily",
      chartMetric: normalizePeriodComparisonMetric(options.chartMetric),
      chartLabel: getPeriodComparisonMetricConfig(options.chartMetric).label,
      chartSubtitle: "",
      insight: "",
      anchorYear: null,
      anchorLabel: "",
      cutoffLabel: "",
      hasData: false,
    };
  }

  const items = buildActivityItems(activities, { settings: options.settings || {} });
  if (!items.length) {
    const anchorYear = referenceEndDate.getFullYear();
    return {
      availableYears: [anchorYear],
      selectedYears: [anchorYear],
      rows: [],
      periods: [],
      chartData: [],
      chartGranularity: "daily",
      chartMetric: normalizePeriodComparisonMetric(options.chartMetric),
      chartLabel: getPeriodComparisonMetricConfig(options.chartMetric).label,
      chartSubtitle: "",
      insight: "",
      anchorYear,
      anchorLabel: String(anchorYear),
      cutoffLabel: referenceEndDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      hasData: false,
    };
  }

  const chartMetric = normalizePeriodComparisonMetric(options.chartMetric);
  const anchorYear = referenceEndDate.getFullYear();
  const availableYears = buildAvailableYears(items, anchorYear);
  const selectedYears = normalizeSelectedYears(options.selectedYears, availableYears, anchorYear);

  const summariesByYear = new Map(
    availableYears.map((year) => {
      const range = buildYearToDateRange(year, referenceEndDate);
      return [
        year,
        {
          year,
          range,
          items: getItemsWithinRange(items, range.start, range.end),
          summary: buildPeriodSummary(items, range),
        },
      ];
    }),
  );

  const periods = selectedYears.map((year, index) => {
    const yearSummary = summariesByYear.get(year);
    return {
      key: `year_${year}`,
      year,
      label: String(year),
      color: YEAR_COLOR_PALETTE[index % YEAR_COLOR_PALETTE.length],
      range: yearSummary.range,
      items: yearSummary.items,
      summary: yearSummary.summary,
    };
  });

  const anchorSummary = summariesByYear.get(anchorYear)?.summary || null;
  const previousAnchorSummary = summariesByYear.get(anchorYear - 1)?.summary || buildPeriodSummary(items, buildYearToDateRange(anchorYear - 1, referenceEndDate));
  const rows = periods.map((period) => {
    const currentValue = getSummaryMetricValue(period.summary, chartMetric);
    const previousYearSummary = summariesByYear.get(period.year - 1)?.summary
      || buildPeriodSummary(items, buildYearToDateRange(period.year - 1, referenceEndDate));

    return {
      key: period.key,
      year: period.year,
      color: period.color,
      value: currentValue,
      deltaPrevYear: buildDeltaValue(currentValue, getSummaryMetricValue(previousYearSummary, chartMetric), chartMetric),
      deltaWithCurrentYear: period.year === anchorYear
        ? null
        : buildDeltaValue(currentValue, getSummaryMetricValue(anchorSummary, chartMetric), chartMetric),
    };
  });

  const chartSubtitle = getPeriodComparisonMetricConfig(chartMetric).chartMode === "normalized"
    ? `${getPeriodComparisonMetricConfig(chartMetric).label} YTD, normalise au fil des jours ecoules depuis le 1er janvier.`
    : `${getPeriodComparisonMetricConfig(chartMetric).label} YTD cumulee, alignee du 1er janvier a la date de coupure.`;

  return {
    availableYears,
    selectedYears,
    rows,
    periods,
    chartData: buildChartData(periods, chartMetric, referenceEndDate),
    chartGranularity: "daily",
    chartMetric,
    chartLabel: getPeriodComparisonMetricConfig(chartMetric).label,
    chartSubtitle,
    insight: buildInsight(anchorYear, chartMetric, anchorSummary, previousAnchorSummary),
    anchorYear,
    anchorLabel: String(anchorYear),
    cutoffLabel: referenceEndDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    hasData: rows.some((row) => Math.abs(Number(row.value || 0)) > 0),
  };
}
