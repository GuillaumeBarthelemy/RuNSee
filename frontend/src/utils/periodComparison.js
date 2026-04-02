function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function atStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

function metricValue(activity, metric) {
  switch (metric) {
    case 'distanceKm':
      return Number(activity.distance || 0) / 1000;
    case 'elevationGain':
      return Number(activity.totalElevationGain || 0);
    case 'movingHours':
      return Number(activity.movingTime || 0) / 3600;
    case 'count':
      return 1;
    default:
      return Number(activity.distance || 0) / 1000;
  }
}

function normalizeActivities(activities) {
  return (activities || [])
    .map((activity) => ({ ...activity, __date: toDate(activity.startDate || activity.startDateLocal) }))
    .filter((activity) => activity.__date)
    .sort((a, b) => a.__date - b.__date);
}

function getLatestDate(activities) {
  const dates = activities.map((a) => a.__date).filter(Boolean);
  return dates.length ? dates[dates.length - 1] : new Date();
}

function getAvailableYears(activities) {
  const set = new Set(normalizeActivities(activities).map((a) => a.__date.getFullYear()));
  return Array.from(set).sort((a, b) => b - a);
}

function buildCumulativeSeries(items, start, end, metric) {
  const dayMap = new Map();
  items.forEach((item) => {
    const key = atStartOfDay(item.__date).toISOString();
    dayMap.set(key, (dayMap.get(key) || 0) + metricValue(item, metric));
  });
  const points = [];
  let cursor = atStartOfDay(start);
  let cumulative = 0;
  while (cursor <= end) {
    const key = cursor.toISOString();
    cumulative += dayMap.get(key) || 0;
    points.push({
      label: cursor.toLocaleDateString('fr-FR', { day: '2-digit', month: start.getFullYear() === end.getFullYear() ? 'short' : '2-digit' }),
      value: cumulative,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return points;
}

function buildRows(periods) {
  const referenceValue = periods[0]?.value || 0;
  const bestValue = Math.max(...periods.map((p) => p.value), 0);
  return periods.map((period, index) => {
    const previous = periods[index + 1] || null;
    const deltaPrevious = previous ? period.value - previous.value : null;
    const deltaReference = index === 0 ? null : period.value - referenceValue;
    return {
      ...period,
      deltaPrevious,
      deltaReference,
      deltaPercent: previous && previous.value ? (deltaPrevious / previous.value) * 100 : null,
      isReference: index === 0,
      isBest: period.value === bestValue,
    };
  });
}

export function getComparisonControlOptions(activities = []) {
  const latest = getLatestDate(normalizeActivities(activities));
  return { years: getAvailableYears(activities), latestDate: latest };
}

export function buildPeriodComparisonModel(activities = [], options = {}) {
  const items = normalizeActivities(activities);
  const mode = options.mode || 'yearToDate';
  const metric = options.metric || 'distanceKm';
  const periodsCount = Math.max(2, Math.min(4, Number(options.periods || 3)));
  const reference = options.reference || '';
  const colors = ['#0b5fff', '#12b76a', '#f97316', '#8b5cf6'];
  const rowsRaw = [];

  if (!items.length) {
    return { mode, metric, rows: [], chartData: [], insight: '', controlType: mode === 'fullYears' ? 'year' : mode === 'fullMonths' ? 'month' : 'date', referenceValue: reference || '' };
  }

  if (mode === 'yearToDate') {
    const latest = getLatestDate(items);
    const refDate = atStartOfDay(toDate(reference) || latest);
    const month = refDate.getMonth();
    const day = refDate.getDate();
    for (let i = 0; i < periodsCount; i += 1) {
      const year = refDate.getFullYear() - i;
      const start = new Date(year, 0, 1);
      const end = new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()), 23, 59, 59, 999);
      const periodItems = items.filter((a) => a.__date >= start && a.__date <= end);
      const series = buildCumulativeSeries(periodItems, start, atStartOfDay(end), metric);
      rowsRaw.push({
        key: `y-${year}`,
        label: String(year),
        description: `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
        value: Number((series[series.length - 1]?.value || 0).toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)),
        series,
        color: colors[i],
      });
    }
    const maxLen = Math.max(...rowsRaw.map((r) => r.series.length), 0);
    const chartData = Array.from({ length: maxLen }, (_, idx) => {
      const row = { label: rowsRaw[0]?.series[idx]?.label || `J${idx + 1}` };
      rowsRaw.forEach((period) => {
        row[period.key] = period.series[idx]?.value ?? null;
      });
      return row;
    });
    const rows = buildRows(rowsRaw);
    const insight = rows.length > 1
      ? `${rows[0].label} est ${rows[0].deltaPrevious >= 0 ? 'en avance' : 'en retrait'} de ${Math.abs(rows[0].deltaPrevious || 0).toLocaleString('fr-FR', { minimumFractionDigits: metric === 'count' || metric === 'elevationGain' ? 0 : 1, maximumFractionDigits: metric === 'count' || metric === 'elevationGain' ? 0 : 1 })} ${metric === 'distanceKm' ? 'km' : metric === 'movingHours' ? 'h' : metric === 'elevationGain' ? 'm' : ''} vs ${rows[1].label} à date.`
      : '';
    return { mode, metric, rows, chartData, insight, referenceValue: refDate.toISOString().slice(0, 10), controlType: 'date' };
  }

  if (mode === 'fullMonths') {
    const latest = getLatestDate(items);
    const [y, m] = (reference || latest.toISOString().slice(0, 7)).split('-');
    const ref = new Date(Number(y), Number(m) - 1, 1);
    for (let i = 0; i < periodsCount; i += 1) {
      const current = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const start = current;
      const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      const periodItems = items.filter((a) => a.__date >= start && a.__date <= end);
      rowsRaw.push({
        key: `m-${i}`,
        label: formatMonthLabel(current),
        description: 'Mois complet',
        value: Number(periodItems.reduce((sum, a) => sum + metricValue(a, metric), 0).toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)),
        color: colors[i],
      });
    }
    const rows = buildRows(rowsRaw);
    const chartData = rows.map((row) => ({ label: row.label, value: row.value, fill: row.color }));
    const insight = rows.length > 1 ? `${rows[0].label} ${rows[0].deltaPrevious >= 0 ? 'dépasse' : 'reste sous'} ${rows[1].label} de ${Math.abs(rows[0].deltaPrevious || 0).toLocaleString('fr-FR', { minimumFractionDigits: metric === 'count' || metric === 'elevationGain' ? 0 : 1, maximumFractionDigits: metric === 'count' || metric === 'elevationGain' ? 0 : 1 })}.` : '';
    return { mode, metric, rows, chartData, insight, referenceValue: `${y}-${m}`, controlType: 'month' };
  }

  const years = getAvailableYears(items);
  const refYear = Number(reference || years[0] || new Date().getFullYear());
  for (let i = 0; i < periodsCount; i += 1) {
    const year = refYear - i;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const periodItems = items.filter((a) => a.__date >= start && a.__date <= end);
    rowsRaw.push({
      key: `fy-${year}`,
      label: String(year),
      description: 'Année complète',
      value: Number(periodItems.reduce((sum, a) => sum + metricValue(a, metric), 0).toFixed(metric === 'count' || metric === 'elevationGain' ? 0 : 1)),
      color: colors[i],
    });
  }
  const rows = buildRows(rowsRaw);
  const chartData = rows.map((row) => ({ label: row.label, value: row.value, fill: row.color }));
  const insight = rows.length > 1 ? `${rows[0].label} ${rows[0].deltaPrevious >= 0 ? 'surperforme' : 'reste sous'} ${rows[1].label} de ${Math.abs(rows[0].deltaPrevious || 0).toLocaleString('fr-FR', { minimumFractionDigits: metric === 'count' || metric === 'elevationGain' ? 0 : 1, maximumFractionDigits: metric === 'count' || metric === 'elevationGain' ? 0 : 1 })}.` : '';
  return { mode, metric, rows, chartData, insight, referenceValue: String(refYear), controlType: 'year' };
}
