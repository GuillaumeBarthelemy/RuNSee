import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import { queueSyncJobForUser } from "./syncJob.service.js";

const SUCCESSFUL_SYNC_JOB_TYPES = ["historical", "incremental"];

let startupTimer = null;
let intervalTimer = null;
let isSweepRunning = false;

function getIntervalMs() {
  return env.autoIncrementalSyncIntervalMinutes * 60 * 1000;
}

function getStartupDelayMs() {
  return env.autoIncrementalSyncStartupDelaySeconds * 1000;
}

async function getCandidateUsersForAutoSync() {
  return prisma.stravaConnection.findMany({
    where: {
      isActive: true,
    },
    distinct: ["appUserId"],
    select: {
      appUserId: true,
    },
  });
}

async function getLatestSuccessfulSyncForUser(appUserId) {
  return prisma.syncJob.findFirst({
    where: {
      appUserId,
      status: "success",
      jobType: {
        in: SUCCESSFUL_SYNC_JOB_TYPES,
      },
    },
    orderBy: {
      endedAt: "desc",
    },
  });
}

function shouldSkipSyncError(error) {
  const status = Number(error?.httpStatus || 0);
  return status === 400 || status === 401 || status === 404 || status === 409;
}

export async function runAutoIncrementalSyncSweep() {
  if (isSweepRunning) {
    return;
  }

  isSweepRunning = true;

  try {
    const candidateUsers = await getCandidateUsersForAutoSync();
    const cutoffMs = Date.now() - getIntervalMs();
    let queuedCount = 0;
    let skippedCount = 0;

    for (const candidate of candidateUsers) {
      const appUserId = String(candidate?.appUserId || "").trim();

      if (!appUserId) {
        skippedCount += 1;
        continue;
      }

      try {
        const latestSuccessfulSync = await getLatestSuccessfulSyncForUser(appUserId);

        if (!latestSuccessfulSync?.endedAt) {
          skippedCount += 1;
          continue;
        }

        if (new Date(latestSuccessfulSync.endedAt).getTime() > cutoffMs) {
          skippedCount += 1;
          continue;
        }

        await queueSyncJobForUser(appUserId, "incremental", "scheduler");
        queuedCount += 1;
      } catch (error) {
        if (shouldSkipSyncError(error)) {
          skippedCount += 1;
          continue;
        }

        console.error(`Auto sync failed for user ${appUserId}:`, error);
      }
    }

    console.log(
      `Auto incremental sync sweep complete. queued=${queuedCount} skipped=${skippedCount}`,
    );
    return {
      queuedCount,
      skippedCount,
      candidateCount: candidateUsers.length,
    };
  } catch (error) {
    console.error("Auto incremental sync sweep failed:", error);
    throw error;
  } finally {
    isSweepRunning = false;
  }
}

export function startAutoIncrementalSyncScheduler() {
  if (!env.autoIncrementalSyncEnabled) {
    console.log("Auto incremental sync scheduler disabled.");
    return;
  }

  if (startupTimer || intervalTimer) {
    return;
  }

  const intervalMs = getIntervalMs();
  const startupDelayMs = Math.min(intervalMs, getStartupDelayMs());

  startupTimer = setTimeout(() => {
    startupTimer = null;
    runAutoIncrementalSyncSweep().catch(() => {});
  }, startupDelayMs);

  intervalTimer = setInterval(() => {
    runAutoIncrementalSyncSweep().catch(() => {});
  }, intervalMs);

  if (typeof startupTimer?.unref === "function") {
    startupTimer.unref();
  }

  if (typeof intervalTimer?.unref === "function") {
    intervalTimer.unref();
  }

  console.log(
    `Auto incremental sync scheduler started. interval=${env.autoIncrementalSyncIntervalMinutes}min startupDelay=${env.autoIncrementalSyncStartupDelaySeconds}s`,
  );
}
