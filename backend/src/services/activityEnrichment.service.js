import { getValidAccessToken } from "./strava/stravaAuth.service.js";
import { getActivityById } from "./strava/stravaActivity.service.js";
import { upsertDetailedActivity } from "../repositories/activity.repository.js";
import { findStoredConnectionForActivity } from "./strava/stravaConnection.service.js";

export async function enrichActivityByStravaId(appUserId, stravaActivityId) {
  const storedEntry = await findStoredConnectionForActivity(appUserId, stravaActivityId);

  if (!storedEntry?.activity || !storedEntry.connection) {
    throw new Error("Activity not found in local database.");
  }

  const accessToken = await getValidAccessToken(storedEntry.connection);
  const { data: detailedActivity } = await getActivityById(accessToken, stravaActivityId);

  const updatedActivity = await upsertDetailedActivity(
    detailedActivity,
    storedEntry.activity.athleteId
  );

  return {
    message: "Activity enriched successfully.",
    activity: updatedActivity.activity,
  };
}
