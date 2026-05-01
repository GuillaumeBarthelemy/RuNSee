const DEFAULT_RESTING_HEARTRATE = 60;
const DEFAULT_BIOLOGICAL_SEX = "unspecified";

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeDistanceKm(value) {
  return toNumber(value) / 1000;
}

function normalizeDurationMinutes(activity = {}) {
  const movingSeconds = toNumber(activity?.movingTime ?? activity?.moving_time ?? activity?.__movingSeconds);
  const elapsedSeconds = toNumber(activity?.elapsedTime ?? activity?.elapsed_time);
  const seconds = movingSeconds > 0 ? movingSeconds : elapsedSeconds;
  return seconds > 0 ? seconds / 60 : 0;
}

function normalizeRestingHeartrate(value) {
  const numeric = Math.round(toNumber(value));
  return numeric >= 30 && numeric <= 120 ? numeric : DEFAULT_RESTING_HEARTRATE;
}

function normalizeMaxHeartrate(value) {
  const numeric = Math.round(toNumber(value));
  return numeric >= 120 && numeric <= 240 ? numeric : 0;
}

function normalizeAverageHeartrate(value) {
  const numeric = toNumber(value);
  return numeric >= 80 && numeric <= 230 ? numeric : 0;
}

function normalizeBiologicalSex(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["male", "female"].includes(normalized) ? normalized : DEFAULT_BIOLOGICAL_SEX;
}

export function normalizeLoadSettings(settings = {}) {
  return {
    heartRateMax: normalizeMaxHeartrate(settings.heartRateMax),
    restingHeartrate: normalizeRestingHeartrate(settings.restingHeartrate ?? settings.heartRateRest),
    biologicalSex: normalizeBiologicalSex(settings.biologicalSex),
  };
}

export function calculateBanisterTrimp({
  durationMinutes = 0,
  averageHeartrate = 0,
  restingHeartrate = DEFAULT_RESTING_HEARTRATE,
  maxHeartrate = 0,
  biologicalSex = DEFAULT_BIOLOGICAL_SEX,
} = {}) {
  const safeDuration = toNumber(durationMinutes);
  const safeAverageHr = normalizeAverageHeartrate(averageHeartrate);
  const safeRestHr = normalizeRestingHeartrate(restingHeartrate);
  const safeMaxHr = normalizeMaxHeartrate(maxHeartrate);

  if (safeDuration <= 0 || safeAverageHr <= 0 || safeMaxHr <= 0 || safeMaxHr <= safeRestHr + 20) {
    return 0;
  }

  const heartRateReserveRatio = clamp((safeAverageHr - safeRestHr) / (safeMaxHr - safeRestHr), 0, 1.15);

  if (heartRateReserveRatio <= 0) {
    return 0;
  }

  const sex = normalizeBiologicalSex(biologicalSex);
  const maleCoefficient = 0.64 * Math.exp(1.92 * heartRateReserveRatio);
  const femaleCoefficient = 0.86 * Math.exp(1.67 * heartRateReserveRatio);
  const coefficient = sex === "female"
    ? femaleCoefficient
    : sex === "male"
      ? maleCoefficient
      : (maleCoefficient + femaleCoefficient) / 2;

  return safeDuration * heartRateReserveRatio * coefficient;
}

// sRPE Foster (Foster 2001) : charge subjective = duree (min) × RPE (1-10).
// Si l'athlete a saisi son RPE sur l'echelle de Borg modifiee, on prefere
// cette valeur au suffer score Strava qui reste opaque.
function calculateSessionRpe(activity = {}) {
  const userRpe = Math.round(toNumber(activity?.userRpe));

  if (userRpe < 1 || userRpe > 10) {
    return 0;
  }

  const durationMinutes = normalizeDurationMinutes(activity);
  if (durationMinutes <= 0) {
    return 0;
  }

  // Echelle classique : duree (min) × RPE Borg modifiee (CR-10).
  // Pour rester homogene avec le TRIMP Banister, on rescale d'un coefficient
  // empirique (1.0) ; un footing tranquille de 60 min RPE 4 vaut alors 240 pts,
  // un seuil de 60 min RPE 8 vaut 480 pts. Plages similaires au TRIMP Banister.
  return durationMinutes * userRpe;
}

function estimatePaceAndTerrainFallback(activity = {}) {
  const durationMinutes = normalizeDurationMinutes(activity);
  const distanceKm = normalizeDistanceKm(activity?.distance ?? activity?.distanceMeters);
  const elevationGain = Math.max(0, toNumber(activity?.totalElevationGain ?? activity?.elevationGain));

  if (durationMinutes <= 0 && distanceKm <= 0) {
    return 0;
  }

  const durationScore = durationMinutes * 0.35;
  const distanceScore = distanceKm * 1.1;
  const elevationScore = elevationGain / 120;

  return durationScore + distanceScore + elevationScore;
}

export function getTrainingLoadEstimation(activity = {}, settings = {}) {
  const normalizedSettings = normalizeLoadSettings(settings);
  const durationMinutes = normalizeDurationMinutes(activity);
  const averageHeartrate = normalizeAverageHeartrate(activity?.averageHeartrate ?? activity?.average_heartrate);
  const activityMaxHeartrate = normalizeMaxHeartrate(activity?.maxHeartrate ?? activity?.max_heartrate);
  const maxHeartrate = normalizedSettings.heartRateMax || activityMaxHeartrate;
  const trimp = calculateBanisterTrimp({
    durationMinutes,
    averageHeartrate,
    restingHeartrate: normalizedSettings.restingHeartrate,
    maxHeartrate,
    biologicalSex: normalizedSettings.biologicalSex,
  });

  if (trimp > 0) {
    return {
      value: Number(trimp.toFixed(1)),
      method: normalizedSettings.heartRateMax ? "trimp_settings" : "trimp_activity_hrmax",
      confidence: normalizedSettings.heartRateMax ? "high" : "medium",
    };
  }

  // Niveau 2 bis : sRPE Foster si l'athlete a saisi un RPE manuel.
  // Plus fiable que le suffer score quand la cardio est absente.
  const sessionRpe = calculateSessionRpe(activity);
  if (sessionRpe > 0) {
    return {
      value: Number(sessionRpe.toFixed(1)),
      method: "session_rpe_foster",
      confidence: "medium",
    };
  }

  const sufferScore = toNumber(activity?.sufferScore);
  if (sufferScore > 0) {
    return {
      value: Number(sufferScore.toFixed(1)),
      method: "strava_suffer_score",
      confidence: "medium",
    };
  }

  const fallback = estimatePaceAndTerrainFallback(activity);
  return {
    value: Number(fallback.toFixed(1)),
    method: "pace_terrain_proxy",
    confidence: fallback > 0 ? "low" : "none",
  };
}

export function estimateLoadValue(activity = {}, settings = {}) {
  return getTrainingLoadEstimation(activity, settings).value;
}

export const DEFAULT_LOAD_SETTINGS = {
  restingHeartrate: DEFAULT_RESTING_HEARTRATE,
  biologicalSex: DEFAULT_BIOLOGICAL_SEX,
};
