import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";
import { syncRecentGarminRecoveryForUser } from "./garminRecoveryBackfill.service.js";

let startupTimer = null;
let intervalTimer = null;
let isSweepRunning = false;

function getIntervalMs() {
  return env.garminconnectDailySyncIntervalMinutes * 60 * 1000;
}

function getStartupDelayMs() {
  return env.garminconnectDailySyncStartupDelaySeconds * 1000;
}

async function getCandidateGarminConnections() {
  return prisma.externalProviderConnection.findMany({
    where: {
      providerCode: EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL,
      status: {
        in: [
          EXTERNAL_PROVIDER_STATUSES.CONNECTED,
          EXTERNAL_PROVIDER_STATUSES.SYNCING,
        ],
      },
      encryptedSession: {
        not: null,
      },
    },
    select: {
      appUserId: true,
      lastSyncAt: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });
}

function shouldSyncConnection(connection, cutoffMs) {
  if (!connection?.appUserId) {
    return false;
  }

  if (!connection.lastSyncAt) {
    return true;
  }

  return new Date(connection.lastSyncAt).getTime() <= cutoffMs;
}

export async function runAutoGarminRecoverySyncSweep() {
  if (isSweepRunning) {
    return {
      queuedCount: 0,
      skippedCount: 0,
      candidateCount: 0,
      alreadyRunning: true,
    };
  }

  isSweepRunning = true;

  try {
    const candidateConnections = await getCandidateGarminConnections();
    const cutoffMs = Date.now() - getIntervalMs();
    let syncedCount = 0;
    let skippedCount = 0;

    for (const connection of candidateConnections) {
      const appUserId = String(connection?.appUserId || "").trim();

      if (!shouldSyncConnection(connection, cutoffMs)) {
        skippedCount += 1;
        continue;
      }

      try {
        await syncRecentGarminRecoveryForUser(appUserId, { triggerSource: "scheduler" });
        syncedCount += 1;
      } catch (error) {
        skippedCount += 1;
        console.error(`Auto Garmin recovery sync failed for user ${appUserId}:`, error);
      }
    }

    console.log(
      `Auto Garmin recovery sync sweep complete. synced=${syncedCount} skipped=${skippedCount}`,
    );

    return {
      syncedCount,
      skippedCount,
      candidateCount: candidateConnections.length,
    };
  } catch (error) {
    console.error("Auto Garmin recovery sync sweep failed:", error);
    throw error;
  } finally {
    isSweepRunning = false;
  }
}

export function startAutoGarminRecoverySyncScheduler() {
  if (!env.garminconnectDailySyncEnabled) {
    console.log("Auto Garmin recovery sync scheduler disabled.");
    return;
  }

  if (startupTimer || intervalTimer) {
    return;
  }

  const intervalMs = getIntervalMs();
  const startupDelayMs = Math.min(intervalMs, getStartupDelayMs());

  startupTimer = setTimeout(() => {
    startupTimer = null;
    runAutoGarminRecoverySyncSweep().catch(() => {});
  }, startupDelayMs);

  intervalTimer = setInterval(() => {
    runAutoGarminRecoverySyncSweep().catch(() => {});
  }, intervalMs);

  if (typeof startupTimer?.unref === "function") {
    startupTimer.unref();
  }

  if (typeof intervalTimer?.unref === "function") {
    intervalTimer.unref();
  }

  console.log(
    `Auto Garmin recovery sync scheduler started. interval=${env.garminconnectDailySyncIntervalMinutes}min startupDelay=${env.garminconnectDailySyncStartupDelaySeconds}s`,
  );
}
