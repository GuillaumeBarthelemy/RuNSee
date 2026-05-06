import { createHash } from "node:crypto";
import prisma from "../../config/prisma.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_DATA_TYPES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";
import { findExternalProviderConnectionForUser } from "./externalProviderConnection.service.js";
import { fetchGarminActivities } from "./garminconnectBridge.service.js";
import { decryptProviderSessionPayload } from "./providerSessionCrypto.service.js";

const GARMIN_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;
const ACTIVITY_DATA_TYPE = EXTERNAL_PROVIDER_DATA_TYPES.ACTIVITY_DETAIL;
const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_DAYS = 180;
const TARGET_WINDOW_DAYS = 1;
const MATCH_WINDOW_MS = 10 * 60 * 1000;
const AMBIGUOUS_SCORE_DELTA = 8;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

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

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toDateKey(date) {
  const value = parseDate(date);

  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function clampDateRange(startDate, endDate) {
  const normalizedEndDate = parseDate(endDate) || new Date();
  const normalizedStartDate = parseDate(startDate) || addDays(normalizedEndDate, -DEFAULT_LOOKBACK_DAYS);
  const maxStartDate = addDays(normalizedEndDate, -MAX_LOOKBACK_DAYS);
  const boundedStartDate = normalizedStartDate < maxStartDate ? maxStartDate : normalizedStartDate;

  if (boundedStartDate > normalizedEndDate) {
    throw buildHttpError(
      "Garmin activity enrichment period is invalid.",
      "La periode Garmin demandee est invalide.",
      400,
    );
  }

  return {
    startDate: toDateKey(boundedStartDate),
    endDate: toDateKey(normalizedEndDate),
  };
}

function buildPayloadHash(payload) {
  return createHash("sha256")
    .update(JSON.stringify(payload || {}))
    .digest("hex");
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

function getGarminActivityId(rawActivity) {
  return String(
    rawActivity?.activityId
      || rawActivity?.activityIdStr
      || rawActivity?.id
      || rawActivity?.activity_id
      || "",
  ).trim();
}

function getGarminStartDate(rawActivity) {
  return parseDate(rawActivity?.startTimeLocal || rawActivity?.startTimeGMT || rawActivity?.startTimeGmt);
}

function getGarminDistanceMeters(rawActivity) {
  return toNumber(rawActivity?.distance);
}

function getGarminDurationSeconds(rawActivity) {
  return toNumber(rawActivity?.movingDuration)
    || toNumber(rawActivity?.duration)
    || toNumber(rawActivity?.elapsedDuration);
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

function areSportsCompatible(stravaActivity, garminActivity) {
  const stravaSport = stravaActivity?.sportType || stravaActivity?.type;
  const garminSport = garminActivity?.activityType;

  if (!stravaSport || !garminSport) {
    return true;
  }

  return isRunLikeSport(stravaSport) === isRunLikeSport(garminSport);
}

function buildDifferenceRatio(a, b) {
  const left = toNumber(a);
  const right = toNumber(b);

  if (!left || !right || left <= 0 || right <= 0) {
    return null;
  }

  return Math.abs(left - right) / Math.max(left, right);
}

function scoreGarminMatch(stravaActivity, garminActivity) {
  const stravaStartDate = parseDate(stravaActivity?.startDateLocal || stravaActivity?.startDate);
  const garminStartDate = getGarminStartDate(garminActivity);

  if (!stravaStartDate || !garminStartDate) {
    return null;
  }

  const deltaMs = Math.abs(garminStartDate.getTime() - stravaStartDate.getTime());

  if (deltaMs > MATCH_WINDOW_MS) {
    return null;
  }

  const distanceRatio = buildDifferenceRatio(stravaActivity?.distance, getGarminDistanceMeters(garminActivity));
  const durationRatio = buildDifferenceRatio(stravaActivity?.movingTime, getGarminDurationSeconds(garminActivity));

  if ((distanceRatio !== null && distanceRatio > 0.15) || (durationRatio !== null && durationRatio > 0.20)) {
    return null;
  }

  if (!areSportsCompatible(stravaActivity, garminActivity)) {
    return null;
  }

  const timeScore = 50 * (1 - deltaMs / MATCH_WINDOW_MS);
  const distanceScore = distanceRatio === null ? 12 : 25 * (1 - Math.min(1, distanceRatio / 0.15));
  const durationScore = durationRatio === null ? 8 : 15 * (1 - Math.min(1, durationRatio / 0.20));
  const sportScore = areSportsCompatible(stravaActivity, garminActivity) ? 10 : 0;
  const score = Math.max(0, timeScore + distanceScore + durationScore + sportScore);

  return {
    score: Math.round(score * 10) / 10,
    deltaSeconds: Math.round(deltaMs / 1000),
    distanceRatio,
    durationRatio,
  };
}

function normalizeGarminActivity(rawActivity) {
  if (!rawActivity || typeof rawActivity !== "object") {
    return null;
  }

  return {
    providerCode: GARMIN_PROVIDER_CODE,
    providerActivityId: getGarminActivityId(rawActivity),
    activityName: rawActivity.activityName || null,
    activityType: rawActivity.activityType || null,
    startTimeLocal: rawActivity.startTimeLocal || null,
    startTimeGMT: rawActivity.startTimeGMT || rawActivity.startTimeGmt || null,
    distance: getGarminDistanceMeters(rawActivity),
    duration: getGarminDurationSeconds(rawActivity),
    elapsedDuration: toNumber(rawActivity.elapsedDuration),
    movingDuration: toNumber(rawActivity.movingDuration),
    elevationGain: toNumber(rawActivity.elevationGain),
    averageHR: toNumber(rawActivity.averageHR),
    maxHR: toNumber(rawActivity.maxHR),
    averageRunCadence: toNumber(rawActivity.averageRunCadence),
    averagePower: toNumber(rawActivity.averagePower),
    maxPower: toNumber(rawActivity.maxPower),
    aerobicTrainingEffect: toNumber(rawActivity.aerobicTrainingEffect || rawActivity.aerobicTrainingEffectScore),
    aerobicTrainingEffectMessage: rawActivity.aerobicTrainingEffectMessage || null,
    anaerobicTrainingEffect: toNumber(rawActivity.anaerobicTrainingEffect || rawActivity.anaerobicTrainingEffectScore),
    anaerobicTrainingEffectMessage: rawActivity.anaerobicTrainingEffectMessage || null,
    trainingEffectLabel: rawActivity.trainingEffectLabel || null,
    vO2MaxValue: toNumber(rawActivity.vO2MaxValue),
    performanceCondition: toNumber(rawActivity.performanceCondition),
    recoveryHeartRate: toNumber(rawActivity.recoveryHeartRate),
    recoveryTime: toNumber(rawActivity.recoveryTime),
    trainingLoad: toNumber(rawActivity.trainingLoad),
    trainingStressScore: toNumber(rawActivity.trainingStressScore),
    intensityFactor: toNumber(rawActivity.intensityFactor),
    epoc: toNumber(rawActivity.epoc),
    lactateThresholdBpm: toNumber(rawActivity.lactateThresholdBpm),
    lactateThresholdSpeed: toNumber(rawActivity.lactateThresholdSpeed),
  };
}

function hasUsefulGarminMetrics(normalizedActivity) {
  if (!normalizedActivity) {
    return false;
  }

  return [
    normalizedActivity.aerobicTrainingEffect,
    normalizedActivity.anaerobicTrainingEffect,
    normalizedActivity.vO2MaxValue,
    normalizedActivity.performanceCondition,
    normalizedActivity.recoveryHeartRate,
    normalizedActivity.recoveryTime,
    normalizedActivity.trainingLoad,
    normalizedActivity.epoc,
    normalizedActivity.lactateThresholdBpm,
    normalizedActivity.lactateThresholdSpeed,
  ].some((value) => value !== null && value !== undefined);
}

function serializeActivityEnrichment(enrichment) {
  if (!enrichment) {
    return null;
  }

  return {
    id: enrichment.id,
    providerCode: enrichment.providerCode,
    providerActivityId: enrichment.providerActivityId || "",
    matchConfidence: enrichment.matchConfidence,
    matchedAt: enrichment.matchedAt,
    status: enrichment.status,
    normalized: parseJsonSafe(enrichment.normalizedJson),
    rawDataId: enrichment.rawDataId || null,
    lastErrorCode: enrichment.lastErrorCode || "",
    lastErrorMessage: enrichment.lastErrorMessage || "",
    updatedAt: enrichment.updatedAt,
  };
}

async function requireConnectedGarminSession(appUserId) {
  const connection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);

  if (!connection || connection.status !== EXTERNAL_PROVIDER_STATUSES.CONNECTED || !connection.encryptedSession) {
    throw buildHttpError(
      "Garmin connection is not ready.",
      "Connecte Garmin avant de lancer l'enrichissement d'activite.",
      409,
    );
  }

  return {
    connection,
    session: decryptProviderSessionPayload(connection.encryptedSession, { parseJson: true }),
  };
}

async function listUserStravaActivities(appUserId, { startDate, endDate, stravaActivityId } = {}) {
  return prisma.activity.findMany({
    where: {
      ...(stravaActivityId ? { stravaActivityId: String(stravaActivityId) } : {}),
      startDate: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      },
      athlete: {
        is: {
          connection: {
            is: {
              appUserId,
            },
          },
        },
      },
    },
    orderBy: [
      { startDate: "asc" },
      { stravaActivityId: "asc" },
    ],
  });
}

async function resolveEnrichmentPeriod(appUserId, payload = {}) {
  const stravaActivityId = String(payload.stravaActivityId || "").trim();

  if (stravaActivityId) {
    const activity = await prisma.activity.findFirst({
      where: {
        stravaActivityId,
        athlete: {
          is: {
            connection: {
              is: {
                appUserId,
              },
            },
          },
        },
      },
      select: {
        startDate: true,
        startDateLocal: true,
      },
    });

    if (!activity) {
      throw buildHttpError(
        "Target Strava activity not found for Garmin enrichment.",
        "Activite Strava introuvable pour cet enrichissement Garmin.",
        404,
      );
    }

    const referenceDate = parseDate(activity.startDateLocal || activity.startDate);

    if (!referenceDate) {
      throw buildHttpError(
        "Target Strava activity has no usable date.",
        "Cette activite n'a pas de date exploitable pour le matching Garmin.",
        400,
      );
    }

    return {
      ...clampDateRange(addDays(referenceDate, -TARGET_WINDOW_DAYS), addDays(referenceDate, TARGET_WINDOW_DAYS)),
      stravaActivityId,
      targeted: true,
    };
  }

  return {
    ...clampDateRange(payload.startDate, payload.endDate),
    stravaActivityId: "",
    targeted: false,
  };
}

async function upsertRawGarminActivity(appUserId, rawActivity, normalizedActivity) {
  const payloadHash = buildPayloadHash(rawActivity);
  const providerActivityId = normalizedActivity.providerActivityId || `no-id-${payloadHash.slice(0, 16)}`;
  const providerDateKey = toDateKey(normalizedActivity.startTimeLocal || normalizedActivity.startTimeGMT) || "";
  const payloadJson = JSON.stringify(rawActivity || {});

  return prisma.externalProviderRawData.upsert({
    where: {
      appUserId_providerCode_dataType_providerDateKey_providerResourceId: {
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
        dataType: ACTIVITY_DATA_TYPE,
        providerDateKey,
        providerResourceId: providerActivityId,
      },
    },
    create: {
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      dataType: ACTIVITY_DATA_TYPE,
      providerDateKey,
      providerResourceId: providerActivityId,
      payloadJson,
      payloadHash,
      status: "success",
      syncedAt: new Date(),
    },
    update: {
      payloadJson,
      payloadHash,
      status: "success",
      syncedAt: new Date(),
    },
  });
}

async function upsertActivityProviderEnrichment({
  appUserId,
  stravaActivity,
  normalizedActivity,
  rawData,
  matchResult,
  status,
}) {
  return prisma.activityProviderEnrichment.upsert({
    where: {
      activityId_providerCode: {
        activityId: stravaActivity.id,
        providerCode: GARMIN_PROVIDER_CODE,
      },
    },
    create: {
      appUserId,
      activityId: stravaActivity.id,
      providerCode: GARMIN_PROVIDER_CODE,
      providerActivityId: normalizedActivity.providerActivityId || "",
      matchConfidence: matchResult.score,
      matchedAt: new Date(),
      status,
      normalizedJson: JSON.stringify(normalizedActivity),
      rawDataId: rawData.id,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
    update: {
      providerActivityId: normalizedActivity.providerActivityId || "",
      matchConfidence: matchResult.score,
      matchedAt: new Date(),
      status,
      normalizedJson: JSON.stringify(normalizedActivity),
      rawDataId: rawData.id,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });
}

function findBestStravaMatch(garminActivity, stravaActivities) {
  const candidates = stravaActivities
    .map((stravaActivity) => ({
      stravaActivity,
      matchResult: scoreGarminMatch(stravaActivity, garminActivity),
    }))
    .filter((candidate) => candidate.matchResult)
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
    status: best.matchResult.deltaSeconds <= 60 ? "matched_exact" : "matched_tolerated",
    candidate: best,
    candidates,
  };
}

function summarizeMatchItem(rawActivity, normalizedActivity, match) {
  return {
    providerActivityId: normalizedActivity.providerActivityId,
    providerDate: normalizedActivity.startTimeLocal || normalizedActivity.startTimeGMT || null,
    activityName: normalizedActivity.activityName || rawActivity?.activityName || "",
    status: match.status,
    stravaActivityId: match.candidate?.stravaActivity?.stravaActivityId || "",
    stravaActivityName: match.candidate?.stravaActivity?.name || "",
    matchConfidence: match.candidate?.matchResult?.score || null,
    deltaSeconds: match.candidate?.matchResult?.deltaSeconds || null,
    metricsAvailable: hasUsefulGarminMetrics(normalizedActivity),
  };
}

export async function enrichGarminActivitiesForUser(appUserId, payload = {}) {
  const { session } = await requireConnectedGarminSession(appUserId);
  const period = await resolveEnrichmentPeriod(appUserId, payload);
  const dryRun = Boolean(payload.dryRun);
  const bridgeResult = await fetchGarminActivities({
    session,
    startDate: period.startDate,
    endDate: period.endDate,
  });

  if (bridgeResult?.status === "expired") {
    throw buildHttpError(
      "Garmin session expired during activity enrichment.",
      "La session Garmin n'est plus valide. Reconnecte Garmin.",
      401,
    );
  }

  if (bridgeResult?.status === "rate_limited" || bridgeResult?.code === "GARMINCONNECT_RATE_LIMITED") {
    throw buildHttpError(
      "Garmin rate limited activity enrichment.",
      "Garmin limite temporairement la recuperation. Reessaie plus tard.",
      429,
    );
  }

  if (bridgeResult?.status !== "success") {
    throw buildHttpError(
      `Garmin activity enrichment failed: ${bridgeResult?.code || "unknown"}.`,
      bridgeResult?.message || "La recuperation des activites Garmin a echoue.",
      bridgeResult?.retryable ? 502 : 400,
    );
  }

  const rawActivities = Array.isArray(bridgeResult.activities) ? bridgeResult.activities : [];
  const stravaActivities = await listUserStravaActivities(appUserId, period);
  const items = [];
  let rawUpsertedCount = 0;
  let enrichmentUpsertedCount = 0;
  let matchedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;

  for (const rawActivity of rawActivities) {
    const normalizedActivity = normalizeGarminActivity(rawActivity);

    if (!normalizedActivity) {
      continue;
    }

    const rawData = dryRun
      ? null
      : await upsertRawGarminActivity(appUserId, rawActivity, normalizedActivity);

    if (rawData) {
      rawUpsertedCount += 1;
    }

    const match = findBestStravaMatch(normalizedActivity, stravaActivities);
    items.push(summarizeMatchItem(rawActivity, normalizedActivity, match));

    if (match.status === "ambiguous") {
      ambiguousCount += 1;
      continue;
    }

    if (match.status === "not_found") {
      notFoundCount += 1;
      continue;
    }

    matchedCount += 1;

    if (dryRun) {
      continue;
    }

    const enrichment = await upsertActivityProviderEnrichment({
      appUserId,
      stravaActivity: match.candidate.stravaActivity,
      normalizedActivity,
      rawData,
      matchResult: match.candidate.matchResult,
      status: match.status,
    });

    if (enrichment) {
      enrichmentUpsertedCount += 1;
    }
  }

  if (!dryRun) {
    await prisma.externalProviderConnection.update({
      where: {
        appUserId_providerCode: {
          appUserId,
          providerCode: GARMIN_PROVIDER_CODE,
        },
      },
      data: {
        lastSyncAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      },
    });
  }

  return {
    providerCode: GARMIN_PROVIDER_CODE,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
      targeted: period.targeted,
      stravaActivityId: period.stravaActivityId || null,
      maxLookbackDays: MAX_LOOKBACK_DAYS,
    },
    dryRun,
    fetchedCount: rawActivities.length,
    stravaCandidateCount: stravaActivities.length,
    rawUpsertedCount,
    enrichmentUpsertedCount,
    matchedCount,
    ambiguousCount,
    notFoundCount,
    items,
  };
}

export async function getGarminActivityEnrichmentForActivity(appUserId, activityId) {
  const enrichment = await prisma.activityProviderEnrichment.findFirst({
    where: {
      appUserId,
      activityId,
      providerCode: GARMIN_PROVIDER_CODE,
    },
  });

  return serializeActivityEnrichment(enrichment);
}

export function buildPublicGarminActivityEnrichment(enrichment) {
  return serializeActivityEnrichment(enrichment);
}
