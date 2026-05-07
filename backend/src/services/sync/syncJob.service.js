import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import {
  executeHistoricalSyncJob,
  executeIncrementalSyncJob,
  executeDetailBackfillJob,
} from "./activitySync.service.js";
import {
  countActivities,
  countDetailedActivities,
  getLatestStoredActivityForUser,
} from "../../repositories/activity.repository.js";
import {
  findActiveConnectionForUser,
  requireActiveConnectionForUser,
} from "../strava/stravaConnection.service.js";
import {
  findExternalProviderConnectionForUser,
} from "../providers/externalProviderConnection.service.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_STATUSES,
} from "../providers/externalProvider.constants.js";
import { syncRecentGarminRecoveryForUser } from "../providers/garminRecoveryBackfill.service.js";
import { enrichGarminActivitiesForUser } from "../providers/garminActivityEnrichment.service.js";

const ACTIVE_JOB_STATUSES = ["queued", "running"];
const runningJobs = new Set();

// Au-delà de cette durée, un job en "running" est considéré orphelin (le worker
// l'a probablement perdu suite à un restart container). On l'auto-marque "failed"
// pour ne pas bloquer indéfiniment les nouvelles synchros.
const STALE_JOB_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

function buildRecoveryFailurePayload(reason, metadata = {}) {
  return JSON.stringify({
    reason,
    ...metadata,
  });
}

function shouldQueueDetailBackfillFollowUp(job, result = {}) {
  return (
    job?.jobType === "detail_backfill"
    && Number(result?.remainingToEnrich || 0) > 0
    && Number(result?.detailsFetched || 0) > 0
  );
}

/**
 * Marque comme "failed" tout job "running" qui a dépassé STALE_JOB_TIMEOUT_MS
 * sans signe de vie. Ces jobs orphelins surviennent typiquement après un
 * restart du container backend pendant une synchro.
 */
async function failStaleJobsForUser(appUserId) {
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
  await prisma.syncJob.updateMany({
    where: {
      appUserId,
      status: "running",
      OR: [
        { startedAt: { lt: cutoff } },
        { startedAt: null, queuedAt: { lt: cutoff } },
      ],
    },
    data: {
      status: "failed",
      endedAt: new Date(),
      message: "Job interrompu (timeout > 30 min sans completion).",
    },
  });
}

export async function assertNoActiveSyncJob(appUserId) {
  // 1. Auto-purge des jobs orphelins (best-effort, non-bloquant en cas d'erreur)
  try {
    await failStaleJobsForUser(appUserId);
  } catch {
    // ignorer : on ne veut pas bloquer la sync si le cleanup échoue
  }

  // 2. Vérification habituelle après cleanup
  const activeJob = await prisma.syncJob.findFirst({
    where: {
      appUserId,
      status: {
        in: ACTIVE_JOB_STATUSES,
      },
    },
    orderBy: {
      queuedAt: "desc",
    },
  });

  if (activeJob) {
    const error = new Error("Another synchronization job is already active.");
    error.httpStatus = 409;
    error.userMessage = "Une synchronisation est deja en cours pour ce compte.";
    throw error;
  }
}

export async function createSyncJob(appUserId, jobType, triggerSource = "ui") {
  if (!appUserId) {
    const error = new Error("App user id is required.");
    error.httpStatus = 401;
    error.userMessage = "Connecte-toi pour lancer une synchronisation.";
    throw error;
  }

  await assertNoActiveSyncJob(appUserId);
  if (jobType !== "global_incremental") {
    await requireActiveConnectionForUser(appUserId);
  }

  return prisma.syncJob.create({
    data: {
      appUserId,
      jobType,
      triggerSource,
      status: "queued",
      message: "Synchronisation en file d'attente",
      progressPercent: 0,
    },
  });
}

export async function queueSyncJobForUser(appUserId, jobType, triggerSource = "ui") {
  const job = await createSyncJob(appUserId, jobType, triggerSource);
  startSyncJobInBackground(job.id);
  return job;
}

function buildSkippedProvider(reason) {
  return {
    requested: false,
    status: "skipped",
    reason,
  };
}

function buildQueuedProvider(extra = {}) {
  return {
    requested: true,
    status: "queued",
    ...extra,
  };
}

function buildFailedProvider(error) {
  return {
    requested: true,
    status: "error",
    reason: error?.userMessage || error?.message || "Synchronisation impossible.",
  };
}

function isUsableGarminConnection(connection) {
  return Boolean(
    connection?.encryptedSession
      && [
        EXTERNAL_PROVIDER_STATUSES.CONNECTED,
        EXTERNAL_PROVIDER_STATUSES.SYNCING,
      ].includes(connection.status),
  );
}

export async function queueGlobalSyncForUser(appUserId) {
  const activeJob = await getCurrentSyncJob(appUserId);
  const periodDays = Number(env.garminActivitySyncRecentDays || env.garminconnectActivityEnrichmentGlobalDays || 30);

  if (activeJob) {
    return {
      status: "already_running",
      message: "Une synchronisation est deja en cours.",
      job: {
        id: activeJob.id,
        status: activeJob.status,
        type: activeJob.jobType,
      },
      providers: {
        strava: {
          requested: false,
          status: "already_running",
          reason: "strava_sync_active",
        },
        garminRecovery: buildSkippedProvider("global_sync_waiting_for_strava_job"),
        garminActivities: buildSkippedProvider("global_sync_already_running"),
      },
    };
  }

  const [stravaConnection, garminConnection] = await Promise.all([
    findActiveConnectionForUser(appUserId),
    findExternalProviderConnectionForUser(appUserId, EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL),
  ]);

  if (!stravaConnection && !isUsableGarminConnection(garminConnection)) {
    return {
      status: "completed",
      message: "Aucune source connectée à synchroniser.",
      job: null,
      providers: {
        strava: buildSkippedProvider("strava_not_connected"),
        garminRecovery: buildSkippedProvider("garmin_not_connected"),
        garminActivities: buildSkippedProvider("garmin_not_connected"),
      },
    };
  }

  const job = await createSyncJob(appUserId, "global_incremental", "ui");
  startSyncJobInBackground(job.id);
  const hasStrava = Boolean(stravaConnection);
  const hasGarmin = isUsableGarminConnection(garminConnection);
  const mode = hasStrava && hasGarmin
    ? "strava_primary_garmin_enrichment_with_fallback"
    : hasStrava
      ? "strava_only"
      : "garmin_primary";

  return {
    status: "running",
    mode,
    message: "Synchronisation globale lancée.",
    job: {
      id: job.id,
      status: job.status,
      type: job.jobType,
    },
    providers: {
      strava: stravaConnection ? buildQueuedProvider() : buildSkippedProvider("strava_not_connected"),
      garminRecovery: hasGarmin
        ? buildQueuedProvider()
        : buildSkippedProvider("garmin_not_connected"),
      garminActivities: hasGarmin
        ? buildQueuedProvider({ periodDays, role: hasStrava ? "enrichment_and_fallback" : "primary" })
        : buildSkippedProvider("garmin_not_connected"),
    },
  };
}

async function updateGlobalJob(jobId, data = {}) {
  return prisma.syncJob.update({
    where: { id: jobId },
    data,
  });
}

function buildProviderResultFromError(error) {
  return {
    requested: true,
    status: "error",
    reason: error?.userMessage || error?.message || "Provider indisponible.",
  };
}

function hasProviderError(providers = {}) {
  return Object.values(providers).some((provider) => provider?.status === "error");
}

async function executeGlobalIncrementalSyncJob(jobId) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });

  if (!job) {
    const error = new Error("Sync job not found.");
    error.httpStatus = 404;
    error.userMessage = "Job de synchronisation introuvable.";
    throw error;
  }

  await updateGlobalJob(jobId, {
    status: "running",
    startedAt: new Date(),
    message: "Synchronisation globale en cours : Strava, Garmin récupération puis activités récentes.",
    progressPercent: 5,
  });

  const providers = {
    strava: buildSkippedProvider("strava_not_connected"),
    garminRecovery: buildSkippedProvider("garmin_not_connected"),
    garminActivities: buildSkippedProvider("garmin_not_connected"),
  };
  const [stravaConnection, garminConnection] = await Promise.all([
    findActiveConnectionForUser(job.appUserId),
    findExternalProviderConnectionForUser(job.appUserId, EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL),
  ]);
  const hasGarmin = isUsableGarminConnection(garminConnection);

  if (stravaConnection) {
    await updateGlobalJob(jobId, {
      message: "Synchronisation globale : lecture Strava en cours.",
      progressPercent: 15,
    });
    try {
      const result = await executeIncrementalSyncJob(jobId);
      providers.strava = {
        requested: true,
        status: "success",
        activitiesSeen: result.activitiesSeen,
        activitiesInserted: result.activitiesInserted,
        activitiesUpdated: result.activitiesUpdated,
        detailsFetched: result.detailsFetched,
      };
    } catch (error) {
      providers.strava = buildProviderResultFromError(error);
    }
  }

  if (hasGarmin) {
    await updateGlobalJob(jobId, {
      status: "running",
      message: "Synchronisation globale : récupération Garmin récente.",
      progressPercent: 58,
      resultJson: JSON.stringify({ providers }),
    });
    try {
      const result = await syncRecentGarminRecoveryForUser(job.appUserId, { triggerSource: "global_sync" });
      providers.garminRecovery = {
        requested: true,
        status: "success",
        message: result?.message || "Récupération Garmin récente synchronisée.",
        recoveryBackfill: result?.recoveryBackfill || null,
      };
    } catch (error) {
      providers.garminRecovery = buildProviderResultFromError(error);
    }

    await updateGlobalJob(jobId, {
      message: "Synchronisation globale : métriques Garmin des activités récentes.",
      progressPercent: 78,
      resultJson: JSON.stringify({ providers }),
    });
    try {
      const days = Number(env.garminActivitySyncRecentDays || env.garminconnectActivityEnrichmentGlobalDays || 30);
      const result = await enrichGarminActivitiesForUser(job.appUserId, {
        mode: "recent_missing",
        days,
        triggerSource: "global_sync",
        allowGarminOnly: true,
      });
      providers.garminActivities = {
        requested: true,
        status: "success",
        periodDays: days,
        fetched: result.fetchedCount,
        candidates: result.stravaCandidateCount,
        skippedAlreadyEnriched: result.skippedAlreadyEnrichedCount,
        matched: result.matchedCount,
        ambiguous: result.ambiguousCount,
        notFound: result.notFoundCount,
        garminOnlyCreated: result.garminOnlyCreatedCount,
        garminOnlyUpdated: result.garminOnlyUpdatedCount,
        unsupportedType: result.unsupportedTypeCount,
      };
    } catch (error) {
      providers.garminActivities = buildProviderResultFromError(error);
    }
  }

  const warning = hasProviderError(providers);
  const result = {
    mode: stravaConnection && hasGarmin
      ? "strava_primary_garmin_enrichment_with_fallback"
      : stravaConnection
        ? "strava_only"
        : hasGarmin
          ? "garmin_primary"
          : "no_provider",
    providers,
  };

  await updateGlobalJob(jobId, {
    status: "success",
    endedAt: new Date(),
    progressPercent: 100,
    message: warning
      ? "Synchronisation globale terminée avec une alerte sur une source."
      : "Synchronisation globale terminée.",
    resultJson: JSON.stringify(result),
    errorDetails: warning ? JSON.stringify({ providers }) : null,
  });

  return result;
}

async function dispatchSyncJob(job) {
  if (job.jobType === "global_incremental") {
    return executeGlobalIncrementalSyncJob(job.id);
  }

  if (job.jobType === "historical") {
    return executeHistoricalSyncJob(job.id);
  }

  if (job.jobType === "incremental") {
    return executeIncrementalSyncJob(job.id);
  }

  if (job.jobType === "detail_backfill") {
    return executeDetailBackfillJob(job.id);
  }

  const error = new Error(`Unsupported sync job type: ${job.jobType}`);
  error.httpStatus = 400;
  error.userMessage = "Type de synchronisation non supporte.";
  throw error;
}

export function startSyncJobInBackground(jobId) {
  if (runningJobs.has(jobId)) {
    return;
  }

  runningJobs.add(jobId);

  setTimeout(async () => {
    try {
      const job = await prisma.syncJob.findUnique({
        where: { id: jobId },
      });

      if (!job || !ACTIVE_JOB_STATUSES.includes(String(job.status || ""))) {
        return;
      }

      const result = await dispatchSyncJob(job);

      if (shouldQueueDetailBackfillFollowUp(job, result)) {
        try {
          await queueSyncJobForUser(job.appUserId, "detail_backfill", "auto_backfill");
        } catch (followUpError) {
          console.error("Unable to queue next detail backfill job automatically:", followUpError);
        }
      }
    } catch (error) {
      console.error("Background sync job failed:", error);

      try {
        const currentJob = await prisma.syncJob.findUnique({
          where: { id: jobId },
        });

        if (currentJob && ACTIVE_JOB_STATUSES.includes(String(currentJob.status || ""))) {
          await prisma.syncJob.update({
            where: { id: jobId },
            data: {
              status: "failed",
              endedAt: new Date(),
              message: error.userMessage || "La synchronisation a echoue.",
              errorDetails: buildRecoveryFailurePayload("background_dispatch_failed", {
                message: error.message,
              }),
            },
          });
        }
      } catch (markError) {
        console.error("Failed to mark background sync job as failed:", markError);
      }
    } finally {
      runningJobs.delete(jobId);
    }
  }, 0);
}

export async function recoverActiveSyncJobsOnStartup() {
  const activeJobs = await prisma.syncJob.findMany({
    where: {
      status: {
        in: ACTIVE_JOB_STATUSES,
      },
    },
    orderBy: [
      { appUserId: "asc" },
      { queuedAt: "desc" },
    ],
  });

  if (!activeJobs.length) {
    console.log("No active sync jobs to recover on startup.");
    return { recoveredJobs: 0, failedDuplicateJobs: 0, activeJobs: 0 };
  }

  const seenUsers = new Set();
  let recoveredJobs = 0;
  let failedDuplicateJobs = 0;

  for (const job of activeJobs) {
    if (!job?.appUserId) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          endedAt: new Date(),
          message: "Synchronisation abandonnee apres redemarrage (compte introuvable).",
          errorDetails: buildRecoveryFailurePayload("missing_app_user_id"),
        },
      });
      failedDuplicateJobs += 1;
      continue;
    }

    if (seenUsers.has(job.appUserId)) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          endedAt: new Date(),
          message: "Synchronisation abandonnee apres redemarrage (job concurrent plus recent conserve).",
          errorDetails: buildRecoveryFailurePayload("duplicate_active_job", { appUserId: job.appUserId }),
        },
      });
      failedDuplicateJobs += 1;
      continue;
    }

    seenUsers.add(job.appUserId);
    startSyncJobInBackground(job.id);
    recoveredJobs += 1;
  }

  console.log("Recovered active sync jobs on startup.", {
    resumed: recoveredJobs,
    failedDuplicates: failedDuplicateJobs,
  });

  return {
    recoveredJobs,
    failedDuplicateJobs,
    activeJobs: activeJobs.length,
  };
}

export async function getCurrentSyncJob(appUserId) {
  return prisma.syncJob.findFirst({
    where: {
      appUserId,
      status: {
        in: ACTIVE_JOB_STATUSES,
      },
    },
    orderBy: {
      queuedAt: "desc",
    },
  });
}

export async function getSyncJobById(appUserId, jobId) {
  return prisma.syncJob.findFirst({
    where: {
      id: jobId,
      appUserId,
    },
  });
}

export async function listSyncJobs(appUserId, limit = 20) {
  return prisma.syncJob.findMany({
    where: {
      appUserId,
    },
    take: limit,
    orderBy: {
      queuedAt: "desc",
    },
  });
}

export async function getSyncSummary(appUserId) {
  const [
    totalActivities,
    detailedActivities,
    latestActivity,
    lastHistoricalSync,
    lastIncrementalSync,
    lastDetailBackfillSync,
    currentJob,
  ] = await Promise.all([
    countActivities({ appUserId }),
    countDetailedActivities({ appUserId }),
    getLatestStoredActivityForUser(appUserId),
    prisma.syncJob.findFirst({
      where: {
        appUserId,
        jobType: "historical",
        status: "success",
      },
      orderBy: {
        endedAt: "desc",
      },
    }),
    prisma.syncJob.findFirst({
      where: {
        appUserId,
        jobType: "incremental",
        status: "success",
      },
      orderBy: {
        endedAt: "desc",
      },
    }),
    prisma.syncJob.findFirst({
      where: {
        appUserId,
        jobType: "detail_backfill",
        status: "success",
      },
      orderBy: {
        endedAt: "desc",
      },
    }),
    getCurrentSyncJob(appUserId),
  ]);

  return {
    totalActivities,
    detailedActivities,
    pendingDetailEnrichment: Math.max(0, totalActivities - detailedActivities),
    latestActivity,
    lastHistoricalSync,
    lastIncrementalSync,
    lastDetailBackfillSync,
    currentJob,
  };
}
