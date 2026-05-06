import prisma from "../config/prisma.js";

const INVALID_STORED_ACTIVITY_IDS = ["", "undefined", "null"];

function toJsonOrNull(value) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

function parseDateOrNull(value) {
  return value ? new Date(value) : null;
}

function getRequiredStravaActivityId(activity) {
  if (activity?.id === undefined || activity?.id === null || activity.id === "") {
    const error = new Error("Strava activity payload is missing its id.");
    error.code = "INVALID_STRAVA_ACTIVITY_ID";
    throw error;
  }

  return String(activity.id);
}

function applyStoredActivityIntegrityFilters(where = {}, { requireStartDate = false } = {}) {
  const and = Array.isArray(where.AND) ? [...where.AND] : [];

  and.push({
    stravaActivityId: {
      notIn: INVALID_STORED_ACTIVITY_IDS,
    },
  });

  if (requireStartDate) {
    and.push({
      startDate: {
        not: null,
      },
    });
  }

  return {
    ...where,
    AND: and,
  };
}

function buildWhereClause(filters = {}) {
  const where = {};

  if (filters.athleteId) {
    where.athleteId = filters.athleteId;
  }

  if (filters.appUserId) {
    where.athlete = {
      is: {
        connection: {
          is: {
            appUserId: filters.appUserId,
          },
        },
      },
    };
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
  const stravaActivityId = getRequiredStravaActivityId(activity);

  return {
    athleteId,
    stravaActivityId,
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

    lastFetchedAt: new Date()
  };
}

function buildSummaryActivityCreateData(activity, athleteId) {
  return {
    ...mapActivityData(activity, athleteId, false),
    isDetailed: false,
    summaryJson: JSON.stringify(activity),
    rawJson: null,
    mapPolyline: null,
    summaryFetchedAt: new Date(),
    detailsFetchedAt: null,
  };
}

function buildSummaryActivityUpdateData(activity, athleteId, existingActivity = null) {
  return {
    ...mapActivityData(activity, athleteId, false),
    isDetailed: Boolean(existingActivity?.isDetailed || existingActivity?.rawJson),
    summaryJson: JSON.stringify(activity),
    rawJson: existingActivity?.rawJson ?? null,
    mapPolyline: existingActivity?.mapPolyline ?? null,
    summaryFetchedAt: new Date(),
    detailsFetchedAt: existingActivity?.detailsFetchedAt ?? null,
  };
}

function buildDetailedActivityCreateData(activity, athleteId) {
  return {
    ...mapActivityData(activity, athleteId, true),
    isDetailed: true,
    summaryJson: JSON.stringify(activity),
    rawJson: JSON.stringify(activity),
    summaryFetchedAt: new Date(),
    detailsFetchedAt: new Date(),
  };
}

function buildDetailedActivityUpdateData(activity, athleteId, existingActivity = null) {
  return {
    ...mapActivityData(activity, athleteId, true),
    isDetailed: true,
    summaryJson: existingActivity?.summaryJson ?? JSON.stringify(activity),
    rawJson: JSON.stringify(activity),
    summaryFetchedAt: existingActivity?.summaryFetchedAt ?? new Date(),
    detailsFetchedAt: new Date(),
  };
}

export async function upsertSummaryActivity(activity, athleteId) {
  const stravaActivityId = getRequiredStravaActivityId(activity);
  const existingActivity = await prisma.activity.findUnique({
    where: {
      stravaActivityId
    },
    select: {
      id: true,
      isDetailed: true,
      rawJson: true,
      mapPolyline: true,
      detailsFetchedAt: true,
    }
  });
  const createData = buildSummaryActivityCreateData(activity, athleteId);
  const updateData = buildSummaryActivityUpdateData(activity, athleteId, existingActivity);
  const savedActivity = await prisma.activity.upsert({
    where: {
      stravaActivityId
    },
    update: updateData,
    create: createData
  });

  return {
    operation: existingActivity ? "updated" : "created",
    activity: savedActivity,
  };
}

export async function upsertDetailedActivity(activity, athleteId) {
  const stravaActivityId = getRequiredStravaActivityId(activity);
  const existingActivity = await prisma.activity.findUnique({
    where: {
      stravaActivityId
    },
    select: {
      id: true,
      summaryJson: true,
      summaryFetchedAt: true,
    }
  });
  const createData = buildDetailedActivityCreateData(activity, athleteId);
  const updateData = buildDetailedActivityUpdateData(activity, athleteId, existingActivity);
  const savedActivity = await prisma.activity.upsert({
    where: {
      stravaActivityId
    },
    update: updateData,
    create: createData
  });

  return {
    operation: existingActivity ? "updated" : "created",
    activity: savedActivity,
  };
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
  const where = applyStoredActivityIntegrityFilters(buildWhereClause(filters), {
    requireStartDate: true,
  });

  return prisma.activity.findMany({
    where,
    orderBy: {
      startDate: "desc"
    }
  });
}

export async function countActivities(filters = {}) {
  const where = applyStoredActivityIntegrityFilters(buildWhereClause(filters), {
    requireStartDate: true,
  });

  return prisma.activity.count({
    where
  });
}

export async function countDetailedActivities(filters = {}) {
  const where = applyStoredActivityIntegrityFilters(buildWhereClause(filters), {
    requireStartDate: true,
  });

  return prisma.activity.count({
    where: {
      ...where,
      rawJson: {
        not: null,
      },
    },
  });
}

export async function listActivitiesMissingDetails(filters = {}, options = {}) {
  const where = applyStoredActivityIntegrityFilters(buildWhereClause(filters), {
    requireStartDate: true,
  });
  const limit = Math.max(1, Number(options.limit || 25));
  const excludeStravaActivityIds = Array.isArray(options.excludeStravaActivityIds)
    ? options.excludeStravaActivityIds
      .map((value) => String(value || "").trim())
      .filter((value) => value && !INVALID_STORED_ACTIVITY_IDS.includes(value))
    : [];

  return prisma.activity.findMany({
    where: {
      ...where,
      rawJson: null,
      ...(excludeStravaActivityIds.length
        ? {
            stravaActivityId: {
              notIn: excludeStravaActivityIds,
            },
          }
        : {}),
    },
    select: {
      id: true,
      athleteId: true,
      stravaActivityId: true,
      startDate: true,
      startDateLocal: true,
      name: true,
      type: true,
      sportType: true,
    },
    orderBy: [
      {
        startDate: "desc",
      },
      {
        stravaActivityId: "desc",
      },
    ],
    take: limit,
  });
}

export async function getStoredActivityByStravaId(stravaActivityId) {
  return prisma.activity.findUnique({
    where: {
      stravaActivityId: String(stravaActivityId)
    }
  });
}

export async function getStoredActivityByStravaIdForUser(appUserId, stravaActivityId) {
  return prisma.activity.findFirst({
    where: applyStoredActivityIntegrityFilters({
      stravaActivityId: String(stravaActivityId),
      athlete: {
        is: {
          connection: {
            is: {
              appUserId,
            },
          },
        },
      },
    }),
    include: {
      providerEnrichments: true,
    },
  });
}

export async function getLatestStoredActivity(athleteId) {
  return prisma.activity.findFirst({
    where: applyStoredActivityIntegrityFilters(
      {
        athleteId
      },
      { requireStartDate: true }
    ),
    select: {
      id: true,
      athleteId: true,
      stravaActivityId: true,
      startDate: true,
      name: true,
      type: true,
      sportType: true,
    },
    orderBy: {
      startDate: "desc"
    }
  });
}

export async function getLatestStoredActivityForUser(appUserId) {
  return prisma.activity.findFirst({
    where: applyStoredActivityIntegrityFilters(buildWhereClause({ appUserId }), {
      requireStartDate: true,
    }),
    select: {
      id: true,
      athleteId: true,
      stravaActivityId: true,
      startDate: true,
      name: true,
      type: true,
      sportType: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });
}
