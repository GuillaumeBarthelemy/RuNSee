function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DISTANCE_BUCKETS = [
  { key: '0-5', label: '0–5 km', min: 0, max: 5 },
  { key: '5-10', label: '5–10 km', min: 5, max: 10 },
  { key: '10-15', label: '10–15 km', min: 10, max: 15 },
  { key: '15-20', label: '15–20 km', min: 15, max: 20 },
  { key: '20-30', label: '20–30 km', min: 20, max: 30 },
  { key: '30+', label: '30 km et +', min: 30, max: Infinity },
];

export function getMetricConfig(metric = 'distanceKm') {
  switch (metric) {
    case 'distanceKm':
      return { label: 'Distance (km)', unit: 'km', decimals: 1 };
    case 'elevationGain':
      return { label: 'Dénivelé positif', unit: 'm', decimals: 0 };
    case 'movingHours':
      return { label: 'Temps de déplacement', unit: 'h', decimals: 1 };
    case 'count':
      return { label: "Nombre d'activités", unit: '', decimals: 0 };
    case 'averageHeartrate':
      return { label: 'FC moyenne', unit: 'bpm', decimals: 0 };
    default:
      return { label: metric, unit: '', decimals: 1 };
  }
}

export function formatMetricValue(value, metric = 'distanceKm') {
  const { unit, decimals } = getMetricConfig(metric);
  const numeric = Number(value || 0);
  const formatted = numeric.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

function getNormalizedText(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeDistanceKm(value) {
  const n = toNumber(value);
  if (!n) return 0;
  return n > 1000 ? n / 1000 : n;
}

export function normalizeDurationHours(value) {
  const n = toNumber(value);
  if (!n) return 0;
  return n > 100 ? n / 3600 : n;
}

export function normalizeElevationMeters(value) {
  return toNumber(value);
}

export function getDisplaySportLabel(activity = {}, options = {}) {
  const { groupSports = true } = options;
  const sportType = getNormalizedText(activity.sportType || activity.type);
  const name = getNormalizedText(activity.name);
  const description = getNormalizedText(activity.description);
  const distanceKm = normalizeDistanceKm(activity.distance);
  const elevationPerKm = distanceKm > 0 ? normalizeElevationMeters(activity.totalElevationGain) / distanceKm : 0;
  const trailHint = /trail|sentier|montagne|col|crête|rando-course/.test(`${name} ${description}`);

  if (!groupSports) return activity.sportType || activity.type || 'Autre';
  if (['trailrun'].includes(sportType)) return 'Course à pied / trail';
  if (['run', 'virtualrun'].includes(sportType)) {
    if (trailHint || elevationPerKm >= 15) return 'Course à pied / trail';
    return 'Course à pied / trail';
  }
  if (['walk', 'hike', 'nordicski', 'snowshoe'].includes(sportType)) return 'Marche / randonnée';
  if (['ride', 'virtualride', 'ebikeride', 'handcycle', 'velomobile', 'gravelride', 'mountainbikeride'].includes(sportType)) return 'Vélo';
  if (['swim'].includes(sportType)) return 'Natation';
  if (['workout', 'weighttraining', 'crossfit', 'yoga', 'stair_stepper', 'elliptical', 'highintensityintervaltraining'].includes(sportType)) return 'Renforcement / fitness';
  if (['rowing', 'kayaking', 'canoeing', 'standuppaddling', 'windsurf', 'kitesurf', 'surfing'].includes(sportType)) return 'Sports nautiques';
  if (['alpineski', 'backcountryski', 'iceskate', 'inlineskate', 'rollerski'].includes(sportType)) return 'Sports de glisse';
  return activity.sportType || activity.type || 'Autre';
}

function metricValue(activity, metric) {
  switch (metric) {
    case 'distanceKm':
      return normalizeDistanceKm(activity.distance);
    case 'elevationGain':
      return normalizeElevationMeters(activity.totalElevationGain);
    case 'movingHours':
      return normalizeDurationHours(activity.movingTime);
    case 'count':
      return 1;
    case 'averageHeartrate':
      return toNumber(activity.averageHeartrate);
    default:
      return normalizeDistanceKm(activity.distance);
  }
}

function getActivitiesWithDates(activities = []) {
  return activities
    .map((activity) => ({ ...activity, __date: toDate(activity.startDate || activity.startDateLocal) }))
    .filter((activity) => activity.__date);
}

export function buildKpis(activities = []) {
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, item) => sum + metricValue(item, 'distanceKm'), 0);
  const totalMovingTime = activities.reduce((sum, item) => sum + metricValue(item, 'movingHours'), 0);
  const totalElevationGain = activities.reduce((sum, item) => sum + metricValue(item, 'elevationGain'), 0);
  const averageHeartrateValues = activities.map((item) => Number(item.averageHeartrate)).filter((value) => Number.isFinite(value) && value > 0);
  const averageHeartrate = averageHeartrateValues.length ? averageHeartrateValues.reduce((sum, value) => sum + value, 0) / averageHeartrateValues.length : 0;
  return { totalActivities, totalDistance, totalMovingTime, totalElevationGain, averageHeartrate };
}

function getLatestDate(activities = []) {
  const dates = activities.map((activity) => toDate(activity.startDate || activity.startDateLocal)).filter(Boolean).sort((a,b)=>a-b);
  return dates.length ? dates[dates.length - 1] : null;
}

export function buildMonthlySeries(activities = [], options = {}) {
  const items = getActivitiesWithDates(activities);
  if (!items.length) return [];
  const months = Number(options.months || 6);
  const metric = options.metric || 'distanceKm';
  const endDate = startOfMonth(getLatestDate(items));
  const startDate = addMonths(endDate, -(months - 1));
  const map = new Map();
  for (const activity of items) {
    const month = startOfMonth(activity.__date);
    if (month < startDate || month > endDate) continue;
    const key = month.toISOString();
    map.set(key, (map.get(key) || 0) + metricValue(activity, metric));
  }
  const data = [];
  for (let index = 0; index < months; index += 1) {
    const current = addMonths(startDate, index);
    const key = current.toISOString();
    const value = map.get(key) || 0;
    data.push({ period: formatMonthLabel(current), periodDate: key, value: Number(value.toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)) });
  }
  return data;
}

export function buildWeekdayDistribution(activities = [], options = {}) {
  const items = getActivitiesWithDates(activities);
  const metric = options.metric || 'count';
  const buckets = WEEKDAY_LABELS.map((label) => ({ label, value: 0 }));
  for (const activity of items) {
    const dayIndex = (activity.__date.getDay() + 6) % 7;
    buckets[dayIndex].value += metricValue(activity, metric);
  }
  return buckets.map((bucket) => ({ ...bucket, value: Number(bucket.value.toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)) }));
}

export function buildSportDistribution(activities = [], options = {}) {
  const { groupSports = true } = options;
  const map = new Map();
  for (const activity of activities) {
    const key = getDisplaySportLabel(activity, { groupSports });
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
}

export function buildRollingLoadSeries(activities = [], options = {}) {
  const items = getActivitiesWithDates(activities);
  if (!items.length) return [];
  const metric = options.metric || 'distanceKm';
  const latest = getLatestDate(items);
  const days = Number(options.days || 120);
  const start = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate() - (days - 1));
  const dailyMap = new Map();
  for (const item of items) {
    const key = new Date(item.__date.getFullYear(), item.__date.getMonth(), item.__date.getDate()).toISOString();
    dailyMap.set(key, (dailyMap.get(key) || 0) + metricValue(item, metric));
  }
  const data = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const currentKey = current.toISOString();
    const dayValue = dailyMap.get(currentKey) || 0;
    let load7 = 0;
    let load28 = 0;
    for (let j = 0; j < 28; j += 1) {
      const d = new Date(current.getFullYear(), current.getMonth(), current.getDate() - j).toISOString();
      const v = dailyMap.get(d) || 0;
      if (j < 7) load7 += v;
      load28 += v;
    }
    data.push({ label: current.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), dayValue: Number(dayValue.toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)), load7: Number(load7.toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)), load28: Number(load28.toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)) });
  }
  return data;
}

export function buildDistanceDistribution(activities = []) {
  const buckets = DISTANCE_BUCKETS.map((bucket) => ({ ...bucket, value: 0 }));
  for (const activity of activities) {
    const distance = normalizeDistanceKm(activity.distance);
    const bucket = buckets.find((item) => distance >= item.min && distance < item.max);
    if (bucket) bucket.value += 1;
  }
  return buckets.map(({ key, label, value }) => ({ key, label, value }));
}

export function filterActivities(activities = [], filters = {}, options = {}) {
  const normalizedSearch = getNormalizedText(filters.search);
  const groupSports = options.groupSports ?? true;
  return activities.filter((activity) => {
    const activityDate = toDate(activity.startDate || activity.startDateLocal);
    const displaySport = getDisplaySportLabel(activity, { groupSports });
    const rawSport = getNormalizedText(activity.sportType || activity.type);
    const haystack = `${activity.name || ''} ${activity.description || ''} ${displaySport} ${rawSport}`.toLowerCase();
    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesSport = filters.sportGroup === 'all' || displaySport === filters.sportGroup;
    let matchesDate = true;
    if (activityDate && filters.dateFrom) matchesDate = matchesDate && activityDate >= new Date(`${filters.dateFrom}T00:00:00`);
    if (activityDate && filters.dateTo) matchesDate = matchesDate && activityDate <= new Date(`${filters.dateTo}T23:59:59.999`);
    return matchesSearch && matchesSport && matchesDate;
  });
}

export function getAvailableSportGroups(activities = [], options = {}) {
  const { groupSports = true } = options;
  return Array.from(new Set(activities.map((activity) => getDisplaySportLabel(activity, { groupSports })).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'fr'));
}
