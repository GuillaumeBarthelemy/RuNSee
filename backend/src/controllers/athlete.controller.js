import prisma from "../config/prisma.js";
import { getValidAccessToken } from "../services/strava/stravaAuth.service.js";
import { getLoggedInAthlete } from "../services/strava/stravaAthlete.service.js";

export async function getCurrentAthlete(req, res, next) {
  try {
    const athlete = await prisma.athlete.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!athlete) {
      return res.status(404).json({
        message: "Aucun athlète Strava connecté.",
      });
    }

    return res.json(athlete);
  } catch (error) {
    next(error);
  }
}

export async function refreshCurrentAthlete(req, res, next) {
  try {
    const connection = await prisma.stravaConnection.findFirst({
      where: { isActive: true },
      orderBy: { connectedAt: "desc" },
    });

    if (!connection) {
      return res.status(404).json({
        message: "Aucune connexion Strava active.",
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
