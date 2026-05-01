import prisma from "../config/prisma.js";
import env from "../config/env.js";
import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  deleteUserAiAssistantConfig,
  upsertUserAiAssistantConfig,
} from "../services/assistant/assistantConfig.service.js";
import {
  clearSessionCookie,
  revokeSessionById,
  setSessionCookie,
} from "../services/auth/session.service.js";
import {
  getCurrentAuthUser,
  loginUser,
  registerUser,
} from "../services/auth/user-auth.service.js";
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
} from "../services/strava/stravaAuth.service.js";
import { encryptStravaToken } from "../services/strava/stravaTokenCrypto.service.js";
import {
  deleteUserStravaApp,
  resolveStravaAuthSettingsFromState,
  resolveStravaAuthSettingsForUser,
  upsertUserStravaApp,
} from "../services/strava/stravaApp.service.js";
import { getLoggedInAthlete } from "../services/strava/stravaAthlete.service.js";
import {
  assertStravaAccountAvailableForUser,
  deactivateOtherConnectionsForUser,
  disconnectStravaForUser,
} from "../services/strava/stravaConnection.service.js";

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

function normalizeReturnTo(value) {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    url.hash = "";
    return url.toString();
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
  const candidate = normalizeReturnTo(value);

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    return getAllowedFrontendOrigins().has(url.origin) ? candidate : "";
  } catch {
    return "";
  }
}

function encodeOAuthState({
  returnTo,
  appUserId,
  stravaAuthSource,
  userStravaAppId,
}) {
  const payload = {
    kind: OAUTH_STATE_KIND,
    returnTo: resolveAllowedReturnTo(returnTo) || env.publicAppUrl,
    appUserId: String(appUserId || "").trim() || "",
    stravaAuthSource: String(stravaAuthSource || "").trim() || "shared",
    userStravaAppId: String(userStravaAppId || "").trim() || "",
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeOAuthState(rawState) {
  const state = String(rawState || "").trim();

  if (!state || state === "runsee-local") {
    return {
      kind: OAUTH_STATE_KIND,
      returnTo: env.publicAppUrl,
      appUserId: "",
      stravaAuthSource: "shared",
      userStravaAppId: "",
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
      appUserId: String(parsed.appUserId || "").trim(),
      stravaAuthSource: String(parsed.stravaAuthSource || "").trim() || "shared",
      userStravaAppId: String(parsed.userStravaAppId || "").trim(),
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

function buildRedirectUrl(returnTo, status, value) {
  const redirectUrl = new URL(
    resolveAllowedReturnTo(returnTo) || env.publicAppUrl
  );

  redirectUrl.searchParams.set(status, value);
  return redirectUrl.toString();
}

function buildConnectedRedirectUrl(returnTo) {
  return buildRedirectUrl(returnTo, "strava", "connected");
}

function buildAuthRedirectUrl(returnTo, reason) {
  return buildRedirectUrl(returnTo, "auth", reason);
}

export async function signup(req, res, next) {
  try {
    const { user, rawToken } = await registerUser({
      displayName: req.body?.displayName,
      email: req.body?.email,
      password: req.body?.password,
      req,
    });

    setSessionCookie(res, rawToken);

    const currentUser = await getCurrentAuthUser(user.id);

    return res.status(201).json({
      user: currentUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginWithPassword(req, res, next) {
  try {
    const { user, rawToken } = await loginUser({
      email: req.body?.email,
      password: req.body?.password,
      req,
    });

    setSessionCookie(res, rawToken);

    const currentUser = await getCurrentAuthUser(user.id);

    return res.json({
      user: currentUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.auth?.session?.id) {
      await revokeSessionById(req.auth.session.id);
    }

    clearSessionCookie(res);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const currentUser = await getCurrentAuthUser(user.id);

    if (!currentUser) {
      clearSessionCookie(res);
      return res.status(401).json({
        message: "Session invalide.",
      });
    }

    return res.json({
      user: currentUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const authSettings = await resolveStravaAuthSettingsForUser(user.id);
    const url = getAuthorizationUrl(authSettings, {
      state: encodeOAuthState({
        returnTo: getRequestedReturnTo(req),
        appUserId: user.id,
        stravaAuthSource: authSettings.source,
        userStravaAppId: authSettings.appConfigId,
      }),
    });
    return res.redirect(url);
  } catch (error) {
    next(error);
  }
}

export async function callback(req, res, next) {
  let oauthState = null;

  try {
    const { code, scope, error, state } = req.query;
    oauthState = decodeOAuthState(state);

    if (error) {
      if (oauthState?.returnTo) {
        return res.redirect(buildAuthRedirectUrl(oauthState.returnTo, "strava_refused"));
      }

      return res.status(400).json({
        message: "Autorisation Strava refusee ou interrompue.",
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

    if (!req.auth?.user?.id) {
      return res.redirect(buildAuthRedirectUrl(oauthState.returnTo, "session_required"));
    }

    if (oauthState.appUserId && oauthState.appUserId !== req.auth.user.id) {
      return res.status(403).json({
        message: "La session OAuth ne correspond pas au compte connecte.",
      });
    }

    const authSettings = await resolveStravaAuthSettingsFromState(
      req.auth.user.id,
      oauthState,
    );
    const tokenData = await exchangeCodeForToken(code, authSettings);
    const athleteData = await getLoggedInAthlete(tokenData.access_token);
    const grantedScopes = scope || tokenData.scope || "";
    const stravaAthleteId = String(athleteData.id || "").trim();

    if (!stravaAthleteId) {
      return res.status(502).json({
        message: "Impossible d'identifier le compte Strava autorise.",
      });
    }

    await prisma.$transaction(async (tx) => {
      const existingConnection = await assertStravaAccountAvailableForUser(
        req.auth.user.id,
        stravaAthleteId,
        { tx },
      );

      await deactivateOtherConnectionsForUser(req.auth.user.id, {
        tx,
        keepConnectionId: existingConnection?.id || "",
      });

      const connection = existingConnection
        ? await tx.stravaConnection.update({
            where: {
              id: existingConnection.id,
            },
            data: {
              userStravaAppId: authSettings.appConfigId || null,
              accessToken: encryptStravaToken(tokenData.access_token),
              refreshToken: encryptStravaToken(tokenData.refresh_token),
              accessTokenExpiresAt: new Date(tokenData.expires_at * 1000),
              grantedScopes,
              isActive: true,
              connectedAt: new Date(),
              lastTokenRefreshAt: new Date(),
            },
          })
        : await tx.stravaConnection.create({
            data: {
              appUserId: req.auth.user.id,
              userStravaAppId: authSettings.appConfigId || null,
              stravaAthleteId,
              accessToken: encryptStravaToken(tokenData.access_token),
              refreshToken: encryptStravaToken(tokenData.refresh_token),
              accessTokenExpiresAt: new Date(tokenData.expires_at * 1000),
              grantedScopes,
              isActive: true,
              connectedAt: new Date(),
              lastTokenRefreshAt: new Date(),
            },
          });

      await tx.athlete.upsert({
        where: {
          stravaAthleteId,
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
          stravaAthleteId,
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
    });

    return res.redirect(buildConnectedRedirectUrl(oauthState.returnTo));
  } catch (error) {
    if (oauthState?.returnTo && error?.authRedirectReason) {
      return res.redirect(buildAuthRedirectUrl(oauthState.returnTo, error.authRedirectReason));
    }

    next(error);
  }
}

export async function disconnectStrava(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await disconnectStravaForUser(user.id);

    return res.json({
      disconnected: result.disconnected,
      count: result.deletedConnections,
      deletedConnections: result.deletedConnections,
      deletedAthletes: result.deletedAthletes,
      deletedActivities: result.deletedActivities,
      deletedSyncJobs: result.deletedSyncJobs,
      deletedSyncCursors: result.deletedSyncCursors,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStravaApp(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const currentUser = await getCurrentAuthUser(user.id);

    if (!currentUser) {
      clearSessionCookie(res);
      return res.status(401).json({
        message: "Session invalide.",
      });
    }

    return res.json({
      stravaApp: currentUser.stravaApp || null,
      user: currentUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveStravaApp(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await upsertUserStravaApp(user.id, {
      clientId: req.body?.clientId,
      clientSecret: req.body?.clientSecret,
    });
    const currentUser = await getCurrentAuthUser(user.id);

    return res.json({
      user: currentUser,
      stravaApp: currentUser?.stravaApp || result.summary,
      reauthorizationRequired: result.reauthorizationRequired,
      deactivatedConnections: result.deactivatedConnections,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteStravaApp(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await deleteUserStravaApp(user.id);
    const currentUser = await getCurrentAuthUser(user.id);

    return res.json({
      user: currentUser,
      stravaApp: currentUser?.stravaApp || result.summary,
      removed: result.removed,
      reauthorizationRequired: result.reauthorizationRequired,
      deactivatedConnections: result.deactivatedConnections,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveAiAssistant(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await upsertUserAiAssistantConfig(user.id, {
      enabled: req.body?.enabled,
      model: req.body?.model,
      apiKey: req.body?.apiKey,
      systemPrompt: req.body?.systemPrompt,
    });
    const currentUser = await getCurrentAuthUser(user.id);

    return res.json({
      user: currentUser,
      aiAssistant: currentUser?.aiAssistant || result.summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAiAssistant(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await deleteUserAiAssistantConfig(user.id);
    const currentUser = await getCurrentAuthUser(user.id);

    return res.json({
      user: currentUser,
      aiAssistant: currentUser?.aiAssistant || result.summary,
      removed: result.removed,
    });
  } catch (error) {
    next(error);
  }
}
