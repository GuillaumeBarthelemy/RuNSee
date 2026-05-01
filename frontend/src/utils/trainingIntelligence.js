import { estimateLoadValue, RUN_SPORT_GROUP_LABEL } from "./activityAggregations.js";
import {
  buildActivityItems,
  buildReferencePace,
  buildTrainingLoadSummary,
  formatPace,
  getReferenceMaxHeartrate,
  isRunLikeActivity,
} from "./activityInsights.js";
import { resolveHeartRateZoneConfig } from "./heartRatePreferences.js";

const RUN_SCOPE_LABEL = RUN_SPORT_GROUP_LABEL;
const MORTON_ZONE_WEIGHTS = [1, 2, 3, 4, 5];

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function roundValue(value, decimals = 1) {
  return Number(toNumber(value).toFixed(decimals));
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function parseJsonSafe(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLatestDate(items = []) {
  return items.length ? items[items.length - 1].__date : null;
}

function getItemsWithinRange(items = [], startDate, endDate) {
  const start = startDate ? startOfDay(startDate) : null;
  const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999) : null;

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

function resolveRunItems(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);
  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const lookbackDays = Math.max(1, Number(options.lookbackDays || 0));
  const startDate = options.startDate
    ? startOfDay(toDate(options.startDate))
    : lookbackDays
      ? addDays(endDate, -(lookbackDays - 1))
      : null;

  return getItemsWithinRange(items, startDate, endDate)
    .filter((activity) => isRunLikeActivity(activity) && activity.__movingSeconds > 0 && activity.__distanceKm > 0);
}

function getZoneWeight(zoneIndex = 0) {
  return MORTON_ZONE_WEIGHTS[Math.max(0, Math.min(MORTON_ZONE_WEIGHTS.length - 1, zoneIndex))] || 1;
}

function normalizeSegment(segment = {}, source = "activity") {
  const distanceKm = Math.max(0, toNumber(segment?.distance ?? segment?.distanceKm) / (segment?.distanceKm ? 1 : 1000));
  const durationSeconds = Math.max(
    0,
    toNumber(
      segment?.moving_time ??
      segment?.movingTime ??
      segment?.elapsed_time ??
      segment?.elapsedTime ??
      segment?.durationSeconds,
    ),
  );
  const speedFromDistance = durationSeconds > 0 && distanceKm > 0
    ? (distanceKm / durationSeconds) * 3600
    : 0;
  const speedKmh = speedFromDistance || (toNumber(segment?.average_speed ?? segment?.averageSpeed) * 3.6);
  const paceSecondsPerKm = distanceKm > 0
    ? durationSeconds / distanceKm
    : speedKmh > 0
      ? 3600 / speedKmh
      : 0;

  return {
    source,
    durationSeconds,
    distanceKm,
    heartRate: toNumber(segment?.average_heartrate ?? segment?.averageHeartrate ?? segment?.heartRate),
    speedKmh: roundValue(speedKmh, 2),
    paceSecondsPerKm: roundValue(paceSecondsPerKm, 1),
  };
}

function getDetailedSegmentCandidates(activity = {}) {
  const payload = parseJsonSafe(activity.rawJson) || parseJsonSafe(activity.summaryJson) || {};

  return [
    {
      source: "lap",
      segments: Array.isArray(payload?.laps) ? payload.laps.map((segment) => normalizeSegment(segment, "lap")) : [],
    },
    {
      source: "split",
      segments: Array.isArray(payload?.splits_metric)
        ? payload.splits_metric.map((segment) => normalizeSegment(segment, "split"))
        : [],
    },
  ];
}

function scoreSegments(segments = [], mode = "heartRate") {
  const validSegments = segments.filter((segment) => {
    if (segment.durationSeconds <= 0) {
      return false;
    }

    if (mode === "speed") {
      return segment.paceSecondsPerKm > 0;
    }

    return segment.heartRate > 0;
  });

  return {
    validCount: validSegments.length,
    totalDurationSeconds: validSegments.reduce((sum, segment) => sum + segment.durationSeconds, 0),
    validSegments,
  };
}

function resolveSegmentsForMode(activity = {}, mode = "heartRate") {
  const candidates = getDetailedSegmentCandidates(activity)
    .map((candidate, index) => {
      const score = scoreSegments(candidate.segments, mode);

      return {
        source: candidate.source,
        sourceRank: index,
        validCount: score.validCount,
        totalDurationSeconds: score.totalDurationSeconds,
        segments: score.validSegments,
      };
    })
    .filter((candidate) => candidate.validCount > 0);

  if (candidates.length) {
    candidates.sort((left, right) => {
      if (right.validCount !== left.validCount) {
        return right.validCount - left.validCount;
      }

      if (right.totalDurationSeconds !== left.totalDurationSeconds) {
        return right.totalDurationSeconds - left.totalDurationSeconds;
      }

      return left.sourceRank - right.sourceRank;
    });

    return {
      source: candidates[0].source,
      segments: candidates[0].segments,
    };
  }

  const fallbackSegment = normalizeSegment({
    durationSeconds: activity.__movingSeconds,
    distanceKm: activity.__distanceKm,
    heartRate: activity.averageHeartrate,
    averageSpeed: activity.averageSpeed,
  }, "activity");

  const hasFallbackMetric = mode === "speed"
    ? fallbackSegment.paceSecondsPerKm > 0
    : fallbackSegment.heartRate > 0;

  return hasFallbackMetric
    ? { source: "activity", segments: [fallbackSegment] }
    : { source: "", segments: [] };
}

function classifyHeartRateZone(heartRate, zones = []) {
  const index = zones.findIndex((zone) => heartRate <= toNumber(zone?.maxHeartrate));
  return index >= 0 ? index : Math.max(0, zones.length - 1);
}

function buildEmptyHeartRateZones() {
  return [
    { key: "z1", shortLabel: "Z1", label: "Z1 recuperation", rangeLabel: "", load: 0, durationSeconds: 0 },
    { key: "z2", shortLabel: "Z2", label: "Z2 endurance", rangeLabel: "", load: 0, durationSeconds: 0 },
    { key: "z3", shortLabel: "Z3", label: "Z3 active", rangeLabel: "", load: 0, durationSeconds: 0 },
    { key: "z4", shortLabel: "Z4", label: "Z4 seuil", rangeLabel: "", load: 0, durationSeconds: 0 },
    { key: "z5", shortLabel: "Z5", label: "Z5 intensif", rangeLabel: "", load: 0, durationSeconds: 0 },
  ];
}

function buildSpeedZones(referencePaceSecondsPerKm = 0) {
  if (referencePaceSecondsPerKm <= 0) {
    return [
      { key: "z1", shortLabel: "Z1", label: "Z1 facile", rangeLabel: "", load: 0, durationSeconds: 0 },
      { key: "z2", shortLabel: "Z2", label: "Z2 endurance", rangeLabel: "", load: 0, durationSeconds: 0 },
      { key: "z3", shortLabel: "Z3", label: "Z3 rythme", rangeLabel: "", load: 0, durationSeconds: 0 },
      { key: "z4", shortLabel: "Z4", label: "Z4 seuil", rangeLabel: "", load: 0, durationSeconds: 0 },
      { key: "z5", shortLabel: "Z5", label: "Z5 vitesse", rangeLabel: "", load: 0, durationSeconds: 0 },
    ];
  }

  const z1Min = referencePaceSecondsPerKm * 1.12;
  const z2Min = referencePaceSecondsPerKm * 1.03;
  const z3Min = referencePaceSecondsPerKm * 0.96;
  const z4Min = referencePaceSecondsPerKm * 0.88;

  return [
    {
      key: "z1",
      shortLabel: "Z1",
      label: "Z1 facile",
      minPaceSecondsPerKm: z1Min,
      maxPaceSecondsPerKm: Number.POSITIVE_INFINITY,
      rangeLabel: `>= ${formatPace(z1Min)}`,
      load: 0,
      durationSeconds: 0,
    },
    {
      key: "z2",
      shortLabel: "Z2",
      label: "Z2 endurance",
      minPaceSecondsPerKm: z2Min,
      maxPaceSecondsPerKm: z1Min,
      rangeLabel: `${formatPace(z2Min)} a ${formatPace(z1Min)}`,
      load: 0,
      durationSeconds: 0,
    },
    {
      key: "z3",
      shortLabel: "Z3",
      label: "Z3 rythme",
      minPaceSecondsPerKm: z3Min,
      maxPaceSecondsPerKm: z2Min,
      rangeLabel: `${formatPace(z3Min)} a ${formatPace(z2Min)}`,
      load: 0,
      durationSeconds: 0,
    },
    {
      key: "z4",
      shortLabel: "Z4",
      label: "Z4 seuil",
      minPaceSecondsPerKm: z4Min,
      maxPaceSecondsPerKm: z3Min,
      rangeLabel: `${formatPace(z4Min)} a ${formatPace(z3Min)}`,
      load: 0,
      durationSeconds: 0,
    },
    {
      key: "z5",
      shortLabel: "Z5",
      label: "Z5 vitesse",
      minPaceSecondsPerKm: 0,
      maxPaceSecondsPerKm: z4Min,
      rangeLabel: `<= ${formatPace(z4Min)}`,
      load: 0,
      durationSeconds: 0,
    },
  ];
}

function classifySpeedZone(paceSecondsPerKm, zones = []) {
  const safePace = toNumber(paceSecondsPerKm);

  return zones.findIndex((zone) => {
    const min = toNumber(zone?.minPaceSecondsPerKm);
    const max = zone?.maxPaceSecondsPerKm === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : toNumber(zone?.maxPaceSecondsPerKm);

    return safePace >= min && safePace <= max;
  });
}

function finalizeZoneModel(baseZones = [], meta = {}) {
  const totalLoad = baseZones.reduce((sum, zone) => sum + zone.load, 0);
  const trackedDurationSeconds = baseZones.reduce((sum, zone) => sum + zone.durationSeconds, 0);
  const hasTrackedData = trackedDurationSeconds > 0;

  return {
    ...meta,
    zones: baseZones.map((zone) => ({
      ...zone,
      value: roundValue(zone.load, 1),
      load: roundValue(zone.load, 1),
      loadShare: totalLoad > 0 ? roundValue((zone.load / totalLoad) * 100, 0) : 0,
      durationMinutes: roundValue(zone.durationSeconds / 60, 0),
      durationHours: roundValue(zone.durationSeconds / 3600, 1),
      durationShare: trackedDurationSeconds > 0 ? roundValue((zone.durationSeconds / trackedDurationSeconds) * 100, 0) : 0,
    })),
    trackedLoad: roundValue(totalLoad, 1),
    trackedDurationMinutes: roundValue(trackedDurationSeconds / 60, 0),
    hasData: hasTrackedData,
  };
}

export function buildHeartRateLoadDistribution(activities = [], options = {}) {
  const items = resolveRunItems(activities, {
    startDate: options.startDate,
    endDate: options.endDate,
    settings: options.settings,
  }).filter((activity) => activity.__movingSeconds >= 12 * 60);
  const estimatedReferenceMaxHeartrate = getReferenceMaxHeartrate(items, {
    endDate: options.endDate,
  }).maxHeartrate || 0;
  const resolvedHeartRateConfig = resolveHeartRateZoneConfig({
    preferences: options.heartRatePreferences || options,
    estimatedMaxHeartrate: estimatedReferenceMaxHeartrate,
  });
  const baseZones = (resolvedHeartRateConfig.maxHeartrate
    ? resolvedHeartRateConfig.zones
    : buildEmptyHeartRateZones()
  ).map((zone) => ({
    ...zone,
    load: 0,
    durationSeconds: 0,
  }));

  if (!items.length) {
    return finalizeZoneModel(baseZones, {
      scope: RUN_SCOPE_LABEL,
      message: "Aucune sortie course / trail exploitable sur cette selection.",
      estimationMode: "heartRateLoad",
      referenceMaxHeartrate: resolvedHeartRateConfig.maxHeartrate,
      usingEstimatedMaxHeartrate: resolvedHeartRateConfig.usingEstimatedMaxHeartrate,
      usingEstimatedZones: resolvedHeartRateConfig.usingEstimatedZones,
      estimationMessage: resolvedHeartRateConfig.estimationMessage,
    });
  }

  if (!resolvedHeartRateConfig.maxHeartrate) {
    return finalizeZoneModel(baseZones, {
      scope: RUN_SCOPE_LABEL,
      message: "Renseigne une FC max ou davantage de donnees cardio pour repartir la charge par zones.",
      estimationMode: "heartRateLoad",
      referenceMaxHeartrate: 0,
      usingEstimatedMaxHeartrate: false,
      usingEstimatedZones: false,
      estimationMessage: resolvedHeartRateConfig.estimationMessage,
    });
  }

  let detailedActivitiesCount = 0;
  let fallbackActivitiesCount = 0;

  items.forEach((activity) => {
    const segmentSource = resolveSegmentsForMode(activity, "heartRate");
    const segments = segmentSource.segments;

    if (!segments.length) {
      return;
    }

    if (segmentSource.source === "activity") {
      fallbackActivitiesCount += 1;
    } else {
      detailedActivitiesCount += 1;
    }

    const activityLoad = toNumber(activity.__load || estimateLoadValue(activity, options.settings || {}));
    const weightedSegments = segments
      .map((segment) => {
        const zoneIndex = classifyHeartRateZone(segment.heartRate, resolvedHeartRateConfig.zones);
        return {
          segment,
          zoneIndex,
          weightedDuration: segment.durationSeconds * getZoneWeight(zoneIndex),
        };
      })
      .filter((entry) => entry.zoneIndex >= 0 && entry.segment.durationSeconds > 0);
    const totalWeightedDuration = weightedSegments.reduce((sum, entry) => sum + entry.weightedDuration, 0);

    weightedSegments.forEach(({ segment, zoneIndex, weightedDuration }) => {
      const zone = baseZones[zoneIndex];
      const segmentLoad = totalWeightedDuration > 0
        ? activityLoad * (weightedDuration / totalWeightedDuration)
        : 0;

      zone.load += segmentLoad;
      zone.durationSeconds += segment.durationSeconds;
    });
  });

  return finalizeZoneModel(baseZones, {
    scope: RUN_SCOPE_LABEL,
    estimationMode: "heartRateLoad",
    message: "",
    referenceMaxHeartrate: resolvedHeartRateConfig.maxHeartrate,
    usingEstimatedMaxHeartrate: resolvedHeartRateConfig.usingEstimatedMaxHeartrate,
    usingEstimatedZones: resolvedHeartRateConfig.usingEstimatedZones,
    estimationMessage: resolvedHeartRateConfig.estimationMessage,
    detailedActivitiesCount,
    fallbackActivitiesCount,
  });
}

export function buildSpeedLoadDistribution(activities = [], options = {}) {
  const items = resolveRunItems(activities, {
    startDate: options.startDate,
    endDate: options.endDate,
    settings: options.settings,
  }).filter((activity) => activity.__movingSeconds >= 12 * 60 && activity.__distanceKm >= 2);
  const reference = buildReferencePace(items, {
    endDate: options.endDate,
    lookbackDays: options.lookbackDays || 120,
  });
  const baseZones = buildSpeedZones(reference.paceSecondsPerKm);

  if (!items.length) {
    return finalizeZoneModel(baseZones, {
      scope: RUN_SCOPE_LABEL,
      estimationMode: "speedLoad",
      message: "Aucune sortie course / trail exploitable sur cette selection.",
      referencePaceSecondsPerKm: reference.paceSecondsPerKm || 0,
      referencePaceLabel: reference.hasData ? formatPace(reference.paceSecondsPerKm) : "",
      referenceSampleSize: reference.sampleSize || 0,
    });
  }

  if (!reference.hasData || reference.paceSecondsPerKm <= 0) {
    return finalizeZoneModel(baseZones, {
      scope: RUN_SCOPE_LABEL,
      estimationMode: "speedLoad",
      message: "Pas assez de sorties course comparables pour construire des zones de vitesse fiables.",
      referencePaceSecondsPerKm: 0,
      referencePaceLabel: "",
      referenceSampleSize: 0,
    });
  }

  let detailedActivitiesCount = 0;
  let fallbackActivitiesCount = 0;

  items.forEach((activity) => {
    const segmentSource = resolveSegmentsForMode(activity, "speed");
    const segments = segmentSource.segments;

    if (!segments.length) {
      return;
    }

    if (segmentSource.source === "activity") {
      fallbackActivitiesCount += 1;
    } else {
      detailedActivitiesCount += 1;
    }

    const activityLoad = toNumber(activity.__load || estimateLoadValue(activity, options.settings || {}));
    const weightedSegments = segments
      .map((segment) => {
        const zoneIndex = classifySpeedZone(segment.paceSecondsPerKm, baseZones);
        return {
          segment,
          zoneIndex,
          weightedDuration: segment.durationSeconds * getZoneWeight(zoneIndex),
        };
      })
      .filter((entry) => entry.zoneIndex >= 0 && entry.segment.durationSeconds > 0);
    const totalWeightedDuration = weightedSegments.reduce((sum, entry) => sum + entry.weightedDuration, 0);

    weightedSegments.forEach(({ segment, zoneIndex, weightedDuration }) => {
      const zone = baseZones[zoneIndex];
      const segmentLoad = totalWeightedDuration > 0
        ? activityLoad * (weightedDuration / totalWeightedDuration)
        : 0;

      zone.load += segmentLoad;
      zone.durationSeconds += segment.durationSeconds;
    });
  });

  return finalizeZoneModel(baseZones, {
    scope: RUN_SCOPE_LABEL,
    estimationMode: "speedLoad",
    message: "",
    referencePaceSecondsPerKm: reference.paceSecondsPerKm,
    referencePaceLabel: formatPace(reference.paceSecondsPerKm),
    referenceSampleSize: reference.sampleSize || 0,
    detailedActivitiesCount,
    fallbackActivitiesCount,
  });
}

function getHighIntensityLoadShare(model = {}) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  return zones
    .filter((zone) => ["z4", "z5"].includes(zone?.key))
    .reduce((sum, zone) => sum + toNumber(zone?.loadShare), 0);
}

function getRecoveryLoadShare(model = {}) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  return zones
    .filter((zone) => ["z1", "z2"].includes(zone?.key))
    .reduce((sum, zone) => sum + toNumber(zone?.loadShare), 0);
}

function getConsecutiveHardDays(items = [], endDate) {
  const startDate = addDays(endDate, -9);
  const recentItems = getItemsWithinRange(items, startDate, endDate);
  const loadsByDay = new Map();

  recentItems.forEach((activity) => {
    const key = startOfDay(activity.__date).toISOString();
    loadsByDay.set(key, (loadsByDay.get(key) || 0) + toNumber(activity.__load));
  });

  const values = Array.from(loadsByDay.values()).sort((left, right) => left - right);
  const threshold = values.length
    ? values[Math.max(0, Math.floor(values.length * 0.6) - 1)] || values[values.length - 1]
    : 0;
  let longest = 0;
  let current = 0;

  for (let index = 0; index < 10; index += 1) {
    const date = addDays(startDate, index).toISOString();
    const load = toNumber(loadsByDay.get(date));

    if (load > 0 && load >= threshold && threshold > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function getStressLevel(score) {
  if (score >= 75) {
    return { label: "Tres elevee", tone: "danger" };
  }

  if (score >= 50) {
    return { label: "Elevee", tone: "warning" };
  }

  if (score >= 25) {
    return { label: "Moderee", tone: "neutral" };
  }

  return { label: "Faible", tone: "positive" };
}

export function buildLoadStressProfile(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    const level = getStressLevel(0);

    return {
      score: 0,
      level: level.label,
      tone: level.tone,
      factors: [],
      message: "Pas assez de donnees pour evaluer la pression d'entrainement.",
      disclaimer: "Indicateur descriptif (ratio aigu/chronique de Gabbett 2016). Non predictif du risque de blessure individuel (Impellizzeri 2020).",
      metrics: {},
    };
  }

  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const loadSummary = buildTrainingLoadSummary(items, { endDate });
  const heartRateModel = options.heartRateModel || null;
  const speedModel = options.speedModel || null;
  const consecutiveHardDays = getConsecutiveHardDays(items, endDate);
  const highIntensityShare = Math.max(
    getHighIntensityLoadShare(heartRateModel),
    getHighIntensityLoadShare(speedModel),
  );
  const recoveryShare = Math.max(
    getRecoveryLoadShare(heartRateModel),
    getRecoveryLoadShare(speedModel),
  );

  const factors = [];
  let score = 0;

  if (Number.isFinite(loadSummary.acuteChronicRatio)) {
    if (loadSummary.acuteChronicRatio >= 1.5) {
      score += 28;
      factors.push({
        label: "Charge recente tres au-dessus du fond",
        value: loadSummary.acuteChronicRatio.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        points: 28,
      });
    } else if (loadSummary.acuteChronicRatio >= 1.3) {
      score += 20;
      factors.push({
        label: "Charge recente au-dessus de la base",
        value: loadSummary.acuteChronicRatio.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        points: 20,
      });
    } else if (loadSummary.acuteChronicRatio >= 1.15) {
      score += 10;
      factors.push({
        label: "Montee de charge a surveiller",
        value: loadSummary.acuteChronicRatio.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        points: 10,
      });
    }
  }

  if (Number.isFinite(loadSummary.deltaPercent)) {
    if (loadSummary.deltaPercent >= 35) {
      score += 22;
      factors.push({
        label: "Hausse rapide sur 7 jours",
        value: `${Math.round(loadSummary.deltaPercent)} %`,
        points: 22,
      });
    } else if (loadSummary.deltaPercent >= 20) {
      score += 15;
      factors.push({
        label: "Progression charge soutenue",
        value: `${Math.round(loadSummary.deltaPercent)} %`,
        points: 15,
      });
    } else if (loadSummary.deltaPercent >= 10) {
      score += 8;
      factors.push({
        label: "Legere hausse recente",
        value: `${Math.round(loadSummary.deltaPercent)} %`,
        points: 8,
      });
    }
  }

  if (loadSummary.freshness <= -20) {
    score += 18;
    factors.push({
      label: "Fraicheur tres basse",
      value: `${Math.round(loadSummary.freshness)} pts`,
      points: 18,
    });
  } else if (loadSummary.freshness <= -8) {
    score += 10;
    factors.push({
      label: "Fraicheur en baisse",
      value: `${Math.round(loadSummary.freshness)} pts`,
      points: 10,
    });
  }

  if (highIntensityShare >= 40) {
    score += 14;
    factors.push({
      label: "Forte part de charge intense",
      value: `${Math.round(highIntensityShare)} %`,
      points: 14,
    });
  } else if (highIntensityShare >= 28) {
    score += 8;
    factors.push({
      label: "Charge intense notable",
      value: `${Math.round(highIntensityShare)} %`,
      points: 8,
    });
  }

  if (recoveryShare > 0 && recoveryShare <= 45) {
    score += 8;
    factors.push({
      label: "Part de charge facile reduite",
      value: `${Math.round(recoveryShare)} %`,
      points: 8,
    });
  }

  if (consecutiveHardDays >= 3) {
    score += 12;
    factors.push({
      label: "Bloc de jours denses consecutifs",
      value: `${consecutiveHardDays} jours`,
      points: 12,
    });
  } else if (consecutiveHardDays === 2) {
    score += 6;
    factors.push({
      label: "Deux jours denses consecutifs",
      value: "2 jours",
      points: 6,
    });
  }

  const safeScore = clamp(Math.round(score), 0, 100);
  const level = getStressLevel(safeScore);

  return {
    score: safeScore,
    level: level.label,
    tone: level.tone,
    message: factors.length
      ? "Le score combine la montee de charge, la fraicheur, la densite recente et la part de charge intense."
      : "La pression d'entrainement reste limitee sur la periode recente.",
    disclaimer: "Indicateur descriptif (ratio aigu/chronique de Gabbett 2016). Non predictif du risque de blessure individuel (Impellizzeri 2020).",
    factors: factors.sort((left, right) => right.points - left.points).slice(0, 4),
    metrics: {
      acuteChronicRatio: loadSummary.acuteChronicRatio,
      currentWeekLoad: loadSummary.currentWeekLoad,
      deltaPercent: loadSummary.deltaPercent,
      freshness: loadSummary.freshness,
      highIntensityShare: roundValue(highIntensityShare, 0),
      recoveryShare: roundValue(recoveryShare, 0),
      consecutiveHardDays,
    },
  };
}

// Alias retrocompatible : l'API publique s'appelle desormais buildLoadStressProfile.
// Conserve provisoirement l'ancien nom pour ne pas casser d'eventuels imports tiers.
export const buildTrainingRiskProfile = buildLoadStressProfile;

function getStandardDeviation(values = []) {
  const safeValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!safeValues.length) {
    return 0;
  }

  const mean = safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
  const variance = safeValues.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / safeValues.length;
  return Math.sqrt(variance);
}

function getLoadVarianceTone(monotony = 0, strain = 0) {
  if (monotony >= 2.2 || strain >= 900) {
    return { tone: "danger", label: "Tres monotone" };
  }

  if (monotony >= 1.6 || strain >= 600) {
    return { tone: "warning", label: "A surveiller" };
  }

  if (monotony > 0) {
    return { tone: "positive", label: "Variee" };
  }

  return { tone: "neutral", label: "Non calculee" };
}

export function buildLoadVarianceProfile(activities = [], options = {}) {
  const items = buildActivityItems(activities, options);

  if (!items.length) {
    return {
      hasData: false,
      monotony: 0,
      strain: 0,
      weeklyLoad: 0,
      label: "Non calculee",
      tone: "neutral",
      message: "Pas assez de charge recente pour lire la monotonie.",
      disclaimer: "Indicateur descriptif Foster : monotonie = moyenne quotidienne / ecart-type ; strain = charge 7 j x monotonie.",
    };
  }

  const endDate = startOfDay(toDate(options.endDate) || getLatestDate(items) || new Date());
  const startDate = addDays(endDate, -6);
  const dailyLoads = [];

  for (let index = 0; index < 7; index += 1) {
    const day = addDays(startDate, index);
    const load = getItemsWithinRange(items, day, day).reduce((sum, item) => sum + toNumber(item.__load), 0);
    dailyLoads.push(load);
  }

  const weeklyLoad = dailyLoads.reduce((sum, value) => sum + value, 0);
  const mean = weeklyLoad / dailyLoads.length;
  const standardDeviation = getStandardDeviation(dailyLoads);
  const monotony = standardDeviation > 0 ? mean / standardDeviation : mean > 0 ? 7 : 0;
  const strain = weeklyLoad * monotony;
  const level = getLoadVarianceTone(monotony, strain);

  return {
    hasData: weeklyLoad > 0,
    monotony: roundValue(monotony, 2),
    strain: roundValue(strain, 0),
    weeklyLoad: roundValue(weeklyLoad, 1),
    dailyLoads: dailyLoads.map((value) => roundValue(value, 1)),
    label: level.label,
    tone: level.tone,
    message: weeklyLoad > 0
      ? "Plus la monotonie monte, plus la charge recente est concentree sur des jours semblables."
      : "Aucune charge sur les 7 derniers jours de la selection.",
    disclaimer: "Indicateur descriptif Foster : monotonie = moyenne quotidienne / ecart-type ; strain = charge 7 j x monotonie.",
  };
}

export function buildIntensityPolarizationProfile(model = {}, metric = "duration") {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const shareKey = metric === "load" ? "loadShare" : "durationShare";
  const lowShare = zones
    .filter((zone) => ["z1", "z2"].includes(zone?.key))
    .reduce((sum, zone) => sum + toNumber(zone?.[shareKey]), 0);
  const moderateShare = zones
    .filter((zone) => zone?.key === "z3")
    .reduce((sum, zone) => sum + toNumber(zone?.[shareKey]), 0);
  const highShare = zones
    .filter((zone) => ["z4", "z5"].includes(zone?.key))
    .reduce((sum, zone) => sum + toNumber(zone?.[shareKey]), 0);

  let label = "Non calculee";
  let message = "Pas assez de donnees d'intensite pour qualifier la structure.";
  let tone = "neutral";

  if (model?.hasData) {
    if (lowShare >= 75 && moderateShare <= 15 && highShare >= 5) {
      label = "Plutot polarisee";
      message = "La majorite du temps reste facile avec une exposition intense nette.";
      tone = "positive";
    } else if (lowShare >= 65 && moderateShare > highShare) {
      label = "Pyramidale";
      message = "La structure privilegie l'endurance avec une part intermediaire notable.";
      tone = "positive";
    } else if (moderateShare + highShare >= 45) {
      label = "Intensite concentree";
      message = "La part de zones moderees/intenses est elevee sur la selection.";
      tone = "warning";
    } else {
      label = "Endurance dominante";
      message = "La selection est surtout placee en zones faciles.";
      tone = "neutral";
    }
  }

  return {
    hasData: Boolean(model?.hasData),
    label,
    tone,
    message,
    lowShare: roundValue(lowShare, 0),
    moderateShare: roundValue(moderateShare, 0),
    highShare: roundValue(highShare, 0),
    metric,
  };
}

function getPredictionConfidence(sampleSize, flatSampleSize) {
  const base = Math.min(65, sampleSize * 10);
  const terrainBonus = Math.min(20, flatSampleSize * 4);
  return clamp(Math.round(base + terrainBonus), 20, 95);
}

function formatConfidenceLabel(score) {
  if (score >= 75) {
    return "Bonne";
  }

  if (score >= 50) {
    return "Moyenne";
  }

  return "A confirmer";
}

function buildCandidateRuns(activities = [], options = {}) {
  const items = resolveRunItems(activities, {
    endDate: options.endDate,
    lookbackDays: options.lookbackDays || 120,
  });

  return items
    .filter((activity) => activity.__distanceKm >= 3 && activity.__distanceKm <= 32)
    .filter((activity) => activity.__movingSeconds >= 12 * 60 && activity.__movingSeconds <= 4 * 3600)
    .filter((activity) => activity.__paceSecondsPerKm >= 180 && activity.__paceSecondsPerKm <= 540)
    .map((activity) => {
      // Pour les predictions chrono, on travaille en duree equivalente plat
      // (Grade Adjusted Pace) : si la sortie est vallonee, on retient le temps
      // qu'elle aurait pris sur un parcours plat a effort metabolique egal.
      // Cela rend Riegel beaucoup plus juste pour les coureurs en terrain variable.
      const referencePace = activity.__gradeAdjustedPaceSecondsPerKm > 0
        ? activity.__gradeAdjustedPaceSecondsPerKm
        : activity.__paceSecondsPerKm;
      const gapEquivalentSeconds = activity.__distanceKm > 0 && referencePace > 0
        ? activity.__distanceKm * referencePace
        : activity.__movingSeconds;

      return {
        ...activity,
        elevationPerKm: activity.__distanceKm > 0 ? activity.__elevationGain / activity.__distanceKm : 0,
        __referencePaceSecondsPerKm: referencePace,
        __gapEquivalentSeconds: gapEquivalentSeconds,
      };
    })
    .sort((left, right) => left.__referencePaceSecondsPerKm - right.__referencePaceSecondsPerKm);
}

function buildPredictionForTarget(targetDistanceKm, candidates = [], reference = {}, endDate) {
  const weightedCandidates = candidates
    .map((activity, index) => {
      const ratio = targetDistanceKm / activity.__distanceKm;
      // Riegel applique sur le temps equivalent plat : T2 = T1_plat * (D2/D1)^1.06.
      const equivalentSeconds = toNumber(activity.__gapEquivalentSeconds || activity.__movingSeconds) * (ratio ** 1.06);
      const ageDays = Math.max(0, Math.round((endDate - activity.__date) / 86400000));
      const recencyWeight = clamp(1 - (ageDays / 160), 0.45, 1);
      const specificityWeight = clamp(1 - (Math.abs(Math.log(ratio)) / 2.2), 0.4, 1.1);
      const rankingWeight = clamp(1.2 - (index * 0.05), 0.65, 1.2);
      // Apres ajustement GAP, le terrain n'est plus penalisant, mais on garde un
      // leger bonus pour les sorties presque plates (signal le plus fiable).
      const terrainWeight = activity.elevationPerKm <= 20 ? 1.05 : activity.elevationPerKm <= 35 ? 1 : 0.92;
      const referencePaceCandidate = toNumber(activity.__referencePaceSecondsPerKm || activity.__paceSecondsPerKm);
      const referenceWeight = reference.hasData && referencePaceCandidate <= (reference.paceSecondsPerKm * 1.12) ? 1.08 : 0.95;

      return {
        equivalentSeconds,
        weight: recencyWeight * specificityWeight * rankingWeight * terrainWeight * referenceWeight,
        flatLike: activity.elevationPerKm <= 20,
      };
    })
    .filter((entry) => Number.isFinite(entry.equivalentSeconds) && entry.equivalentSeconds > 0 && entry.weight > 0);

  if (!weightedCandidates.length) {
    return null;
  }

  const totalWeight = weightedCandidates.reduce((sum, entry) => sum + entry.weight, 0);
  const predictedSeconds = weightedCandidates.reduce(
    (sum, entry) => sum + (entry.equivalentSeconds * entry.weight),
    0,
  ) / totalWeight;
  const flatSampleSize = weightedCandidates.filter((entry) => entry.flatLike).length;
  const confidence = getPredictionConfidence(weightedCandidates.length, flatSampleSize);

  return {
    distanceKm: targetDistanceKm,
    label: `${targetDistanceKm === 21.1 ? "Semi" : targetDistanceKm === 42.2 ? "Marathon" : `${targetDistanceKm} km`}`,
    predictedSeconds: Math.round(predictedSeconds),
    confidence,
    confidenceLabel: formatConfidenceLabel(confidence),
    sampleSize: weightedCandidates.length,
    flatSampleSize,
  };
}

export function buildPerformancePredictions(activities = [], options = {}) {
  const endDate = startOfDay(toDate(options.endDate) || new Date());
  const reference = buildReferencePace(activities, {
    endDate,
    lookbackDays: options.lookbackDays || 120,
  });
  const candidates = buildCandidateRuns(activities, {
    endDate,
    lookbackDays: options.lookbackDays || 120,
  });

  if (!candidates.length) {
    return {
      hasData: false,
      message: "Pas assez de sorties course comparables pour estimer un chrono.",
      referencePaceLabel: reference.hasData ? formatPace(reference.paceSecondsPerKm) : "",
      predictions: [],
    };
  }

  const fastestSubset = candidates.slice(0, Math.max(3, Math.ceil(candidates.length * 0.6)));
  const predictions = [5, 10, 21.1, 42.2]
    .map((distanceKm) => buildPredictionForTarget(distanceKm, fastestSubset, reference, endDate))
    .filter(Boolean);

  return {
    hasData: predictions.length > 0,
    message: predictions.length ? "" : "Prediction indisponible sur la selection courante.",
    referencePaceLabel: reference.hasData ? formatPace(reference.paceSecondsPerKm) : "",
    predictionScopeLabel: "Projection route/plat basee sur les sorties course recentes les plus parlantes.",
    sampleSize: fastestSubset.length,
    predictions,
  };
}
