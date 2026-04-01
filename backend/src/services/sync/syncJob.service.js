import prisma from "../../config/prisma.js";
import {
  executeHistoricalSyncJob,
  executeIncrementalSyncJob,
} from "./activitySync.service.js";
import { countActivities } from "../../repositories/activity.repository.js";

const ACTIVE_JOB_STATUSES = ["queued", "running"];
const runningJobs = new Set();

async function getDefaultAppUserId() {
  const appUser = await prisma.appUser.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!appUser) {
    const error = new Error("No local app user found.");
    error.httpStatus = 400;
    error.userMessage = "Connecte d'abord ton compte Strava avant de lancer une synchronisation.";
    throw error;
  }

  return appUser.id;
}

export async function assertNoActiveSyncJob() {
  const activeJob = await prisma.syncJob.findFirst({
    where: {
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
    error.userMessage = "Une synchronisation est déjà en cours.";
    throw error;
  }
}

export async function createSyncJob(jobType, triggerSource = "ui") {
  await assertNoActiveSyncJob();

  const appUserId = await getDefaultAppUserId();

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

async function dispatchSyncJob(job) {
  if (job.jobType === "historical") {
    return executeHistoricalSyncJob(job.id);
  }

  if (job.jobType === "incremental") {
    return executeIncrementalSyncJob(job.id);
  }

  const error = new Error(`Unsupported sync job type: ${job.jobType}`);
  error.httpStatus = 400;
  error.userMessage = "Type de synchronisation non supporté.";
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

      if (!job) {
        return;
      }

      await dispatchSyncJob(job);
    } catch (error) {
      console.error("Background sync job failed:", error);
    } finally {
      runningJobs.delete(jobId);
    }
  }, 0);
}

export async function getCurrentSyncJob() {
  return prisma.syncJob.findFirst({
    where: {
      status: {
        in: ACTIVE_JOB_STATUSES,
      },
    },
    orderBy: {
      queuedAt: "desc",
    },
  });
}

export async function getSyncJobById(jobId) {
  return prisma.syncJob.findUnique({
    where: { id: jobId },
  });
}

export async function listSyncJobs(limit = 20) {
  return prisma.syncJob.findMany({
    take: limit,
    orderBy: {
      queuedAt: "desc",
    },
  });
}

export async function getSyncSummary() {
  const [
    totalActivities,
    latestActivity,
    lastHistoricalSync,
    lastIncrementalSync,
    currentJob,
  ] = await Promise.all([
    countActivities(),
    prisma.activity.findFirst({
      orderBy: { startDate: "desc" },
      select: {
        stravaActivityId: true,
        startDate: true,
        name: true,
        type: true,
        sportType: true,
      },
    }),
    prisma.syncJob.findFirst({
      where: {
        jobType: "historical",
        status: "success",
      },
      orderBy: {
        endedAt: "desc",
      },
    }),
    prisma.syncJob.findFirst({
      where: {
        jobType: "incremental",
        status: "success",
      },
      orderBy: {
        endedAt: "desc",
      },
    }),
    getCurrentSyncJob(),
  ]);

  return {
    totalActivities,
    latestActivity,
    lastHistoricalSync,
    lastIncrementalSync,
    currentJob,
  };
}
