import prisma from "../config/prisma.js";
import env from "../config/env.js";
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
} from "../services/strava/stravaAuth.service.js";
import { getLoggedInAthlete } from "../services/strava/stravaAthlete.service.js";

const OAUTH_STATE_KIND = "runsee-oauth";

function normalizeOrigin(value) {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

function getAllowedFrontendOrigins() {
  return new Set(
    [env.localAppUrl, env.publicAppUrl, ...(env.frontendAllowedOrigins || [])]
      .map((entry) => normalizeOrigin(entry))
      .filter(Boolean)
  );
}

function resolveAllowedReturnTo(value) {
  const candidate = normalizeOrigin(value);

  if (!candidate) {
    return "";
  }

  return getAllowedFrontendOrigins().has(candidate) ? candidate : "";
}

function encodeOAuthState(returnTo) {
  const payload = {
    kind: OAUTH_STATE_KIND,
    returnTo: resolveAllowedReturnTo(returnTo) || env.publicAppUrl,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeOAuthState(rawState) {
  const state = String(rawState || "").trim();

  if (!state || state === "runsee-local") {
    return {
      kind: OAUTH_STATE_KIND,
      returnTo: env.publicAppUrl,
    };
  }

  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));

    if (parsed?.kind !== OAUTH_STATE_KIND) {
      return null;
    }

    return {
      kind: OAUTH_STATE_KIND,
      returnTo: resolveAllowedReturnTo(parsed.returnTo) || env.publicAppUrl,
    };
  } catch {
    return null;
  }
}

function getRequestedReturnTo(req) {
  return (
    resolveAllowedReturnTo(req.query?.returnTo) ||
    resolveAllowedReturnTo(req.get("origin")) ||
    resolveAllowedReturnTo(req.get("referer")) ||
    env.publicAppUrl
  );
}

function buildConnectedRedirectUrl(returnTo) {
  const redirectUrl = new URL(
    resolveAllowedReturnTo(returnTo) || env.publicAppUrl
  );

  redirectUrl.searchParams.set("strava", "connected");
  return redirectUrl.toString();
}

export async function login(req, res, next) {
  try {
    const url = getAuthorizationUrl({
      state: encodeOAuthState(getRequestedReturnTo(req)),
    });
    return res.redirect(url);
  } catch (error) {
    next(error);
  }
}

export async function callback(req, res, next) {
  try {
    const { code, scope, error, state } = req.query;
    const oauthState = decodeOAuthState(state);

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

    if (!oauthState) {
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

    return res.redirect(buildConnectedRedirectUrl(oauthState.returnTo));
  } catch (error) {
    next(error);
  }
}
