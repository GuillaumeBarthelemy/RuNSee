import prisma from "../config/prisma.js";
import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import { getValidAccessToken } from "../services/strava/stravaAuth.service.js";
import { getLoggedInAthlete } from "../services/strava/stravaAthlete.service.js";
import { findActiveConnectionForUser } from "../services/strava/stravaConnection.service.js";

async function getCurrentConnectionWithAthlete(appUserId) {
  return findActiveConnectionForUser(appUserId, { includeAthlete: true });
}

export async function getCurrentAthlete(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const connection = await getCurrentConnectionWithAthlete(user.id);

    if (!connection?.athlete) {
      return res.status(404).json({
        message: "Aucun athlete Strava connecte pour ce compte.",
      });
    }

    return res.json(connection.athlete);
  } catch (error) {
    next(error);
  }
}

export async function refreshCurrentAthlete(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const connection = await getCurrentConnectionWithAthlete(user.id);

    if (!connection) {
      return res.status(404).json({
        message: "Aucune connexion Strava active pour ce compte.",
      });
    }

    const accessToken = await getValidAccessToken(connection);
    const athleteData = await getLoggedInAthlete(accessToken);

    const updatedAthlete = await prisma.athlete.upsert({
      where: {
        stravaAthleteId: String(athleteData.id),
      },
      update: {
        connectionId: connection.id,
        username: athleteData.username || null,
        firstname: athleteData.firstname || null,
        lastname: athleteData.lastname || null,
        city: athleteData.city || null,
        state: athleteData.state || null,
        country: athleteData.country || null,
        sex: athleteData.sex || null,
        profileMediumUrl: athleteData.profile_medium || null,
        profileUrl: athleteData.profile || null,
        rawJson: JSON.stringify(athleteData),
        lastFetchedAt: new Date(),
      },
      create: {
        connectionId: connection.id,
        stravaAthleteId: String(athleteData.id),
        username: athleteData.username || null,
        firstname: athleteData.firstname || null,
        lastname: athleteData.lastname || null,
        city: athleteData.city || null,
        state: athleteData.state || null,
        country: athleteData.country || null,
        sex: athleteData.sex || null,
        profileMediumUrl: athleteData.profile_medium || null,
        profileUrl: athleteData.profile || null,
        rawJson: JSON.stringify(athleteData),
        lastFetchedAt: new Date(),
      },
    });

    return res.json(updatedAthlete);
  } catch (error) {
    next(error);
  }
}
