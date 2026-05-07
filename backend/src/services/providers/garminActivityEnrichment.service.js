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
import {
  buildCanonicalActivityDataFromGarmin,
  isSupportedGarminActivityType,
  normalizeGarminActivity as normalizeGarminActivityCandidate,
} from "./garminActivityNormalizer.service.js";
import { upsertCanonicalProviderActivity } from "../../repositories/activity.repository.js";

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

function getGarminRecoveryTimeHours(rawActivity) {
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

  if (payload.mode === "recent_missing") {
    const days = Math.min(
      DEFAULT_LOOKBACK_DAYS,
      Math.max(1, Number(payload.days || DEFAULT_LOOKBACK_DAYS)),
    );
    const endDate = new Date();
    const startDate = addDays(endDate, -(days - 1));

    return {
      ...clampDateRange(startDate, endDate),
      stravaActivityId: "",
      targeted: false,
      mode: "recent_missing",
      days,
    };
  }

  return {
    ...clampDateRange(payload.startDate, payload.endDate),
    stravaActivityId: "",
    targeted: false,
    mode: "period",
  };
}

async function filterAlreadyEnrichedActivities(appUserId, stravaActivities = [], options = {}) {
  if (options.force || !stravaActivities.length) {
    return stravaActivities;
  }

  const enrichments = await prisma.activityProviderEnrichment.findMany({
    where: {
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      activityId: {
        in: stravaActivities.map((activity) => activity.id),
      },
      status: {
        in: ["matched_exact", "matched_tolerated"],
      },
    },
    select: {
      activityId: true,
    },
  });
  const enrichedActivityIds = new Set(enrichments.map((enrichment) => enrichment.activityId));

  return stravaActivities.filter((activity) => !enrichedActivityIds.has(activity.id));
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

function mapLinkStatus(matchStatus) {
  if (matchStatus === "matched_exact") {
    return "exact";
  }

  if (matchStatus === "matched_tolerated") {
    return "probable";
  }

  return matchStatus || "not_found";
}

async function upsertActivityProviderLink({
  appUserId,
  activityId = null,
  normalizedActivity,
  rawData = null,
  matchStatus,
  matchConfidence = null,
}) {
  if (!normalizedActivity?.providerActivityId) {
    return null;
  }

  return prisma.activityProviderLink.upsert({
    where: {
      appUserId_provider_providerActivityId: {
        appUserId,
        provider: GARMIN_PROVIDER_CODE,
        providerActivityId: normalizedActivity.providerActivityId,
      },
    },
    create: {
      appUserId,
      activityId,
      provider: GARMIN_PROVIDER_CODE,
      providerActivityId: normalizedActivity.providerActivityId,
      matchStatus,
      matchConfidence,
      matchedAt: new Date(),
      rawDataId: rawData?.id || null,
    },
    update: {
      activityId,
      matchStatus,
      matchConfidence,
      matchedAt: new Date(),
      rawDataId: rawData?.id || null,
    },
  });
}

export async function enrichGarminActivitiesForUser(appUserId, payload = {}) {
  const { session } = await requireConnectedGarminSession(appUserId);
  const period = await resolveEnrichmentPeriod(appUserId, payload);
  const dryRun = Boolean(payload.dryRun);
  const allowGarminOnly = Boolean(payload.allowGarminOnly);
  const allStravaActivities = await listUserStravaActivities(appUserId, period);
  const stravaActivities = period.mode === "recent_missing"
    ? await filterAlreadyEnrichedActivities(appUserId, allStravaActivities, { force: payload.force })
    : allStravaActivities;

  if (period.mode === "recent_missing" && stravaActivities.length === 0 && !allowGarminOnly) {
    return {
      providerCode: GARMIN_PROVIDER_CODE,
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        targeted: period.targeted,
        stravaActivityId: null,
        maxLookbackDays: MAX_LOOKBACK_DAYS,
        mode: period.mode,
        days: period.days,
      },
      dryRun,
      fetchedCount: 0,
      stravaCandidateCount: 0,
      stravaCandidateTotalCount: allStravaActivities.length,
      skippedAlreadyEnrichedCount: allStravaActivities.length,
      rawUpsertedCount: 0,
      enrichmentUpsertedCount: 0,
      matchedCount: 0,
      ambiguousCount: 0,
      notFoundCount: 0,
      fieldCoverage: {},
      items: [],
      skippedReason: "no_recent_missing_strava_activity",
    };
  }

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
  const fieldCoverage = bridgeResult.fieldCoverage && typeof bridgeResult.fieldCoverage === "object"
    ? bridgeResult.fieldCoverage
    : {};
  const items = [];
  let rawUpsertedCount = 0;
  let enrichmentUpsertedCount = 0;
  let garminOnlyCreatedCount = 0;
  let garminOnlyUpdatedCount = 0;
  let unsupportedTypeCount = 0;
  let matchedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;

  for (const rawActivity of rawActivities) {
    const normalizedActivity = normalizeGarminActivityCandidate(rawActivity);

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
      if (!dryRun) {
        await upsertActivityProviderLink({
          appUserId,
          normalizedActivity,
          rawData,
          matchStatus: "ambiguous",
          matchConfidence: match.candidate?.matchResult?.score || null,
        });
      }
      continue;
    }

    if (match.status === "not_found") {
      notFoundCount += 1;

      if (!allowGarminOnly) {
        continue;
      }

      if (!isSupportedGarminActivityType(rawActivity)) {
        unsupportedTypeCount += 1;
        if (!dryRun) {
          await upsertActivityProviderLink({
            appUserId,
            normalizedActivity,
            rawData,
            matchStatus: "rejected",
            matchConfidence: null,
          });
        }
        continue;
      }

      const canonicalData = buildCanonicalActivityDataFromGarmin(appUserId, normalizedActivity, rawActivity);
      if (!canonicalData) {
        continue;
      }

      if (dryRun) {
        continue;
      }

      const existing = await prisma.activity.findUnique({
        where: {
          appUserId_sourceProvider_sourceActivityId: {
            appUserId,
            sourceProvider: canonicalData.sourceProvider,
            sourceActivityId: canonicalData.sourceActivityId,
          },
        },
        select: { id: true },
      });
      const canonicalActivity = await upsertCanonicalProviderActivity(appUserId, canonicalData);
      if (existing) {
        garminOnlyUpdatedCount += 1;
      } else {
        garminOnlyCreatedCount += 1;
      }

      await upsertActivityProviderLink({
        appUserId,
        activityId: canonicalActivity.id,
        normalizedActivity,
        rawData,
        matchStatus: "not_found",
        matchConfidence: null,
      });
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

    await upsertActivityProviderLink({
      appUserId,
      activityId: match.candidate.stravaActivity.id,
      normalizedActivity,
      rawData,
      matchStatus: mapLinkStatus(match.status),
      matchConfidence: match.candidate.matchResult.score,
    });
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
    stravaCandidateTotalCount: allStravaActivities.length,
    skippedAlreadyEnrichedCount: Math.max(0, allStravaActivities.length - stravaActivities.length),
    rawUpsertedCount,
    enrichmentUpsertedCount,
    garminOnlyCreatedCount,
    garminOnlyUpdatedCount,
    unsupportedTypeCount,
    matchedCount,
    ambiguousCount,
    notFoundCount,
    fieldCoverage,
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

export {
  findBestStravaMatch,
  getGarminRecoveryTimeHours,
  normalizeGarminActivity,
  scoreGarminMatch,
};
