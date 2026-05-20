import { formatMetricValue } from "./activityAggregations.js";
import {
  buildActivityItems,
  summarizeActivityItems,
  getItemsWithinRange,
  isRunLikeActivity,
} from "./activityInsights.js";
import {
  buildHeartRateLoadDistribution,
  buildSpeedLoadDistribution,
} from "./trainingIntelligence.js";
import { endOfWeek, startOfWeek as resolveWeekStart } from "./weekStart.js";

export const DEFAULT_TRAINING_ANALYTICS_SETTINGS = {
  heartRateMax: null,
  restingHeartrate: 60,
  biologicalSex: "unspecified",
  heartRateZone1Max: null,
  heartRateZone2Max: null,
  heartRateZone3Max: null,
  heartRateZone4Max: null,
  intensitySourcePriority: "heart_rate",
  efficiencyMinDurationMinutes: 20,
  efficiencyMaxElevationPerKm: 25,
  efficiencyExcludeTrail: true,
};

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function roundValue(value, decimals = 1) {
  return Number(toNumber(value).toFixed(decimals));
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

function formatWeekLabel(date) {
  const end = addDays(date, 6);
  return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
}

function toNullableInteger(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numeric = Math.round(Number(value));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === "false" || value === "0" || value === 0) {
    return false;
  }

  return fallback;
}

function resolveIntensitySourcePriority(value) {
  return String(value || "").trim() === "pace" ? "pace" : "heart_rate";
}

function resolveBiologicalSex(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["male", "female"].includes(normalized) ? normalized : "unspecified";
}

function formatRangeLabel(startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }

  return `${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - ${endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function resolveDateRange(items = [], options = {}) {
  const latestAvailableDate = items.length
    ? startOfDay(items[items.length - 1].__date)
    : startOfDay(new Date());
  const endDate = startOfDay(options.endDate ? new Date(options.endDate) : latestAvailableDate);
  const requestedStartDate = options.startDate ? new Date(options.startDate) : addDays(endDate, -29);
  const startDate = startOfDay(requestedStartDate <= endDate ? requestedStartDate : endDate);

  return {
    startDate,
    endDate,
    days: Math.max(1, Math.round((endDate - startDate) / 86400000) + 1),
    label: formatRangeLabel(startDate, endDate),
  };
}

function buildPreviousEquivalentRange(range = {}) {
  const windowDays = Math.max(1, Number(range.days || 1));
  const endDate = addDays(range.startDate, -1);
  const startDate = addDays(endDate, -(windowDays - 1));

  return {
    startDate,
    endDate,
    days: windowDays,
    label: formatRangeLabel(startDate, endDate),
  };
}

function buildDeltaValue(currentValue, previousValue, decimals = 1) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return null;
  }

  return roundValue(currentValue - previousValue, decimals);
}

function buildDeltaPercent(currentValue, previousValue, decimals = 1) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
    return null;
  }

  return roundValue(((currentValue - previousValue) / Math.abs(previousValue)) * 100, decimals);
}

function groupTimelineByWeek(points = [], weekStartsOn = "monday") {
  const safePoints = Array.isArray(points) ? points : [];

  if (!safePoints.length) {
    return [];
  }

  const grouped = new Map();

  safePoints.forEach((point) => {
    const weekStart = resolveWeekStart(point.date, weekStartsOn);
    const key = formatDayKey(weekStart);
    const current = grouped.get(key) || {
      date: weekStart,
      label: formatWeekLabel(weekStart),
      periodDate: key,
      fullLabel: formatWeekLabel(weekStart),
      load: 0,
      ctl: 0,
      atl: 0,
      tsb: 0,
      activityCount: 0,
      efficiency: null,
    };

    current.load += toNumber(point.load);
    current.ctl = point.ctl;
    current.atl = point.atl;
    current.tsb = point.tsb;
    current.activityCount += toNumber(point.activityCount);
    current.efficiency = point.efficiency;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((point) => ({
    ...point,
    load: roundValue(point.load, 1),
    ctl: roundValue(point.ctl, 1),
    atl: roundValue(point.atl, 1),
    tsb: roundValue(point.tsb, 1),
    efficiency: Number.isFinite(point.efficiency) ? roundValue(point.efficiency, 3) : null,
  }));
}

function isTrailLikeActivity(activity = {}) {
  const sportType = String(activity?.sportType || activity?.type || "").trim().toLowerCase();
  const text = `${activity?.name || ""} ${activity?.description || ""}`.toLowerCase();

  return sportType === "trailrun" || /trail|montagne|sentier|col|crete|grimpette/.test(text);
}

function buildHeartRatePreferences(settings = {}) {
  const safe = settings || {};
  return {
    heartRateMax: safe.heartRateMax ?? "",
    restingHeartrate: safe.restingHeartrate ?? "",
    biologicalSex: safe.biologicalSex ?? "unspecified",
    heartRateZone1Max: safe.heartRateZone1Max ?? "",
    heartRateZone2Max: safe.heartRateZone2Max ?? "",
    heartRateZone3Max: safe.heartRateZone3Max ?? "",
    heartRateZone4Max: safe.heartRateZone4Max ?? "",
  };
}

function buildDailyLoadTimeline(items = [], endDate, { ctlWindowDays = 42, atlWindowDays = 7 } = {}) {
  if (!items.length) {
    return [];
  }

  const firstDate = startOfDay(items[0].__date);
  const safeEndDate = startOfDay(endDate);
  const loadMap = new Map();
  const activityCountMap = new Map();

  items
    .filter((item) => startOfDay(item.__date) <= safeEndDate)
    .forEach((item) => {
      const activityDay = startOfDay(item.__date);
      const key = formatDayKey(activityDay);
      loadMap.set(key, (loadMap.get(key) || 0) + toNumber(item.__load));
      activityCountMap.set(key, (activityCountMap.get(key) || 0) + 1);
    });

  const points = [];
  let ctl = 0;
  let atl = 0;
  let cursor = firstDate;

  while (cursor <= safeEndDate) {
    const key = formatDayKey(cursor);
    const load = roundValue(loadMap.get(key) || 0, 1);
    ctl = ctl + ((load - ctl) / ctlWindowDays);
    atl = atl + ((load - atl) / atlWindowDays);

    points.push({
      date: cursor,
      label: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      fullLabel: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      periodDate: formatDayKey(cursor),
      load,
      ctl: roundValue(ctl, 1),
      atl: roundValue(atl, 1),
      tsb: roundValue(ctl - atl, 1),
      activityCount: activityCountMap.get(key) || 0,
      efficiency: null,
    });

    cursor = addDays(cursor, 1);
  }

  return points;
}

function formatSignedDelta(value, metric) {
  if (!Number.isFinite(Number(value))) {
    return "Pas assez d'historique";
  }

  const numeric = Number(value);
  const absoluteValue = Math.abs(numeric);
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";

  return `${sign}${formatMetricValue(absoluteValue, metric)}`;
}

function getDeltaTone(value) {
  if (!Number.isFinite(Number(value)) || Number(value) === 0) {
    return "neutral";
  }

  return Number(value) > 0 ? "positive" : "negative";
}

function formatWeeklySnapshotLabel(startDate, endDate, selectedEndDate) {
  const safeStartDate = startDate instanceof Date ? startDate : null;
  const safeEndDate = endDate instanceof Date ? endDate : null;
  const safeSelectedEndDate = selectedEndDate instanceof Date ? selectedEndDate : null;

  if (!safeStartDate || !safeEndDate) {
    return "";
  }

  const rangeLabel = `${safeStartDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })} - ${safeEndDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })}`;

  return safeSelectedEndDate && safeSelectedEndDate < safeEndDate
    ? `${rangeLabel} · a date`
    : rangeLabel;
}

function buildWeeklySnapshotItems(currentSummary, previousSummary, options = {}) {
  const safeCurrentSummary = currentSummary || {};
  const safePreviousSummary = previousSummary || {};
  const hint = options.hint || "";

  return [
    {
      label: "Distance",
      value: formatMetricValue(safeCurrentSummary.distanceKm || 0, "distanceKm"),
      trend: `vs sem. prec. ${formatSignedDelta((safeCurrentSummary.distanceKm || 0) - (safePreviousSummary.distanceKm || 0), "distanceKm")}`,
      trendTone: getDeltaTone((safeCurrentSummary.distanceKm || 0) - (safePreviousSummary.distanceKm || 0)),
      hint,
    },
    {
      label: "Denivele",
      value: formatMetricValue(safeCurrentSummary.elevationGain || 0, "elevationGain"),
      trend: `vs sem. prec. ${formatSignedDelta((safeCurrentSummary.elevationGain || 0) - (safePreviousSummary.elevationGain || 0), "elevationGain")}`,
      trendTone: getDeltaTone((safeCurrentSummary.elevationGain || 0) - (safePreviousSummary.elevationGain || 0)),
      hint,
    },
    {
      label: "Duree",
      value: formatMetricValue(safeCurrentSummary.movingHours || 0, "movingHours"),
      trend: `vs sem. prec. ${formatSignedDelta((safeCurrentSummary.movingHours || 0) - (safePreviousSummary.movingHours || 0), "movingHours")}`,
      trendTone: getDeltaTone((safeCurrentSummary.movingHours || 0) - (safePreviousSummary.movingHours || 0)),
      hint,
    },
    {
      label: "Seances",
      value: formatMetricValue(safeCurrentSummary.count || 0, "count"),
      trend: `vs sem. prec. ${formatSignedDelta((safeCurrentSummary.count || 0) - (safePreviousSummary.count || 0), "count")}`,
      trendTone: getDeltaTone((safeCurrentSummary.count || 0) - (safePreviousSummary.count || 0)),
      hint,
    },
  ];
}

function buildEfficiencyAggregate(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const totalDistanceKm = safeItems.reduce((sum, item) => sum + toNumber(item.__distanceKm), 0);
  const totalMovingHours = safeItems.reduce((sum, item) => sum + toNumber(item.__movingHours), 0);
  const hrWeightedSeconds = safeItems.reduce((sum, item) => sum + toNumber(item.averageHeartrate) * toNumber(item.__movingSeconds), 0);
  const totalHrSeconds = safeItems.reduce((sum, item) => sum + toNumber(item.__movingSeconds), 0);

  if (totalDistanceKm <= 0 || totalMovingHours <= 0 || totalHrSeconds <= 0) {
    return null;
  }

  const averageSpeedKmh = totalDistanceKm / totalMovingHours;
  const averageHeartrate = hrWeightedSeconds / totalHrSeconds;

  if (averageSpeedKmh <= 0 || averageHeartrate <= 0) {
    return null;
  }

  return {
    value: roundValue(averageSpeedKmh / averageHeartrate, 3),
    averageSpeedKmh: roundValue(averageSpeedKmh, 2),
    averageHeartrate: roundValue(averageHeartrate, 0),
    distanceKm: roundValue(totalDistanceKm, 1),
    movingHours: roundValue(totalMovingHours, 1),
    activityCount: safeItems.length,
  };
}

function isEligibleForEfficiency(activity = {}, settings = {}) {
  const safe = settings || {};
  if (!isRunLikeActivity(activity)) {
    return false;
  }

  if (toNumber(activity.__movingSeconds) < (safe.efficiencyMinDurationMinutes * 60)) {
    return false;
  }

  if (toNumber(activity.__distanceKm) < 3) {
    return false;
  }

  const averageHeartrate = toNumber(activity.averageHeartrate);

  if (averageHeartrate < 100 || averageHeartrate > 210) {
    return false;
  }

  const speedKmh = toNumber(activity.__speedKmh);

  if (speedKmh < 6 || speedKmh > 22) {
    return false;
  }

  const elevationPerKm = toNumber(activity.__distanceKm) > 0
    ? toNumber(activity.__elevationGain) / toNumber(activity.__distanceKm)
    : 0;

  if (elevationPerKm > safe.efficiencyMaxElevationPerKm) {
    return false;
  }

  if (safe.efficiencyExcludeTrail && isTrailLikeActivity(activity)) {
    return false;
  }

  return true;
}

export function normalizeTrainingAnalyticsSettings(settings = {}) {
  // Defensive: si l'appelant passe explicitement null (l'arg default = {} ne le rattrape pas),
  // on retombe sur un objet vide pour ne pas crasher la page Performance.
  const safe = settings || {};
  return {
    heartRateMax: toNullableInteger(safe.heartRateMax, DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateMax),
    restingHeartrate: Math.max(
      30,
      Math.min(
        120,
        toNullableInteger(
          safe.restingHeartrate ?? safe.heartRateRest,
          DEFAULT_TRAINING_ANALYTICS_SETTINGS.restingHeartrate,
        )
          ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.restingHeartrate,
      ),
    ),
    biologicalSex: resolveBiologicalSex(safe.biologicalSex),
    heartRateZone1Max: toNullableInteger(safe.heartRateZone1Max, DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone1Max),
    heartRateZone2Max: toNullableInteger(safe.heartRateZone2Max, DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone2Max),
    heartRateZone3Max: toNullableInteger(safe.heartRateZone3Max, DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone3Max),
    heartRateZone4Max: toNullableInteger(safe.heartRateZone4Max, DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone4Max),
    intensitySourcePriority: resolveIntensitySourcePriority(safe.intensitySourcePriority),
    efficiencyMinDurationMinutes: Math.max(
      5,
      toNullableInteger(
        safe.efficiencyMinDurationMinutes,
        DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMinDurationMinutes,
      ) ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMinDurationMinutes,
    ),
    efficiencyMaxElevationPerKm: Math.max(
      0,
      toNullableInteger(
        safe.efficiencyMaxElevationPerKm,
        DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMaxElevationPerKm,
      ) ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMaxElevationPerKm,
    ),
    efficiencyExcludeTrail: toBoolean(
      safe.efficiencyExcludeTrail,
      DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyExcludeTrail,
    ),
  };
}

export function formatEfficiencyValue(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    return "-";
  }

  return `${Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} km/h/bpm`;
}

export function buildTrainingLoadStateModel(activities = [], options = {}) {
  const settings = normalizeTrainingAnalyticsSettings(options.settings || {});
  const items = buildActivityItems(activities, { settings });
  const weekStartsOn = options.weekStartsOn || "monday";

  if (!items.length) {
    return {
      hasData: false,
      range: resolveDateRange([], options),
      previousRange: null,
      summary: null,
      chartData: [],
      granularity: options.granularity === "weekly" ? "weekly" : "daily",
    };
  }

  const range = resolveDateRange(items, options);
  const previousRange = buildPreviousEquivalentRange(range);
  const dailyTimeline = buildDailyLoadTimeline(items, range.endDate, options);
  const currentDailyTimeline = dailyTimeline.filter(
    (point) => point.date >= range.startDate && point.date <= range.endDate,
  );
  const previousDailyTimeline = dailyTimeline.filter(
    (point) => point.date >= previousRange.startDate && point.date <= previousRange.endDate,
  );
  const currentItems = getItemsWithinRange(items, range.startDate, range.endDate);
  const previousItems = getItemsWithinRange(items, previousRange.startDate, previousRange.endDate);
  const currentEndPoint = currentDailyTimeline[currentDailyTimeline.length - 1] || null;
  const previousEndPoint = previousDailyTimeline[previousDailyTimeline.length - 1] || null;
  const currentLoad = roundValue(currentItems.reduce((sum, item) => sum + toNumber(item.__load), 0), 1);
  const previousLoad = roundValue(previousItems.reduce((sum, item) => sum + toNumber(item.__load), 0), 1);
  const granularity = options.granularity === "weekly" ? "weekly" : "daily";
  const chartData = granularity === "weekly"
    ? groupTimelineByWeek(currentDailyTimeline, weekStartsOn)
    : currentDailyTimeline;

  return {
    hasData: Boolean(currentEndPoint),
    range,
    previousRange,
    granularity,
    summary: {
      load: currentLoad,
      previousLoad,
      loadDeltaValue: buildDeltaValue(currentLoad, previousLoad, 1),
      loadDeltaPercent: buildDeltaPercent(currentLoad, previousLoad, 1),
      ctl: currentEndPoint?.ctl ?? 0,
      previousCtl: previousEndPoint?.ctl ?? 0,
      ctlDeltaValue: buildDeltaValue(currentEndPoint?.ctl, previousEndPoint?.ctl, 1),
      ctlDeltaPercent: buildDeltaPercent(currentEndPoint?.ctl, previousEndPoint?.ctl, 1),
      atl: currentEndPoint?.atl ?? 0,
      previousAtl: previousEndPoint?.atl ?? 0,
      atlDeltaValue: buildDeltaValue(currentEndPoint?.atl, previousEndPoint?.atl, 1),
      atlDeltaPercent: buildDeltaPercent(currentEndPoint?.atl, previousEndPoint?.atl, 1),
      tsb: currentEndPoint?.tsb ?? 0,
      previousTsb: previousEndPoint?.tsb ?? 0,
      tsbDeltaValue: buildDeltaValue(currentEndPoint?.tsb, previousEndPoint?.tsb, 1),
      tsbDeltaPercent: buildDeltaPercent(currentEndPoint?.tsb, previousEndPoint?.tsb, 1),
    },
    chartData,
  };
}

export function buildWeeklyDashboardKpiModel(activities = [], options = {}) {
  const settings = normalizeTrainingAnalyticsSettings(options.settings || {});
  const items = buildActivityItems(activities, { settings });
  const weekStartsOn = options.weekStartsOn || "monday";

  if (!items.length) {
    return {
      hasData: false,
      items: buildWeeklySnapshotItems(null, null, { hint: "Pas de donnees sur cette semaine." }),
      currentRange: null,
      previousRange: null,
    };
  }

  const latestAvailableDate = items[items.length - 1].__date;
  const selectedEndDate = startOfDay(options.endDate ? new Date(options.endDate) : latestAvailableDate);
  const currentWeekStart = resolveWeekStart(selectedEndDate, weekStartsOn);
  const currentWeekEnd = endOfWeek(selectedEndDate, weekStartsOn);
  const elapsedDays = Math.max(0, Math.round((selectedEndDate - currentWeekStart) / 86400000));
  const currentSliceEnd = addDays(currentWeekStart, elapsedDays);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const previousSliceEnd = addDays(previousWeekStart, elapsedDays);
  const currentItems = getItemsWithinRange(items, currentWeekStart, currentSliceEnd);
  const previousItems = getItemsWithinRange(items, previousWeekStart, previousSliceEnd);
  const currentSummary = summarizeActivityItems(currentItems);
  const previousSummary = summarizeActivityItems(previousItems);
  const hint = formatWeeklySnapshotLabel(currentWeekStart, currentWeekEnd, currentSliceEnd);

  return {
    hasData: true,
    currentRange: {
      startDate: currentWeekStart,
      endDate: currentWeekEnd,
      sliceEndDate: currentSliceEnd,
    },
    previousRange: {
      startDate: previousWeekStart,
      endDate: addDays(previousWeekStart, 6),
      sliceEndDate: previousSliceEnd,
    },
    currentSummary,
    previousSummary,
    items: buildWeeklySnapshotItems(currentSummary, previousSummary, { hint }),
  };
}

export function buildEfficiencyHistoryModel(activities = [], options = {}) {
  const settings = normalizeTrainingAnalyticsSettings(options.settings || {});
  const items = buildActivityItems(activities, { settings });
  const weekStartsOn = options.weekStartsOn || "monday";

  if (!items.length) {
    return {
      hasData: false,
      range: resolveDateRange([], options),
      previousRange: null,
      summary: null,
      chartData: [],
      granularity: options.granularity === "weekly" ? "weekly" : "daily",
      settings,
    };
  }

  const range = resolveDateRange(items, options);
  const previousRange = buildPreviousEquivalentRange(range);
  const eligibleItems = items.filter((item) => isEligibleForEfficiency(item, settings));
  const currentItems = getItemsWithinRange(eligibleItems, range.startDate, range.endDate);
  const previousItems = getItemsWithinRange(eligibleItems, previousRange.startDate, previousRange.endDate);
  const currentAggregate = buildEfficiencyAggregate(currentItems);
  const previousAggregate = buildEfficiencyAggregate(previousItems);
  const granularity = options.granularity === "weekly" ? "weekly" : "daily";
  const chartPoints = [];

  if (granularity === "weekly") {
    let cursor = resolveWeekStart(range.startDate, weekStartsOn);

    while (cursor <= range.endDate) {
      const weekStart = cursor;
      const weekEnd = addDays(weekStart, 6);
      const aggregate = buildEfficiencyAggregate(getItemsWithinRange(eligibleItems, weekStart, weekEnd));

      chartPoints.push({
        date: weekStart,
        label: formatWeekLabel(weekStart),
        fullLabel: formatWeekLabel(weekStart),
        periodDate: formatDayKey(weekStart),
        efficiency: aggregate?.value ?? null,
        activityCount: aggregate?.activityCount ?? 0,
      });

      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = range.startDate;

    while (cursor <= range.endDate) {
      const aggregate = buildEfficiencyAggregate(getItemsWithinRange(eligibleItems, cursor, cursor));

      chartPoints.push({
        date: cursor,
        label: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        fullLabel: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        periodDate: formatDayKey(cursor),
        efficiency: aggregate?.value ?? null,
        activityCount: aggregate?.activityCount ?? 0,
      });

      cursor = addDays(cursor, 1);
    }
  }

  return {
    hasData: Boolean(currentAggregate),
    range,
    previousRange,
    granularity,
    settings,
    summary: currentAggregate
      ? {
        value: currentAggregate.value,
        previousValue: previousAggregate?.value ?? null,
        deltaValue: buildDeltaValue(currentAggregate.value, previousAggregate?.value, 3),
        deltaPercent: buildDeltaPercent(currentAggregate.value, previousAggregate?.value, 1),
        activityCount: currentAggregate.activityCount,
        distanceKm: currentAggregate.distanceKm,
        movingHours: currentAggregate.movingHours,
      }
      : null,
    chartData: chartPoints,
    eligibleActivityCount: eligibleItems.length,
  };
}

export function buildConsolidatedIntensityDistributionModel(activities = [], options = {}) {
  const settings = normalizeTrainingAnalyticsSettings(options.settings || {});
  const heartRatePreferences = buildHeartRatePreferences(settings);
  const heartRateModel = buildHeartRateLoadDistribution(activities, {
    startDate: options.startDate,
    endDate: options.endDate,
    heartRatePreferences,
    settings,
  });
  const paceModel = buildSpeedLoadDistribution(activities, {
    startDate: options.startDate,
    endDate: options.endDate,
    settings,
  });
  const preferHeartRate = settings.intensitySourcePriority !== "pace";

  if (preferHeartRate && heartRateModel.hasData) {
    return {
      ...heartRateModel,
      sourceType: "heart_rate",
      sourceLabel: "Zones FC",
      fallbackLabel: paceModel.hasData ? "Repli allure disponible" : "",
    };
  }

  if (!preferHeartRate && paceModel.hasData) {
    return {
      ...paceModel,
      sourceType: "pace",
      sourceLabel: "Zones allure",
      fallbackLabel: heartRateModel.hasData ? "Repli FC disponible" : "",
    };
  }

  if (heartRateModel.hasData) {
    return {
      ...heartRateModel,
      sourceType: "heart_rate",
      sourceLabel: "Zones FC",
      fallbackLabel: "Source prioritaire indisponible sur ce bloc",
    };
  }

  if (paceModel.hasData) {
    return {
      ...paceModel,
      sourceType: "pace",
      sourceLabel: "Zones allure",
      fallbackLabel: "Source prioritaire indisponible sur ce bloc",
    };
  }

  return {
    ...(preferHeartRate ? heartRateModel : paceModel),
    sourceType: preferHeartRate ? "heart_rate" : "pace",
    sourceLabel: preferHeartRate ? "Zones FC" : "Zones allure",
    fallbackLabel: "Aucune source exploitable sur ce bloc",
  };
}

export function formatTrainingLoadValue(value) {
  return formatMetricValue(value, "load");
}

export function buildActivityTrainingInsights(activity = {}, settings = {}) {
  const normalizedSettings = normalizeTrainingAnalyticsSettings(settings);
  const item = buildActivityItems([activity], { settings: normalizedSettings })[0];

  if (!item) {
    return {
      load: 0,
      efficiency: null,
      efficiencyEligible: false,
      efficiencyReason: "Activite indisponible.",
    };
  }

  const efficiencyEligible = isEligibleForEfficiency(item, normalizedSettings);

  return {
    load: roundValue(item.__load, 1),
    efficiency: efficiencyEligible && toNumber(item.averageHeartrate) > 0
      ? roundValue(item.__speedKmh / toNumber(item.averageHeartrate), 3)
      : null,
    efficiencyEligible,
    efficiencyReason: efficiencyEligible
      ? ""
      : "Efficience non calculee: sortie hors garde-fous de comparaison (duree, cardio, terrain ou trail).",
  };
}
