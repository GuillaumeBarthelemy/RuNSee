import {
  buildWeeklyBuckets,
  estimateLoadValue,
  getDisplaySportLabel,
  RUN_SPORT_GROUP_LABEL,
  normalizeDistanceKm,
  normalizeDurationHours,
  normalizeElevationMeters,
} from "./activityAggregations.js";
import { getActivityGradeAdjustedPaceSecondsPerKm } from "./gradeAdjustedPace.js";
import { resolveHeartRateZoneConfig } from "./heartRatePreferences.js";
import { getActivityRawPayload } from "./parsedRawCache.js";
import { startOfWeek as resolveWeekStart } from "./weekStart.js";

const RUN_SCOPE_LABEL = RUN_SPORT_GROUP_LABEL;
const DEFAULT_FITNESS_WINDOW_DAYS = 42;
const DEFAULT_ACUTE_WINDOW_DAYS = 7;
const DEFAULT_GAUGE_HISTORY_DAYS = 180;
const BEST_EFFORT_RECORD_TARGETS = [
  { key: "5k", label: "5 km", distanceMeters: 5000, aliases: ["5k", "5 km"] },
  { key: "10k", label: "10 km", distanceMeters: 10000, aliases: ["10k", "10 km"] },
  {
    key: "halfMarathon",
    label: "Semi-marathon",
    distanceMeters: 21097.5,
    aliases: ["half marathon", "half_marathon", "semi", "semi marathon", "semi-marathon"],
  },
  { key: "marathon", label: "Marathon", distanceMeters: 42195, aliases: ["marathon"] },
];

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date, weekStartsOn = "monday") {
  return resolveWeekStart(date, weekStartsOn);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatWeekLabel(date) {
  const end = addDays(date, 6);
  return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getActivityDate(activity) {
  return toDate(activity?.startDate || activity?.startDateLocal);
}

function getPaceSecondsPerKm(activity) {
  const distanceKm = normalizeDistanceKm(activity?.distance);
  const movingSeconds = toNumber(activity?.movingTime);

  if (distanceKm <= 0 || movingSeconds <= 0) {
    return 0;
  }

  return movingSeconds / distanceKm;
}

function getSpeedKmh(activity) {
  const movingHours = normalizeDurationHours(activity?.movingTime);
  const distanceKm = normalizeDistanceKm(activity?.distance);

  if (movingHours <= 0 || distanceKm <= 0) {
    return 0;
  }

  return distanceKm / movingHours;
}

function isPreparedItem(activity = {}) {
  return Boolean(activity?.__date) && Number.isFinite(Number(activity?.__load));
}

function sortByDate(items = []) {
  return [...items].sort((left, right) => left.__date - right.__date);
}

function prepareActivityItem(activity = {}, options = {}) {
  const date = getActivityDate(activity);
  const settings = options.settings || options.trainingAnalyticsSettings || {};

  return {
    ...activity,
    __date: date,
    __distanceKm: normalizeDistanceKm(activity?.distance),
    __movingHours: normalizeDurationHours(activity?.movingTime),
    __movingSeconds: toNumber(activity?.movingTime),
    __elevationGain: normalizeElevationMeters(activity?.totalElevationGain),
    __paceSecondsPerKm: getPaceSecondsPerKm(activity),
    // Allure ajustee a la pente (Minetti 2002). Sert de base aux indicateurs
    // performance (CS, predictions chrono, pace de reference) sur les sorties
    // ou le profil n'est pas plat.
    __gradeAdjustedPaceSecondsPerKm: getActivityGradeAdjustedPaceSecondsPerKm(activity),
    __speedKmh: getSpeedKmh(activity),
    __load: estimateLoadValue(activity, settings),
  };
}

export function buildActivityItems(activities = [], options = {}) {
  const safeActivities = Array.isArray(activities) ? activities : [];
  const shouldRecalculateLoad = Boolean(options.settings || options.trainingAnalyticsSettings || options.forceRecalculateLoad);

  if (!safeActivities.length) {
    return [];
  }

  if (!shouldRecalculateLoad && safeActivities.every((activity) => isPreparedItem(activity))) {
    return sortByDate(safeActivities);
  }

  return sortByDate(
    safeActivities
      .map((activity) => prepareActivityItem(activity, options))
      .filter((activity) => activity.__date),
  );
}

function getLatestDate(items = []) {
  return items.length ? items[items.length - 1].__date : null;
}

export function getItemsWithinRange(items = [], startDate, endDate) {
  const start = startDate ? startOfDay(startDate) : null;
  const end = endDate ? endOfDay(endDate) : null;

  return items.filter((activity) => {
    if (start && activity.__date < start) {
      return false;
    }

    if (end && activity.__date > end) {
      return false;
    }

    return true;
  });
}

export function summarizeActivityItems(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const totalDistance = safeItems.reduce((sum, activity) => sum + activity.__distanceKm, 0);
  const totalMovingHours = safeItems.reduce((sum, activity) => sum + activity.__movingHours, 0);
  const totalMovingSeconds = safeItems.reduce((sum, activity) => sum + activity.__movingSeconds, 0);
  const totalElevationGain = safeItems.reduce((sum, activity) => sum + activity.__elevationGain, 0);
  const totalLoad = safeItems.reduce((sum, activity) => sum + activity.__load, 0);
  const runLikeItems = safeItems.filter(
    (activity) => isRunLikeActivity(activity) && activity.__distanceKm > 0 && activity.__movingSeconds > 0,
  );
  const runDistance = runLikeItems.reduce((sum, activity) => sum + activity.__distanceKm, 0);
  const runMovingHours = runLikeItems.reduce((sum, activity) => sum + activity.__movingHours, 0);
  const runMovingSeconds = runLikeItems.reduce((sum, activity) => sum + activity.__movingSeconds, 0);
  const measuredHeartrateItems = safeItems.filter(
    (activity) => toNumber(activity.averageHeartrate) > 0 && activity.__movingSeconds > 0,
  );
  const heartrateWeight = measuredHeartrateItems.reduce(
    (sum, activity) => sum + activity.__movingSeconds,
    0,
  );
  const averageHeartrate = heartrateWeight
    ? measuredHeartrateItems.reduce(
      (sum, activity) => sum + (toNumber(activity.averageHeartrate) * activity.__movingSeconds),
      0,
    ) / heartrateWeight
    : 0;
  const averagePaceSecondsPerKm = runDistance > 0 ? runMovingSeconds / runDistance : 0;
  const averageSpeedKmh = runMovingHours > 0 ? runDistance / runMovingHours : 0;
  const efficiency = averageHeartrate > 0 ? averageSpeedKmh / averageHeartrate : 0;
  return {
    count: safeItems.length,
    distanceKm: roundValue(totalDistance, 1),
    movingHours: roundValue(totalMovingHours, 1),
    movingSeconds: totalMovingSeconds,
    elevationGain: roundValue(totalElevationGain, 0),
    load: roundValue(totalLoad, 1),
    averagePaceSecondsPerKm: roundValue(averagePaceSecondsPerKm, 0),
    averageHeartrate: roundValue(averageHeartrate, 0),
    averageSpeedKmh: roundValue(averageSpeedKmh, 1),
    efficiency: roundValue(efficiency, 3),
  };
}

export function buildWindowSummary(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  if (!items.length) {
    return summarizeActivityItems([]);
  }

  return summarizeActivityItems(
    getItemsWithinRange(items, options.startDate, options.endDate),
  );
}

function getTrendDirection(deltaPercent) {
  if (!Number.isFinite(deltaPercent)) return "stable";
  if (deltaPercent > 5) return "up";
  if (deltaPercent < -5) return "down";
  return "stable";
}

function getMedian(values = []) {
  const safeValues = [...values]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (!safeValues.length) {
    return 0;
  }

  const middle = Math.floor(safeValues.length / 2);

  if (safeValues.length % 2 === 0) {
    return (safeValues[middle - 1] + safeValues[middle]) / 2;
  }

  return safeValues[middle];
}

function getQuantile(values = [], ratio = 0.5) {
  const safeValues = [...values]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (!safeValues.length) {
    return 0;
  }

  const index = (safeValues.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return safeValues[lower];
  }

  const weight = index - lower;
  return safeValues[lower] + ((safeValues[upper] - safeValues[lower]) * weight);
}

function getPercentileRank(values = [], currentValue) {
  const safeValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (!safeValues.length) {
    return 0;
  }

  if (safeValues.length === 1) {
    return 50;
  }

  const lessOrEqualCount = safeValues.filter((value) => value <= currentValue).length;
  return clamp(Math.round((lessOrEqualCount / safeValues.length) * 100), 1, 100);
}

function resolveGaugeScale(score, scale = []) {
  const safeScale = Array.isArray(scale) ? scale : [];

  if (!safeScale.length) {
    return null;
  }

  return safeScale.find((item) => score <= item.maxScore) || safeScale[safeScale.length - 1];
}

function buildGaugeTrend(currentValue, previousValue, config = {}) {
  const {
    threshold = 5,
    deltaMode = "percent",
    positiveLabel = "En hausse",
    negativeLabel = "En baisse",
    steadyLabel = "Stable",
    note = "vs reference",
  } = config;

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return {
      direction: "steady",
      label: steadyLabel,
      note: "Pas assez d'historique",
      deltaPercent: null,
      deltaValue: null,
    };
  }

  const deltaValue = roundValue(currentValue - previousValue, 1);
  const deltaPercent = previousValue !== 0
    ? roundValue(((currentValue - previousValue) / Math.abs(previousValue)) * 100, 1)
    : null;
  const comparisonValue = deltaMode === "value" ? deltaValue : deltaPercent;

  if (!Number.isFinite(comparisonValue)) {
    return {
      direction: "steady",
      label: steadyLabel,
      note,
      deltaPercent,
      deltaValue,
    };
  }

  if (comparisonValue > threshold) {
    return {
      direction: "up",
      label: positiveLabel,
      note,
      deltaPercent,
      deltaValue,
    };
  }

  if (comparisonValue < -threshold) {
    return {
      direction: "down",
      label: negativeLabel,
      note,
      deltaPercent,
      deltaValue,
    };
  }

  return {
    direction: "steady",
    label: steadyLabel,
    note,
    deltaPercent,
    deltaValue,
  };
}

const TRAINING_GAUGE_DEFINITIONS = {
  base: {
    label: "Base de charge",
    tone: "#355886",
    toneSoft: "rgba(53, 88, 134, 0.12)",
    scale: [
      { maxScore: 20, range: "0-20", label: "Base basse", color: "#B9C4D3" },
      { maxScore: 40, range: "21-40", label: "Fond leger", color: "#8FA7C4" },
      { maxScore: 60, range: "41-60", label: "Niveau habituel", color: "#5D7FA9" },
      { maxScore: 80, range: "61-80", label: "Fond solide", color: "#355886" },
      { maxScore: 100, range: "81-100", label: "Bloc tres dense", color: "#203A61" },
    ],
    trend: {
      deltaMode: "percent",
      threshold: 3,
      positiveLabel: "En hausse",
      negativeLabel: "En baisse",
      steadyLabel: "Stable",
      note: "vs 7 j",
    },
  },
  pressure: {
    label: "Pression recente",
    tone: "#D97706",
    toneSoft: "rgba(245, 158, 11, 0.14)",
    scale: [
      { maxScore: 20, range: "0-20", label: "Tres legere", color: "#F6D8B3" },
      { maxScore: 40, range: "21-40", label: "Legere", color: "#F0BE84" },
      { maxScore: 60, range: "41-60", label: "Moderee", color: "#E99A52" },
      { maxScore: 80, range: "61-80", label: "Soutenue", color: "#D97706" },
      { maxScore: 100, range: "81-100", label: "Elevee", color: "#B45309" },
    ],
    trend: {
      deltaMode: "percent",
      threshold: 5,
      positiveLabel: "Monte",
      negativeLabel: "Se relache",
      steadyLabel: "Stable",
      note: "vs 7 j",
    },
  },
  balance: {
    label: "Balance de charge",
    tone: "#16A34A",
    toneSoft: "rgba(34, 197, 94, 0.12)",
    scale: [
      { maxScore: 20, range: "0-20", label: "Entame", color: "#E46B6B" },
      { maxScore: 40, range: "21-40", label: "Charge", color: "#E7A84A" },
      { maxScore: 60, range: "41-60", label: "Neutre", color: "#8FA7C4" },
      { maxScore: 80, range: "61-80", label: "Frais", color: "#39A768" },
      { maxScore: 100, range: "81-100", label: "Tres frais", color: "#157F48" },
    ],
    trend: {
      deltaMode: "value",
      threshold: 5,
      positiveLabel: "Remonte",
      negativeLabel: "Recule",
      steadyLabel: "Stable",
      note: "vs 7 j",
    },
  },
};

export function isRunLikeActivity(activity = {}) {
  const rawSport = String(activity?.sportType || activity?.type || "").trim().toLowerCase();
  return getDisplaySportLabel(activity, { groupSports: true }) === RUN_SCOPE_LABEL
    || ["run", "trailrun", "virtualrun"].includes(rawSport);
}

function getRunItems(items = [], options = {}) {
  const startDate = options.startDate ? startOfDay(options.startDate) : null;
  const endDate = options.endDate ? startOfDay(options.endDate) : null;

  return items.filter((activity) => {
    if (!isRunLikeActivity(activity)) {
      return false;
    }

    if (startDate && activity.__date < startDate) {
      return false;
    }

    if (endDate && activity.__date > endDate) {
      return false;
    }

    return true;
  });
}

export function formatPace(secondsPerKm) {
  const numeric = Math.round(toNumber(secondsPerKm));

  if (numeric <= 0) {
    return "-";
  }

  const minutes = Math.floor(numeric / 60);
  const seconds = numeric % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}/km`;
}

export function buildWeeklyInsightSeries(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return [];
  }

  const explicitStart = toDate(options.startDate);
  const explicitEnd = toDate(options.endDate);
  const latestDate = startOfDay(explicitEnd || getLatestDate(items));
  const endWeek = startOfWeek(latestDate);
  const startWeek = explicitStart
    ? startOfWeek(explicitStart)
    : addDays(endWeek, -((Math.max(1, Number(options.weeks || 12)) - 1) * 7));
  const weeks = Math.max(1, Math.round((endWeek - startWeek) / (7 * 86400000)) + 1);

  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(startWeek, index * 7);
    const weekEnd = addDays(weekStart, 6);
    const summary = summarizeActivityItems(getItemsWithinRange(items, weekStart, weekEnd));

    return {
      period: formatWeekLabel(weekStart),
      periodDate: formatDayKey(weekStart),
      weekStart,
      weekEnd,
      ...summary,
    };
  });
}

export function buildRollingLoadProxySeries(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return [];
  }

  const days = Math.max(7, Number(options.days || 84));
  const latestDate = startOfDay(toDate(options.endDate) || getLatestDate(items));
  const start = addDays(latestDate, -(days - 1));
  const dailyLoadMap = new Map();

  items.forEach((activity) => {
    const key = formatDayKey(startOfDay(activity.__date));
    dailyLoadMap.set(key, (dailyLoadMap.get(key) || 0) + activity.__load);
  });

  return Array.from({ length: days }, (_, index) => {
    const current = addDays(start, index);
    const currentKey = formatDayKey(current);
    let load7 = 0;
    let load42 = 0;

    for (let offset = 0; offset < DEFAULT_FITNESS_WINDOW_DAYS; offset += 1) {
      const key = formatDayKey(addDays(current, -offset));
      const value = dailyLoadMap.get(key) || 0;

      if (offset < DEFAULT_ACUTE_WINDOW_DAYS) {
        load7 += value;
      }

      load42 += value;
    }

    const fitness = load42 / (DEFAULT_FITNESS_WINDOW_DAYS / DEFAULT_ACUTE_WINDOW_DAYS);

    return {
      label: current.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      dayValue: roundValue(dailyLoadMap.get(currentKey) || 0, 1),
      load7: roundValue(load7, 1),
      load42: roundValue(fitness, 1),
      freshness: roundValue(fitness - load7, 1),
    };
  });
}

export function buildTrainingLoadSummary(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return {
      currentWeekLoad: 0,
      previousWeekLoad: 0,
      deltaPercent: null,
      direction: "stable",
      fitness: 0,
      fatigue: 0,
      freshness: 0,
      acuteChronicRatio: null,
      overload: false,
    };
  }

  const fitnessWindowDays = Math.max(DEFAULT_FITNESS_WINDOW_DAYS, Number(options.fitnessWindowDays || DEFAULT_FITNESS_WINDOW_DAYS));
  const acuteWindowDays = Math.max(DEFAULT_ACUTE_WINDOW_DAYS, Number(options.acuteWindowDays || DEFAULT_ACUTE_WINDOW_DAYS));
  const latestDate = startOfDay(toDate(options.endDate) || getLatestDate(items));
  const currentWeekStart = startOfWeek(latestDate);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const fatigueStart = addDays(latestDate, -(acuteWindowDays - 1));
  const fitnessStart = addDays(latestDate, -(fitnessWindowDays - 1));

  const currentWeekLoad = summarizeActivityItems(
    getItemsWithinRange(items, currentWeekStart, addDays(currentWeekStart, 6)),
  ).load;
  const previousWeekLoad = summarizeActivityItems(
    getItemsWithinRange(items, previousWeekStart, addDays(previousWeekStart, 6)),
  ).load;
  const fatigue = summarizeActivityItems(
    getItemsWithinRange(items, fatigueStart, latestDate),
  ).load;
  const fitness = roundValue(
    summarizeActivityItems(getItemsWithinRange(items, fitnessStart, latestDate)).load / (fitnessWindowDays / acuteWindowDays),
    1,
  );
  const freshness = roundValue(fitness - fatigue, 1);
  const acuteChronicRatio = fitness > 0 ? roundValue(fatigue / fitness, 2) : null;
  const deltaPercent = previousWeekLoad > 0
    ? roundValue(((currentWeekLoad - previousWeekLoad) / previousWeekLoad) * 100, 1)
    : null;

  return {
    currentWeekLoad,
    previousWeekLoad,
    deltaPercent,
    direction: getTrendDirection(deltaPercent),
    fitness,
    fatigue,
    freshness,
    acuteChronicRatio,
    overload: (Number.isFinite(deltaPercent) && deltaPercent > 20)
      || (Number.isFinite(acuteChronicRatio) && acuteChronicRatio > 1.3),
  };
}

export function buildTrainingStatusSummary(activities = [], options = {}) {
  const summary = buildTrainingLoadSummary(activities, options);
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return {
      acuteLoad: 0,
      acuteDeltaPercent: null,
      fitness: 0,
      freshness: 0,
      freshnessLabel: "Neutre",
      acuteChronicRatio: null,
      ratioLabel: "Non calcule",
      regularityScore: 0,
      distancePerWeek: 0,
      movingHoursPerWeek: 0,
      elevationPerWeek: 0,
    };
  }

  const latestDate = startOfDay(toDate(options.endDate) || getLatestDate(items));
  const previousWindowEnd = addDays(latestDate, -DEFAULT_ACUTE_WINDOW_DAYS);
  const previousWindowStart = addDays(previousWindowEnd, -(DEFAULT_ACUTE_WINDOW_DAYS - 1));
  const recentSummary = summarizeActivityItems(
    getItemsWithinRange(items, addDays(latestDate, -(DEFAULT_ACUTE_WINDOW_DAYS - 1)), latestDate),
  );
  const previousSummary = summarizeActivityItems(
    getItemsWithinRange(items, previousWindowStart, previousWindowEnd),
  );
  const regularitySummary = buildRegularitySummary(items, {
    weeks: 4,
    endDate: latestDate,
  });

  let freshnessLabel = "Neutre";
  if (summary.freshness >= 10) freshnessLabel = "Frais";
  if (summary.freshness <= -10) freshnessLabel = "Charge";

  let ratioLabel = "Stable";
  if (Number.isFinite(summary.acuteChronicRatio)) {
    if (summary.acuteChronicRatio < 0.8) ratioLabel = "Bas";
    if (summary.acuteChronicRatio > 1.3) ratioLabel = "Eleve";
  } else {
    ratioLabel = "Non calcule";
  }

  const acuteDeltaPercent = previousSummary.load > 0
    ? roundValue(((recentSummary.load - previousSummary.load) / previousSummary.load) * 100, 1)
    : null;

  return {
    acuteLoad: recentSummary.load,
    acuteDeltaPercent,
    fitness: summary.fitness,
    freshness: summary.freshness,
    freshnessLabel,
    acuteChronicRatio: summary.acuteChronicRatio,
    ratioLabel,
    regularityScore: regularitySummary.activeWeeksRatio,
    distancePerWeek: recentSummary.distanceKm,
    movingHoursPerWeek: recentSummary.movingHours,
    elevationPerWeek: recentSummary.elevationGain,
  };
}

function resolveTrainingGaugeRange(items = [], options = {}) {
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const requestedStartDate = toDate(options.startDate);
  const startDate = startOfDay(requestedStartDate || addDays(endDate, -29));
  const safeStartDate = startDate <= endDate ? startDate : endDate;
  const safeEndDate = endDate >= startDate ? endDate : startDate;

  return {
    startDate: safeStartDate,
    endDate: safeEndDate,
    windowDays: Math.max(1, Math.round((safeEndDate - safeStartDate) / 86400000) + 1),
  };
}

function buildPreviousEquivalentRange(range) {
  const safeRange = range || {};
  const windowDays = Math.max(1, Number(safeRange.windowDays || 1));
  const previousEndDate = addDays(safeRange.startDate, -1);
  const previousStartDate = addDays(previousEndDate, -(windowDays - 1));

  return {
    startDate: previousStartDate,
    endDate: previousEndDate,
    windowDays,
  };
}

function buildEmptyTrainingStateTimeline(range, granularity = "daily") {
  const safeRange = range || {};
  const safeStartDate = startOfDay(safeRange.startDate || new Date());
  const safeEndDate = startOfDay(safeRange.endDate || safeStartDate);
  const safeGranularity = granularity === "weekly" ? "weekly" : "daily";
  const points = [];

  if (safeGranularity === "weekly") {
    let cursor = startOfWeek(safeStartDate);

    while (cursor <= safeEndDate) {
      const pointDate = cursor <= safeEndDate ? cursor : safeEndDate;

      points.push({
        date: pointDate,
        label: formatWeekLabel(pointDate),
        periodDate: formatDayKey(pointDate),
        acuteLoad: 0,
        fitness: 0,
        freshness: 0,
      });

      cursor = addDays(cursor, 7);
    }

    return points;
  }

  let cursor = safeStartDate;

  while (cursor <= safeEndDate) {
    points.push({
      date: cursor,
      label: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      periodDate: formatDayKey(cursor),
      acuteLoad: 0,
      fitness: 0,
      freshness: 0,
    });

    cursor = addDays(cursor, 1);
  }

  return points;
}

function buildTrainingStatePeriodTimeline(items = [], range, granularity = "daily") {
  const safeItems = buildActivityItems(items);
  const safeRange = range || {};

  if (!safeItems.length) {
    return buildEmptyTrainingStateTimeline(safeRange, granularity);
  }

  return buildTrainingStateTimeline(safeItems, {
    startDate: safeRange.startDate,
    endDate: safeRange.endDate,
    granularity,
  });
}

function buildTrainingTimelineAverage(timeline = []) {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  if (!safeTimeline.length) {
    return {
      acuteLoad: 0,
      fitness: 0,
      freshness: 0,
    };
  }

  const count = safeTimeline.length;

  return {
    acuteLoad: roundValue(safeTimeline.reduce((sum, point) => sum + toNumber(point?.acuteLoad), 0) / count, 1),
    fitness: roundValue(safeTimeline.reduce((sum, point) => sum + toNumber(point?.fitness), 0) / count, 1),
    freshness: roundValue(safeTimeline.reduce((sum, point) => sum + toNumber(point?.freshness), 0) / count, 1),
  };
}

function buildTrainingGaugeHistoryContext(items = [], options = {}) {
  if (!items.length) {
    return {
      currentRange: null,
      endDate: null,
      windowDays: 0,
      historyTimeline: [],
      historyValues: {
        base: [],
        pressure: [],
        balance: [],
      },
    };
  }

  const currentRange = resolveTrainingGaugeRange(items, options);
  const currentItems = getItemsWithinRange(items, currentRange.startDate, currentRange.endDate);

  if (!currentItems.length) {
    return {
      currentRange,
      endDate: currentRange.endDate,
      windowDays: currentRange.windowDays,
      historyTimeline: [],
      historyValues: {
        base: [],
        pressure: [],
        balance: [],
      },
    };
  }

  const historyTimeline = buildTrainingStatePeriodTimeline(items, currentRange, "daily");

  return {
    currentRange,
    endDate: currentRange.endDate,
    windowDays: currentRange.windowDays,
    historyTimeline,
    historyValues: {
      base: historyTimeline.map((point) => point.fitness),
      pressure: historyTimeline.map((point) => point.acuteLoad),
      balance: historyTimeline.map((point) => point.freshness),
    },
  };
}

function buildTrainingGaugeModel(item, historyValues, windowDays) {
  const definition = TRAINING_GAUGE_DEFINITIONS[item.key];
  const score = getPercentileRank(historyValues[item.key], item.currentValue);
  const activeScale = resolveGaugeScale(score, definition.scale) || definition.scale[definition.scale.length - 1];
  const trend = buildGaugeTrend(item.currentValue, item.previousValue, {
    ...definition.trend,
    note: item.trendNote || "Pas assez d'historique",
  });
  return {
    key: item.key,
    label: definition.label,
    score,
    value: roundValue(item.currentValue, 1),
    previousValue: roundValue(item.previousValue, 1),
    statusLabel: activeScale?.label || "Neutre",
    rangeLabel: activeScale?.range || "",
    toneColor: activeScale?.color || definition.tone,
    toneSoftColor: definition.toneSoft,
    scale: definition.scale,
    trendDirection: trend.direction,
    trendLabel: trend.label,
    trendNote: trend.note,
    deltaPercent: trend.deltaPercent,
    deltaValue: trend.deltaValue,
    historyDays: windowDays,
    selectionStartDate: item.selectionStartDate || null,
    selectionEndDate: item.selectionEndDate || null,
    comparisonStartDate: item.comparisonStartDate || null,
    comparisonEndDate: item.comparisonEndDate || null,
  };
}

export function buildTrainingGaugeModels(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  if (!items.length) {
    return [];
  }
  const { currentRange, windowDays, historyTimeline, historyValues } = buildTrainingGaugeHistoryContext(items, options);
  if (!historyTimeline.length) {
    return [];
  }
  const currentSummary = buildTrainingTimelineAverage(historyTimeline);
  const previousRange = buildPreviousEquivalentRange(currentRange);
  const previousTimeline = buildTrainingStatePeriodTimeline(items, previousRange, "daily");
  const previousSummary = buildTrainingTimelineAverage(previousTimeline);
  const trendNote = currentRange?.windowDays > 1 ? "vs periode prec." : "vs veille";
  return [
    {
      key: "base",
      currentValue: currentSummary.fitness,
      previousValue: previousSummary.fitness,
      trendNote,
      selectionStartDate: currentRange.startDate,
      selectionEndDate: currentRange.endDate,
      comparisonStartDate: previousRange.startDate,
      comparisonEndDate: previousRange.endDate,
    },
    {
      key: "pressure",
      currentValue: currentSummary.acuteLoad,
      previousValue: previousSummary.acuteLoad,
      trendNote,
      selectionStartDate: currentRange.startDate,
      selectionEndDate: currentRange.endDate,
      comparisonStartDate: previousRange.startDate,
      comparisonEndDate: previousRange.endDate,
    },
    {
      key: "balance",
      currentValue: currentSummary.freshness,
      previousValue: previousSummary.freshness,
      trendNote,
      selectionStartDate: currentRange.startDate,
      selectionEndDate: currentRange.endDate,
      comparisonStartDate: previousRange.startDate,
      comparisonEndDate: previousRange.endDate,
    },
  ].map((item) => buildTrainingGaugeModel(item, historyValues, windowDays));
}

export function buildTrainingGaugeTimeline(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return [];
  }

  const { currentRange, historyTimeline, historyValues } = buildTrainingGaugeHistoryContext(items, options);

  if (!historyTimeline.length) {
    return [];
  }

  const granularity = options.granularity === "weekly" ? "weekly" : "daily";
  const timeline = buildTrainingStatePeriodTimeline(items, currentRange, granularity);

  return timeline.map((point) => ({
    ...point,
    baseScore: getPercentileRank(historyValues.base, point.fitness),
    pressureScore: getPercentileRank(historyValues.pressure, point.acuteLoad),
    balanceScore: getPercentileRank(historyValues.balance, point.freshness),
  }));
}

export function buildTrainingStateTimeline(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return [];
  }

  const fitnessWindowDays = Math.max(DEFAULT_FITNESS_WINDOW_DAYS, Number(options.fitnessWindowDays || DEFAULT_FITNESS_WINDOW_DAYS));
  const acuteWindowDays = Math.max(DEFAULT_ACUTE_WINDOW_DAYS, Number(options.acuteWindowDays || DEFAULT_ACUTE_WINDOW_DAYS));
  const granularity = options.granularity === "weekly" ? "weekly" : "daily";
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items));
  const startDate = startOfDay(toDate(options.startDate) || addDays(endDate, -29));
  const points = [];

  if (granularity === "weekly") {
    let cursor = startOfWeek(startDate);

    while (cursor <= endDate) {
      const pointDate = cursor <= endDate ? cursor : endDate;
      const acuteLoad = summarizeActivityItems(
        getItemsWithinRange(items, addDays(pointDate, -(acuteWindowDays - 1)), pointDate),
      ).load;
      const fitness = summarizeActivityItems(
        getItemsWithinRange(items, addDays(pointDate, -(fitnessWindowDays - 1)), pointDate),
      ).load / (fitnessWindowDays / acuteWindowDays);

      points.push({
        date: pointDate,
        label: formatWeekLabel(pointDate),
        periodDate: formatDayKey(pointDate),
        acuteLoad: roundValue(acuteLoad, 1),
        fitness: roundValue(fitness, 1),
        freshness: roundValue(fitness - acuteLoad, 1),
      });

      cursor = addDays(cursor, 7);
    }

    return points;
  }

  let cursor = startDate;

  while (cursor <= endDate) {
    const acuteLoad = summarizeActivityItems(
      getItemsWithinRange(items, addDays(cursor, -(acuteWindowDays - 1)), cursor),
    ).load;
    const fitness = summarizeActivityItems(
      getItemsWithinRange(items, addDays(cursor, -(fitnessWindowDays - 1)), cursor),
    ).load / (fitnessWindowDays / acuteWindowDays);

    points.push({
      date: cursor,
      label: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      periodDate: formatDayKey(cursor),
      acuteLoad: roundValue(acuteLoad, 1),
      fitness: roundValue(fitness, 1),
      freshness: roundValue(fitness - acuteLoad, 1),
    });

    cursor = addDays(cursor, 1);
  }

  return points;
}

export function buildDashboardSnapshot(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  const explicitStart = toDate(options.startDate);
  const explicitEnd = toDate(options.endDate) || getLatestDate(items) || new Date();
  const windowItems = getItemsWithinRange(items, explicitStart, explicitEnd);
  const weeklySeries = buildWeeklyInsightSeries(items, {
    weeks: options.weeks || 10,
    startDate: explicitStart ? startOfWeek(explicitStart) : null,
    endDate: explicitEnd,
  });
  const recentActivities = buildRecentActivities(windowItems, options.recentLimit || 6);
  const currentWeek = weeklySeries[weeklySeries.length - 1] || summarizeActivityItems([]);
  const previousWeek = weeklySeries[weeklySeries.length - 2] || summarizeActivityItems([]);
  const latestWeekStart = currentWeek.weekStart || startOfWeek(explicitEnd);

  return {
    currentWeek: {
      ...currentWeek,
      label: formatWeekLabel(latestWeekStart),
    },
    previousWeek,
    loadSummary: buildTrainingLoadSummary(items, { endDate: explicitEnd }),
    weeklySeries,
    recentActivities,
    performanceSummary: buildPerformanceSummary(windowItems),
  };
}

export function buildPerformanceSummary(activities = []) {
  const summary = summarizeActivityItems(buildActivityItems(activities));

  return {
    averagePaceSecondsPerKm: summary.averagePaceSecondsPerKm,
    averageHeartrate: summary.averageHeartrate,
    efficiency: summary.efficiency,
    averageSpeedKmh: summary.averageSpeedKmh,
  };
}

export function buildRecentActivities(activities = [], limit = 6) {
  const items = buildActivityItems(activities).sort((left, right) => right.__date - left.__date);
  return items.slice(0, Math.max(1, Number(limit || 6)));
}

export function buildReferencePace(activities = [], options = {}) {
  const items = buildActivityItems(activities);
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const lookbackDays = Math.max(28, Number(options.lookbackDays || 84));
  const lookbackStart = addDays(endDate, -(lookbackDays - 1));
  const runItems = getRunItems(items, { startDate: lookbackStart, endDate })
    .filter((activity) => (
      activity.__paceSecondsPerKm > 0
      && activity.__distanceKm >= 5
      && activity.__distanceKm <= 35
      && activity.__movingSeconds >= 20 * 60
      && activity.__movingSeconds <= 3 * 3600
    ));

  if (!runItems.length) {
    return {
      paceSecondsPerKm: 0,
      averageHeartrate: 0,
      sampleSize: 0,
      scope: RUN_SCOPE_LABEL,
      hasData: false,
    };
  }

  // Pour la pace de reference, on prend de preference l'allure ajustee a la
  // pente (GAP, Minetti 2002) afin de ne pas pieger les coureurs en terrain
  // vallonne sur des references de seuil ou de prediction.
  const useGradeAdjusted = options.useGradeAdjusted !== false;
  const getReferencePaceForActivity = (activity) => (
    useGradeAdjusted && activity.__gradeAdjustedPaceSecondsPerKm > 0
      ? activity.__gradeAdjustedPaceSecondsPerKm
      : activity.__paceSecondsPerKm
  );

  const paces = runItems.map(getReferencePaceForActivity);
  const q1 = getQuantile(paces, 0.25);
  const q3 = getQuantile(paces, 0.75);
  const iqr = q3 - q1;
  const filteredItems = iqr > 0
    ? runItems.filter((activity) => {
      const value = getReferencePaceForActivity(activity);
      return value >= (q1 - (1.5 * iqr)) && value <= (q3 + (1.5 * iqr));
    })
    : runItems;
  const referenceItems = filteredItems.length >= 3 ? filteredItems : runItems;
  const heartRates = referenceItems
    .map((activity) => toNumber(activity.averageHeartrate))
    .filter((value) => value > 0);
  const targetPercentile = Math.max(0.05, Math.min(0.95, Number(options.percentile ?? 0.5)));
  const referencePaces = referenceItems.map(getReferencePaceForActivity);

  return {
    paceSecondsPerKm: roundValue(getQuantile(referencePaces, targetPercentile), 0),
    averageHeartrate: roundValue(getMedian(heartRates), 0),
    sampleSize: referenceItems.length,
    scope: RUN_SCOPE_LABEL,
    hasData: true,
    usesGradeAdjusted: useGradeAdjusted,
  };
}

function buildHeartRateSegments(activity = {}) {
  const payload = getActivityRawPayload(activity);
  const candidateSources = [
    { source: "split", segments: Array.isArray(payload?.splits_metric) ? payload.splits_metric : [] },
    { source: "lap", segments: Array.isArray(payload?.laps) ? payload.laps : [] },
  ];

  for (const candidate of candidateSources) {
    const normalized = candidate.segments
      .map((segment) => ({
        source: candidate.source,
        heartRate: toNumber(segment?.average_heartrate ?? segment?.averageHeartrate),
        durationSeconds: toNumber(segment?.moving_time ?? segment?.movingTime ?? segment?.elapsed_time ?? segment?.elapsedTime),
      }))
      .filter((segment) => segment.heartRate > 0 && segment.durationSeconds > 0);

    if (normalized.length) {
      return normalized;
    }
  }

  const averageHeartrate = toNumber(activity.averageHeartrate);

  if (averageHeartrate > 0 && activity.__movingSeconds > 0) {
    return [{
      source: "activity",
      heartRate: averageHeartrate,
      durationSeconds: activity.__movingSeconds,
    }];
  }

  return [];
}

export function getReferenceMaxHeartrate(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const lookbackDays = Math.max(42, Number(options.lookbackDays || 180));
  const lookbackStart = addDays(endDate, -(lookbackDays - 1));
  const runItems = getRunItems(items, { startDate: lookbackStart, endDate })
    .filter((activity) => activity.__movingSeconds >= 15 * 60);
  const candidates = runItems
    .map((activity) => {
      const storedMax = toNumber(activity.maxHeartrate);
      if (storedMax > 0) {
        return storedMax;
      }

      const segmentMax = Math.max(
        ...buildHeartRateSegments(activity).map((segment) => segment.heartRate),
        0,
      );

      if (segmentMax > 0) {
        return segmentMax;
      }

      const averageHeartrate = toNumber(activity.averageHeartrate);
      return averageHeartrate > 0 ? averageHeartrate * 1.06 : 0;
    })
    .filter((value) => value > 0);

  if (!candidates.length) {
    return {
      maxHeartrate: 0,
      sampleSize: 0,
      hasData: false,
    };
  }

  return {
    maxHeartrate: roundValue(
      candidates.length >= 5 ? getQuantile(candidates, 0.95) : Math.max(...candidates),
      0,
    ),
    sampleSize: candidates.length,
    hasData: true,
  };
}

function classifyHeartRateZone(heartRate, zoneDefinitions = []) {
  const index = zoneDefinitions.findIndex((zone) => heartRate <= toNumber(zone?.maxHeartrate));

  if (index >= 0) {
    return index;
  }

  return Math.max(0, zoneDefinitions.length - 1);
}

export function buildIntensityDistribution(activities = [], options = {}) {
  const emptyBaseZones = [
    { key: "z1", shortLabel: "Z1", label: "Z1 recuperation", rangeLabel: "", durationSeconds: 0 },
    { key: "z2", shortLabel: "Z2", label: "Z2 endurance fondamentale", rangeLabel: "", durationSeconds: 0 },
    { key: "z3", shortLabel: "Z3", label: "Z3 endurance active", rangeLabel: "", durationSeconds: 0 },
    { key: "z4", shortLabel: "Z4", label: "Z4 seuil", rangeLabel: "", durationSeconds: 0 },
    { key: "z5", shortLabel: "Z5", label: "Z5 intensif / VO2", rangeLabel: "", durationSeconds: 0 },
  ];

  if (!options.allowRunOnlyMetrics) {
    return {
      zones: emptyBaseZones,
      unit: "min",
      hasData: false,
      scope: RUN_SCOPE_LABEL,
      estimationMode: "heartRateTime",
      message: "Aucune sortie course / trail cardio exploitable sur cette selection.",
    };
  }

  const items = buildActivityItems(activities, options);
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const startDate = startOfDay(toDate(options.startDate) || addDays(endDate, -29));
  const estimatedReference = options.referenceMaxHeartrate || getReferenceMaxHeartrate(items, { endDate });
  const resolvedHeartRateConfig = resolveHeartRateZoneConfig({
    preferences: options.heartRatePreferences || options,
    estimatedMaxHeartrate: estimatedReference?.maxHeartrate || 0,
  });
  const baseZones = (
    resolvedHeartRateConfig.maxHeartrate
      ? resolvedHeartRateConfig.zones
      : emptyBaseZones
  ).map((zone) => ({
    ...zone,
    durationSeconds: 0,
  }));
  const runItems = getRunItems(items, { startDate, endDate })
    .filter((activity) => activity.__movingSeconds >= 15 * 60);

  if (!runItems.length) {
    return {
      zones: baseZones,
      unit: "min",
      hasData: false,
      scope: RUN_SCOPE_LABEL,
      estimationMode: "heartRateTime",
      message: "Aucune sortie course / trail cardio exploitable sur cette selection.",
      referenceMaxHeartrate: resolvedHeartRateConfig.maxHeartrate,
      referenceMaxHeartrateSampleSize: estimatedReference?.sampleSize || 0,
      usingEstimatedMaxHeartrate: resolvedHeartRateConfig.usingEstimatedMaxHeartrate,
      usingEstimatedZones: resolvedHeartRateConfig.usingEstimatedZones,
      hasInvalidCustomZones: resolvedHeartRateConfig.hasInvalidCustomZones,
      estimationMessage: resolvedHeartRateConfig.estimationMessage,
    };
  }

  if (!resolvedHeartRateConfig.maxHeartrate) {
    return {
      zones: baseZones,
      unit: "min",
      hasData: false,
      scope: RUN_SCOPE_LABEL,
      estimationMode: "heartRateTime",
      message: "Pas assez de donnees cardio pour estimer la FC max. Tu peux la renseigner dans Administration.",
      usingEstimatedMaxHeartrate: false,
      usingEstimatedZones: false,
      hasInvalidCustomZones: resolvedHeartRateConfig.hasInvalidCustomZones,
      estimationMessage: "",
    };
  }

  let trackedDurationSeconds = 0;
  let detailedActivitiesCount = 0;
  let fallbackActivitiesCount = 0;

  runItems.forEach((activity) => {
    const segments = buildHeartRateSegments(activity);

    if (!segments.length) {
      return;
    }

    const usesDetailedSegments = segments.some((segment) => segment.source !== "activity");
    if (usesDetailedSegments) {
      detailedActivitiesCount += 1;
    } else {
      fallbackActivitiesCount += 1;
    }

    segments.forEach((segment) => {
      const zoneIndex = classifyHeartRateZone(segment.heartRate, resolvedHeartRateConfig.zones);
      const zone = baseZones[zoneIndex];

      zone.durationSeconds += segment.durationSeconds;
      trackedDurationSeconds += segment.durationSeconds;
    });
  });

  if (!trackedDurationSeconds) {
    return {
      zones: baseZones,
      unit: "min",
      hasData: false,
      scope: RUN_SCOPE_LABEL,
      estimationMode: "heartRateTime",
      message: "Les sorties retenues n'ont pas assez de donnees cardio pour estimer les zones.",
      referenceMaxHeartrate: resolvedHeartRateConfig.maxHeartrate,
      referenceMaxHeartrateSampleSize: estimatedReference?.sampleSize || 0,
      usingEstimatedMaxHeartrate: resolvedHeartRateConfig.usingEstimatedMaxHeartrate,
      usingEstimatedZones: resolvedHeartRateConfig.usingEstimatedZones,
      hasInvalidCustomZones: resolvedHeartRateConfig.hasInvalidCustomZones,
      estimationMessage: resolvedHeartRateConfig.estimationMessage,
    };
  }

  return {
    zones: baseZones.map((zone) => ({
      ...zone,
      value: roundValue(zone.durationSeconds / 60, 0),
      durationMinutes: roundValue(zone.durationSeconds / 60, 0),
      durationHours: roundValue(zone.durationSeconds / 3600, 1),
      share: trackedDurationSeconds > 0 ? roundValue((zone.durationSeconds / trackedDurationSeconds) * 100, 0) : 0,
    })),
    unit: "min",
    hasData: trackedDurationSeconds > 0,
    scope: RUN_SCOPE_LABEL,
    estimationMode: "heartRateTime",
    referenceMaxHeartrate: resolvedHeartRateConfig.maxHeartrate,
    referenceMaxHeartrateSampleSize: estimatedReference?.sampleSize || 0,
    usingEstimatedMaxHeartrate: resolvedHeartRateConfig.usingEstimatedMaxHeartrate,
    usingEstimatedZones: resolvedHeartRateConfig.usingEstimatedZones,
    hasInvalidCustomZones: resolvedHeartRateConfig.hasInvalidCustomZones,
    estimationMessage: resolvedHeartRateConfig.estimationMessage,
    trackedDurationMinutes: roundValue(trackedDurationSeconds / 60, 0),
    detailedActivitiesCount,
    fallbackActivitiesCount,
    message: "",
  };
}

export function buildRegularitySummary(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  const weeks = Math.max(1, Number(options.weeks || 12));
  const weekStartsOn = options.weekStartsOn || "monday";
  const viewMode = options.viewMode === "calendar" ? "calendar" : "rolling";
  const weeklySeries = buildWeeklyBuckets({
    startDate: options.startDate,
    endDate: options.endDate || getLatestDate(items) || new Date(),
    weeks,
    weekStartsOn,
    grouping: viewMode,
  }).map((bucket) => {
    const summary = summarizeActivityItems(
      getItemsWithinRange(items, bucket.coverageStart, bucket.coverageEnd),
    );

    return {
      period: bucket.period,
      shortLabel: bucket.shortLabel,
      periodDate: bucket.periodDate,
      weekStart: bucket.periodStart,
      weekEnd: bucket.periodEnd,
      coverageStart: bucket.coverageStart,
      coverageEnd: bucket.coverageEnd,
      coverageLabel: bucket.coverageLabel,
      isPartial: bucket.isPartial,
      count: summary.count,
      distanceKm: roundValue(summary.distanceKm, 1),
      movingHours: roundValue(summary.movingHours, 1),
      movingSeconds: summary.movingSeconds,
      elevationGain: roundValue(summary.elevationGain, 0),
      load: roundValue(summary.load, 1),
      value: summary.count,
      viewMode,
    };
  });

  const activeWeeks = weeklySeries.filter((week) => week.count > 0).length;
  const totalSessions = weeklySeries.reduce((sum, week) => sum + week.count, 0);
  let activeStreakWeeks = 0;

  for (let index = weeklySeries.length - 1; index >= 0; index -= 1) {
    if ((weeklySeries[index]?.count || 0) > 0) {
      activeStreakWeeks += 1;
      continue;
    }

    break;
  }

  return {
    weeklySeries,
    averageSessionsPerWeek: roundValue(totalSessions / weeklySeries.length, 1),
    activeWeeks,
    activeWeeksRatio: roundValue((activeWeeks / weeklySeries.length) * 100, 0),
    activeStreakWeeks,
  };
}

function formatEffortEntry(activity, value, label) {
  return {
    activity,
    value,
    label,
    sport: getDisplaySportLabel(activity, { groupSports: true }),
  };
}

function normalizeLookupText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function getBestEffortElapsedSeconds(bestEffort = {}) {
  const elapsedSeconds = toNumber(bestEffort?.elapsed_time ?? bestEffort?.elapsedTime);

  if (elapsedSeconds > 0) {
    return elapsedSeconds;
  }

  return toNumber(bestEffort?.moving_time ?? bestEffort?.movingTime);
}

function isOfficialBestEffortRecord(bestEffort = {}) {
  const prRank = toNumber(bestEffort?.pr_rank ?? bestEffort?.prRank);
  const achievements = Array.isArray(bestEffort?.achievements) ? bestEffort.achievements : [];

  if (prRank === 1) {
    return true;
  }

  return achievements.some((achievement) => {
    const type = normalizeLookupText(achievement?.type);
    const rank = toNumber(achievement?.rank);
    return type === "pr" && rank === 1;
  });
}

function getRecordDistanceToleranceMeters(target = {}) {
  const distanceMeters = toNumber(target.distanceMeters);

  if (distanceMeters >= 42195) {
    return 600;
  }

  if (distanceMeters >= 21097) {
    return 300;
  }

  return 80;
}

function isActivityNearRecordDistance(activity = {}, target = {}) {
  const activityDistanceMeters = toNumber(activity?.__distanceKm) * 1000;
  const distanceMeters = toNumber(target.distanceMeters);

  if (activityDistanceMeters <= 0 || distanceMeters <= 0) {
    return false;
  }

  return Math.abs(activityDistanceMeters - distanceMeters) <= getRecordDistanceToleranceMeters(target);
}

function getActivityRecordElapsedSeconds(activity = {}) {
  const movingSeconds = toNumber(activity?.__movingSeconds ?? activity?.movingTime);

  if (movingSeconds > 0) {
    return movingSeconds;
  }

  return toNumber(activity?.elapsedTime);
}

function getActivityRecordPaceSecondsPerKm(activity = {}) {
  if (toNumber(activity?.__paceSecondsPerKm) > 0) {
    return roundValue(activity.__paceSecondsPerKm, 0);
  }

  const elapsedSeconds = getActivityRecordElapsedSeconds(activity);
  const distanceKm = toNumber(activity?.__distanceKm) || (toNumber(activity?.distance) / 1000);

  if (elapsedSeconds <= 0 || distanceKm <= 0) {
    return 0;
  }

  return roundValue(elapsedSeconds / distanceKm, 0);
}

function getRecordSourceText(activity = {}) {
  return normalizeLookupText([activity?.name, activity?.description].filter(Boolean).join(" "));
}

function hasDetailedActivityPayload(activity = {}) {
  const payload = getActivityRawPayload(activity);
  return Boolean(payload && typeof payload === "object");
}

function getDetailedBestEfforts(activity = {}) {
  const payload = getActivityRawPayload(activity);
  return Array.isArray(payload?.best_efforts) ? payload.best_efforts : [];
}

function hasExplicitRecordMention(activity = {}) {
  const text = getRecordSourceText(activity);

  if (!text) {
    return false;
  }

  const tokens = text.split(" ").filter(Boolean);
  return tokens.includes("rp") || tokens.includes("pr");
}

function hasRecordTargetKeyword(activity = {}, target = {}) {
  const text = getRecordSourceText(activity);
  const aliases = Array.isArray(target.aliases) ? target.aliases : [];

  return aliases.some((alias) => text.includes(normalizeLookupText(alias)));
}

function buildActivityBackedRecordEntry(activity, target, options = {}) {
  const elapsedSeconds = getActivityRecordElapsedSeconds(activity);

  if (elapsedSeconds <= 0) {
    return null;
  }

  return {
    ...formatEffortEntry(activity, roundValue(elapsedSeconds, 0), "durationSeconds"),
    recordKey: target.key,
    recordLabel: target.label,
    elapsedSeconds,
    paceSecondsPerKm: getActivityRecordPaceSecondsPerKm(activity),
    isAvailable: true,
    isOfficial: options.isOfficial === true,
    sourceType: options.sourceType || "activity",
  };
}

function matchesBestEffortRecordTarget(bestEffort = {}, target = {}) {
  const effortName = normalizeLookupText(bestEffort?.name);
  const effortDistance = toNumber(bestEffort?.distance);
  const aliasMatch = Array.isArray(target.aliases) && target.aliases.includes(effortName);
  const distanceTolerance = target.distanceMeters >= 21000 ? 250 : 50;
  const distanceMatch = effortDistance > 0
    && Math.abs(effortDistance - toNumber(target.distanceMeters)) <= distanceTolerance;

  return aliasMatch || distanceMatch;
}

function resolveRecordActivity(items = [], bestEffort = {}, fallbackActivity = null) {
  const bestEffortActivityId = bestEffort?.activity?.id;

  if (bestEffortActivityId !== undefined && bestEffortActivityId !== null && bestEffortActivityId !== "") {
    const matchedActivity = items.find(
      (activity) => String(activity?.stravaActivityId || "") === String(bestEffortActivityId),
    );

    if (matchedActivity) {
      return matchedActivity;
    }
  }

  return fallbackActivity;
}

function buildActivityRecordCandidates(runItems = [], target = {}) {
  return runItems.reduce((candidates, activity) => {
    const nearDistance = isActivityNearRecordDistance(activity, target);
    const hasTargetKeyword = hasRecordTargetKeyword(activity, target);
    const explicitRecord = hasExplicitRecordMention(activity);
    const hasRecordedAchievement = toNumber(activity?.prCount) > 0 || toNumber(activity?.achievementCount) > 0;

    if (explicitRecord && (nearDistance || hasTargetKeyword)) {
      const entry = buildActivityBackedRecordEntry(activity, target, {
        isOfficial: true,
        sourceType: "annotated-activity",
      });

      if (entry) {
        candidates.push({
          priority: 300,
          sortSeconds: entry.elapsedSeconds,
          entry,
        });
      }
    }

    if (hasRecordedAchievement && nearDistance) {
      const entry = buildActivityBackedRecordEntry(activity, target, {
        isOfficial: true,
        sourceType: "activity-achievement",
      });

      if (entry) {
        candidates.push({
          priority: 200,
          sortSeconds: entry.elapsedSeconds,
          entry,
        });
      }
    }

    if (nearDistance && hasTargetKeyword) {
      const entry = buildActivityBackedRecordEntry(activity, target, {
        isOfficial: false,
        sourceType: "named-activity",
      });

      if (entry) {
        candidates.push({
          priority: 150,
          sortSeconds: entry.elapsedSeconds,
          entry,
        });
      }
    }

    return candidates;
  }, []);
}

function scoreRecordEnrichmentCandidate(activity = {}, target = {}) {
  const nearDistance = isActivityNearRecordDistance(activity, target);
  const hasTargetKeyword = hasRecordTargetKeyword(activity, target);
  const explicitRecord = hasExplicitRecordMention(activity);
  const hasAchievements = toNumber(activity?.prCount) > 0 || toNumber(activity?.achievementCount) > 0;
  const distanceDeltaMeters = Math.abs((toNumber(activity?.__distanceKm) * 1000) - toNumber(target.distanceMeters));

  if (!nearDistance && !hasTargetKeyword) {
    return null;
  }

  return {
    activity,
    score:
      (explicitRecord ? 400 : 0)
      + (hasTargetKeyword ? 250 : 0)
      + (nearDistance ? 200 : 0)
      + (hasAchievements ? 100 : 0)
      - Math.round(distanceDeltaMeters),
    distanceDeltaMeters,
    movingSeconds: getActivityRecordElapsedSeconds(activity),
  };
}

function shouldEnrichRecordCandidate(currentRecord = null, candidate = {}, target = {}) {
  if (!currentRecord?.isAvailable) {
    return true;
  }

  if (!currentRecord.isOfficial || currentRecord.sourceType === "named-activity") {
    return true;
  }

  const candidateElapsedSeconds = getActivityRecordElapsedSeconds(candidate);

  if (
    candidateElapsedSeconds > 0
    && toNumber(currentRecord.elapsedSeconds) > 0
    && isActivityNearRecordDistance(candidate, target)
    && candidateElapsedSeconds < toNumber(currentRecord.elapsedSeconds)
  ) {
    return true;
  }

  return false;
}

export function findRecordEnrichmentCandidates(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  const runItems = items.filter((activity) => isRunLikeActivity(activity));
  const limitPerRecord = Math.max(1, toNumber(options.limitPerRecord) || 1);
  const currentRecords = buildBestEffortRecords(runItems);
  const seenIds = new Set();

  return BEST_EFFORT_RECORD_TARGETS.flatMap((target) => {
    const currentRecord = currentRecords.find((entry) => entry.recordKey === target.key);

    return runItems
      .filter((activity) => !hasDetailedActivityPayload(activity))
      .map((activity) => scoreRecordEnrichmentCandidate(activity, target))
      .filter(Boolean)
      .filter((candidate) => shouldEnrichRecordCandidate(currentRecord, candidate.activity, target))
      .sort(
        (left, right) =>
          right.score - left.score
          || left.distanceDeltaMeters - right.distanceDeltaMeters
          || left.movingSeconds - right.movingSeconds,
      )
      .slice(0, limitPerRecord)
      .map((candidate) => candidate.activity)
      .filter((activity) => {
        const id = String(activity?.stravaActivityId || "");

        if (!id || seenIds.has(id)) {
          return false;
        }

        seenIds.add(id);
        return true;
      });
  });
}

export function buildBestEffortRecords(items = []) {
  const runItems = items.filter((activity) => isRunLikeActivity(activity));

  if (!runItems.length) {
    return [];
  }

  return BEST_EFFORT_RECORD_TARGETS.map((target) => {
    const bestEffortCandidates = runItems.reduce((candidates, activity) => {
      const activityBestEfforts = getDetailedBestEfforts(activity);
      const matchingEfforts = activityBestEfforts.length
        ? activityBestEfforts
          .filter((bestEffort) => matchesBestEffortRecordTarget(bestEffort, target))
          .filter((bestEffort) => isOfficialBestEffortRecord(bestEffort))
          .map((bestEffort) => ({
            bestEffort,
            elapsedSeconds: getBestEffortElapsedSeconds(bestEffort),
            linkedActivity: resolveRecordActivity(runItems, bestEffort, activity),
          }))
          .filter((entry) => entry.elapsedSeconds > 0)
        : [];

      if (!matchingEfforts.length) {
        return candidates;
      }

      const activityBest = matchingEfforts.reduce(
        (fastest, entry) => (!fastest || entry.elapsedSeconds < fastest.elapsedSeconds ? entry : fastest),
        null,
      );

      if (!activityBest) {
        return candidates;
      }

      const linkedActivity = activityBest.linkedActivity || activity;
      const useActivityTime = linkedActivity && isActivityNearRecordDistance(linkedActivity, target);
      const activityBackedEntry = useActivityTime
        ? buildActivityBackedRecordEntry(linkedActivity, target, {
          isOfficial: true,
          sourceType: "best-effort-linked-activity",
        })
        : null;
      const entry = activityBackedEntry || {
        ...formatEffortEntry(linkedActivity, roundValue(activityBest.elapsedSeconds, 0), "durationSeconds"),
          recordKey: target.key,
          recordLabel: target.label,
          elapsedSeconds: activityBest.elapsedSeconds,
          paceSecondsPerKm: roundValue(activityBest.elapsedSeconds / (target.distanceMeters / 1000), 0),
          isAvailable: true,
          isOfficial: true,
          sourceType: "best-effort",
        };

      candidates.push({
        priority: useActivityTime ? 250 : 100,
        sortSeconds: entry.elapsedSeconds,
        entry,
      });

      return candidates;
    }, []);

    const activityCandidates = buildActivityRecordCandidates(runItems, target);
    const rankedCandidates = [...activityCandidates, ...bestEffortCandidates]
      .sort((left, right) => right.priority - left.priority || left.sortSeconds - right.sortSeconds);

    if (rankedCandidates.length) {
      const topEntry = rankedCandidates[0].entry;
      const topDateMs = topEntry?.activity?.__date instanceof Date
        ? topEntry.activity.__date.getTime()
        : toDate(topEntry?.activity?.start_date || topEntry?.activity?.startDate)?.getTime() || 0;
      // Trouve le record precedent : meilleur effort sur une activite differente, plus ancienne.
      const previousCandidate = rankedCandidates.slice(1).find((candidate) => {
        const entry = candidate.entry;
        if (!entry || entry.elapsedSeconds <= 0) return false;
        if (entry.activity && topEntry.activity && entry.activity === topEntry.activity) return false;
        const candidateDateMs = entry?.activity?.__date instanceof Date
          ? entry.activity.__date.getTime()
          : toDate(entry?.activity?.start_date || entry?.activity?.startDate)?.getTime() || 0;
        return candidateDateMs > 0 && (topDateMs === 0 || candidateDateMs < topDateMs);
      });
      const previousEntry = previousCandidate?.entry || null;
      return {
        ...topEntry,
        previousElapsedSeconds: previousEntry ? previousEntry.elapsedSeconds : null,
        previousActivity: previousEntry ? previousEntry.activity : null,
      };
    }

    return {
      recordKey: target.key,
      recordLabel: target.label,
      activity: null,
      value: 0,
      elapsedSeconds: 0,
      paceSecondsPerKm: 0,
      isAvailable: false,
      isOfficial: false,
    };
  });
}

export function buildCriticalSpeed(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  const records = buildBestEffortRecords(items)
    .filter((record) => record?.isAvailable && toNumber(record.elapsedSeconds) > 0)
    .map((record) => {
      const target = BEST_EFFORT_RECORD_TARGETS.find((entry) => entry.key === record.recordKey);
      return target
        ? {
            ...record,
            distanceMeters: toNumber(target.distanceMeters),
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  if (records.length < 2) {
    return {
      hasData: false,
      message: "Au moins deux records route enrichis sont necessaires pour estimer une vitesse critique.",
      records,
    };
  }

  const pairs = [];
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      const timeDelta = toNumber(right.elapsedSeconds) - toNumber(left.elapsedSeconds);
      const distanceDelta = toNumber(right.distanceMeters) - toNumber(left.distanceMeters);

      if (timeDelta > 0 && distanceDelta > 0) {
        pairs.push({
          left,
          right,
          spreadMeters: distanceDelta,
          criticalSpeedMetersPerSecond: distanceDelta / timeDelta,
        });
      }
    }
  }

  const bestPair = pairs
    .filter((pair) => pair.criticalSpeedMetersPerSecond > 2 && pair.criticalSpeedMetersPerSecond < 7)
    .sort((left, right) => right.spreadMeters - left.spreadMeters)[0];

  if (!bestPair) {
    return {
      hasData: false,
      message: "Les records disponibles ne forment pas encore une estimation stable de vitesse critique.",
      records,
    };
  }

  const criticalSpeedKmh = bestPair.criticalSpeedMetersPerSecond * 3.6;
  const paceSecondsPerKm = criticalSpeedKmh > 0 ? 3600 / criticalSpeedKmh : 0;
  const dPrimeMeters = Math.max(0, bestPair.left.distanceMeters - (bestPair.criticalSpeedMetersPerSecond * bestPair.left.elapsedSeconds));

  return {
    hasData: true,
    criticalSpeedMetersPerSecond: roundValue(bestPair.criticalSpeedMetersPerSecond, 2),
    criticalSpeedKmh: roundValue(criticalSpeedKmh, 2),
    paceSecondsPerKm: roundValue(paceSecondsPerKm, 0),
    dPrimeMeters: roundValue(dPrimeMeters, 0),
    sourceRecords: [bestPair.left, bestPair.right],
    records,
    message: `Estimation construite avec ${bestPair.left.recordLabel} et ${bestPair.right.recordLabel}.`,
  };
}

export function buildBestEfforts(activities = [], limit = 3) {
  const items = buildActivityItems(activities).sort((left, right) => right.__date - left.__date);
  const safeLimit = Math.max(1, Number(limit || 3));
  const longest = [...items]
    .sort((left, right) => right.__distanceKm - left.__distanceKm)
    .slice(0, safeLimit)
    .map((activity) => formatEffortEntry(activity, roundValue(activity.__distanceKm, 1), "distanceKm"));
  const fastest = items
    .filter((activity) => isRunLikeActivity(activity) && activity.__distanceKm >= 5 && activity.__paceSecondsPerKm > 0)
    .sort((left, right) => left.__paceSecondsPerKm - right.__paceSecondsPerKm)
    .slice(0, safeLimit)
    .map((activity) => formatEffortEntry(activity, roundValue(activity.__paceSecondsPerKm, 0), "pace"));
  const climbing = [...items]
    .sort((left, right) => right.__elevationGain - left.__elevationGain)
    .slice(0, safeLimit)
    .map((activity) => formatEffortEntry(activity, roundValue(activity.__elevationGain, 0), "elevationGain"));
  const records = buildBestEffortRecords(items);

  return { longest, fastest, climbing, records };
}

export function buildSportVolumeBreakdown(activities = [], options = {}) {
  const { groupSports = true } = options;
  const items = buildActivityItems(activities, options);
  const volumeBySport = new Map();

  items.forEach((activity) => {
    const key = getDisplaySportLabel(activity, { groupSports });

    if (!key) {
      return;
    }

    const current = volumeBySport.get(key) || {
      name: key,
      count: 0,
      distanceKm: 0,
      movingHours: 0,
      elevationGain: 0,
      load: 0,
    };

    volumeBySport.set(key, {
      name: key,
      count: current.count + 1,
      distanceKm: current.distanceKm + activity.__distanceKm,
      movingHours: current.movingHours + activity.__movingHours,
      elevationGain: current.elevationGain + activity.__elevationGain,
      load: current.load + activity.__load,
    });
  });

  return Array.from(volumeBySport.values())
    .map((entry) => ({
      ...entry,
      distanceKm: roundValue(entry.distanceKm, 1),
      movingHours: roundValue(entry.movingHours, 1),
      elevationGain: roundValue(entry.elevationGain, 0),
      load: roundValue(entry.load, 1),
    }))
    .sort((left, right) => right.distanceKm - left.distanceKm || right.load - left.load);
}
