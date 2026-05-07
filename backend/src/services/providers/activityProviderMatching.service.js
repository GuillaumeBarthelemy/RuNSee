import {
  getGarminDistanceMeters,
  getGarminDurationSeconds,
  getGarminStartDate,
} from "./garminActivityNormalizer.service.js";

const EXACT_WINDOW_MS = 2 * 60 * 1000;
const PROBABLE_WINDOW_MS = 10 * 60 * 1000;
const AMBIGUOUS_SCORE_DELTA = 8;

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

function isRunLikeSport(value) {
  const sport = normalizeSportText(value);
  return sport.includes("run") || sport.includes("trail") || sport.includes("course");
}

function isHikeLikeSport(value) {
  const sport = normalizeSportText(value);
  return sport.includes("hike") || sport.includes("hiking") || sport.includes("randon");
}

export function areProviderSportsCompatible(activity, providerActivity) {
  const activitySport = activity?.sportType || activity?.type;
  const providerSport = providerActivity?.sportType || providerActivity?.type || providerActivity?.activityType;

  if (!activitySport || !providerSport) {
    return true;
  }

  if (isHikeLikeSport(activitySport) || isHikeLikeSport(providerSport)) {
    return isHikeLikeSport(activitySport) === isHikeLikeSport(providerSport);
  }

  return isRunLikeSport(activitySport) === isRunLikeSport(providerSport);
}

function buildDifferenceRatio(a, b) {
  const left = toNumber(a);
  const right = toNumber(b);

  if (!left || !right || left <= 0 || right <= 0) {
    return null;
  }

  return Math.abs(left - right) / Math.max(left, right);
}

export function scoreProviderActivityMatch(activity, providerActivity) {
  const activityStartDate = parseDate(activity?.startDateLocal || activity?.startDate);
  const providerStartDate = providerActivity?.startDate || getGarminStartDate(providerActivity);

  if (!activityStartDate || !providerStartDate) {
    return null;
  }

  const deltaMs = Math.abs(providerStartDate.getTime() - activityStartDate.getTime());

  if (deltaMs > PROBABLE_WINDOW_MS) {
    return null;
  }

  if (!areProviderSportsCompatible(activity, providerActivity)) {
    return {
      status: "rejected",
      score: 0,
      deltaSeconds: Math.round(deltaMs / 1000),
      distanceRatio: null,
      durationRatio: null,
      reason: "type_incompatible",
    };
  }

  const providerDistance = providerActivity?.distance ?? getGarminDistanceMeters(providerActivity);
  const providerDuration = providerActivity?.duration ?? providerActivity?.movingDuration ?? getGarminDurationSeconds(providerActivity);
  const distanceRatio = buildDifferenceRatio(activity?.distance, providerDistance);
  const durationRatio = buildDifferenceRatio(activity?.movingTime, providerDuration);

  if ((distanceRatio !== null && distanceRatio > 0.15) || (durationRatio !== null && durationRatio > 0.20)) {
    return null;
  }

  const timeScore = 50 * (1 - deltaMs / PROBABLE_WINDOW_MS);
  const distanceScore = distanceRatio === null ? 12 : 25 * (1 - Math.min(1, distanceRatio / 0.15));
  const durationScore = durationRatio === null ? 8 : 15 * (1 - Math.min(1, durationRatio / 0.20));
  const sportScore = 10;
  const score = Math.max(0, timeScore + distanceScore + durationScore + sportScore);

  return {
    status: deltaMs <= EXACT_WINDOW_MS ? "exact" : "probable",
    score: Math.round(score * 10) / 10,
    deltaSeconds: Math.round(deltaMs / 1000),
    distanceRatio,
    durationRatio,
  };
}

export function findBestActivityProviderMatch(providerActivity, activities = []) {
  const candidates = activities
    .map((activity) => ({
      activity,
      matchResult: scoreProviderActivityMatch(activity, providerActivity),
    }))
    .filter((candidate) => candidate.matchResult && candidate.matchResult.status !== "rejected")
    .sort((left, right) => right.matchResult.score - left.matchResult.score);

  const best = candidates[0] || null;

  if (!best) {
    return {
      status: "not_found",
      candidate: null,
      candidates,
    };
  }

  const second = candidates[1] || null;
  if (second && best.matchResult.score - second.matchResult.score < AMBIGUOUS_SCORE_DELTA) {
    return {
      status: "ambiguous",
      candidate: best,
      candidates,
    };
  }

  return {
    status: best.matchResult.status,
    candidate: best,
    candidates,
  };
}
