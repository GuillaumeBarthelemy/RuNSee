import prisma from "../../src/config/prisma.js";
import env from "../../src/config/env.js";

const INVALID_STORED_ACTIVITY_IDS = ["", "undefined", "null"];

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

async function main() {
  const [
    appUsers,
    stravaConnections,
    athletes,
    activities,
    syncJobs,
    syncCursors,
    activityIntegrity,
    currentAthlete,
    latestActivity,
    latestSyncJob,
  ] = await Promise.all([
    prisma.appUser.count(),
    prisma.stravaConnection.count(),
    prisma.athlete.count(),
    prisma.activity.count(),
    prisma.syncJob.count(),
    prisma.syncCursor.count(),
    Promise.all([
      prisma.activity.count({
        where: {
          stravaActivityId: {
            in: INVALID_STORED_ACTIVITY_IDS,
          },
        },
      }),
      prisma.activity.count({
        where: {
          startDate: null,
        },
      }),
    ]).then(([invalidStravaActivityIds, nullStartDates]) => ({
      invalidStravaActivityIds,
      nullStartDates,
    })),
    prisma.athlete.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        stravaAthleteId: true,
        firstname: true,
        lastname: true,
        updatedAt: true,
      },
    }),
    prisma.activity.findFirst({
      where: {
        AND: [
          {
            startDate: {
              not: null,
            },
          },
          {
            stravaActivityId: {
              notIn: INVALID_STORED_ACTIVITY_IDS,
            },
          },
        ],
      },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        stravaActivityId: true,
        startDate: true,
        name: true,
        sportType: true,
      },
    }),
    prisma.syncJob.findFirst({
      orderBy: { queuedAt: "desc" },
      select: {
        id: true,
        jobType: true,
        status: true,
        queuedAt: true,
        endedAt: true,
      },
    }),
  ]);

  const snapshot = {
    databaseProvider: env.databaseProvider,
    counts: {
      appUsers,
      stravaConnections,
      athletes,
      activities,
      syncJobs,
      syncCursors,
    },
    activityIntegrity,
    currentAthlete,
    latestActivity,
    latestSyncJob,
    generatedAt: new Date().toISOString(),
  };

  const spacing = hasFlag("--compact") ? 0 : 2;
  console.log(JSON.stringify(snapshot, null, spacing));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
