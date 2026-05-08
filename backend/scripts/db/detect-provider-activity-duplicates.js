import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { findBestActivityProviderMatch } from "../../src/services/providers/activityProviderMatching.service.js";

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function toPercent(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Math.round(Number(value) * 1000) / 10;
}

function buildReasonList(matchResult = {}) {
  const reasons = [];

  if (Number.isFinite(matchResult.deltaSeconds)) {
    reasons.push(`start_delta_${matchResult.deltaSeconds}s`);
  }

  const distancePercent = toPercent(matchResult.distanceRatio);
  if (distancePercent !== null) {
    reasons.push(`distance_delta_${distancePercent}%`);
  }

  const durationPercent = toPercent(matchResult.durationRatio);
  if (durationPercent !== null) {
    reasons.push(`duration_delta_${durationPercent}%`);
  }

  const elevationPercent = toPercent(matchResult.elevationRatio);
  if (elevationPercent !== null) {
    reasons.push(`elevation_delta_${elevationPercent}%`);
  }

  if (Number.isFinite(matchResult.heartRateDelta)) {
    reasons.push(`average_hr_delta_${matchResult.heartRateDelta}bpm`);
  }

  return reasons;
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

async function listCandidates(appUserId = "") {
  const where = {
    isMerged: false,
    appUserId: appUserId || { not: null },
    sourceProvider: {
      in: ["strava", "garmin"],
    },
  };

  return prisma.activity.findMany({
    where,
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

function detectDuplicatesForUser(activities, minScore) {
  const stravaActivities = activities.filter((activity) => activity.sourceProvider === "strava");
  const garminActivities = activities.filter((activity) => activity.sourceProvider === "garmin");
  const duplicates = [];

  for (const garminActivity of garminActivities) {
    const match = findBestActivityProviderMatch(garminActivity, stravaActivities);
    const candidate = match.candidate;
    const matchResult = candidate?.matchResult;

    if (!candidate || !matchResult || match.status === "ambiguous" || match.status === "not_found") {
      continue;
    }

    if (Number(matchResult.score || 0) < minScore) {
      continue;
    }

    duplicates.push({
      status: match.status,
      confidence: Math.round((Number(matchResult.score || 0) / 100) * 1000) / 1000,
      score: matchResult.score,
      reasons: buildReasonList(matchResult),
      recommendedAction: "merge_garmin_into_strava",
      stravaActivity: {
        id: candidate.activity.id,
        stravaActivityId: candidate.activity.stravaActivityId,
        name: candidate.activity.name,
        startDate: candidate.activity.startDate,
      },
      garminActivity: {
        id: garminActivity.id,
        sourceActivityId: garminActivity.sourceActivityId,
        name: garminActivity.name,
        startDate: garminActivity.startDate,
      },
    });
  }

  return duplicates;
}

async function main() {
  const minScore = Math.max(0, Number(getArgValue("--min-score", "70")) || 70);
  const appUserId = getArgValue("--app-user-id", "");
  const activities = await listCandidates(appUserId);
  const groups = groupByUser(activities);
  const duplicates = [];

  for (const [userId, userActivities] of groups.entries()) {
    const userDuplicates = detectDuplicatesForUser(userActivities, minScore);
    for (const duplicate of userDuplicates) {
      duplicates.push({
        appUserId: userId,
        ...duplicate,
      });
    }
  }

  const payload = {
    dryRun: !hasFlag("--apply"),
    minScore,
    scannedActivities: activities.length,
    duplicateCount: duplicates.length,
    duplicates,
  };

  console.log(JSON.stringify(payload, null, 2));
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
