import prisma from "../../config/prisma.js";
import { getValidAccessToken } from "../strava/stravaAuth.service.js";
import {
  listAthleteActivities,
  getActivityById,
} from "../strava/stravaActivity.service.js";
import {
  countActivities,
  countDetailedActivities,
  saveSummaryActivity,
  saveDetailedActivity,
  getLatestStoredActivity,
  listActivitiesMissingDetails,
} from "../../repositories/activity.repository.js";
import { requireActiveConnectionForUser } from "../strava/stravaConnection.service.js";

const FETCH_DETAILS_IN_INCREMENTAL =
  String(process.env.STRAVA_INCREMENTAL_FETCH_DETAILS || "true").toLowerCase() !== "false";

const SYNC_AFTER_OVERLAP_SECONDS = Number(process.env.SYNC_AFTER_OVERLAP_SECONDS || 3600);
const DETAIL_BACKFILL_BATCH_SIZE = Math.max(
  1,
  Number(process.env.STRAVA_DETAIL_BACKFILL_BATCH_SIZE || 25),
);
const DETAIL_BACKFILL_DELAY_MS = Math.max(
  0,
  Number(process.env.STRAVA_DETAIL_BACKFILL_DELAY_MS || 150),
);
const DETAIL_BACKFILL_MAX_ACTIVITIES_PER_JOB = Math.max(
  0,
  Number(process.env.STRAVA_DETAIL_BACKFILL_MAX_ACTIVITIES_PER_JOB || 0),
);

function toEpochSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function computeDetailBackfillProgress({
  totalActivities = 0,
  detailedActivities = 0,
  detailsFetched = 0,
} = {}) {
  const safeTotal = Math.max(0, Number(totalActivities || 0));

  if (safeTotal <= 0) {
    return 0;
  }

  const resolvedDetailed = Math.max(0, Number(detailedActivities || 0) + Number(detailsFetched || 0));
  return Math.max(0, Math.min(99, Math.round((resolvedDetailed / safeTotal) * 100)));
}

async function getJobWithConnection(jobId) {
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    const error = new Error("Sync job not found.");
    error.httpStatus = 404;
    error.userMessage = "Job de synchronisation introuvable.";
    throw error;
  }

  const connection = await requireActiveConnectionForUser(job.appUserId, {
    includeAthlete: true,
  });

  return {
    job,
    connection,
  };
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
      ? "La limite API Strava a ete atteinte. Relance la synchronisation plus tard."
      : "La synchronisation a echoue cote Strava.";
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
    message: error.userMessage || "La synchronisation a echoue.",
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

async function processDetailedActivity(jobId, athleteId, accessToken, activityId, counters, options = {}) {
  const { data: detailed, headers } = await getActivityById(accessToken, activityId);
  const result = await saveDetailedActivity(detailed, athleteId);
  const rateLimits = buildRateLimitSnapshot(headers);
  const seenCount = Number(options.activitiesSeen ?? counters.activitiesSeen ?? 0);

  counters.detailsFetched += 1;

  if (result.operation === "created") {
    counters.activitiesInserted += 1;
  }

  await updateJob(jobId, {
    activitiesSeen: seenCount,
    detailsFetched: counters.detailsFetched,
    activitiesInserted: counters.activitiesInserted,
    activitiesUpdated: counters.activitiesUpdated,
    lastProcessedActivityId: String(activityId),
    lastProcessedActivityDate: detailed.start_date ? new Date(detailed.start_date) : null,
    resultJson: JSON.stringify({
      lastRateLimits: rateLimits,
    }),
  });

  return {
    operation: result.operation,
    rateLimits,
  };
}

export async function executeHistoricalSyncJob(jobId) {
  const { job, connection } = await getJobWithConnection(jobId);
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
      job.appUserId,
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
      `Import historique termine. Activites vues : ${counters.activitiesSeen}.`,
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
  const { job, connection } = await getJobWithConnection(jobId);
  const accessToken = await getValidAccessToken(connection);

  const existingCursor = await getCursor(job.appUserId, "last_activity_sync_after_epoch");
  const fallbackLatestActivity = await getLatestStoredActivity(connection.athlete.id);

  const baseCursorEpoch =
    existingCursor?.cursorValue ||
    (fallbackLatestActivity?.startDate
      ? String(toEpochSeconds(fallbackLatestActivity.startDate))
      : null);

  const requestedAfterEpoch = computeIncrementalAfterEpoch(baseCursorEpoch);

  await markJobRunning(
    jobId,
    "Synchronisation incrementale en cours",
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
              counters,
              { activitiesSeen: counters.activitiesSeen },
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
      job.appUserId,
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
      `Synchronisation incrementale terminee. Activites vues : ${counters.activitiesSeen}.`,
      result
    );

    return result;
  } catch (error) {
    const mapped = buildStravaError(error);
    await markJobFailed(jobId, mapped);
    throw mapped;
  }
}

export async function executeDetailBackfillJob(jobId) {
  const { job, connection } = await getJobWithConnection(jobId);
  const accessToken = await getValidAccessToken(connection);

  await markJobRunning(jobId, "Enrichissement detaille historique en cours");

  const counters = {
    activitiesSeen: 0,
    activitiesInserted: 0,
    activitiesUpdated: 0,
    activitiesFailed: 0,
    detailsFetched: 0,
  };
  const [totalActivitiesAtStart, detailedActivitiesAtStart] = await Promise.all([
    countActivities({ appUserId: job.appUserId }),
    countDetailedActivities({ appUserId: job.appUserId }),
  ]);
  const initialPendingCount = Math.max(0, totalActivitiesAtStart - detailedActivitiesAtStart);

  await updateJob(jobId, {
    progressPercent: computeDetailBackfillProgress({
      totalActivities: totalActivitiesAtStart,
      detailedActivities: detailedActivitiesAtStart,
      detailsFetched: 0,
    }),
    resultJson: JSON.stringify({
      mode: "detail_backfill",
      totalActivities: totalActivitiesAtStart,
      detailedActivities: detailedActivitiesAtStart,
      pendingDetailEnrichment: initialPendingCount,
    }),
  });

  try {
    const attemptedActivityIds = new Set();
    let remainingBudget = DETAIL_BACKFILL_MAX_ACTIVITIES_PER_JOB > 0
      ? DETAIL_BACKFILL_MAX_ACTIVITIES_PER_JOB
      : Number.POSITIVE_INFINITY;
    let lastRateLimits = null;
    let batchCount = 0;

    while (remainingBudget > 0) {
      const batchLimit = Math.max(
        1,
        Math.min(
          DETAIL_BACKFILL_BATCH_SIZE,
          Number.isFinite(remainingBudget) ? remainingBudget : DETAIL_BACKFILL_BATCH_SIZE,
        ),
      );
      const candidates = await listActivitiesMissingDetails(
        { appUserId: job.appUserId },
        {
          limit: batchLimit,
          excludeStravaActivityIds: Array.from(attemptedActivityIds),
        },
      );

      if (!candidates.length) {
        break;
      }

      batchCount += 1;
      await updateJob(jobId, {
        message: `Enrichissement detaille historique en cours (lot ${batchCount}, ${counters.detailsFetched} detail(s) recupere(s)).`,
      });

      for (let index = 0; index < candidates.length; index += 1) {
        const activity = candidates[index];
        attemptedActivityIds.add(String(activity.stravaActivityId));

        try {
          counters.activitiesSeen += 1;

          const detailResult = await processDetailedActivity(
            jobId,
            connection.athlete.id,
            accessToken,
            activity.stravaActivityId,
            counters,
            { activitiesSeen: counters.activitiesSeen },
          );

          lastRateLimits = detailResult?.rateLimits || lastRateLimits;
        } catch (error) {
          counters.activitiesFailed += 1;

          await updateJob(jobId, {
            activitiesSeen: counters.activitiesSeen,
            activitiesFailed: counters.activitiesFailed,
            lastProcessedActivityId: String(activity.stravaActivityId),
            lastProcessedActivityDate: activity.startDate || activity.startDateLocal || null,
          });
        }

        if (Number.isFinite(remainingBudget)) {
          remainingBudget -= 1;
        }

        if (DETAIL_BACKFILL_DELAY_MS > 0 && index < candidates.length - 1) {
          await wait(DETAIL_BACKFILL_DELAY_MS);
        }
      }

      await updateJob(jobId, {
        progressPercent: computeDetailBackfillProgress({
          totalActivities: totalActivitiesAtStart,
          detailedActivities: detailedActivitiesAtStart,
          detailsFetched: counters.detailsFetched,
        }),
        resultJson: JSON.stringify({
          mode: "detail_backfill",
          totalActivities: totalActivitiesAtStart,
          detailedActivities: Math.min(totalActivitiesAtStart, detailedActivitiesAtStart + counters.detailsFetched),
          pendingDetailEnrichment: Math.max(
            0,
            totalActivitiesAtStart - (detailedActivitiesAtStart + counters.detailsFetched),
          ),
          batchesProcessed: batchCount,
          lastRateLimits,
        }),
      });

      if (candidates.length < batchLimit) {
        break;
      }
    }

    if (!counters.activitiesSeen) {
      const result = {
        mode: "detail_backfill",
        batchSize: DETAIL_BACKFILL_BATCH_SIZE,
        maxActivitiesPerJob: DETAIL_BACKFILL_MAX_ACTIVITIES_PER_JOB || null,
        remainingToEnrich: 0,
        ...counters,
      };

      await markJobSuccess(
        jobId,
        "Aucune activite supplementaire a enrichir. Le stock detaille est deja a jour.",
        result,
      );

      return result;
    }

    const [totalActivities, detailedActivities] = await Promise.all([
      countActivities({ appUserId: job.appUserId }),
      countDetailedActivities({ appUserId: job.appUserId }),
    ]);
    const remainingToEnrich = Math.max(0, totalActivities - detailedActivities);

    const result = {
      mode: "detail_backfill",
      batchSize: DETAIL_BACKFILL_BATCH_SIZE,
      maxActivitiesPerJob: DETAIL_BACKFILL_MAX_ACTIVITIES_PER_JOB || null,
      batchesProcessed: batchCount,
      remainingToEnrich,
      lastRateLimits,
      ...counters,
    };

    await markJobSuccess(
      jobId,
      remainingToEnrich > 0
        ? counters.detailsFetched > 0
          ? `Lot d'enrichissement detaille termine. ${remainingToEnrich} activite(s) restent a completer et pourront etre reprises automatiquement.`
          : `Enrichissement detaille termine sans progression. Il reste ${remainingToEnrich} activite(s) sans details, probablement en echec cote API ou hors perimetre exploitable.`
        : "Enrichissement detaille termine. Toutes les activites connues sont maintenant enrichies ou tentees.",
      result,
    );

    return result;
  } catch (error) {
    const mapped = buildStravaError(error);
    await markJobFailed(jobId, mapped);
    throw mapped;
  }
}
