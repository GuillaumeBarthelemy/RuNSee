function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toActivityArray(activities) {
  return Array.isArray(activities) ? activities : [];
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfWeek(date) {
  const dayOffset = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOffset);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
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

function formatMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getRoundedMetricValue(value, metric) {
  const normalizedMetric = normalizeMetric(metric);
  const decimals = normalizedMetric === "count" || normalizedMetric === "elevationGain" ? 0 : 1;
  return Number(toNumber(value).toFixed(decimals));
}

function getNormalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

const DEFAULT_FILTERS = {
  search: "",
  sportGroup: "all",
  dateFrom: "",
  dateTo: "",
};

const WEEKDAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DISTANCE_BUCKETS = [
  { key: "0-5", label: "0-5 km", min: 0, max: 5 },
  { key: "5-10", label: "5-10 km", min: 5, max: 10 },
  { key: "10-15", label: "10-15 km", min: 10, max: 15 },
  { key: "15-20", label: "15-20 km", min: 15, max: 20 },
  { key: "20-30", label: "20-30 km", min: 20, max: 30 },
  { key: "30+", label: "30 km et +", min: 30, max: Infinity },
];

const METRIC_ALIASES = {
  distance: "distanceKm",
  distanceKm: "distanceKm",
  distance_km: "distanceKm",
  elevation: "elevationGain",
  elevationGain: "elevationGain",
  totalElevationGain: "elevationGain",
  movingHours: "movingHours",
  movingTime: "movingHours",
  moving_time: "movingHours",
  duration: "movingHours",
  count: "count",
  activities: "count",
  activityCount: "count",
  averageHeartRate: "averageHeartrate",
  averageHeartrate: "averageHeartrate",
  heartrate: "averageHeartrate",
};

export function normalizeMetric(metric = "distanceKm") {
  return METRIC_ALIASES[metric] || "distanceKm";
}

export function getMetricConfig(metric = "distanceKm") {
  switch (normalizeMetric(metric)) {
    case "distanceKm":
      return { label: "Distance (km)", unit: "km", decimals: 1 };
    case "elevationGain":
      return { label: "Dénivelé positif", unit: "m", decimals: 0 };
    case "movingHours":
      return { label: "Temps de déplacement", unit: "h", decimals: 1 };
    case "count":
      return { label: "Nombre d'activités", unit: "", decimals: 0 };
    case "averageHeartrate":
      return { label: "FC moyenne", unit: "bpm", decimals: 0 };
    default:
      return { label: String(metric || "Valeur"), unit: "", decimals: 1 };
  }
}

export function getMetricLabel(metric = "distanceKm") {
  return getMetricConfig(metric).label;
}

export function formatMetricValue(value, metric = "distanceKm") {
  const { unit, decimals } = getMetricConfig(metric);
  const numeric = toNumber(value);
  const formatted = numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function normalizeDistanceKm(value) {
  return toNumber(value) / 1000;
}

export function normalizeDurationHours(value) {
  return toNumber(value) / 3600;
}

export function normalizeElevationMeters(value) {
  return toNumber(value);
}

export function getDisplaySportLabel(activity = {}, options = {}) {
  const { groupSports = true } = options;
  const safeActivity = activity || {};
  const sportType = getNormalizedText(safeActivity.sportType || safeActivity.type);
  const name = getNormalizedText(safeActivity.name);
  const description = getNormalizedText(safeActivity.description);
  const distanceKm = normalizeDistanceKm(safeActivity.distance);
  const elevationPerKm = distanceKm > 0 ? normalizeElevationMeters(safeActivity.totalElevationGain) / distanceKm : 0;
  const trailHint = /trail|sentier|montagne|col|crête|rando-course/.test(`${name} ${description}`);

  if (!groupSports) return safeActivity.sportType || safeActivity.type || "Autre";
  if (["trailrun"].includes(sportType)) return "Course à pied / trail";
  if (["run", "virtualrun"].includes(sportType)) {
    if (trailHint || elevationPerKm >= 15) return "Course à pied / trail";
    return "Course à pied / trail";
  }
  if (["walk", "hike", "nordicski", "snowshoe"].includes(sportType)) return "Marche / randonnée";
  if (["ride", "virtualride", "ebikeride", "handcycle", "velomobile", "gravelride", "mountainbikeride"].includes(sportType)) return "Vélo";
  if (["swim"].includes(sportType)) return "Natation";
  if (["workout", "weighttraining", "crossfit", "yoga", "stair_stepper", "elliptical", "highintensityintervaltraining"].includes(sportType)) return "Renforcement / fitness";
  if (["rowing", "kayaking", "canoeing", "standuppaddling", "windsurf", "kitesurf", "surfing"].includes(sportType)) return "Sports nautiques";
  if (["alpineski", "backcountryski", "iceskate", "inlineskate", "rollerski"].includes(sportType)) return "Sports de glisse";
  return safeActivity.sportType || safeActivity.type || "Autre";
}

function metricValue(activity, metric) {
  const safeActivity = activity || {};
  switch (normalizeMetric(metric)) {
    case "distanceKm":
      return normalizeDistanceKm(safeActivity.distance);
    case "elevationGain":
      return normalizeElevationMeters(safeActivity.totalElevationGain);
    case "movingHours":
      return normalizeDurationHours(safeActivity.movingTime);
    case "count":
      return 1;
    case "averageHeartrate":
      return toNumber(safeActivity.averageHeartrate);
    default:
      return normalizeDistanceKm(safeActivity.distance);
  }
}

function getActivitiesWithDates(activities) {
  return toActivityArray(activities)
    .map((activity) => ({ ...activity, __date: toDate(activity?.startDate || activity?.startDateLocal) }))
    .filter((activity) => activity.__date);
}

export function buildKpis(activities) {
  const safeActivities = toActivityArray(activities);
  const totalActivities = safeActivities.length;
  const totalDistance = safeActivities.reduce((sum, item) => sum + metricValue(item, "distanceKm"), 0);
  const totalMovingTime = safeActivities.reduce((sum, item) => sum + metricValue(item, "movingHours"), 0);
  const totalElevationGain = safeActivities.reduce((sum, item) => sum + metricValue(item, "elevationGain"), 0);
  const averageHeartrateValues = safeActivities
    .map((item) => toNumber(item?.averageHeartrate))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageHeartrate = averageHeartrateValues.length
    ? averageHeartrateValues.reduce((sum, value) => sum + value, 0) / averageHeartrateValues.length
    : 0;

  return { totalActivities, totalDistance, totalMovingTime, totalElevationGain, averageHeartrate };
}

function getLatestDate(activities) {
  return toActivityArray(activities).reduce((latest, activity) => {
    const currentDate = activity?.__date || toDate(activity?.startDate || activity?.startDateLocal);
    if (!currentDate) return latest;
    if (!latest || currentDate > latest) return currentDate;
    return latest;
  }, null);
}

export function buildMonthlySeries(activities, options = {}) {
  const items = getActivitiesWithDates(activities);
  if (!items.length) return [];

  const months = Math.max(1, Number(options.months || 6));
  const metric = normalizeMetric(options.metric || "distanceKm");
  const endDate = startOfMonth(getLatestDate(items));
  const startDate = addMonths(endDate, -(months - 1));
  const monthMap = new Map();

  for (const activity of items) {
    const month = startOfMonth(activity.__date);
    if (month < startDate || month > endDate) continue;
    const key = formatMonthKey(month);
    monthMap.set(key, (monthMap.get(key) || 0) + metricValue(activity, metric));
  }

  return Array.from({ length: months }, (_, index) => {
    const current = addMonths(startDate, index);
    const key = formatMonthKey(current);
    const value = getRoundedMetricValue(monthMap.get(key) || 0, metric);
    return {
      period: formatMonthLabel(current),
      periodDate: key,
      value,
      [metric]: value,
    };
  });
}

export function buildMonthlyVolume(activities, options = {}) {
  return buildMonthlySeries(activities, options);
}

export function buildWeeklySeries(activities, options = {}) {
  const items = getActivitiesWithDates(activities);
  if (!items.length) return [];

  const weeks = Math.max(1, Number(options.weeks || 12));
  const metric = normalizeMetric(options.metric || "distanceKm");
  const endDate = startOfWeek(getLatestDate(items));
  const startDate = addDays(endDate, -((weeks - 1) * 7));
  const weekMap = new Map();

  for (const activity of items) {
    const weekStart = startOfWeek(activity.__date);
    if (weekStart < startDate || weekStart > endDate) continue;
    const key = formatDayKey(weekStart);
    weekMap.set(key, (weekMap.get(key) || 0) + metricValue(activity, metric));
  }

  return Array.from({ length: weeks }, (_, index) => {
    const current = addDays(startDate, index * 7);
    const key = formatDayKey(current);
    const value = getRoundedMetricValue(weekMap.get(key) || 0, metric);
    return {
      period: formatWeekLabel(current),
      periodDate: key,
      value,
      [metric]: value,
      distanceKm: metric === "distanceKm" ? value : undefined,
    };
  });
}

export function buildWeeklyVolume(activities, options = {}) {
  return buildWeeklySeries(activities, { ...options, metric: options.metric || "distanceKm" });
}

export function buildWeekdayDistribution(activities, options = {}) {
  const items = getActivitiesWithDates(activities);
  const metric = normalizeMetric(options.metric || "count");
  const buckets = WEEKDAY_LABELS.map((label) => ({ label, value: 0 }));

  for (const activity of items) {
    const dayIndex = (activity.__date.getDay() + 6) % 7;
    buckets[dayIndex].value += metricValue(activity, metric);
  }

  return buckets.map((bucket) => ({
    ...bucket,
    value: getRoundedMetricValue(bucket.value, metric),
  }));
}

export function buildSportDistribution(activities, options = {}) {
  const { groupSports = true } = options;
  const sportMap = new Map();

  for (const activity of toActivityArray(activities)) {
    const key = getDisplaySportLabel(activity, { groupSports });
    if (!key) continue;
    sportMap.set(key, (sportMap.get(key) || 0) + 1);
  }

  return Array.from(sportMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildRollingLoadSeries(activities, options = {}) {
  const items = getActivitiesWithDates(activities);
  if (!items.length) return [];

  const metric = normalizeMetric(options.metric || "distanceKm");
  const latest = getLatestDate(items);
  const days = Math.max(1, Number(options.days || 120));
  const start = addDays(new Date(latest.getFullYear(), latest.getMonth(), latest.getDate()), -(days - 1));
  const dailyMap = new Map();

  for (const item of items) {
    const key = formatDayKey(item.__date);
    dailyMap.set(key, (dailyMap.get(key) || 0) + metricValue(item, metric));
  }

  return Array.from({ length: days }, (_, index) => {
    const current = addDays(start, index);
    const currentKey = formatDayKey(current);
    const dayValue = dailyMap.get(currentKey) || 0;
    let load7 = 0;
    let load28 = 0;

    for (let offset = 0; offset < 28; offset += 1) {
      const key = formatDayKey(addDays(current, -offset));
      const value = dailyMap.get(key) || 0;
      if (offset < 7) load7 += value;
      load28 += value;
    }

    return {
      label: current.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      dayValue: getRoundedMetricValue(dayValue, metric),
      load7: getRoundedMetricValue(load7, metric),
      load28: getRoundedMetricValue(load28, metric),
    };
  });
}

export function buildDistanceDistribution(activities) {
  const buckets = DISTANCE_BUCKETS.map((bucket) => ({ ...bucket, value: 0 }));

  for (const activity of toActivityArray(activities)) {
    const distance = normalizeDistanceKm(activity?.distance);
    const bucket = buckets.find((item) => distance >= item.min && distance < item.max);
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ key, label, value }) => ({ key, label, value }));
}

export function filterActivities(activities, filters = {}, options = {}) {
  const safeActivities = toActivityArray(activities);
  const safeFilters = { ...DEFAULT_FILTERS, ...(filters || {}) };
  const normalizedSearch = getNormalizedText(safeFilters.search);
  const groupSports = options.groupSports ?? true;

  return safeActivities.filter((activity) => {
    const activityDate = toDate(activity?.startDate || activity?.startDateLocal);
    const displaySport = getDisplaySportLabel(activity, { groupSports });
    const rawSport = getNormalizedText(activity?.sportType || activity?.type);
    const haystack = `${activity?.name || ""} ${activity?.description || ""} ${displaySport} ${rawSport}`.toLowerCase();
    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesSport = safeFilters.sportGroup === "all" || displaySport === safeFilters.sportGroup;
    let matchesDate = true;

    if (activityDate && safeFilters.dateFrom) {
      matchesDate = matchesDate && activityDate >= new Date(`${safeFilters.dateFrom}T00:00:00`);
    }
    if (activityDate && safeFilters.dateTo) {
      matchesDate = matchesDate && activityDate <= new Date(`${safeFilters.dateTo}T23:59:59.999`);
    }

    return matchesSearch && matchesSport && matchesDate;
  });
}

export function getAvailableSportGroups(activities, options = {}) {
  const { groupSports = true } = options;
  return Array.from(
    new Set(
      toActivityArray(activities)
        .map((activity) => getDisplaySportLabel(activity, { groupSports }))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

const activityAggregations = {
  buildDistanceDistribution,
  buildKpis,
  buildMonthlySeries,
  buildMonthlyVolume,
  buildRollingLoadSeries,
  buildSportDistribution,
  buildWeekdayDistribution,
  buildWeeklySeries,
  buildWeeklyVolume,
  filterActivities,
  formatMetricValue,
  getAvailableSportGroups,
  getDisplaySportLabel,
  getMetricConfig,
  getMetricLabel,
  normalizeDistanceKm,
  normalizeDurationHours,
  normalizeElevationMeters,
  normalizeMetric,
};

export default activityAggregations;
