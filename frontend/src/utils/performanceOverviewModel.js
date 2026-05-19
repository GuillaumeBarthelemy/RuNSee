import {
  buildActivityItems,
  buildBestEfforts,
  buildBestEffortRecords,
  formatPace,
  isRunLikeActivity,
} from "./activityInsights.js";
import {
  buildConsolidatedIntensityDistributionModel,
  normalizeTrainingAnalyticsSettings,
} from "./trainingMetrics.js";
import {
  buildFooterTakeaway,
  classifyEndurance,
  decorateZone,
  shareZ1Z2,
  shareZ3Z5,
} from "./analyticsIntensities.js";
import { buildVdotProfile } from "./runningPerformance.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TREND_POINTS = 6;
const MIN_COMPARABLE_ECONOMY_RUNS = 3;
const MIN_COMPARABLE_PACE_RUNS = 2;

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  const date = safeDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(value) {
  const date = startOfDay(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value, days) {
  const date = startOfDay(value);
  if (!date) return null;
  return new Date(date.getTime() + (days * MS_PER_DAY));
}

function formatDate(value) {
  const date = safeDate(value);
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "");
}

function formatDurationCompact(seconds) {
  const safeSeconds = Math.max(0, Math.round(toFiniteNumber(seconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.round((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}`;
  }

  return `${minutes} min`;
}

function formatRaceDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(toFiniteNumber(seconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatPaceShort(secondsPerKm) {
  const formatted = formatPace(secondsPerKm);
  return formatted && formatted !== "-" ? formatted.replace("/km", "") : "-";
}

function formatPaceRange(range = {}) {
  const faster = toFiniteNumber(range.faster);
  const slower = toFiniteNumber(range.slower);

  if (faster > 0 && slower > 0) {
    return `${formatPaceShort(faster)} - ${formatPaceShort(slower)}`;
  }

  return "-";
}

function buildRangeLabel(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (!start || !end) return "";
  return `${start} - ${end}`;
}

function buildRange(range = {}, fallbackActivities = []) {
  const end = endOfDay(range.endDate || range.end || range.dateTo)
    || endOfDay(new Date());
  const start = startOfDay(range.startDate || range.start || range.dateFrom)
    || addDays(end, -89);

  if (start && end) {
    return {
      startDate: start,
      endDate: end,
      days: Math.max(1, Math.round((end - start) / MS_PER_DAY) + 1),
      label: buildRangeLabel(start, end),
    };
  }

  const dates = fallbackActivities
    .map((activity) => safeDate(activity?.startDateLocal || activity?.startDate))
    .filter(Boolean)
    .sort((left, right) => left - right);

  const fallbackEnd = endOfDay(dates.at(-1) || new Date());
  const fallbackStart = startOfDay(dates[0] || addDays(fallbackEnd, -89));

  return {
    startDate: fallbackStart,
    endDate: fallbackEnd,
    days: Math.max(1, Math.round((fallbackEnd - fallbackStart) / MS_PER_DAY) + 1),
    label: buildRangeLabel(fallbackStart, fallbackEnd),
  };
}

function previousRange(range) {
  const endDate = addDays(range.startDate, -1);
  const startDate = addDays(endDate, -(range.days - 1));
  return {
    startDate,
    endDate: endOfDay(endDate),
    days: range.days,
    label: buildRangeLabel(startDate, endDate),
  };
}

export function getCanonicalPerformanceActivities(activities = []) {
  return (Array.isArray(activities) ? activities : []).filter((activity) => activity?.isMerged !== true);
}

function filterItemsByRange(items = [], range = {}) {
  const start = startOfDay(range.startDate);
  const end = endOfDay(range.endDate);

  return items.filter((item) => {
    const date = item?.__date || safeDate(item?.startDateLocal || item?.startDate);
    if (!date) return false;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}

function buildBuckets(range, count = DEFAULT_TREND_POINTS) {
  const bucketCount = Math.max(2, count);
  const duration = range.endDate - range.startDate;
  const bucketDuration = Math.max(MS_PER_DAY, Math.ceil(duration / bucketCount));

  return Array.from({ length: bucketCount }, (_, index) => {
    const startDate = new Date(range.startDate.getTime() + (index * bucketDuration));
    const rawEnd = new Date(startDate.getTime() + bucketDuration - 1);
    const endDate = index === bucketCount - 1 || rawEnd > range.endDate
      ? range.endDate
      : rawEnd;

    return {
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
      label: formatDate(endDate),
    };
  });
}

function buildTrendSeries(items, range, aggregate, options = {}) {
  return buildBuckets(range, options.points || DEFAULT_TREND_POINTS)
    .map((bucket) => {
      const value = aggregate(filterItemsByRange(items, bucket));
      return {
        label: bucket.label,
        value: Number.isFinite(value) ? Math.round(value * 10) / 10 : null,
      };
    })
    .filter((point) => Number.isFinite(point.value));
}

function buildMetricDelta({ current = null, previous = null, lowerIsBetter = false, unit = "" }) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return {
      value: null,
      percent: null,
      label: "",
      direction: "neutral",
    };
  }

  const rawDelta = current - previous;
  const percent = (rawDelta / previous) * 100;
  const performancePercent = lowerIsBetter ? -percent : percent;
  const direction = performancePercent > 1 ? "positive" : performancePercent < -1 ? "negative" : "neutral";
  const absolute = lowerIsBetter ? -rawDelta : rawDelta;
  const sign = absolute > 0 ? "+" : absolute < 0 ? "-" : "";
  const formattedAbsolute = unit === "pace"
    ? formatPace(Math.abs(rawDelta)).replace("/km", "")
    : `${Math.abs(Math.round(rawDelta * 10) / 10)}${unit ? ` ${unit}` : ""}`;

  return {
    value: Math.round(absolute * 10) / 10,
    percent: Math.round(performancePercent * 10) / 10,
    label: `${sign}${formattedAbsolute}`,
    direction,
  };
}

function getAdjustedPaceSeconds(item = {}) {
  const adjusted = toFiniteNumber(item.__gradeAdjustedPaceSecondsPerKm);
  if (adjusted > 0) return adjusted;
  return toFiniteNumber(item.__paceSecondsPerKm);
}

function isTrailLike(activity = {}) {
  const sport = String(activity?.sportType || activity?.type || "").toLowerCase();
  const text = `${activity?.name || ""} ${activity?.description || ""}`.toLowerCase();
  return sport.includes("trail") || text.includes("trail");
}

function aggregateAdjustedPace(items = []) {
  let weightedSeconds = 0;
  let distanceKm = 0;
  let count = 0;

  items.forEach((item) => {
    if (!isRunLikeActivity(item)) return;
    const pace = getAdjustedPaceSeconds(item);
    const distance = toFiniteNumber(item.__distanceKm);
    const moving = toFiniteNumber(item.__movingSeconds);
    if (pace < 120 || pace > 900 || distance < 2 || moving < 600) return;
    weightedSeconds += pace * distance;
    distanceKm += distance;
    count += 1;
  });

  if (distanceKm <= 0 || count <= 0) {
    return null;
  }

  return {
    value: weightedSeconds / distanceKm,
    activityCount: count,
    distanceKm,
  };
}

function aggregateEconomy(items = [], settings = {}) {
  const normalizedSettings = normalizeTrainingAnalyticsSettings(settings);
  let weightedSpeed = 0;
  let weightedHr = 0;
  let durationSeconds = 0;
  let count = 0;

  items.forEach((item) => {
    if (!isRunLikeActivity(item)) return;
    if (normalizedSettings.efficiencyExcludeTrail && isTrailLike(item)) return;

    const moving = toFiniteNumber(item.__movingSeconds);
    const distance = toFiniteNumber(item.__distanceKm);
    const heartRate = toFiniteNumber(item.averageHeartrate);
    const pace = getAdjustedPaceSeconds(item);
    const elevationPerKm = distance > 0 ? toFiniteNumber(item.__elevationGain) / distance : 0;

    if (moving < normalizedSettings.efficiencyMinDurationMinutes * 60) return;
    if (distance < 3 || pace < 120 || pace > 900) return;
    if (heartRate < 100 || heartRate > 210) return;
    if (elevationPerKm > normalizedSettings.efficiencyMaxElevationPerKm) return;

    const adjustedSpeedKmh = 3600 / pace;
    if (adjustedSpeedKmh < 6 || adjustedSpeedKmh > 22) return;

    weightedSpeed += adjustedSpeedKmh * moving;
    weightedHr += heartRate * moving;
    durationSeconds += moving;
    count += 1;
  });

  if (count < MIN_COMPARABLE_ECONOMY_RUNS || durationSeconds <= 0) {
    return null;
  }

  const averageSpeedKmh = weightedSpeed / durationSeconds;
  const averageHeartrate = weightedHr / durationSeconds;
  const value = averageSpeedKmh / averageHeartrate * 100;

  return {
    value,
    averageSpeedKmh,
    averageHeartrate,
    activityCount: count,
  };
}

function buildAdjustedPaceSignal({ periodItems, previousItems, range }) {
  const current = aggregateAdjustedPace(periodItems);
  const previous = aggregateAdjustedPace(previousItems);

  if (!current) {
    return {
      key: "adjustedPace",
      label: "Allure ajustée",
      hasData: false,
      emptyReason: "Données insuffisantes pour estimer l'allure ajustée.",
    };
  }

  const delta = buildMetricDelta({
    current: current.value,
    previous: previous?.value ?? null,
    lowerIsBetter: true,
    unit: "pace",
  });
  const series = buildTrendSeries(
    periodItems,
    range,
    (items) => aggregateAdjustedPace(items)?.value ?? null,
  );
  const improvement = delta.percent;
  const hint = improvement == null
    ? "Repère actuel"
    : improvement >= 2
      ? "Plus rapide"
      : improvement <= -2
        ? "En retrait"
        : "Stable";

  return {
    key: "adjustedPace",
    label: "Allure ajustée",
    value: current.value,
    formattedValue: formatPace(current.value),
    unit: "",
    hint,
    tone: delta.direction === "positive" ? "positive" : delta.direction === "negative" ? "warning" : "neutral",
    trendLabel: delta.label ? `${delta.label} vs période préc.` : "",
    trendDirection: delta.direction,
    hasData: true,
    activityCount: current.activityCount,
    series,
    info: [
      { label: "Calcul", text: "Moyenne pondérée de l'allure corrigée du dénivelé sur les sorties exploitables." },
      { label: "Lecture", text: "Plus la valeur est basse, plus ton allure équivalente terrain plat est rapide." },
    ],
  };
}

function buildEconomySignal({ periodItems, previousItems, range, settings }) {
  const current = aggregateEconomy(periodItems, settings);
  const previous = aggregateEconomy(previousItems, settings);

  if (!current) {
    return {
      key: "economy",
      label: "Économie de course",
      hasData: false,
      emptyReason: "Données insuffisantes pour comparer allure et fréquence cardiaque.",
    };
  }

  const delta = buildMetricDelta({
    current: current.value,
    previous: previous?.value ?? null,
    lowerIsBetter: false,
  });
  const series = buildTrendSeries(
    periodItems,
    range,
    (items) => aggregateEconomy(items, settings)?.value ?? null,
  );
  const hint = delta.percent == null
    ? "Sorties comparables"
    : delta.percent >= 2
      ? "Plus efficiente"
      : delta.percent <= -2
        ? "Moins efficiente"
        : "Stable";

  return {
    key: "economy",
    label: "Économie de course",
    value: current.value,
    formattedValue: current.value.toFixed(2),
    unit: "indice",
    hint,
    tone: delta.direction === "positive" ? "positive" : delta.direction === "negative" ? "warning" : "neutral",
    trendLabel: delta.percent != null ? `${delta.percent > 0 ? "+" : ""}${delta.percent} % vs période préc.` : "",
    trendDirection: delta.direction,
    hasData: true,
    activityCount: current.activityCount,
    series,
    info: [
      { label: "Calcul", text: "Vitesse ajustée divisée par la fréquence cardiaque moyenne, sur sorties comparables." },
      { label: "Garde-fous", text: "Les sorties trop courtes, trop vallonnées, sans cardio fiable ou trail non comparable sont exclues." },
    ],
  };
}

function buildVdotTrend(scopeItems, range, settings) {
  const trendRange = {
    startDate: addDays(range.endDate, -89),
    endDate: range.endDate,
  };

  return buildBuckets(trendRange, DEFAULT_TREND_POINTS)
    .map((bucket) => {
      const activitiesUntilBucket = scopeItems.filter((item) => item.__date && item.__date <= bucket.endDate);
      const records = buildBestEffortRecords(activitiesUntilBucket);
      const profile = buildVdotProfile({ records, referenceDate: bucket.endDate, settings });
      return {
        label: bucket.label,
        value: profile?.hasData ? profile.vdot : null,
      };
    })
    .filter((point) => Number.isFinite(point.value));
}

function buildVdotSignal({ scopeItems, vdotProfile, range, settings }) {
  if (!vdotProfile?.hasData || !Number.isFinite(Number(vdotProfile.vdot)) || Number(vdotProfile.vdot) <= 0) {
    return {
      key: "vdot",
      label: "VDOT estimé",
      hasData: false,
      emptyReason: "Données insuffisantes pour estimer le VDOT.",
    };
  }

  const series = buildVdotTrend(scopeItems, range, settings);
  const previousValue = series.length >= 2 ? series.at(-2).value : null;
  const delta = buildMetricDelta({
    current: Number(vdotProfile.vdot),
    previous: previousValue,
    lowerIsBetter: false,
  });
  const levelLabel = vdotProfile.level?.label || "Profil estimé";

  return {
    key: "vdot",
    label: "VDOT estimé",
    value: Number(vdotProfile.vdot),
    formattedValue: Number(vdotProfile.vdot).toFixed(1),
    unit: "",
    hint: levelLabel,
    tone: delta.direction === "positive" ? "positive" : delta.direction === "negative" ? "warning" : "neutral",
    trendLabel: delta.value != null ? `${delta.value > 0 ? "+" : ""}${delta.value} vs point préc.` : "",
    trendDirection: delta.direction,
    hasData: true,
    activityCount: vdotProfile.usedSampleSize || vdotProfile.sampleSize || 0,
    series,
    info: [
      { label: "Calcul", text: "Estimation Daniels consolidée à partir de tes records route exploitables." },
      { label: "Lecture", text: "C'est un repère de niveau, pas une mesure de laboratoire ni une prédiction certaine." },
    ],
  };
}

function buildEnduranceSignal({ periodActivities, previousActivities, range, settings }) {
  const currentModel = buildConsolidatedIntensityDistributionModel(periodActivities, {
    startDate: range.startDate,
    endDate: range.endDate,
    settings,
  });
  const prev = previousRange(range);
  const previousModel = buildConsolidatedIntensityDistributionModel(previousActivities, {
    startDate: prev.startDate,
    endDate: prev.endDate,
    settings,
  });
  const currentShare = shareZ1Z2(currentModel);

  if (!currentModel?.hasData || currentShare <= 0) {
    return {
      key: "endurance",
      label: "Endurance fondamentale",
      hasData: false,
      emptyReason: "Données insuffisantes pour lire la part facile.",
      intensityModel: currentModel,
    };
  }

  const previousShare = shareZ1Z2(previousModel);
  const delta = buildMetricDelta({
    current: currentShare,
    previous: previousShare > 0 ? previousShare : null,
    lowerIsBetter: false,
    unit: "%",
  });
  const classification = classifyEndurance(currentShare);
  const series = buildTrendSeries(
    buildActivityItems(periodActivities, { settings }),
    range,
    (items) => {
      const model = buildConsolidatedIntensityDistributionModel(items, {
        settings,
      });
      return model?.hasData ? shareZ1Z2(model) : null;
    },
  );

  return {
    key: "endurance",
    label: "Endurance fondamentale",
    value: currentShare,
    formattedValue: `${Math.round(currentShare)} %`,
    unit: "",
    hint: classification.tag,
    tone: classification.tone === 4 ? "warning" : "positive",
    trendLabel: delta.value != null ? `${delta.value > 0 ? "+" : ""}${delta.value} pts vs période préc.` : "",
    trendDirection: delta.direction,
    hasData: true,
    activityCount: currentModel.activityCount || 0,
    series,
    intensityModel: currentModel,
    info: [
      { label: "Calcul", text: "Part de temps en zones faciles Z1-Z2 sur la période filtrée." },
      { label: "Lecture", text: "Une part élevée soutient la base aérobie sans refaire le détail complet des intensités." },
    ],
  };
}

function buildHeartRateZonePreview(intensityModel = {}) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];

  if (!intensityModel?.hasData || !zones.length) {
    return {
      hasData: false,
      title: "Zones de fréquence cardiaque",
      emptyReason: "Données insuffisantes pour afficher un aperçu cardiaque.",
      zones: [],
    };
  }

  const decoratedZones = zones.map((zone) => ({
    ...zone,
    ...decorateZone(zone),
    share: toFiniteNumber(zone.durationShare),
    durationSeconds: toFiniteNumber(zone.durationSeconds),
    durationLabel: formatDurationCompact(zone.durationSeconds),
    label: zone.label || zone.key?.toUpperCase() || "",
  }));
  const totalDurationSeconds = decoratedZones.reduce((sum, zone) => sum + toFiniteNumber(zone.durationSeconds), 0);
  const easyShare = shareZ1Z2(intensityModel);
  const harderShare = shareZ3Z5(intensityModel);

  return {
    hasData: true,
    title: "Zones de fréquence cardiaque",
    sourceLabel: intensityModel.sourceLabel || "Zones FC",
    totalDurationSeconds,
    totalDurationLabel: formatDurationCompact(totalDurationSeconds),
    easyShare,
    harderShare,
    summary: buildFooterTakeaway(intensityModel),
    zones: decoratedZones,
  };
}

function findRoadPace(profile = {}, key) {
  return Array.isArray(profile?.roadPaces)
    ? profile.roadPaces.find((pace) => pace.key === key)
    : null;
}

function getPaceBucket(item, vdotProfile) {
  const pace = getAdjustedPaceSeconds(item);
  if (pace <= 0) return null;

  const ef = findRoadPace(vdotProfile, "EF")?.paceRangeSecondsPerKm;
  const s1 = findRoadPace(vdotProfile, "S1")?.paceRangeSecondsPerKm;
  const s2 = findRoadPace(vdotProfile, "S2")?.paceRangeSecondsPerKm;

  if (!ef || !s1 || !s2) {
    return null;
  }

  if (pace >= ef.slower) return "veryEasy";
  if (pace >= ef.faster) return "easy";
  if (pace >= s1.faster) return "moderate";
  if (pace >= s2.faster) return "sustained";
  return "rapid";
}

function buildPaceDistribution(periodItems, vdotProfile) {
  const ef = findRoadPace(vdotProfile, "EF")?.paceRangeSecondsPerKm;
  const s1 = findRoadPace(vdotProfile, "S1")?.paceRangeSecondsPerKm;
  const s2 = findRoadPace(vdotProfile, "S2")?.paceRangeSecondsPerKm;

  const bucketDefinitions = [
    {
      key: "veryEasy",
      label: "Très facile",
      tone: "easy",
      rangeLabel: ef?.slower ? `> ${formatPaceShort(ef.slower)}/km` : "-",
    },
    {
      key: "easy",
      label: "Facile",
      tone: "positive",
      rangeLabel: ef ? `${formatPaceRange(ef)}/km` : "-",
    },
    {
      key: "moderate",
      label: "Modérée",
      tone: "neutral",
      rangeLabel: s1 ? `${formatPaceRange(s1)}/km` : "-",
    },
    {
      key: "sustained",
      label: "Soutenue",
      tone: "warning",
      rangeLabel: s2 ? `${formatPaceRange(s2)}/km` : "-",
    },
    {
      key: "rapid",
      label: "Rapide",
      tone: "danger",
      rangeLabel: s2?.faster ? `< ${formatPaceShort(s2.faster)}/km` : "-",
    },
  ];
  const buckets = new Map(bucketDefinitions.map((bucket) => [bucket.key, { ...bucket, seconds: 0, count: 0 }]));
  let totalSeconds = 0;

  periodItems.forEach((item) => {
    if (!isRunLikeActivity(item)) return;
    const moving = toFiniteNumber(item.__movingSeconds);
    if (moving <= 0) return;
    const bucketKey = getPaceBucket(item, vdotProfile);
    if (!bucketKey || !buckets.has(bucketKey)) return;
    const bucket = buckets.get(bucketKey);
    bucket.seconds += moving;
    bucket.count += 1;
    totalSeconds += moving;
  });

  if (!vdotProfile?.hasData || totalSeconds <= 0) {
    return {
      hasData: false,
      title: "Distribution des allures",
      emptyReason: "Données insuffisantes pour relier tes allures au profil estimé.",
      buckets: [],
    };
  }

  const activeBucketCount = Array.from(buckets.values()).filter((bucket) => bucket.seconds > 0).length;
  const formattedBuckets = bucketDefinitions
    .map((definition) => buckets.get(definition.key))
    .map((bucket) => ({
      ...bucket,
      share: Math.round((bucket.seconds / totalSeconds) * 100),
      minutes: Math.round(bucket.seconds / 60),
      durationLabel: formatDurationCompact(bucket.seconds),
    }));

  if (activeBucketCount < 1 || periodItems.length < MIN_COMPARABLE_PACE_RUNS) {
    return {
      hasData: false,
      title: "Distribution des allures",
      emptyReason: "Données insuffisantes pour relier tes allures au profil estimé.",
      buckets: [],
    };
  }

  return {
    hasData: true,
    title: "Distribution des allures",
    buckets: formattedBuckets,
    totalDurationSeconds: totalSeconds,
    totalDurationLabel: formatDurationCompact(totalSeconds),
    summary: `Lecture basée sur ${formattedBuckets.reduce((sum, bucket) => sum + bucket.count, 0)} sortie(s) comparables.`,
  };
}

function buildBestPerformancePreview(bestEfforts = {}) {
  const rows = [];
  const records = Array.isArray(bestEfforts.records)
    ? bestEfforts.records.filter((record) => record?.isAvailable)
    : [];

  records.forEach((record) => {
    rows.push({
      key: `record-${record.recordKey}`,
      iconKey: "record",
      label: record.recordLabel,
      title: record.activity?.name || record.name || "Record route",
      value: formatRaceDuration(record.elapsedSeconds),
      meta: record.dateLabel || "",
    });
  });

  const fastest = Array.isArray(bestEfforts.fastest) ? bestEfforts.fastest[0] : null;
  const longest = Array.isArray(bestEfforts.longest) ? bestEfforts.longest[0] : null;
  const climbing = Array.isArray(bestEfforts.climbing) ? bestEfforts.climbing[0] : null;

  if (fastest) {
    rows.push({
      key: "fastest",
      iconKey: "speed",
      label: "Allure récente",
      title: fastest.activity?.name || fastest.name || "Sortie rapide",
      value: formatPace(fastest.value),
      meta: fastest.dateLabel || "",
    });
  }

  if (longest) {
    rows.push({
      key: "longest",
      iconKey: "distance",
      label: "Sortie longue",
      title: longest.activity?.name || longest.name || "Sortie longue",
      value: `${toFiniteNumber(longest.value).toFixed(1)} km`,
      meta: longest.dateLabel || "",
    });
  }

  if (climbing) {
    rows.push({
      key: "climbing",
      iconKey: "climb",
      label: "Dénivelé",
      title: climbing.activity?.name || climbing.name || "Sortie vallonnée",
      value: `${Math.round(toFiniteNumber(climbing.value))} m`,
      meta: climbing.dateLabel || "",
    });
  }

  return {
    hasData: rows.length > 0,
    title: "Meilleures performances",
    rows: rows.slice(0, 4),
    emptyReason: "Aucune performance exploitable sur le périmètre actif.",
  };
}

function buildPerformanceTrendSummary(signals = []) {
  const usableSignals = signals.filter((signal) => signal?.hasData);
  const positiveCount = usableSignals.filter((signal) => signal.trendDirection === "positive").length;
  const negativeCount = usableSignals.filter((signal) => signal.trendDirection === "negative").length;
  const primarySignal = usableSignals.find((signal) => signal.key === "vdot")
    || usableSignals.find((signal) => Array.isArray(signal.series) && signal.series.length >= 2)
    || usableSignals[0]
    || null;

  let tone = "neutral";
  let title = "Tendance stable";
  let text = "Les signaux disponibles ne montrent pas de variation nette.";

  if (positiveCount >= 2 && positiveCount > negativeCount) {
    tone = "positive";
    title = "Niveau en progression";
    text = "Plusieurs signaux de performance évoluent dans le bon sens.";
  } else if (negativeCount >= 2 && negativeCount > positiveCount) {
    tone = "warning";
    title = "Signaux en retrait";
    text = "Plusieurs repères reculent sur la période. À lire avec la fatigue et le contexte.";
  } else if (usableSignals.length < 2) {
    title = "Tendance limitée";
    text = "Il manque encore des signaux comparables pour conclure.";
  }

  return {
    hasData: usableSignals.length > 0,
    tone,
    title,
    text,
    primaryLabel: primarySignal?.label || "",
    primaryValue: primarySignal?.formattedValue || "",
    series: Array.isArray(primarySignal?.series) ? primarySignal.series : [],
    rows: usableSignals.map((signal) => ({
      key: signal.key,
      label: signal.label,
      direction: signal.trendDirection,
      value: signal.trendLabel || "stable",
    })),
  };
}

function buildTakeaway({ signals, confidence, zonePreview, paceDistribution }) {
  const availableSignals = signals.filter((signal) => signal.hasData);
  const missingSignals = signals.filter((signal) => !signal.hasData);
  const topPositive = availableSignals.find((signal) => signal.trendDirection === "positive");
  const topWarning = availableSignals.find((signal) => signal.trendDirection === "negative");

  let title = "Lecture prudente";
  let text = "Les signaux sont exploitables, mais l'estimation reste à lire avec le contexte terrain.";
  let tone = "neutral";

  if (availableSignals.length === 0) {
    title = "Données insuffisantes";
    text = "Ajoute quelques sorties récentes avec allure et fréquence cardiaque pour fiabiliser cette vue.";
    tone = "warning";
  } else if (topPositive && !topWarning) {
    title = "Signaux favorables";
    text = `${topPositive.label} progresse, avec une confiance ${confidence?.label || "à consolider"}.`;
    tone = "positive";
  } else if (topWarning) {
    title = "À surveiller";
    text = `${topWarning.label} recule. Vérifie si cela vient du terrain, de la fatigue ou d'une semaine plus légère.`;
    tone = "warning";
  } else if (zonePreview?.hasData && zonePreview.easyShare >= 70 && paceDistribution?.hasData) {
    title = "Base cohérente";
    text = "La base facile reste lisible et les allures sont suffisamment réparties pour suivre ton niveau.";
    tone = "positive";
  }

  return {
    title,
    text,
    tone,
    missingSignals: missingSignals.map((signal) => signal.label),
    confidenceLabel: confidence?.label || "Confiance à consolider",
  };
}

export function buildPerformanceOverviewModel({
  periodActivities = [],
  scopeActivities = [],
  range = {},
  settings = {},
  bestEfforts = null,
  vdotProfile = null,
  confidence = null,
} = {}) {
  const canonicalPeriodActivities = getCanonicalPerformanceActivities(periodActivities);
  const canonicalScopeActivities = getCanonicalPerformanceActivities(scopeActivities);
  const resolvedRange = buildRange(range, canonicalPeriodActivities);
  const prevRange = previousRange(resolvedRange);
  const periodItems = buildActivityItems(canonicalPeriodActivities, { settings });
  const scopeItems = buildActivityItems(canonicalScopeActivities, { settings });
  const previousItems = filterItemsByRange(scopeItems, prevRange);
  const previousActivities = previousItems.map((item) => item);
  const resolvedBestEfforts = bestEfforts || buildBestEfforts(canonicalScopeActivities, 3);
  const resolvedVdotProfile = vdotProfile || buildVdotProfile({
    records: resolvedBestEfforts.records,
    referenceDate: resolvedRange.endDate,
  });

  const adjustedPaceSignal = buildAdjustedPaceSignal({
    periodItems,
    previousItems,
    range: resolvedRange,
  });
  const vdotSignal = buildVdotSignal({
    scopeItems,
    vdotProfile: resolvedVdotProfile,
    range: resolvedRange,
    settings,
  });
  const economySignal = buildEconomySignal({
    periodItems,
    previousItems,
    range: resolvedRange,
    settings,
  });
  const enduranceSignal = buildEnduranceSignal({
    periodActivities: canonicalPeriodActivities,
    previousActivities,
    range: resolvedRange,
    settings,
  });
  const zonePreview = buildHeartRateZonePreview(enduranceSignal.intensityModel);
  const paceDistribution = buildPaceDistribution(periodItems, resolvedVdotProfile);
  const bestPerformancePreview = buildBestPerformancePreview(resolvedBestEfforts);
  const signals = [adjustedPaceSignal, vdotSignal, economySignal, enduranceSignal];
  const trendSummary = buildPerformanceTrendSummary(signals);
  const takeaway = buildTakeaway({
    signals,
    confidence,
    zonePreview,
    paceDistribution,
  });

  return {
    range: resolvedRange,
    previousRange: prevRange,
    canonicalCounts: {
      period: canonicalPeriodActivities.length,
      scope: canonicalScopeActivities.length,
      excludedMergedPeriod: Math.max(0, (Array.isArray(periodActivities) ? periodActivities.length : 0) - canonicalPeriodActivities.length),
      excludedMergedScope: Math.max(0, (Array.isArray(scopeActivities) ? scopeActivities.length : 0) - canonicalScopeActivities.length),
    },
    metrics: signals,
    zonePreview,
    paceDistribution,
    bestPerformancePreview,
    trendSummary,
    takeaway,
    confidence,
    vdotProfile: resolvedVdotProfile,
  };
}
