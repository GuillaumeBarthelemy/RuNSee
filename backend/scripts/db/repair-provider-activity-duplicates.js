import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { findBestActivityProviderMatch } from "../../src/services/providers/activityProviderMatching.service.js";
import { EXTERNAL_PROVIDER_CODES } from "../../src/services/providers/externalProvider.constants.js";

const CONFIRM_TOKEN = "merge-provider-duplicates";
const GARMIN_PROVIDER = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function selectActivityFields() {
  return {
    id: true,
    appUserId: true,
    stravaActivityId: true,
    sourceProvider: true,
    sourceActivityId: true,
    name: true,
    type: true,
    sportType: true,
    startDate: true,
    startDateLocal: true,
    distance: true,
    movingTime: true,
    elapsedTime: true,
    totalElevationGain: true,
    averageHeartrate: true,
    isMerged: true,
  };
}

async function listActivities(appUserId = "") {
  return prisma.activity.findMany({
    where: {
      isMerged: false,
      appUserId: appUserId || { not: null },
      sourceProvider: {
        in: ["strava", "garmin"],
      },
    },
    select: selectActivityFields(),
    orderBy: [
      { appUserId: "asc" },
      { startDate: "asc" },
    ],
  });
}

function groupByUser(activities) {
  return activities.reduce((groups, activity) => {
    const key = activity.appUserId || "unknown";
    const bucket = groups.get(key) || [];
    bucket.push(activity);
    groups.set(key, bucket);
    return groups;
  }, new Map());
}

function buildRepairs(activities, minScore) {
  const repairs = [];

  for (const [appUserId, userActivities] of groupByUser(activities).entries()) {
    const stravaActivities = userActivities.filter((activity) => activity.sourceProvider === "strava");
    const garminActivities = userActivities.filter((activity) => activity.sourceProvider === "garmin");

    for (const garminActivity of garminActivities) {
      const match = findBestActivityProviderMatch(garminActivity, stravaActivities);
      const stravaActivity = match.candidate?.activity;
      const matchResult = match.candidate?.matchResult;

      if (!stravaActivity || !matchResult || match.status === "ambiguous" || match.status === "not_found") {
        continue;
      }

      if (Number(matchResult.score || 0) < minScore) {
        continue;
      }

      repairs.push({
        appUserId,
        matchStatus: match.status,
        score: matchResult.score,
        stravaActivity,
        garminActivity,
      });
    }
  }

  return repairs;
}

async function repairDuplicate(repair) {
  const { appUserId, stravaActivity, garminActivity, matchStatus, score } = repair;
  const providerActivityId = String(garminActivity.sourceActivityId || "").trim();

  if (!providerActivityId) {
    return {
      status: "skipped",
      reason: "missing_garmin_source_activity_id",
      garminActivityId: garminActivity.id,
    };
  }

  return prisma.$transaction(async (tx) => {
    const existingStravaEnrichment = await tx.activityProviderEnrichment.findUnique({
      where: {
        activityId_providerCode: {
          activityId: stravaActivity.id,
          providerCode: GARMIN_PROVIDER,
        },
      },
      select: { id: true },
    });

    if (!existingStravaEnrichment) {
      const garminEnrichment = await tx.activityProviderEnrichment.findUnique({
        where: {
          activityId_providerCode: {
            activityId: garminActivity.id,
            providerCode: GARMIN_PROVIDER,
          },
        },
      });

      if (garminEnrichment) {
        await tx.activityProviderEnrichment.update({
          where: { id: garminEnrichment.id },
          data: {
            activityId: stravaActivity.id,
            status: matchStatus === "exact" ? "matched_exact" : "matched_tolerated",
            matchConfidence: score,
            matchedAt: new Date(),
          },
        });
      }
    }

    await tx.activityProviderLink.upsert({
      where: {
        appUserId_provider_providerActivityId: {
          appUserId,
          provider: GARMIN_PROVIDER,
          providerActivityId,
        },
      },
      create: {
        appUserId,
        activityId: stravaActivity.id,
        provider: GARMIN_PROVIDER,
        providerActivityId,
        matchStatus,
        matchConfidence: score,
        matchedAt: new Date(),
      },
      update: {
        activityId: stravaActivity.id,
        matchStatus,
        matchConfidence: score,
        matchedAt: new Date(),
      },
    });

    await tx.activity.update({
      where: { id: garminActivity.id },
      data: {
        isMerged: true,
        mergedIntoActivityId: stravaActivity.id,
        mergedAt: new Date(),
        sourcePriority: "merged",
      },
    });

    return {
      status: "merged",
      stravaActivityId: stravaActivity.stravaActivityId || stravaActivity.id,
      garminActivityId: garminActivity.sourceActivityId || garminActivity.id,
      score,
    };
  });
}

async function main() {
  const apply = hasFlag("--apply");
  const confirm = getArgValue("--confirm", "");
  const minScore = Math.max(0, Number(getArgValue("--min-score", "70")) || 70);
  const appUserId = getArgValue("--app-user-id", "");

  if (apply && confirm !== CONFIRM_TOKEN) {
    throw new Error(`Refusing to repair without --confirm=${CONFIRM_TOKEN}.`);
  }

  const activities = await listActivities(appUserId);
  const repairs = buildRepairs(activities, minScore);
  const results = [];

  if (apply) {
    for (const repair of repairs) {
      results.push(await repairDuplicate(repair));
    }
  }

  console.log(JSON.stringify({
    dryRun: !apply,
    minScore,
    scannedActivities: activities.length,
    repairCandidateCount: repairs.length,
    repairedCount: results.filter((result) => result.status === "merged").length,
    candidates: repairs.map((repair) => ({
      appUserId: repair.appUserId,
      status: repair.matchStatus,
      score: repair.score,
      stravaActivityId: repair.stravaActivity.stravaActivityId || repair.stravaActivity.id,
      garminActivityId: repair.garminActivity.sourceActivityId || repair.garminActivity.id,
      stravaName: repair.stravaActivity.name,
      garminName: repair.garminActivity.name,
    })),
    results,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      status: "error",
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
