import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";
import { findExternalProviderConnectionForUser } from "./externalProviderConnection.service.js";
import { enrichGarminActivitiesForUser } from "./garminActivityEnrichment.service.js";
import { detectProviderActivityDuplicates } from "./providerActivityDuplicateDetection.service.js";
import { sanitizeError } from "./loggerSanitization.js";

const GARMIN_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;
const RESOURCE_TYPE = "activities";
const MAX_EMPTY_LOOKBACK_YEARS = 10;
const runningWindows = new Set();
let startupTimer = null;
let intervalTimer = null;
let isSweepRunning = false;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toUtcDay(value) {
  const date = parseDate(value) || new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toDateKey(value) {
  const date = parseDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function formatDate(value) {
  return toDateKey(value) || null;
}

function getWindowDays(value = env.garminBackfillWindowDays) {
  return Math.max(1, Number(value || env.garminBackfillWindowDays || 180));
}

function getMinIntervalMs() {
  return env.garminBackfillMinIntervalMinutes * 60 * 1000;
}

function getScanIntervalMs() {
  return env.garminBackfillScanIntervalMinutes * 60 * 1000;
}

function getConfiguredMinDate() {
  return parseDate(env.garminBackfillMinDate);
}

function getEmptyHistoryCutoffDate(referenceDate = new Date()) {
  const cutoff = toUtcDay(referenceDate);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - MAX_EMPTY_LOOKBACK_YEARS);
  return cutoff;
}

export function calculateGarminBackfillWindow(nextWindowEndDate, windowDays = env.garminBackfillWindowDays) {
  const endDate = toUtcDay(nextWindowEndDate || new Date());
  const days = getWindowDays(windowDays);
  const startDate = addDays(endDate, -(days - 1));

  return {
    startDate,
    endDate,
    windowDays: days,
  };
}

export function calculatePreviousGarminWindowEndDate(windowStartDate) {
  return addDays(toUtcDay(windowStartDate), -1);
}

function estimateLastWindow(cursor) {
  if (!cursor?.oldestFetchedDate || !cursor?.lastSuccessAt) {
    return null;
  }

  const startDate = toUtcDay(cursor.oldestFetchedDate);
  const endDate = addDays(startDate, getWindowDays(cursor.windowDays) - 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

function getNextRunNotBefore(cursor) {
  if (!cursor?.lastRunAt || cursor.status !== "running") {
    return null;
  }

  return new Date(new Date(cursor.lastRunAt).getTime() + getMinIntervalMs());
}

function buildNextWindow(cursor) {
  if (!cursor?.nextWindowEndDate || !["running", "paused", "error", "idle"].includes(cursor.status)) {
    return null;
  }

  const window = calculateGarminBackfillWindow(cursor.nextWindowEndDate, cursor.windowDays);
  return {
    startDate: formatDate(window.startDate),
    endDate: formatDate(window.endDate),
  };
}

function buildPublicCursor(cursor, extras = {}) {
  const nextRunNotBefore = getNextRunNotBefore(cursor);
  const totalMatched = Number(extras.totalMatched ?? extras.matched ?? 0);
  const totalGarminOnlyCreated = Number(extras.totalGarminOnlyCreated ?? extras.createdGarminOnly ?? 0);
  const totalAmbiguous = Number(extras.totalAmbiguous ?? extras.ambiguous ?? 0);
  const totalRejected = Number(extras.totalRejected ?? extras.rejected ?? 0);

  return {
    provider: "garmin",
    providerCode: GARMIN_PROVIDER_CODE,
    resourceType: RESOURCE_TYPE,
    status: cursor?.status || "idle",
    windowDays: getWindowDays(cursor?.windowDays),
    lastRunAt: cursor?.lastRunAt || null,
    lastSuccessAt: cursor?.lastSuccessAt || null,
    nextRunNotBefore: nextRunNotBefore ? nextRunNotBefore.toISOString() : null,
    lastWindow: estimateLastWindow(cursor),
    nextWindow: buildNextWindow(cursor),
    lastErrorCode: cursor?.lastErrorCode || null,
    lastErrorMessage: cursor?.lastErrorMessage || null,
    totals: {
      windowsProcessed: Number(cursor?.totalWindowsProcessed || 0),
      activitiesImported: Number(cursor?.totalActivitiesImported || 0),
      matched: totalMatched,
      createdGarminOnly: totalGarminOnlyCreated,
      ambiguous: totalAmbiguous,
      rejected: totalRejected,
    },
    ...extras,
  };
}

async function getBackfillLogSummary(cursor) {
  if (!cursor?.id) {
    return {};
  }

  const [aggregate, latestLog] = await Promise.all([
    prisma.providerBackfillWindowLog.aggregate({
      where: { cursorId: cursor.id },
      _sum: {
        matchedCount: true,
        garminOnlyCreatedCount: true,
        ambiguousCount: true,
        rejectedCount: true,
      },
    }),
    prisma.providerBackfillWindowLog.findFirst({
      where: { cursorId: cursor.id },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const summary = {
    totalMatched: Number(aggregate._sum.matchedCount || 0),
    totalGarminOnlyCreated: Number(aggregate._sum.garminOnlyCreatedCount || 0),
    totalAmbiguous: Number(aggregate._sum.ambiguousCount || 0),
    totalRejected: Number(aggregate._sum.rejectedCount || 0),
    latestWindowStatus: latestLog?.status || null,
  };

  if (latestLog) {
    summary.lastWindow = {
      startDate: formatDate(latestLog.windowStartDate),
      endDate: formatDate(latestLog.windowEndDate),
    };
  }

  return summary;
}

async function getOrCreateCursor(appUserId) {
  const existing = await prisma.providerBackfillCursor.findUnique({
    where: {
      appUserId_provider_resourceType: {
        appUserId,
        provider: GARMIN_PROVIDER_CODE,
        resourceType: RESOURCE_TYPE,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.providerBackfillCursor.create({
    data: {
      appUserId,
      provider: GARMIN_PROVIDER_CODE,
      resourceType: RESOURCE_TYPE,
      status: "idle",
      windowDays: getWindowDays(),
      nextWindowEndDate: toUtcDay(new Date()),
    },
  });
}

async function requireConnectedGarmin(appUserId) {
  const connection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);
  if (
    !connection
      || connection.status !== EXTERNAL_PROVIDER_STATUSES.CONNECTED
      || !connection.encryptedSession
  ) {
    throw buildHttpError(
      "Garmin is not connected for historical activity backfill.",
      "Connecte Garmin avant de lancer l'import historique des activites.",
      409,
    );
  }

  return connection;
}

function shouldCompleteBackfill({ windowStartDate, nextWindowEndDate, fetchedCount }) {
  const minDate = getConfiguredMinDate();
  if (minDate && nextWindowEndDate < toUtcDay(minDate)) {
    return true;
  }

  if (fetchedCount > 0) {
    return false;
  }

  return windowStartDate <= getEmptyHistoryCutoffDate();
}

function isWindowDue(cursor, { force = false } = {}) {
  if (force) {
    return true;
  }

  const nextRunNotBefore = getNextRunNotBefore(cursor);
  return !nextRunNotBefore || nextRunNotBefore.getTime() <= Date.now();
}

export function resolveGarminBackfillForceRun(requestedForce, allowForce = env.garminBackfillAllowForceRun) {
  return Boolean(requestedForce && allowForce);
}

function summarizeWindowResult(result = {}) {
  return {
    fetchedCount: Number(result.fetchedCount || 0),
    rawUpsertedCount: Number(result.rawUpsertedCount || 0),
    matchedCount: Number(result.matchedCount || 0),
    garminOnlyCreatedCount: Number(result.garminOnlyCreatedCount || 0),
    garminOnlyUpdatedCount: Number(result.garminOnlyUpdatedCount || 0),
    ambiguousCount: Number(result.ambiguousCount || 0),
    unsupportedTypeCount: Number(result.unsupportedTypeCount || 0),
    notFoundCount: Number(result.notFoundCount || 0),
  };
}

function buildWindowResultJson(payload = {}) {
  return JSON.stringify(payload, (key, value) => {
    if (key.toLowerCase().includes("session") || key.toLowerCase().includes("token")) {
      return "[redacted]";
    }

    return value;
  });
}

async function createWindowLog({ cursor, window, status = "running" }) {
  return prisma.providerBackfillWindowLog.create({
    data: {
      cursorId: cursor.id,
      appUserId: cursor.appUserId,
      provider: GARMIN_PROVIDER_CODE,
      resourceType: RESOURCE_TYPE,
      windowStartDate: window.startDate,
      windowEndDate: window.endDate,
      status,
    },
  });
}

async function updateWindowLog(logId, data = {}) {
  if (!logId) {
    return null;
  }

  return prisma.providerBackfillWindowLog.update({
    where: { id: logId },
    data: {
      ...data,
      endedAt: data.endedAt || new Date(),
    },
  });
}

async function softMergeDetectedDuplicates(duplicateReport = {}) {
  const duplicates = Array.isArray(duplicateReport.duplicates) ? duplicateReport.duplicates : [];
  const results = [];

  for (const duplicate of duplicates) {
    const appUserId = duplicate.appUserId;
    const stravaActivityId = duplicate.stravaActivity?.id;
    const garminActivityId = duplicate.garminActivity?.id;
    const providerActivityId = String(duplicate.garminActivity?.sourceActivityId || "").trim();

    if (!appUserId || !stravaActivityId || !garminActivityId || !providerActivityId) {
      results.push({
        status: "skipped",
        reason: "missing_duplicate_identity",
      });
      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const garminEnrichment = await tx.activityProviderEnrichment.findUnique({
        where: {
          activityId_providerCode: {
            activityId: garminActivityId,
            providerCode: GARMIN_PROVIDER_CODE,
          },
        },
      });

      if (garminEnrichment) {
        const existingStravaEnrichment = await tx.activityProviderEnrichment.findUnique({
          where: {
            activityId_providerCode: {
              activityId: stravaActivityId,
              providerCode: GARMIN_PROVIDER_CODE,
            },
          },
          select: { id: true },
        });

        if (!existingStravaEnrichment) {
          await tx.activityProviderEnrichment.update({
            where: { id: garminEnrichment.id },
            data: {
              activityId: stravaActivityId,
              status: duplicate.status === "exact" ? "matched_exact" : "matched_tolerated",
              matchConfidence: duplicate.score,
              matchedAt: new Date(),
            },
          });
        }
      }

      await tx.activityProviderLink.upsert({
        where: {
          appUserId_provider_providerActivityId: {
            appUserId,
            provider: GARMIN_PROVIDER_CODE,
            providerActivityId,
          },
        },
        create: {
          appUserId,
          activityId: stravaActivityId,
          provider: GARMIN_PROVIDER_CODE,
          providerActivityId,
          matchStatus: duplicate.status,
          matchConfidence: duplicate.score,
          matchedAt: new Date(),
        },
        update: {
          activityId: stravaActivityId,
          matchStatus: duplicate.status,
          matchConfidence: duplicate.score,
          matchedAt: new Date(),
        },
      });

      await tx.activity.update({
        where: { id: garminActivityId },
        data: {
          isMerged: true,
          mergedIntoActivityId: stravaActivityId,
          mergedAt: new Date(),
          sourcePriority: "merged",
        },
      });

      return {
        status: "merged",
        garminActivityId,
        stravaActivityId,
        score: duplicate.score,
      };
    });

    results.push(result);
  }

  return {
    attemptedCount: duplicates.length,
    mergedCount: results.filter((result) => result.status === "merged").length,
    results,
  };
}

export async function getGarminActivityBackfillStatusForUser(appUserId) {
  const cursor = await getOrCreateCursor(appUserId);
  const logSummary = await getBackfillLogSummary(cursor);
  return buildPublicCursor(cursor, logSummary);
}

export async function startGarminActivityBackfillForUser(appUserId) {
  await requireConnectedGarmin(appUserId);
  const cursor = await getOrCreateCursor(appUserId);

  if (cursor.status === "running") {
    return {
      message: "Import historique Garmin deja en cours.",
      backfill: buildPublicCursor(cursor, { alreadyRunning: true }),
    };
  }

  if (cursor.status === "completed") {
    return {
      message: "Import historique Garmin deja termine.",
      backfill: buildPublicCursor(cursor, { alreadyCompleted: true }),
    };
  }

  const nextWindowEndDate = cursor.nextWindowEndDate || toUtcDay(new Date());
  const updatedCursor = await prisma.providerBackfillCursor.update({
    where: { id: cursor.id },
    data: {
      status: "running",
      nextWindowEndDate,
      windowDays: getWindowDays(cursor.windowDays),
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });

  setTimeout(() => {
    runGarminActivityBackfillWindowForUser(appUserId, { triggerSource: "manual-start" })
      .catch((error) => {
        console.error("Garmin historical activity backfill first window failed:", {
          userRef: appUserId.slice(0, 8),
          error: sanitizeError(error),
        });
      });
  }, 0);

  return {
    message: "Import historique Garmin lance. La premiere tranche demarre maintenant.",
    backfill: buildPublicCursor(updatedCursor, { status: "started" }),
  };
}

export async function pauseGarminActivityBackfillForUser(appUserId) {
  const cursor = await getOrCreateCursor(appUserId);
  const updatedCursor = await prisma.providerBackfillCursor.update({
    where: { id: cursor.id },
    data: {
      status: "paused",
    },
  });

  return {
    message: "Import historique Garmin mis en pause.",
    backfill: buildPublicCursor(updatedCursor),
  };
}

export async function resumeGarminActivityBackfillForUser(appUserId) {
  await requireConnectedGarmin(appUserId);
  const cursor = await getOrCreateCursor(appUserId);

  if (cursor.status === "completed") {
    return {
      message: "Import historique Garmin deja termine.",
      backfill: buildPublicCursor(cursor, { alreadyCompleted: true }),
    };
  }

  const updatedCursor = await prisma.providerBackfillCursor.update({
    where: { id: cursor.id },
    data: {
      status: "running",
      lastErrorCode: null,
      lastErrorMessage: null,
      nextWindowEndDate: cursor.nextWindowEndDate || toUtcDay(new Date()),
    },
  });

  return {
    message: "Import historique Garmin repris.",
    backfill: buildPublicCursor(updatedCursor),
  };
}

export async function runGarminActivityBackfillWindowForUser(appUserId, options = {}) {
  await requireConnectedGarmin(appUserId);
  const lockKey = String(appUserId);
  const requestedForce = Boolean(options.force);
  const force = resolveGarminBackfillForceRun(requestedForce);
  let windowLog = null;

  if (runningWindows.has(lockKey)) {
    return {
      message: "Une tranche Garmin est deja en cours.",
      backfill: await getGarminActivityBackfillStatusForUser(appUserId),
      alreadyRunningWindow: true,
    };
  }

  runningWindows.add(lockKey);

  try {
    const cursor = await getOrCreateCursor(appUserId);

    if (cursor.status !== "running") {
      return {
        message: `Import Garmin non actif (${cursor.status}).`,
        backfill: buildPublicCursor(cursor),
        skipped: true,
      };
    }

    if (requestedForce && !env.garminBackfillAllowForceRun) {
      return {
        message: "Execution forcee Garmin desactivee cote serveur.",
        backfill: buildPublicCursor(cursor, { forceDenied: true }),
        skipped: true,
      };
    }

    if (!isWindowDue(cursor, { force })) {
      return {
        message: "Prochaine tranche Garmin pas encore due.",
        backfill: buildPublicCursor(cursor),
        skipped: true,
      };
    }

    const window = calculateGarminBackfillWindow(cursor.nextWindowEndDate || new Date(), cursor.windowDays);
    const windowStartKey = formatDate(window.startDate);
    const windowEndKey = formatDate(window.endDate);
    windowLog = await createWindowLog({ cursor, window });

    await prisma.providerBackfillCursor.update({
      where: { id: cursor.id },
      data: {
        lastRunAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    const duplicatePreflight = await detectProviderActivityDuplicates({ appUserId, minScore: 70 });
    if (duplicatePreflight.duplicateCount > 0) {
      await updateWindowLog(windowLog.id, {
        status: "error",
        duplicateCountAfterWindow: duplicatePreflight.duplicateCount,
        resultJson: buildWindowResultJson({ duplicatePreflight }),
        errorCode: "PROVIDER_DUPLICATE_PREFLIGHT",
        errorMessage: `${duplicatePreflight.duplicateCount} doublon(s) Garmin/Strava actif(s) detecte(s) avant tranche.`,
      });

      const errorCursor = await prisma.providerBackfillCursor.update({
        where: { id: cursor.id },
        data: {
          status: "error",
          lastErrorCode: "PROVIDER_DUPLICATE_PREFLIGHT",
          lastErrorMessage: `${duplicatePreflight.duplicateCount} doublon(s) Garmin/Strava actif(s) detecte(s) avant tranche.`,
        },
      });

      return {
        message: "Import historique Garmin bloque : doublons actifs detectes avant ecriture.",
        backfill: buildPublicCursor(errorCursor, { duplicateReport: duplicatePreflight }),
      };
    }

    const preflightResult = await enrichGarminActivitiesForUser(appUserId, {
      startDate: windowStartKey,
      endDate: windowEndKey,
      allowGarminOnly: true,
      force: true,
      dryRun: true,
    });
    const preflightSummary = summarizeWindowResult(preflightResult);

    const result = await enrichGarminActivitiesForUser(appUserId, {
      startDate: windowStartKey,
      endDate: windowEndKey,
      allowGarminOnly: true,
      force: true,
    });
    const summary = summarizeWindowResult(result);
    const duplicateReport = await detectProviderActivityDuplicates({ appUserId, minScore: 70 });
    let repairedDuplicateReport = null;
    let duplicateRepair = null;

    if (duplicateReport.duplicateCount > 0) {
      duplicateRepair = await softMergeDetectedDuplicates(duplicateReport);
      repairedDuplicateReport = await detectProviderActivityDuplicates({ appUserId, minScore: 70 });
    }

    if (repairedDuplicateReport?.duplicateCount > 0) {
      await updateWindowLog(windowLog.id, {
        status: "error",
        fetchedCount: summary.fetchedCount,
        rawUpsertedCount: summary.rawUpsertedCount,
        matchedCount: summary.matchedCount,
        garminOnlyCreatedCount: summary.garminOnlyCreatedCount,
        garminOnlyUpdatedCount: summary.garminOnlyUpdatedCount,
        ambiguousCount: summary.ambiguousCount,
        rejectedCount: summary.unsupportedTypeCount,
        duplicateCountAfterWindow: repairedDuplicateReport.duplicateCount,
        resultJson: buildWindowResultJson({
          preflightSummary,
          summary,
          duplicateReport,
          duplicateRepair,
          repairedDuplicateReport,
        }),
        errorCode: "PROVIDER_DUPLICATE_DETECTED",
        errorMessage: `${repairedDuplicateReport.duplicateCount} doublon(s) Garmin/Strava detecte(s) apres tranche.`,
      });

      const errorCursor = await prisma.providerBackfillCursor.update({
        where: { id: cursor.id },
        data: {
          status: "error",
          lastErrorCode: "PROVIDER_DUPLICATE_DETECTED",
          lastErrorMessage: `${repairedDuplicateReport.duplicateCount} doublon(s) Garmin/Strava detecte(s) apres tranche.`,
        },
      });

      return {
        message: "Import historique Garmin arrete pour proteger les donnees : doublons detectes.",
        backfill: buildPublicCursor(errorCursor, {
          duplicateReport: repairedDuplicateReport,
          duplicateRepair,
          matched: summary.matchedCount,
          createdGarminOnly: summary.garminOnlyCreatedCount,
          ambiguous: summary.ambiguousCount,
          rejected: summary.unsupportedTypeCount,
        }),
      };
    }

    const nextWindowEndDate = calculatePreviousGarminWindowEndDate(window.startDate);
    const completed = shouldCompleteBackfill({
      windowStartDate: window.startDate,
      nextWindowEndDate,
      fetchedCount: summary.fetchedCount,
    });
    const updatedCursor = await prisma.providerBackfillCursor.update({
      where: { id: cursor.id },
      data: {
        status: completed ? "completed" : "running",
        nextWindowEndDate: completed ? null : nextWindowEndDate,
        oldestFetchedDate: window.startDate,
        lastSuccessAt: new Date(),
        totalWindowsProcessed: { increment: 1 },
        totalActivitiesImported: {
          increment: summary.rawUpsertedCount || summary.fetchedCount,
        },
      },
    });
    await updateWindowLog(windowLog.id, {
      status: completed ? "completed" : "success",
      fetchedCount: summary.fetchedCount,
      rawUpsertedCount: summary.rawUpsertedCount,
      matchedCount: summary.matchedCount,
      garminOnlyCreatedCount: summary.garminOnlyCreatedCount,
      garminOnlyUpdatedCount: summary.garminOnlyUpdatedCount,
      ambiguousCount: summary.ambiguousCount,
      rejectedCount: summary.unsupportedTypeCount,
      duplicateCountAfterWindow: repairedDuplicateReport?.duplicateCount ?? duplicateReport.duplicateCount ?? 0,
      resultJson: buildWindowResultJson({
        preflightSummary,
        summary,
        duplicateReport,
        duplicateRepair,
      }),
    });

    return {
      message: completed
        ? "Import historique Garmin termine."
        : "Tranche Garmin traitee. La suivante sera lancee automatiquement apres le delai de securite.",
      backfill: buildPublicCursor(updatedCursor, {
        lastWindow: {
          startDate: windowStartKey,
          endDate: windowEndKey,
        },
        matched: summary.matchedCount,
        createdGarminOnly: summary.garminOnlyCreatedCount,
        ambiguous: summary.ambiguousCount,
        rejected: summary.unsupportedTypeCount,
        windowResult: summary,
        duplicateReport,
        duplicateRepair,
        triggerSource: options.triggerSource || "manual",
      }),
    };
  } catch (error) {
    const cursor = await getOrCreateCursor(appUserId);
    await updateWindowLog(windowLog?.id, {
      status: "error",
      errorCode: error?.code || error?.name || "GARMIN_BACKFILL_WINDOW_FAILED",
      errorMessage: error?.userMessage || error?.message || "Erreur Garmin pendant l'import historique.",
      resultJson: buildWindowResultJson({ error: sanitizeError(error) }),
    });

    const updatedCursor = await prisma.providerBackfillCursor.update({
      where: { id: cursor.id },
      data: {
        status: "error",
        lastErrorCode: error?.code || error?.name || "GARMIN_BACKFILL_WINDOW_FAILED",
        lastErrorMessage: error?.userMessage || error?.message || "Erreur Garmin pendant l'import historique.",
      },
    });

    console.error("Garmin historical activity backfill window failed:", {
      userRef: appUserId.slice(0, 8),
      error: sanitizeError(error),
    });

    return {
      message: "Import historique Garmin mis en erreur controlee. Le curseur n'a pas avance.",
      backfill: buildPublicCursor(updatedCursor),
      error: sanitizeError(error),
    };
  } finally {
    runningWindows.delete(lockKey);
  }
}

export async function runDueGarminActivityBackfillWindows() {
  if (isSweepRunning) {
    return {
      alreadyRunning: true,
      processedCount: 0,
      skippedCount: 0,
    };
  }

  isSweepRunning = true;

  try {
    const cursors = await prisma.providerBackfillCursor.findMany({
      where: {
        provider: GARMIN_PROVIDER_CODE,
        resourceType: RESOURCE_TYPE,
        status: "running",
      },
      orderBy: [
        { lastRunAt: "asc" },
        { updatedAt: "asc" },
      ],
      take: env.garminBackfillMaxWindowsPerRun,
    });

    let processedCount = 0;
    let skippedCount = 0;

    for (const cursor of cursors) {
      if (!isWindowDue(cursor)) {
        skippedCount += 1;
        continue;
      }

      const result = await runGarminActivityBackfillWindowForUser(cursor.appUserId, {
        triggerSource: "scheduler",
      });

      if (result?.skipped) {
        skippedCount += 1;
      } else {
        processedCount += 1;
      }
    }

    return {
      processedCount,
      skippedCount,
      candidateCount: cursors.length,
    };
  } finally {
    isSweepRunning = false;
  }
}

export function startAutoGarminActivityBackfillScheduler() {
  if (startupTimer || intervalTimer) {
    return;
  }

  const scanIntervalMs = getScanIntervalMs();
  startupTimer = setTimeout(() => {
    startupTimer = null;
    runDueGarminActivityBackfillWindows().catch((error) => {
      console.error("Auto Garmin activity backfill startup sweep failed:", sanitizeError(error));
    });
  }, Math.min(scanIntervalMs, 60 * 1000));

  intervalTimer = setInterval(() => {
    runDueGarminActivityBackfillWindows().catch((error) => {
      console.error("Auto Garmin activity backfill sweep failed:", sanitizeError(error));
    });
  }, scanIntervalMs);

  if (typeof startupTimer?.unref === "function") {
    startupTimer.unref();
  }

  if (typeof intervalTimer?.unref === "function") {
    intervalTimer.unref();
  }

  console.log(
    `Auto Garmin activity backfill scheduler started. scanInterval=${env.garminBackfillScanIntervalMinutes}min minWindowInterval=${env.garminBackfillMinIntervalMinutes}min`,
  );
}
