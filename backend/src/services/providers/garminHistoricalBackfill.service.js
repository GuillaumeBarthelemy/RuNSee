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
      matched: Number(extras.matched || 0),
      createdGarminOnly: Number(extras.createdGarminOnly || 0),
      ambiguous: Number(extras.ambiguous || 0),
      rejected: Number(extras.rejected || 0),
    },
    ...extras,
  };
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

export async function getGarminActivityBackfillStatusForUser(appUserId) {
  const cursor = await getOrCreateCursor(appUserId);
  return buildPublicCursor(cursor);
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
    runGarminActivityBackfillWindowForUser(appUserId, { triggerSource: "manual-start", force: true })
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

    if (!isWindowDue(cursor, { force: Boolean(options.force) })) {
      return {
        message: "Prochaine tranche Garmin pas encore due.",
        backfill: buildPublicCursor(cursor),
        skipped: true,
      };
    }

    const window = calculateGarminBackfillWindow(cursor.nextWindowEndDate || new Date(), cursor.windowDays);
    const windowStartKey = formatDate(window.startDate);
    const windowEndKey = formatDate(window.endDate);

    await prisma.providerBackfillCursor.update({
      where: { id: cursor.id },
      data: {
        lastRunAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    const result = await enrichGarminActivitiesForUser(appUserId, {
      startDate: windowStartKey,
      endDate: windowEndKey,
      allowGarminOnly: true,
      force: true,
    });
    const summary = summarizeWindowResult(result);
    const duplicateReport = await detectProviderActivityDuplicates({ appUserId, minScore: 70 });

    if (duplicateReport.duplicateCount > 0) {
      const errorCursor = await prisma.providerBackfillCursor.update({
        where: { id: cursor.id },
        data: {
          status: "error",
          lastErrorCode: "PROVIDER_DUPLICATE_DETECTED",
          lastErrorMessage: `${duplicateReport.duplicateCount} doublon(s) Garmin/Strava detecte(s) apres tranche.`,
        },
      });

      return {
        message: "Import historique Garmin arrete pour proteger les donnees : doublons detectes.",
        backfill: buildPublicCursor(errorCursor, {
          duplicateReport,
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
        triggerSource: options.triggerSource || "manual",
      }),
    };
  } catch (error) {
    const cursor = await getOrCreateCursor(appUserId);
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
