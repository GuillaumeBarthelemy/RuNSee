function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date, years) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function formatWeekLabel(date) {
  const end = addWeeks(date, 1);
  end.setDate(end.getDate() - 1);
  const startLabel = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const endLabel = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  return `${startLabel} → ${endLabel}`;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function buildRange(start, end, stepper) {
  const range = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    range.push(new Date(cursor));
    cursor = stepper(cursor);
  }
  return range;
}

function getLatestDate(activities = []) {
  const dates = activities
    .map((activity) => toDate(activity.startDate || activity.startDateLocal))
    .filter(Boolean)
    .sort((a, b) => a - b);

  return dates.length ? dates[dates.length - 1] : null;
}

function getDateBounds(activities = [], dateFrom = "", dateTo = "") {
  const latest = getLatestDate(activities) || new Date();

  const minDate = dateFrom ? toDate(`${dateFrom}T00:00:00`) : null;
  const maxDate = dateTo ? toDate(`${dateTo}T23:59:59.999`) : latest;

  return {
    minDate,
    maxDate,
  };
}

function getNormalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function filterBySearchAndSport(activities = [], filters = {}) {
  const normalizedSearch = getNormalizedText(filters.search);

  return activities.filter((activity) => {
    const sportGroup = getSportGroup(activity);
    const rawSport = getNormalizedText(activity.sportType || activity.type);
    const haystack = `${activity.name || ""} ${activity.description || ""} ${sportGroup} ${rawSport}`.toLowerCase();

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesSport = filters.sportGroup === "all" || !filters.sportGroup || sportGroup === filters.sportGroup;

    return matchesSearch && matchesSport;
  });
}

export function getSportGroup(activity = {}) {
  const sportType = getNormalizedText(activity.sportType || activity.type);
  const name = getNormalizedText(activity.name);
  const description = getNormalizedText(activity.description);
  const distanceKm = toNumber(activity.distance) / 1000;
  const elevationPerKm = distanceKm > 0 ? toNumber(activity.totalElevationGain) / distanceKm : 0;
  const trailHint = /trail|sentier|montagne|col|crête|rando-course/.test(`${name} ${description}`);

  if (["trailrun"].includes(sportType)) return "Trail";
  if (["run", "virtualrun"].includes(sportType)) {
    if (trailHint || elevationPerKm >= 15) return "Trail";
    return "Course à pied";
  }
  if (["walk", "hike", "nordicski", "snowshoe"].includes(sportType)) return "Marche / randonnée";
  if (["ride", "virtualride", "ebikeride", "handcycle", "velomobile", "gravelride", "mountainbikeride"].includes(sportType)) {
    if (sportType === "gravelride") return "Vélo gravel";
    if (sportType === "mountainbikeride") return "VTT";
    if (sportType === "virtualride") return "Vélo indoor";
    return "Vélo";
  }
  if (["swim"].includes(sportType)) return "Natation";
  if (["workout", "weighttraining", "crossfit", "yoga", "stair_stepper", "elliptical"].includes(sportType)) return "Renforcement / fitness";
  if (["rowing", "kayaking", "canoeing", "standuppaddling", "windsurf", "kitesurf", "surfing"].includes(sportType)) return "Sports nautiques";
  if (["alpineski", "backcountryski", "iceskate", "inlineskate", "rollerski"].includes(sportType)) return "Sports de glisse";
  return activity.sportType || activity.type || "Autre";
}

export function getDisplaySportLabel(activity = {}) {
  return getSportGroup(activity);
}

export function buildKpis(activities = []) {
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, item) => sum + toNumber(item.distance), 0);
  const totalMovingTime = activities.reduce((sum, item) => sum + toNumber(item.movingTime), 0);
  const totalElevationGain = activities.reduce((sum, item) => sum + toNumber(item.totalElevationGain), 0);
  const averageHeartrateValues = activities
    .map((item) => Number(item.averageHeartrate))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageHeartrate = averageHeartrateValues.length
    ? averageHeartrateValues.reduce((sum, value) => sum + value, 0) / averageHeartrateValues.length
    : 0;

  return {
    totalActivities,
    totalDistance,
    totalMovingTime,
    totalElevationGain,
    averageHeartrate,
  };
}

export function buildWeeklyVolume(activities = [], options = {}) {
  const filteredActivities = activities
    .map((activity) => ({ ...activity, __date: toDate(activity.startDate || activity.startDateLocal) }))
    .filter((activity) => activity.__date);

  if (!filteredActivities.length) return [];

  const { minDate, maxDate } = getDateBounds(filteredActivities, options.dateFrom, options.dateTo);
  const latest = maxDate || getLatestDate(filteredActivities) || new Date();
  const defaultStart = startOfWeek(addWeeks(latest, -15));
  const start = startOfWeek(minDate || defaultStart);
  const end = startOfWeek(maxDate || latest);

  const map = new Map();

  for (const activity of filteredActivities) {
    const keyDate = startOfWeek(activity.__date);
    const key = keyDate.toISOString();
    const current = map.get(key) || {
      period: formatWeekLabel(keyDate),
      periodDate: key,
      distanceKm: 0,
      movingHours: 0,
      elevationGain: 0,
      count: 0,
    };

    current.distanceKm += toNumber(activity.distance) / 1000;
    current.movingHours += toNumber(activity.movingTime) / 3600;
    current.elevationGain += toNumber(activity.totalElevationGain);
    current.count += 1;
    map.set(key, current);
  }

  return buildRange(start, end, (date) => addWeeks(date, 1)).map((periodStart) => {
    const key = periodStart.toISOString();
    const data = map.get(key) || {
      period: formatWeekLabel(periodStart),
      periodDate: key,
      distanceKm: 0,
      movingHours: 0,
      elevationGain: 0,
      count: 0,
    };

    return {
      ...data,
      distanceKm: Number(data.distanceKm.toFixed(1)),
      movingHours: Number(data.movingHours.toFixed(1)),
      elevationGain: Math.round(data.elevationGain),
    };
  });
}

export function buildMonthlyVolume(activities = [], options = {}) {
  const filteredActivities = activities
    .map((activity) => ({ ...activity, __date: toDate(activity.startDate || activity.startDateLocal) }))
    .filter((activity) => activity.__date);

  if (!filteredActivities.length) return [];

  const { minDate, maxDate } = getDateBounds(filteredActivities, options.dateFrom, options.dateTo);
  const latest = maxDate || getLatestDate(filteredActivities) || new Date();
  const defaultStart = startOfMonth(addMonths(latest, -11));
  const start = startOfMonth(minDate || defaultStart);
  const end = startOfMonth(maxDate || latest);

  const map = new Map();

  for (const activity of filteredActivities) {
    const keyDate = startOfMonth(activity.__date);
    const key = keyDate.toISOString();
    const current = map.get(key) || {
      period: formatMonthLabel(keyDate),
      periodDate: key,
      distanceKm: 0,
      movingHours: 0,
      elevationGain: 0,
      count: 0,
    };

    current.distanceKm += toNumber(activity.distance) / 1000;
    current.movingHours += toNumber(activity.movingTime) / 3600;
    current.elevationGain += toNumber(activity.totalElevationGain);
    current.count += 1;
    map.set(key, current);
  }

  return buildRange(start, end, (date) => addMonths(date, 1)).map((periodStart) => {
    const key = periodStart.toISOString();
    const data = map.get(key) || {
      period: formatMonthLabel(periodStart),
      periodDate: key,
      distanceKm: 0,
      movingHours: 0,
      elevationGain: 0,
      count: 0,
    };

    return {
      ...data,
      distanceKm: Number(data.distanceKm.toFixed(1)),
      movingHours: Number(data.movingHours.toFixed(1)),
      elevationGain: Math.round(data.elevationGain),
    };
  });
}

export function buildSportDistribution(activities = []) {
  const map = new Map();

  for (const activity of activities) {
    const key = getSportGroup(activity);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function filterActivities(activities = [], filters = {}) {
  const normalizedSearch = getNormalizedText(filters.search);

  return activities.filter((activity) => {
    const activityDate = toDate(activity.startDate || activity.startDateLocal);
    const sportGroup = getSportGroup(activity);
    const rawSport = getNormalizedText(activity.sportType || activity.type);
    const haystack = `${activity.name || ""} ${activity.description || ""} ${sportGroup} ${rawSport}`.toLowerCase();

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesSport = filters.sportGroup === "all" || sportGroup === filters.sportGroup;

    let matchesDate = true;
    if (activityDate && filters.dateFrom) {
      matchesDate = matchesDate && activityDate >= new Date(`${filters.dateFrom}T00:00:00`);
    }
    if (activityDate && filters.dateTo) {
      matchesDate = matchesDate && activityDate <= new Date(`${filters.dateTo}T23:59:59.999`);
    }

    return matchesSearch && matchesSport && matchesDate;
  });
}

export function getAvailableSportGroups(activities = []) {
  return Array.from(new Set(activities.map((activity) => getSportGroup(activity)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
}

export const COMPARISON_MODES = [
  { value: "rolling30", label: "30 jours glissants" },
  { value: "month_n_n1", label: "Mois N vs N-1" },
  { value: "year_n_n1", label: "Année N vs N-1" },
  { value: "month_n_n1_n2", label: "Mois N vs N-1 vs N-2" },
  { value: "year_n_n1_n2", label: "Année N vs N-1 vs N-2" },
];

export const COMPARISON_METRICS = [
  { value: "distanceKm", label: "Distance", unit: "km", color: "#0b5fff" },
  { value: "elevationGain", label: "D+", unit: "m", color: "#16a34a" },
  { value: "movingHours", label: "Temps", unit: "h", color: "#f97316" },
  { value: "count", label: "Activités", unit: "act.", color: "#8b5cf6" },
];

function getMetricValue(activity, metric) {
  switch (metric) {
    case "distanceKm":
      return toNumber(activity.distance) / 1000;
    case "elevationGain":
      return toNumber(activity.totalElevationGain);
    case "movingHours":
      return toNumber(activity.movingTime) / 3600;
    case "count":
      return 1;
    default:
      return 0;
  }
}

function buildComparisonWindow(label, start, end, compareLabel, metric, activities) {
  const value = activities.reduce((sum, activity) => {
    const date = toDate(activity.startDate || activity.startDateLocal);
    if (!date || date < start || date > end) return sum;
    return sum + getMetricValue(activity, metric);
  }, 0);

  const roundedValue = metric === "count" ? Math.round(value) : Number(value.toFixed(1));

  return {
    label,
    compareLabel,
    start,
    end,
    value: roundedValue,
  };
}

function getReferenceDate(activities = []) {
  return getLatestDate(activities) || new Date();
}

function buildWindows(referenceDate, mode, metric, activities) {
  const ref = new Date(referenceDate);
  ref.setHours(23, 59, 59, 999);

  if (mode === "rolling30") {
    const currentEnd = new Date(ref);
    const currentStart = addDays(currentEnd, -29);
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = addDays(currentStart, -1);
    previousEnd.setHours(23, 59, 59, 999);
    const previousStart = addDays(previousEnd, -29);
    previousStart.setHours(0, 0, 0, 0);

    return [
      buildComparisonWindow("30 derniers jours", currentStart, currentEnd, "Période courante", metric, activities),
      buildComparisonWindow("30 jours précédents", previousStart, previousEnd, "Période précédente", metric, activities),
    ];
  }

  if (mode === "month_n_n1" || mode === "month_n_n1_n2") {
    const offsets = mode === "month_n_n1" ? [0, -1] : [0, -1, -2];
    return offsets.map((offset) => {
      const monthDate = addMonths(startOfMonth(ref), offset);
      return buildComparisonWindow(
        monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        startOfMonth(monthDate),
        endOfMonth(monthDate),
        offset === 0 ? "Mois N" : `Mois N${offset}`,
        metric,
        activities,
      );
    });
  }

  const yearOffsets = mode === "year_n_n1" ? [0, -1] : [0, -1, -2];
  return yearOffsets.map((offset) => {
    const yearDate = addYears(startOfYear(ref), offset);
    return buildComparisonWindow(
      String(yearDate.getFullYear()),
      startOfYear(yearDate),
      endOfYear(yearDate),
      offset === 0 ? "Année N" : `Année N${offset}`,
      metric,
      activities,
    );
  });
}

function buildComparisonSummary(series = [], metricDefinition) {
  if (!series.length) {
    return {
      currentLabel: "-",
      currentValue: 0,
      previousLabel: "-",
      previousValue: 0,
      delta: 0,
      deltaPercent: null,
      bestLabel: "-",
      averageValue: 0,
      unit: metricDefinition?.unit || "",
    };
  }

  const current = series[0];
  const previous = series[1] || null;
  const previousValue = previous?.value ?? 0;
  const delta = current.value - previousValue;
  const deltaPercent = previousValue > 0 ? (delta / previousValue) * 100 : null;
  const best = [...series].sort((a, b) => b.value - a.value)[0];
  const averageValue = series.reduce((sum, item) => sum + item.value, 0) / series.length;

  return {
    currentLabel: current.label,
    currentValue: current.value,
    previousLabel: previous?.label || "-",
    previousValue,
    delta,
    deltaPercent,
    bestLabel: best.label,
    averageValue,
    unit: metricDefinition?.unit || "",
  };
}

export function buildPeriodComparison(activities = [], options = {}) {
  const mode = options.mode || "rolling30";
  const metric = options.metric || "distanceKm";
  const scopedActivities = filterBySearchAndSport(activities, options.filters || {})
    .map((activity) => ({ ...activity, __date: toDate(activity.startDate || activity.startDateLocal) }))
    .filter((activity) => activity.__date);

  const metricDefinition = COMPARISON_METRICS.find((item) => item.value === metric) || COMPARISON_METRICS[0];
  const modeDefinition = COMPARISON_MODES.find((item) => item.value === mode) || COMPARISON_MODES[0];

  if (!scopedActivities.length) {
    return {
      mode,
      metric,
      metricDefinition,
      modeDefinition,
      referenceDate: null,
      series: [],
      summary: buildComparisonSummary([], metricDefinition),
    };
  }

  const referenceDate = getReferenceDate(scopedActivities);
  const windows = buildWindows(referenceDate, mode, metric, scopedActivities)
    .map((item) => ({
      ...item,
      valueLabel: metric === "count" ? String(Math.round(item.value)) : `${item.value.toFixed(1)} ${metricDefinition.unit}`,
    }));

  return {
    mode,
    metric,
    metricDefinition,
    modeDefinition,
    referenceDate,
    series: windows,
    summary: buildComparisonSummary(windows, metricDefinition),
  };
}
