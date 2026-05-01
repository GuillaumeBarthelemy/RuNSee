function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundValue(value, decimals = 1) {
  return Number(toNumber(value).toFixed(decimals));
}

function emptyWeek() {
  return {
    distanceKm: 0,
    count: 0,
    movingHours: 0,
    elevationGain: 0,
  };
}

function normalizeWeek(week = {}) {
  return {
    distanceKm: roundValue(week.distanceKm, 1),
    count: Math.round(toNumber(week.count)),
    movingHours: roundValue(week.movingHours, 1),
    elevationGain: Math.round(toNumber(week.elevationGain)),
  };
}

function percentDelta(current, previous) {
  const safePrevious = toNumber(previous);

  if (safePrevious <= 0) {
    return null;
  }

  return roundValue(((toNumber(current) - safePrevious) / safePrevious) * 100, 0);
}

function getVolumeTone(deltaPercent) {
  if (!Number.isFinite(Number(deltaPercent))) {
    return "neutral";
  }

  if (deltaPercent > 20 || deltaPercent < -20) {
    return "warning";
  }

  if (deltaPercent >= 0 && deltaPercent <= 10) {
    return "positive";
  }

  return "neutral";
}

function getSessionTone(deltaCount) {
  if (deltaCount > 0) {
    return "positive";
  }

  if (deltaCount < 0) {
    return "warning";
  }

  return "neutral";
}

export function buildTodayVolumeSummary(weeklySummary = {}) {
  const weeklySeries = Array.isArray(weeklySummary?.weeklySeries)
    ? weeklySummary.weeklySeries
    : [];
  const current = normalizeWeek(weeklySeries[weeklySeries.length - 1] || emptyWeek());
  const previous = normalizeWeek(weeklySeries[weeklySeries.length - 2] || emptyWeek());
  const sessionDelta = current.count - previous.count;
  const deltas = {
    distanceKm: percentDelta(current.distanceKm, previous.distanceKm),
    count: sessionDelta,
    movingHours: percentDelta(current.movingHours, previous.movingHours),
    elevationGain: percentDelta(current.elevationGain, previous.elevationGain),
  };

  return {
    current,
    previous,
    deltas,
    tones: {
      distanceKm: getVolumeTone(deltas.distanceKm),
      count: getSessionTone(sessionDelta),
      movingHours: getVolumeTone(deltas.movingHours),
      elevationGain: getVolumeTone(deltas.elevationGain),
    },
    hasData: weeklySeries.length >= 2,
  };
}
