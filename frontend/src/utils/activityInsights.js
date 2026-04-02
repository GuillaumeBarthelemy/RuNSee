import {
  estimateLoadValue,
  getDisplaySportLabel,
  normalizeDistanceKm,
  normalizeDurationHours,
  normalizeElevationMeters,
} from "./activityAggregations.js";
import { resolveHeartRateZoneConfig } from "./heartRatePreferences.js";

const RUN_SCOPE_LABEL = "Course a pied / trail";
const DEFAULT_FITNESS_WINDOW_DAYS = 42;
const DEFAULT_ACUTE_WINDOW_DAYS = 7;

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

function startOfWeek(date) {
  const dayOffset = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOffset);
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

function prepareActivityItem(activity = {}) {
  const date = getActivityDate(activity);

  return {
    ...activity,
    __date: date,
    __distanceKm: normalizeDistanceKm(activity?.distance),
    __movingHours: normalizeDurationHours(activity?.movingTime),
    __movingSeconds: toNumber(activity?.movingTime),
    __elevationGain: normalizeElevationMeters(activity?.totalElevationGain),
    __paceSecondsPerKm: getPaceSecondsPerKm(activity),
    __speedKmh: getSpeedKmh(activity),
    __load: estimateLoadValue(activity),
  };
}

export function buildActivityItems(activities = []) {
  const safeActivities = Array.isArray(activities) ? activities : [];

  if (!safeActivities.length) {
    return [];
  }

  if (safeActivities.every((activity) => isPreparedItem(activity))) {
    return sortByDate(safeActivities);
  }

  return sortByDate(
    safeActivities
      .map((activity) => prepareActivityItem(activity))
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
  const averagePaceSecondsPerKm = totalDistance > 0 ? totalMovingSeconds / totalDistance : 0;
  const averageSpeedKmh = totalMovingHours > 0 ? totalDistance / totalMovingHours : 0;
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
  const items = buildActivityItems(activities);
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
  const items = buildActivityItems(activities);

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
  const items = buildActivityItems(activities);

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
  const items = buildActivityItems(activities);

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
  const items = buildActivityItems(activities);

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

export function buildTrainingStateTimeline(activities = [], options = {}) {
  const items = buildActivityItems(activities);

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
        label: formatWeekLabel(pointDate),
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
      label: cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      acuteLoad: roundValue(acuteLoad, 1),
      fitness: roundValue(fitness, 1),
      freshness: roundValue(fitness - acuteLoad, 1),
    });

    cursor = addDays(cursor, 1);
  }

  return points;
}

export function buildDashboardSnapshot(activities = [], options = {}) {
  const items = buildActivityItems(activities);
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

  const paces = runItems.map((activity) => activity.__paceSecondsPerKm);
  const q1 = getQuantile(paces, 0.25);
  const q3 = getQuantile(paces, 0.75);
  const iqr = q3 - q1;
  const filteredItems = iqr > 0
    ? runItems.filter((activity) => activity.__paceSecondsPerKm >= (q1 - (1.5 * iqr)) && activity.__paceSecondsPerKm <= (q3 + (1.5 * iqr)))
    : runItems;
  const referenceItems = filteredItems.length >= 3 ? filteredItems : runItems;
  const heartRates = referenceItems
    .map((activity) => toNumber(activity.averageHeartrate))
    .filter((value) => value > 0);

  return {
    paceSecondsPerKm: roundValue(getMedian(referenceItems.map((activity) => activity.__paceSecondsPerKm)), 0),
    averageHeartrate: roundValue(getMedian(heartRates), 0),
    sampleSize: referenceItems.length,
    scope: RUN_SCOPE_LABEL,
    hasData: true,
  };
}

function parseJsonSafe(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildHeartRateSegments(activity = {}) {
  const payload = parseJsonSafe(activity.rawJson);
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

function getReferenceMaxHeartrate(activities = [], options = {}) {
  const items = buildActivityItems(activities);
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

  const items = buildActivityItems(activities);
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
      message: "Pas assez de donnees cardio pour estimer la FC max. Vous pouvez la renseigner dans Administration.",
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
  const items = buildActivityItems(activities);
  const weeks = Math.max(1, Number(options.weeks || 12));
  const explicitStart = toDate(options.startDate);
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const endWeekStart = startOfWeek(endDate);
  const startWeekStart = explicitStart
    ? startOfWeek(explicitStart)
    : addDays(endWeekStart, -((weeks - 1) * 7));
  const weeksInWindow = explicitStart
    ? Math.max(1, Math.round((endWeekStart - startWeekStart) / (7 * 86400000)) + 1)
    : weeks;
  const fullHistoryMap = new Map();
  const windowMap = new Map();

  items
    .filter((activity) => activity.__date <= endDate)
    .forEach((activity) => {
      const weekKey = formatDayKey(startOfWeek(activity.__date));
      fullHistoryMap.set(weekKey, (fullHistoryMap.get(weekKey) || 0) + 1);

      if (!explicitStart || activity.__date >= startOfDay(explicitStart)) {
        const currentWeek = windowMap.get(weekKey) || { count: 0, distanceKm: 0 };
        windowMap.set(weekKey, {
          count: currentWeek.count + 1,
          distanceKm: currentWeek.distanceKm + activity.__distanceKm,
        });
      }
    });

  const weeklySeries = Array.from({ length: weeksInWindow }, (_, index) => {
    const weekStart = addDays(startWeekStart, index * 7);
    const weekData = windowMap.get(formatDayKey(weekStart)) || { count: 0, distanceKm: 0 };
    const count = weekData.count || 0;
    const distanceKm = roundValue(weekData.distanceKm || 0, 1);

    return {
      period: formatWeekLabel(weekStart),
      periodDate: formatDayKey(weekStart),
      weekStart,
      weekEnd: addDays(weekStart, 6),
      count,
      distanceKm,
      value: count,
    };
  });

  const activeWeeks = weeklySeries.filter((week) => week.count > 0).length;
  const totalSessions = weeklySeries.reduce((sum, week) => sum + week.count, 0);
  let activeStreakWeeks = 0;
  let cursor = endWeekStart;

  while ((fullHistoryMap.get(formatDayKey(cursor)) || 0) > 0) {
    activeStreakWeeks += 1;
    cursor = addDays(cursor, -7);
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

  return { longest, fastest, climbing };
}

export function buildSportVolumeBreakdown(activities = [], options = {}) {
  const { groupSports = true } = options;
  const items = buildActivityItems(activities);
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
