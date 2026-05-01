import prisma from "../../config/prisma.js";

function buildMissingConnectionError() {
  const error = new Error("No active Strava connection found for the current user.");
  error.httpStatus = 400;
  error.userMessage = "Aucune connexion Strava active n'a ete trouvee pour ce compte.";
  return error;
}

function buildActiveSyncError() {
  const error = new Error("A sync job is still active for this user.");
  error.httpStatus = 409;
  error.userMessage = "Une synchronisation est en cours. Attends sa fin avant de delier Strava.";
  return error;
}

function buildAlreadyLinkedError() {
  const error = new Error("This Strava account is already linked to another RunNSee user.");
  error.httpStatus = 409;
  error.userMessage = "Ce compte Strava est deja lie a un autre compte RunNSee.";
  error.authRedirectReason = "strava_already_linked";
  return error;
}

export async function findConnectionByStravaAthleteId(
  stravaAthleteId,
  { includeAthlete = false, tx = prisma } = {},
) {
  const normalizedAthleteId = String(stravaAthleteId || "").trim();

  if (!normalizedAthleteId) {
    return null;
  }

  return tx.stravaConnection.findUnique({
    where: {
      stravaAthleteId: normalizedAthleteId,
    },
    include: includeAthlete ? { athlete: true } : undefined,
  });
}

export async function assertStravaAccountAvailableForUser(
  appUserId,
  stravaAthleteId,
  options = {},
) {
  if (!appUserId) {
    return null;
  }

  const connection = await findConnectionByStravaAthleteId(stravaAthleteId, options);

  if (!connection) {
    return null;
  }

  if (connection.appUserId !== appUserId) {
    throw buildAlreadyLinkedError();
  }

  return connection;
}

export async function deactivateOtherConnectionsForUser(
  appUserId,
  { keepConnectionId = "", tx = prisma } = {},
) {
  if (!appUserId) {
    return { count: 0 };
  }

  return tx.stravaConnection.updateMany({
    where: {
      appUserId,
      isActive: true,
      ...(keepConnectionId
        ? {
            id: {
              not: keepConnectionId,
            },
          }
        : {}),
    },
    data: {
      isActive: false,
    },
  });
}

export async function findActiveConnectionForUser(appUserId, { includeAthlete = false } = {}) {
  if (!appUserId) {
    return null;
  }

  return prisma.stravaConnection.findFirst({
    where: {
      appUserId,
      isActive: true,
    },
    include: includeAthlete ? { athlete: true } : undefined,
    orderBy: {
      connectedAt: "desc",
    },
  });
}

export async function requireActiveConnectionForUser(appUserId, options = {}) {
  const connection = await findActiveConnectionForUser(appUserId, options);

  if (!connection || (options.includeAthlete && !connection.athlete)) {
    throw buildMissingConnectionError();
  }

  return connection;
}

export async function findStoredConnectionForActivity(appUserId, stravaActivityId) {
  if (!appUserId || !stravaActivityId) {
    return null;
  }

  const activity = await prisma.activity.findFirst({
    where: {
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
    },
    include: {
      athlete: {
        include: {
          connection: true,
        },
      },
    },
  });

  if (!activity?.athlete?.connection) {
    return null;
  }

  return {
    activity,
    connection: activity.athlete.connection,
  };
}

export async function disconnectStravaForUser(appUserId) {
  if (!appUserId) {
    return {
      disconnected: false,
      deletedConnections: 0,
      deletedAthletes: 0,
      deletedActivities: 0,
      deletedSyncJobs: 0,
      deletedSyncCursors: 0,
    };
  }

  const activeJob = await prisma.syncJob.findFirst({
    where: {
      appUserId,
      status: {
        in: ["queued", "running"],
      },
    },
    orderBy: {
      queuedAt: "desc",
    },
  });

  if (activeJob) {
    throw buildActiveSyncError();
  }

  return prisma.$transaction(async (tx) => {
    const connections = await tx.stravaConnection.findMany({
      where: {
        appUserId,
      },
      select: {
        id: true,
        isActive: true,
        athlete: {
          select: {
            id: true,
          },
        },
      },
    });

    const connectionIds = connections.map((connection) => connection.id);
    const athleteIds = connections
      .map((connection) => connection.athlete?.id || null)
      .filter(Boolean);

    const deletedActivities = athleteIds.length
      ? await tx.activity.deleteMany({
          where: {
            athleteId: {
              in: athleteIds,
            },
          },
        })
      : { count: 0 };

    const deletedAthletes = connectionIds.length
      ? await tx.athlete.deleteMany({
          where: {
            connectionId: {
              in: connectionIds,
            },
          },
        })
      : { count: 0 };

    const deletedSyncJobs = await tx.syncJob.deleteMany({
      where: {
        appUserId,
      },
    });

    const deletedSyncCursors = await tx.syncCursor.deleteMany({
      where: {
        appUserId,
      },
    });

    const deletedConnections = connectionIds.length
      ? await tx.stravaConnection.deleteMany({
          where: {
            id: {
              in: connectionIds,
            },
          },
        })
      : { count: 0 };

    return {
      disconnected: connections.some((connection) => connection.isActive),
      deletedConnections: deletedConnections.count,
      deletedAthletes: deletedAthletes.count,
      deletedActivities: deletedActivities.count,
      deletedSyncJobs: deletedSyncJobs.count,
      deletedSyncCursors: deletedSyncCursors.count,
    };
  });
}
