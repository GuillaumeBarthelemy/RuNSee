import prisma from "../config/prisma.js";
import { getValidAccessToken } from "./strava/stravaAuth.service.js";
import { getActivityById } from "./strava/stravaActivity.service.js";
import { upsertDetailedActivity } from "../repositories/activity.repository.js";

async function getActiveConnectionWithAthlete() {
  const connection = await prisma.stravaConnection.findFirst({
    where: { isActive: true },
    include: { athlete: true },
    orderBy: { connectedAt: "desc" }
  });

  if (!connection || !connection.athlete) {
    throw new Error("No active Strava connection with athlete found.");
  }

  return connection;
}

export async function enrichActivityByStravaId(stravaActivityId) {
  const existingActivity = await prisma.activity.findUnique({
    where: {
      stravaActivityId: String(stravaActivityId)
    }
  });

  if (!existingActivity) {
    throw new Error("Activity not found in local database.");
  }

  const connection = await getActiveConnectionWithAthlete();
  const accessToken = await getValidAccessToken(connection);
  const { data: detailedActivity } = await getActivityById(accessToken, stravaActivityId);

  const updatedActivity = await upsertDetailedActivity(
    detailedActivity,
    connection.athlete.id
  );

  return {
    message: "Activity enriched successfully.",
    activity: updatedActivity
  };
}
