import axios from "axios";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import { resolveStravaAuthSettingsForConnection } from "./stravaApp.service.js";
import {
  decryptStravaToken,
  encryptStravaToken,
  isEncryptedStravaTokenPayload,
  isStravaTokenStorageReady,
} from "./stravaTokenCrypto.service.js";

function getRequiredAuthSettings(authSettings = {}, { requireSecret = false } = {}) {
  const clientId = String(authSettings.clientId || "").trim();
  const clientSecret = String(authSettings.clientSecret || "").trim();
  const redirectUri = String(authSettings.redirectUri || env.stravaRedirectUri || "").trim();

  if (!clientId || !redirectUri) {
    const error = new Error("Missing Strava OAuth configuration.");
    error.httpStatus = 400;
    error.userMessage =
      "La configuration OAuth Strava est incomplete pour ce compte.";
    throw error;
  }

  if (requireSecret && !clientSecret) {
    const error = new Error("Missing Strava client secret.");
    error.httpStatus = 400;
    error.userMessage =
      "Le Client Secret Strava manque pour finaliser la connexion de ce compte.";
    throw error;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope: String(authSettings.scope || env.stravaScope || "").trim(),
    approvalPrompt:
      String(authSettings.approvalPrompt || env.stravaApprovalPrompt || "force").trim() ||
      "force",
  };
}

export function getAuthorizationUrl(authSettings = {}, options = {}) {
  const settings = getRequiredAuthSettings(authSettings);
  const state = String(options.state || "runsee-local").trim() || "runsee-local";
  const approvalPrompt =
    String(options.approvalPrompt || settings.approvalPrompt || "force").trim() || "force";
  const params = new URLSearchParams({
    client_id: settings.clientId,
    response_type: "code",
    redirect_uri: settings.redirectUri,
    approval_prompt: approvalPrompt,
    scope: settings.scope,
    state,
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code, authSettings = {}) {
  const settings = getRequiredAuthSettings(authSettings, { requireSecret: true });

  const response = await axios.post(
    "https://www.strava.com/oauth/token",
    {
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: "authorization_code",
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

export async function refreshAccessToken(refreshToken, authSettings = {}) {
  const settings = getRequiredAuthSettings(authSettings, { requireSecret: true });

  const response = await axios.post(
    "https://www.strava.com/oauth/token",
    {
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

async function persistEncryptedTokensIfNeeded(connection, accessToken, refreshToken) {
  if (!connection?.id || !isStravaTokenStorageReady()) {
    return connection;
  }

  const nextAccessToken = accessToken ? encryptStravaToken(accessToken) : "";
  const nextRefreshToken = refreshToken ? encryptStravaToken(refreshToken) : "";
  const shouldPersist =
    (nextAccessToken && nextAccessToken !== connection.accessToken) ||
    (nextRefreshToken && nextRefreshToken !== connection.refreshToken);

  if (!shouldPersist) {
    return connection;
  }

  return prisma.stravaConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: nextAccessToken || null,
      refreshToken: nextRefreshToken || null,
    },
  });
}

export async function getValidAccessToken(connection) {
  if (!connection) {
    throw new Error("No Strava connection found.");
  }

  if (!connection.accessToken) {
    throw new Error("No Strava access token found.");
  }

  const accessToken = decryptStravaToken(connection.accessToken);
  const refreshToken = decryptStravaToken(connection.refreshToken);
  let normalizedConnection = connection;

  if (
    (connection.accessToken && !isEncryptedStravaTokenPayload(connection.accessToken)) ||
    (connection.refreshToken && !isEncryptedStravaTokenPayload(connection.refreshToken))
  ) {
    normalizedConnection = await persistEncryptedTokensIfNeeded(connection, accessToken, refreshToken);
  }

  if (!normalizedConnection.accessTokenExpiresAt || !refreshToken) {
    return accessToken;
  }

  const now = Date.now();
  const expiresAt = new Date(normalizedConnection.accessTokenExpiresAt).getTime();
  const safetyWindowMs = 60 * 1000;

  if (expiresAt - now > safetyWindowMs) {
    return accessToken;
  }

  const authSettings = await resolveStravaAuthSettingsForConnection(normalizedConnection);
  const refreshed = await refreshAccessToken(refreshToken, authSettings);

  const updatedConnection = await prisma.stravaConnection.update({
    where: { id: normalizedConnection.id },
    data: {
      userStravaAppId: authSettings.appConfigId || null,
      accessToken: encryptStravaToken(refreshed.access_token),
      refreshToken: encryptStravaToken(refreshed.refresh_token),
      accessTokenExpiresAt: new Date(refreshed.expires_at * 1000),
      grantedScopes: refreshed.scope || normalizedConnection.grantedScopes,
      lastTokenRefreshAt: new Date(),
    },
  });

  return decryptStravaToken(updatedConnection.accessToken);
}
