import prisma from "../../config/prisma.js";
import { getValidAccessToken } from "../strava/stravaAuth.service.js";
import {
  listAthleteActivities,
  getActivityById,
} from "../strava/stravaActivity.service.js";
import {
  saveSummaryActivity,
  saveDetailedActivity,
  getLatestStoredActivity,
} from "../../repositories/activity.repository.js";

const FETCH_DETAILS_IN_INCREMENTAL =
  String(process.env.STRAVA_INCREMENTAL_FETCH_DETAILS || "true").toLowerCase() !== "false";

const SYNC_AFTER_OVERLAP_SECONDS = Number(process.env.SYNC_AFTER_OVERLAP_SECONDS || 3600);

function toEpochSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

async function getActiveConnectionWithAthlete() {
  const connection = await prisma.stravaConnection.findFirst({
    where: { isActive: true },
    include: { athlete: true },
    orderBy: { connectedAt: "desc" },
  });

  if (!connection || !connection.athlete) {
    const error = new Error("No active Strava connection with athlete found.");
    error.httpStatus = 400;
    error.userMessage = "Aucune connexion Strava active n'a été trouvée.";
    throw error;
  }

  return connection;
}

async function setCursor(appUserId, cursorName, cursorValue) {
  await prisma.syncCursor.upsert({
    where: {
      appUserId_cursorName: {
        appUserId,
        cursorName,
      },
    },
    update: {
      cursorValue,
    },
    create: {
      appUserId,
      cursorName,
      cursorValue,
    },
  });
}

async function getCursor(appUserId, cursorName) {
  return prisma.syncCursor.findUnique({
    where: {
      appUserId_cursorName: {
        appUserId,
        cursorName,
      },
    },
  });
}

function buildRateLimitSnapshot(headers = {}) {
  const limit = headers["x-ratelimit-limit"] || headers["X-RateLimit-Limit"] || null;
  const usage = headers["x-ratelimit-usage"] || headers["X-RateLimit-Usage"] || null;
  const readLimit =
    headers["x-readratelimit-limit"] || headers["X-ReadRateLimit-Limit"] || null;
  const readUsage =
    headers["x-readratelimit-usage"] || headers["X-ReadRateLimit-Usage"] || null;

  return {
    limit,
    usage,
    readLimit,
    readUsage,
  };
}

function buildStravaError(error) {
  const response = error?.response;
  const status = response?.status;
  const message =
    response?.data?.message ||
    response?.data?.errors?.map((item) => item.resource || item.code || item.field).join(", ") ||
    error.message;

  const rateLimits = buildRateLimitSnapshot(response?.headers || {});
  const details = {
    status,
    message,
    rateLimits,
    responseData: response?.data || null,
  };

  const finalError = new Error(message);
  finalError.httpStatus = status || 500;
  finalError.userMessage =
    status === 429
      ? "La limite API Strava a été atteinte. Relance la synchronisation plus tard."
      : "La synchronisation a échoué côté Strava.";
  finalError.details = details;

  return finalError;
}

async function updateJob(jobId, data) {
  return prisma.syncJob.update({
    where: { id: jobId },
    data,
  });
}

async function markJobRunning(jobId, message, requestedAfterEpoch = null) {
  await updateJob(jobId, {
    status: "running",
    startedAt: new Date(),
    message,
    requestedAfterEpoch,
    progressPercent: 0,
  });
}

async function markJobSuccess(jobId, message, result = null) {
  await updateJob(jobId, {
    status: "success",
    endedAt: new Date(),
    progressPercent: 100,
    message,
    resultJson: result ? JSON.stringify(result) : null,
  });
}

async function markJobFailed(jobId, error) {
  await updateJob(jobId, {
    status: "failed",
    endedAt: new Date(),
    message: error.userMessage || "La synchronisation a échoué.",
    errorDetails: JSON.stringify(error.details || { message: error.message }),
  });
}

async function refreshCursorFromLatestActivity(appUserId, athleteId) {
  const latestActivity = await getLatestStoredActivity(athleteId);

  if (!latestActivity?.startDate) {
    return null;
  }

  const latestEpoch = String(toEpochSeconds(latestActivity.startDate));

  await setCursor(appUserId, "last_activity_sync_after_epoch", latestEpoch);

  return latestEpoch;
}

function computeIncrementalAfterEpoch(cursorValue) {
  if (!cursorValue) {
    return undefined;
  }

  const parsed = Number(cursorValue);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, parsed - SYNC_AFTER_OVERLAP_SECONDS);
}

async function processSummaryActivity(jobId, athleteId, activity, counters) {
  const result = await saveSummaryActivity(activity, athleteId);

  counters.activitiesSeen += 1;

  if (result.operation === "created") {
    counters.activitiesInserted += 1;
  } else {
    counters.activitiesUpdated += 1;
  }

  await updateJob(jobId, {
    activitiesSeen: counters.activitiesSeen,
    activitiesInserted: counters.activitiesInserted,
    activitiesUpdated: counters.activitiesUpdated,
    lastProcessedActivityId: String(activity.id),
    lastProcessedActivityDate: activity.start_date ? new Date(activity.start_date) : null,
  });
}

async function processDetailedActivity(jobId, athleteId, accessToken, activityId, counters) {
  const { data: detailed, headers } = await getActivityById(accessToken, activityId);
  const result = await saveDetailedActivity(detailed, athleteId);

  counters.detailsFetched += 1;

  if (result.operation === "created") {
    counters.activitiesInserted += 1;
  }

  await updateJob(jobId, {
    detailsFetched: counters.detailsFetched,
    activitiesInserted: counters.activitiesInserted,
    activitiesUpdated: counters.activitiesUpdated,
    resultJson: JSON.stringify({
      lastRateLimits: buildRateLimitSnapshot(headers),
    }),
  });
}

export async function executeHistoricalSyncJob(jobId) {
  const connection = await getActiveConnectionWithAthlete();
  const accessToken = await getValidAccessToken(connection);

  await markJobRunning(jobId, "Import historique en cours");

  let page = 1;
  const perPage = 100;
  const counters = {
    activitiesSeen: 0,
    activitiesInserted: 0,
    activitiesUpdated: 0,
    activitiesFailed: 0,
    detailsFetched: 0,
  };

  try {
    while (true) {
      const { data: activities, headers } = await listAthleteActivities(accessToken, {
        page,
        perPage,
      });

      if (!activities.length) {
        break;
      }

      for (const activity of activities) {
        try {
          await processSummaryActivity(jobId, connection.athlete.id, activity, counters);
        } catch (error) {
          counters.activitiesFailed += 1;

          await updateJob(jobId, {
            activitiesFailed: counters.activitiesFailed,
            lastProcessedActivityId: String(activity.id),
            lastProcessedActivityDate: activity.start_date ? new Date(activity.start_date) : null,
          });
        }
      }

      await updateJob(jobId, {
        pagesProcessed: page,
        resultJson: JSON.stringify({
          lastRateLimits: buildRateLimitSnapshot(headers),
        }),
      });

      page += 1;
    }

    const latestEpoch = await refreshCursorFromLatestActivity(
      connection.appUserId,
      connection.athlete.id
    );

    const result = {
      latestCursorEpoch: latestEpoch,
      mode: "historical",
      summaryOnly: true,
      ...counters,
    };

    await markJobSuccess(
      jobId,
      `Import historique terminé. Activités vues : ${counters.activitiesSeen}.`,
      result
    );

    return result;
  } catch (error) {
    const mapped = buildStravaError(error);
    await markJobFailed(jobId, mapped);
    throw mapped;
  }
}

export async function executeIncrementalSyncJob(jobId) {
  const connection = await getActiveConnectionWithAthlete();
  const accessToken = await getValidAccessToken(connection);

  const existingCursor = await getCursor(connection.appUserId, "last_activity_sync_after_epoch");
  const fallbackLatestActivity = await getLatestStoredActivity(connection.athlete.id);

  const baseCursorEpoch =
    existingCursor?.cursorValue ||
    (fallbackLatestActivity?.startDate
      ? String(toEpochSeconds(fallbackLatestActivity.startDate))
      : null);

  const requestedAfterEpoch = computeIncrementalAfterEpoch(baseCursorEpoch);

  await markJobRunning(
    jobId,
    "Synchronisation incrémentale en cours",
    requestedAfterEpoch ? String(requestedAfterEpoch) : null
  );

  let page = 1;
  const perPage = 100;
  const counters = {
    activitiesSeen: 0,
    activitiesInserted: 0,
    activitiesUpdated: 0,
    activitiesFailed: 0,
    detailsFetched: 0,
  };

  try {
    while (true) {
      const { data: activities, headers } = await listAthleteActivities(accessToken, {
        page,
        perPage,
        after: requestedAfterEpoch,
      });

      if (!activities.length) {
        break;
      }

      for (const activity of activities) {
        try {
          await processSummaryActivity(jobId, connection.athlete.id, activity, counters);

          if (FETCH_DETAILS_IN_INCREMENTAL) {
            await processDetailedActivity(
              jobId,
              connection.athlete.id,
              accessToken,
              activity.id,
              counters
            );
          }
        } catch (error) {
          counters.activitiesFailed += 1;

          await updateJob(jobId, {
            activitiesFailed: counters.activitiesFailed,
            lastProcessedActivityId: String(activity.id),
            lastProcessedActivityDate: activity.start_date ? new Date(activity.start_date) : null,
          });
        }
      }

      await updateJob(jobId, {
        pagesProcessed: page,
        resultJson: JSON.stringify({
          lastRateLimits: buildRateLimitSnapshot(headers),
        }),
      });

      page += 1;
    }

    const latestEpoch = await refreshCursorFromLatestActivity(
      connection.appUserId,
      connection.athlete.id
    );

    const result = {
      latestCursorEpoch: latestEpoch,
      mode: "incremental",
      fetchedDetails: FETCH_DETAILS_IN_INCREMENTAL,
      ...counters,
    };

    await markJobSuccess(
      jobId,
      `Synchronisation incrémentale terminée. Activités vues : ${counters.activitiesSeen}.`,
      result
    );

    return result;
  } catch (error) {
    const mapped = buildStravaError(error);
    await markJobFailed(jobId, mapped);
    throw mapped;
  }
}
