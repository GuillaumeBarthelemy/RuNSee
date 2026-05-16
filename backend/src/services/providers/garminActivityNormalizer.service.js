import { EXTERNAL_PROVIDER_CODES } from "./externalProvider.constants.js";

export const GARMIN_ACTIVITY_SOURCE_PROVIDER = "garmin";
export const GARMINCONNECT_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;

const SUPPORTED_GARMIN_ACTIVITY_TYPES = new Set([
  "running",
  "street_running",
  "trail_running",
  "treadmill_running",
  "track_running",
  "indoor_running",
  "hiking",
  "walking_hiking",
]);

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const numeric = toNumber(value);
    if (numeric !== null) {
      return numeric;
    }
  }

  return null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSportText(value) {
  if (typeof value === "object" && value !== null) {
    return normalizeSportText(value.typeKey || value.typeId || value.name || value.displayName);
  }

  return String(value || "").trim().toLowerCase();
}

function getNestedActivityType(rawActivity = {}) {
  return rawActivity?.activityTypeDTO
    || rawActivity?.activityType
    || rawActivity?.activityTypeKey
    || rawActivity?.sportType
    || "";
}

export function getGarminActivityId(rawActivity) {
  return String(
    rawActivity?.activityId
      || rawActivity?.activityIdStr
      || rawActivity?.id
      || rawActivity?.activity_id
      || "",
  ).trim();
}

export function getGarminStartDate(rawActivity) {
  return parseDate(rawActivity?.startTimeGMT || rawActivity?.startTimeGmt || rawActivity?.startTimeLocal);
}

export function getGarminLocalStartDate(rawActivity) {
  return parseDate(rawActivity?.startTimeLocal || rawActivity?.startTimeGMT || rawActivity?.startTimeGmt);
}

export function getGarminDistanceMeters(rawActivity) {
  return firstNumber(rawActivity?.distance, rawActivity?.distanceMeters);
}

export function getGarminDurationSeconds(rawActivity) {
  return firstNumber(rawActivity?.movingDuration, rawActivity?.duration, rawActivity?.elapsedDuration);
}

export function getGarminRecoveryTimeHours(rawActivity) {
  const hours = firstNumber(rawActivity?.recoveryTimeInHours);
  if (hours !== null) {
    return hours;
  }

  const minutes = firstNumber(rawActivity?.recoveryTimeMinutes);
  if (minutes !== null) {
    return minutes / 60;
  }

  const seconds = firstNumber(rawActivity?.recoveryTimeSeconds);
  if (seconds !== null) {
    return seconds / 3600;
  }

  return firstNumber(rawActivity?.recoveryTime);
}

export function getGarminActivityTypeKey(rawActivity = {}) {
  return normalizeSportText(getNestedActivityType(rawActivity));
}

export function isSupportedGarminActivityType(rawActivity = {}) {
  const typeKey = getGarminActivityTypeKey(rawActivity);

  if (!typeKey) {
    return false;
  }

  if (SUPPORTED_GARMIN_ACTIVITY_TYPES.has(typeKey)) {
    return true;
  }

  return typeKey.includes("trail_running") || typeKey.includes("hiking");
}

function mapGarminSportType(typeKey) {
  if (typeKey.includes("hiking")) {
    return "Hike";
  }

  if (typeKey.includes("trail")) {
    return "TrailRun";
  }

  if (typeKey.includes("treadmill")) {
    return "VirtualRun";
  }

  return "Run";
}

function buildActivityName(rawActivity, typeKey, startDate) {
  const explicitName = String(rawActivity?.activityName || rawActivity?.name || "").trim();
  if (explicitName) {
    return explicitName;
  }

  const dateLabel = startDate ? startDate.toISOString().slice(0, 10) : "date inconnue";
  return `${typeKey.includes("hiking") ? "Randonnée Garmin" : "Course Garmin"} - ${dateLabel}`;
}

export function normalizeGarminActivity(rawActivity) {
  if (!rawActivity || typeof rawActivity !== "object") {
    return null;
  }

  const providerActivityId = getGarminActivityId(rawActivity);
  const typeKey = getGarminActivityTypeKey(rawActivity);
  const startDate = getGarminStartDate(rawActivity);
  const startDateLocal = getGarminLocalStartDate(rawActivity);

  return {
    providerCode: GARMINCONNECT_PROVIDER_CODE,
    providerActivityId,
    sourceProvider: GARMIN_ACTIVITY_SOURCE_PROVIDER,
    sourceActivityId: providerActivityId,
    sourcePriority: "fallback",
    activityName: buildActivityName(rawActivity, typeKey, startDateLocal || startDate),
    activityType: typeKey,
    type: typeKey.includes("hiking") ? "Hike" : "Run",
    sportType: mapGarminSportType(typeKey),
    startTimeLocal: rawActivity.startTimeLocal || null,
    startTimeGMT: rawActivity.startTimeGMT || rawActivity.startTimeGmt || null,
    startDate,
    startDateLocal,
    distance: getGarminDistanceMeters(rawActivity),
    duration: getGarminDurationSeconds(rawActivity),
    elapsedDuration: firstNumber(rawActivity.elapsedDuration, rawActivity.duration),
    movingDuration: firstNumber(rawActivity.movingDuration, rawActivity.duration),
    elevationGain: toNumber(rawActivity.elevationGain),
    elevationLoss: toNumber(rawActivity.elevationLoss),
    averageHR: toNumber(rawActivity.averageHR),
    maxHR: toNumber(rawActivity.maxHR),
    calories: toNumber(rawActivity.calories),
    averageSpeed: toNumber(rawActivity.averageSpeed),
    maxSpeed: toNumber(rawActivity.maxSpeed),
    averageRunCadence: toNumber(rawActivity.averageRunCadence),
    averagePower: toNumber(rawActivity.averagePower),
    maxPower: toNumber(rawActivity.maxPower),
    aerobicTrainingEffect: firstNumber(rawActivity.aerobicTrainingEffect, rawActivity.aerobicTrainingEffectScore),
    aerobicTrainingEffectMessage: rawActivity.aerobicTrainingEffectMessage || null,
    anaerobicTrainingEffect: firstNumber(rawActivity.anaerobicTrainingEffect, rawActivity.anaerobicTrainingEffectScore),
    anaerobicTrainingEffectMessage: rawActivity.anaerobicTrainingEffectMessage || null,
    trainingEffectLabel: rawActivity.trainingEffectLabel || null,
    vO2MaxValue: toNumber(rawActivity.vO2MaxValue),
    performanceCondition: toNumber(rawActivity.performanceCondition),
    recoveryHeartRate: toNumber(rawActivity.recoveryHeartRate),
    recoveryTime: getGarminRecoveryTimeHours(rawActivity),
    trainingLoad: toNumber(rawActivity.trainingLoad),
    trainingStressScore: toNumber(rawActivity.trainingStressScore),
    intensityFactor: toNumber(rawActivity.intensityFactor),
    epoc: toNumber(rawActivity.epoc),
    lactateThresholdBpm: toNumber(rawActivity.lactateThresholdBpm),
    lactateThresholdSpeed: toNumber(rawActivity.lactateThresholdSpeed),
    activityTrainingLoad: toNumber(rawActivity.activityTrainingLoad),
    trainingEffect: toNumber(rawActivity.trainingEffect),
    beginPotentialStamina: toNumber(rawActivity.beginPotentialStamina),
    endPotentialStamina: toNumber(rawActivity.endPotentialStamina),
    differenceBodyBattery: toNumber(rawActivity.differenceBodyBattery),
    moderateIntensityMinutes: toNumber(rawActivity.moderateIntensityMinutes),
    vigorousIntensityMinutes: toNumber(rawActivity.vigorousIntensityMinutes),
    supported: isSupportedGarminActivityType(rawActivity),
  };
}

export function buildCanonicalActivityDataFromGarmin(appUserId, normalizedActivity, rawActivity = {}) {
  if (!appUserId || !normalizedActivity?.providerActivityId || !normalizedActivity?.startDate) {
    return null;
  }

  return {
    appUserId,
    athleteId: null,
    stravaActivityId: null,
    sourceProvider: normalizedActivity.sourceProvider,
    sourceActivityId: normalizedActivity.sourceActivityId,
    sourcePriority: normalizedActivity.sourcePriority,
    sourceSyncedAt: new Date(),
    sourceUrl: null,
    name: normalizedActivity.activityName,
    description: rawActivity?.description || null,
    type: normalizedActivity.type,
    sportType: normalizedActivity.sportType,
    startDate: normalizedActivity.startDate,
    startDateLocal: normalizedActivity.startDateLocal,
    distance: normalizedActivity.distance,
    movingTime: normalizedActivity.movingDuration || normalizedActivity.duration,
    elapsedTime: normalizedActivity.elapsedDuration || normalizedActivity.duration,
    totalElevationGain: normalizedActivity.elevationGain,
    totalElevationLoss: normalizedActivity.elevationLoss,
    averageSpeed: normalizedActivity.averageSpeed,
    maxSpeed: normalizedActivity.maxSpeed,
    averageCadence: normalizedActivity.averageRunCadence,
    averageWatts: normalizedActivity.averagePower,
    hasHeartrate: Boolean(normalizedActivity.averageHR || normalizedActivity.maxHR),
    averageHeartrate: normalizedActivity.averageHR,
    maxHeartrate: normalizedActivity.maxHR,
    calories: normalizedActivity.calories,
    isDetailed: true,
    summaryJson: JSON.stringify(rawActivity || {}),
    rawJson: JSON.stringify(rawActivity || {}),
    summaryFetchedAt: new Date(),
    detailsFetchedAt: new Date(),
    lastFetchedAt: new Date(),
  };
}
