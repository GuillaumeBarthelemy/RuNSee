import prisma from "../../config/prisma.js";

const DEFAULT_TRAINING_ANALYTICS_SETTINGS = {
  heartRateMax: null,
  restingHeartrate: 60,
  biologicalSex: "unspecified",
  heartRateZone1Max: null,
  heartRateZone2Max: null,
  heartRateZone3Max: null,
  heartRateZone4Max: null,
  intensitySourcePriority: "heart_rate",
  efficiencyMinDurationMinutes: 20,
  efficiencyMaxElevationPerKm: 25,
  efficiencyExcludeTrail: true,
};

const HEART_RATE_FIELDS = [
  "heartRateMax",
  "restingHeartrate",
  "heartRateZone1Max",
  "heartRateZone2Max",
  "heartRateZone3Max",
  "heartRateZone4Max",
];

function toNullableInteger(value, { min = 1, max = 260 } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Math.round(Number(value));

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(Math.max(numeric, min), max);
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === "false" || value === "0" || value === 0) {
    return false;
  }

  return fallback;
}

function sanitizeIntensitySourcePriority(value) {
  return String(value || "").trim() === "pace" ? "pace" : "heart_rate";
}

function sanitizeBiologicalSex(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["male", "female"].includes(normalized) ? normalized : "unspecified";
}

const ALLOWED_SMOOTHING = new Set(["exp30", "ma15", "none"]);
const ALLOWED_ZONES_METHODS = new Set(["custom_hr", "karvonen", "lactate"]);

function sanitizeEnum(value, allowed, fallback) {
  const v = String(value || "").trim().toLowerCase();
  return allowed.has(v) ? v : fallback;
}

function sanitizeSettingsInput(input = {}) {
  const rawRestingHeartrate = input.restingHeartrate ?? input.heartRateRest;

  return {
    heartRateMax: toNullableInteger(input.heartRateMax, { min: 80, max: 260 }),
    restingHeartrate: toNullableInteger(rawRestingHeartrate, { min: 30, max: 120 })
      ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.restingHeartrate,
    biologicalSex: sanitizeBiologicalSex(input.biologicalSex),
    heartRateZone1Max: toNullableInteger(input.heartRateZone1Max, { min: 60, max: 250 }),
    heartRateZone2Max: toNullableInteger(input.heartRateZone2Max, { min: 60, max: 250 }),
    heartRateZone3Max: toNullableInteger(input.heartRateZone3Max, { min: 60, max: 250 }),
    heartRateZone4Max: toNullableInteger(input.heartRateZone4Max, { min: 60, max: 250 }),
    ftpWatts: toNullableInteger(input.ftpWatts, { min: 50, max: 600 }),
    paceSmoothingMethod: sanitizeEnum(input.paceSmoothingMethod, ALLOWED_SMOOTHING, "exp30"),
    zonesCalculationMethod: sanitizeEnum(input.zonesCalculationMethod, ALLOWED_ZONES_METHODS, "custom_hr"),
    gapEnabled: toBoolean(input.gapEnabled, true),
    intensitySourcePriority: sanitizeIntensitySourcePriority(input.intensitySourcePriority),
    efficiencyMinDurationMinutes: toNullableInteger(input.efficiencyMinDurationMinutes, { min: 5, max: 180 })
      ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMinDurationMinutes,
    efficiencyMaxElevationPerKm: toNullableInteger(input.efficiencyMaxElevationPerKm, { min: 0, max: 250 })
      ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMaxElevationPerKm,
    efficiencyExcludeTrail: toBoolean(
      input.efficiencyExcludeTrail,
      DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyExcludeTrail,
    ),
  };
}

function serializeSettings(record = null) {
  const safeRecord = record || {};

  return {
    id: safeRecord.id || null,
    effectiveFrom: safeRecord.effectiveFrom || null,
    archivedAt: safeRecord.archivedAt || null,
    isActive: safeRecord.isActive ?? true,
    heartRateMax: safeRecord.heartRateMax ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateMax,
    restingHeartrate:
      safeRecord.restingHeartrate
      ?? safeRecord.heartRateRest
      ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.restingHeartrate,
    biologicalSex: safeRecord.biologicalSex || DEFAULT_TRAINING_ANALYTICS_SETTINGS.biologicalSex,
    heartRateZone1Max: safeRecord.heartRateZone1Max ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone1Max,
    heartRateZone2Max: safeRecord.heartRateZone2Max ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone2Max,
    heartRateZone3Max: safeRecord.heartRateZone3Max ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone3Max,
    heartRateZone4Max: safeRecord.heartRateZone4Max ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateZone4Max,
    ftpWatts: safeRecord.ftpWatts ?? null,
    paceSmoothingMethod: safeRecord.paceSmoothingMethod || "exp30",
    zonesCalculationMethod: safeRecord.zonesCalculationMethod || "custom_hr",
    gapEnabled: safeRecord.gapEnabled !== undefined && safeRecord.gapEnabled !== null
      ? Boolean(safeRecord.gapEnabled) : true,
    intensitySourcePriority: safeRecord.intensitySourcePriority || DEFAULT_TRAINING_ANALYTICS_SETTINGS.intensitySourcePriority,
    efficiencyMinDurationMinutes:
      safeRecord.efficiencyMinDurationMinutes ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMinDurationMinutes,
    efficiencyMaxElevationPerKm:
      safeRecord.efficiencyMaxElevationPerKm ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMaxElevationPerKm,
    efficiencyExcludeTrail:
      safeRecord.efficiencyExcludeTrail ?? DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyExcludeTrail,
  };
}

function serializeHistory(records = []) {
  return (Array.isArray(records) ? records : []).map((record) => serializeSettings(record));
}

function areSettingsEqual(left = {}, right = {}) {
  return (
    left.intensitySourcePriority === right.intensitySourcePriority
    && left.efficiencyMinDurationMinutes === right.efficiencyMinDurationMinutes
    && left.efficiencyMaxElevationPerKm === right.efficiencyMaxElevationPerKm
    && left.efficiencyExcludeTrail === right.efficiencyExcludeTrail
    && left.biologicalSex === right.biologicalSex
    && (left.ftpWatts ?? null) === (right.ftpWatts ?? null)
    && (left.paceSmoothingMethod || "exp30") === (right.paceSmoothingMethod || "exp30")
    && (left.zonesCalculationMethod || "custom_hr") === (right.zonesCalculationMethod || "custom_hr")
    && Boolean(left.gapEnabled) === Boolean(right.gapEnabled)
    && HEART_RATE_FIELDS.every((field) => (left[field] ?? null) === (right[field] ?? null))
  );
}

function hasPersistedTrainingLoadParameters(record = null) {
  if (!record) {
    return false;
  }

  return (record.restingHeartrate ?? record.heartRateRest) !== null
    && (record.restingHeartrate ?? record.heartRateRest) !== undefined
    && record.biologicalSex !== null
    && record.biologicalSex !== undefined;
}

async function getSettingsHistory(appUserId) {
  return prisma.userTrainingAnalyticsSettings.findMany({
    where: {
      appUserId,
    },
    orderBy: {
      effectiveFrom: "desc",
    },
    take: 6,
  });
}

export async function getTrainingAnalyticsSettings(appUserId) {
  const records = await getSettingsHistory(appUserId);
  const activeRecord = records.find((record) => record.isActive && !record.archivedAt) || null;

  return {
    settings: serializeSettings(activeRecord),
    history: serializeHistory(records),
  };
}

export async function saveTrainingAnalyticsSettings(appUserId, input = {}) {
  const nextValues = sanitizeSettingsInput(input);
  const currentRecords = await getSettingsHistory(appUserId);
  const currentActiveRecord = currentRecords.find((record) => record.isActive && !record.archivedAt) || null;
  const serializedCurrent = serializeSettings(currentActiveRecord);

  if (
    currentActiveRecord
    && hasPersistedTrainingLoadParameters(currentActiveRecord)
    && areSettingsEqual(serializedCurrent, nextValues)
  ) {
    return {
      settings: serializedCurrent,
      history: serializeHistory(currentRecords),
      updated: false,
    };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.userTrainingAnalyticsSettings.updateMany({
      where: {
        appUserId,
        isActive: true,
        archivedAt: null,
      },
      data: {
        isActive: false,
        archivedAt: now,
      },
    });

    await tx.userTrainingAnalyticsSettings.create({
      data: {
        appUserId,
        effectiveFrom: now,
        isActive: true,
        ...nextValues,
      },
    });
  });

  return {
    ...(await getTrainingAnalyticsSettings(appUserId)),
    updated: true,
  };
}

export { DEFAULT_TRAINING_ANALYTICS_SETTINGS };
