import prisma from "../config/prisma.js";
import env from "../config/env.js";
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
} from "../services/strava/stravaAuth.service.js";
import { getLoggedInAthlete } from "../services/strava/stravaAthlete.service.js";

export async function login(req, res, next) {
  try {
    const url = getAuthorizationUrl();
    return res.redirect(url);
  } catch (error) {
    next(error);
  }
}

export async function callback(req, res, next) {
  try {
    const { code, scope, error, state } = req.query;

    if (error) {
      return res.status(400).json({
        message: "Autorisation Strava refusée ou interrompue.",
        error,
      });
    }

    if (!code) {
      return res.status(400).json({
        message: "Code d'autorisation Strava manquant.",
      });
    }

    if (state && state !== "runsee-local") {
      return res.status(400).json({
        message: "State OAuth invalide.",
      });
    }

    const tokenData = await exchangeCodeForToken(code);
    const athleteData = await getLoggedInAthlete(tokenData.access_token);

    let appUser = await prisma.appUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!appUser) {
      appUser = await prisma.appUser.create({
        data: {
          displayName: "Local User",
        },
      });
    }

    const grantedScopes = scope || tokenData.scope || "";

    const connection = await prisma.stravaConnection.upsert({
      where: {
        stravaAthleteId: String(athleteData.id),
      },
      update: {
        appUserId: appUser.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpiresAt: new Date(tokenData.expires_at * 1000),
        grantedScopes,
        isActive: true,
        lastTokenRefreshAt: new Date(),
      },
      create: {
        appUserId: appUser.id,
        stravaAthleteId: String(athleteData.id),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpiresAt: new Date(tokenData.expires_at * 1000),
        grantedScopes,
        isActive: true,
        lastTokenRefreshAt: new Date(),
      },
    });

    await prisma.athlete.upsert({
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

    return res.redirect(`${env.publicAppUrl}?strava=connected`);
  } catch (error) {
    next(error);
  }
}
