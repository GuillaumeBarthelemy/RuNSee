import axios from "axios";
import prisma from "../../config/prisma.js";

export function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    approval_prompt: "auto",
    scope: process.env.STRAVA_SCOPE,
    state: "runsee-local",
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const response = await axios.post(
    "https://www.strava.com/oauth/token",
    {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
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

export async function refreshAccessToken(refreshToken) {
  const response = await axios.post(
    "https://www.strava.com/oauth/token",
    {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
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

export async function getValidAccessToken(connection) {
  if (!connection) {
    throw new Error("No Strava connection found.");
  }

  if (!connection.accessToken) {
    throw new Error("No Strava access token found.");
  }

  if (!connection.accessTokenExpiresAt || !connection.refreshToken) {
    return connection.accessToken;
  }

  const now = Date.now();
  const expiresAt = new Date(connection.accessTokenExpiresAt).getTime();
  const safetyWindowMs = 60 * 1000;

  if (expiresAt - now > safetyWindowMs) {
    return connection.accessToken;
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);

  const updatedConnection = await prisma.stravaConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      accessTokenExpiresAt: new Date(refreshed.expires_at * 1000),
      grantedScopes: refreshed.scope || connection.grantedScopes,
      lastTokenRefreshAt: new Date(),
    },
  });

  return updatedConnection.accessToken;
}
