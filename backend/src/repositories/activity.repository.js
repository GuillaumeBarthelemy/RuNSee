import prisma from "../config/prisma.js";

function toJsonOrNull(value) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

function parseDateOrNull(value) {
  return value ? new Date(value) : null;
}

function buildWhereClause(filters = {}) {
  const where = {};

  if (filters.athleteId) {
    where.athleteId = filters.athleteId;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.sportType) {
    where.sportType = filters.sportType;
  }

  if (filters.from || filters.to) {
    where.startDate = {};

    if (filters.from) {
      where.startDate.gte = new Date(filters.from);
    }

    if (filters.to) {
      where.startDate.lte = new Date(filters.to);
    }
  }

  return where;
}

function mapActivityData(activity, athleteId, isDetailed = false) {
  return {
    athleteId,
    stravaActivityId: String(activity.id),
    resourceState: activity.resource_state ?? null,
    externalId: activity.external_id ?? null,
    uploadId: activity.upload_id ? String(activity.upload_id) : null,

    name: activity.name ?? null,
    description: activity.description ?? null,

    type: activity.type ?? null,
    sportType: activity.sport_type ?? null,
    workoutType: activity.workout_type ?? null,

    startDate: parseDateOrNull(activity.start_date),
    startDateLocal: parseDateOrNull(activity.start_date_local),
    timezone: activity.timezone ?? null,
    utcOffset: activity.utc_offset ?? null,

    distance: activity.distance ?? null,
    movingTime: activity.moving_time ?? null,
    elapsedTime: activity.elapsed_time ?? null,
    totalElevationGain: activity.total_elevation_gain ?? null,

    startLatlngJson: toJsonOrNull(activity.start_latlng),
    endLatlngJson: toJsonOrNull(activity.end_latlng),

    achievementCount: activity.achievement_count ?? null,
    kudosCount: activity.kudos_count ?? null,
    commentCount: activity.comment_count ?? null,
    athleteCount: activity.athlete_count ?? null,
    photoCount: activity.photo_count ?? null,
    prCount: activity.pr_count ?? null,
    totalPhotoCount: activity.total_photo_count ?? null,

    trainer: activity.trainer ?? null,
    commute: activity.commute ?? null,
    manual: activity.manual ?? null,
    private: activity.private ?? null,
    flagged: activity.flagged ?? null,

    averageSpeed: activity.average_speed ?? null,
    maxSpeed: activity.max_speed ?? null,
    averageCadence: activity.average_cadence ?? null,
    averageWatts: activity.average_watts ?? null,
    weightedAverageWatts: activity.weighted_average_watts ?? null,
    kilojoules: activity.kilojoules ?? null,

    deviceWatts: activity.device_watts ?? null,
    hasHeartrate: activity.has_heartrate ?? null,
    averageHeartrate: activity.average_heartrate ?? null,
    maxHeartrate: activity.max_heartrate ?? null,
    averageTemp: activity.average_temp ?? null,
    sufferScore: activity.suffer_score ?? null,
    calories: activity.calories ?? null,

    mapId: activity.map?.id ? String(activity.map.id) : null,
    mapSummaryPolyline: activity.map?.summary_polyline ?? null,
    mapPolyline: isDetailed ? activity.map?.polyline ?? null : null,

    gearId: activity.gear_id ?? null,

    summaryJson: isDetailed ? null : JSON.stringify(activity),
    rawJson: isDetailed ? JSON.stringify(activity) : null,
    lastFetchedAt: new Date()
  };
}

export async function upsertSummaryActivity(activity, athleteId) {
  const data = mapActivityData(activity, athleteId, false);

  return prisma.activity.upsert({
    where: {
      stravaActivityId: String(activity.id)
    },
    update: data,
    create: data
  });
}

export async function upsertDetailedActivity(activity, athleteId) {
  const data = mapActivityData(activity, athleteId, true);

  return prisma.activity.upsert({
    where: {
      stravaActivityId: String(activity.id)
    },
    update: data,
    create: data
  });
}

// Alias de compatibilité
export async function saveSummaryActivity(activity, athleteId) {
  return upsertSummaryActivity(activity, athleteId);
}

// Alias de compatibilité
export async function saveDetailedActivity(activity, athleteId) {
  return upsertDetailedActivity(activity, athleteId);
}

export async function listActivities(filters = {}) {
  const where = buildWhereClause(filters);

  return prisma.activity.findMany({
    where,
    orderBy: {
      startDate: "desc"
    }
  });
}

export async function countActivities(filters = {}) {
  const where = buildWhereClause(filters);

  return prisma.activity.count({
    where
  });
}

export async function getStoredActivityByStravaId(stravaActivityId) {
  return prisma.activity.findUnique({
    where: {
      stravaActivityId: String(stravaActivityId)
    }
  });
}

export async function getLatestStoredActivity(athleteId) {
  return prisma.activity.findFirst({
    where: {
      athleteId
    },
    orderBy: {
      startDate: "desc"
    }
  });
}