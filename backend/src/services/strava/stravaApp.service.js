import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import { deactivateOtherConnectionsForUser } from "./stravaConnection.service.js";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function getEncryptionKey() {
  const rawValue = String(env.stravaAppEncryptionKey || "").trim();

  if (!rawValue) {
    throw buildHttpError(
      "RUNSEE_STRAVA_APP_ENCRYPTION_KEY is not configured.",
      "La securisation des applications Strava personnelles n'est pas configuree cote serveur.",
      503,
    );
  }

  return createHash("sha256").update(rawValue).digest();
}

function encryptValue(value) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value || ""), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptValue(payload) {
  const rawPayload = String(payload || "").trim();

  if (!rawPayload) {
    return "";
  }

  const [version, iv, authTag, encrypted] = rawPayload.split(".");

  if (version !== ENCRYPTION_VERSION || !iv || !authTag || !encrypted) {
    throw buildHttpError(
      "Unsupported encrypted Strava app secret payload.",
      "Le secret de l'application Strava stocke cote serveur est invalide.",
      500,
    );
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getSharedStravaClientId() {
  return String(env.stravaClientId || "").trim();
}

function getSharedStravaClientSecret() {
  return String(env.stravaClientSecret || "").trim();
}

function hasSharedStravaApp() {
  return Boolean(getSharedStravaClientId() && getSharedStravaClientSecret());
}

function normalizeClientId(value) {
  return String(value || "").trim();
}

function normalizeClientSecret(value) {
  return String(value || "").trim();
}

function validateClientId(value) {
  const clientId = normalizeClientId(value);

  if (!clientId) {
    throw buildHttpError(
      "Missing Strava client id.",
      "Le Client ID Strava est obligatoire.",
      400,
    );
  }

  if (!/^\d+$/.test(clientId)) {
    throw buildHttpError(
      "Invalid Strava client id.",
      "Le Client ID Strava doit etre numerique.",
      400,
    );
  }

  return clientId;
}

function validateClientSecret(value) {
  const clientSecret = normalizeClientSecret(value);

  if (!clientSecret) {
    throw buildHttpError(
      "Missing Strava client secret.",
      "Le Client Secret Strava est obligatoire.",
      400,
    );
  }

  if (clientSecret.length < 20) {
    throw buildHttpError(
      "Invalid Strava client secret.",
      "Le Client Secret Strava semble incomplet.",
      400,
    );
  }

  return clientSecret;
}

function safeRedirectUri() {
  const redirectUri = String(env.stravaRedirectUri || "").trim();

  if (!redirectUri) {
    throw buildHttpError(
      "STRAVA_REDIRECT_URI is not configured.",
      "Le callback OAuth Strava n'est pas configure cote serveur.",
      503,
    );
  }

  return redirectUri;
}

function safeCallbackDomain() {
  try {
    return new URL(safeRedirectUri()).host;
  } catch {
    return "";
  }
}

function buildSharedStravaAppUnavailableError() {
  return buildHttpError(
    "No shared Strava app is configured.",
    "Aucune application Strava partagee n'est configuree sur RunNSee. Ajoute ton application Strava personnelle avant de continuer.",
    400,
  );
}

function buildMissingPersonalStravaAppError() {
  return buildHttpError(
    "No personal Strava app was found for the current user.",
    "Aucune application Strava personnelle n'est configuree pour ce compte.",
    404,
  );
}

function buildMissingReferencedPersonalStravaAppError() {
  const error = buildHttpError(
    "The referenced personal Strava app configuration is missing.",
    "Cette connexion Strava depend d'une application personnelle qui n'est plus disponible. Reconfigure-la puis reconnecte Strava.",
    409,
  );
  error.authRedirectReason = "strava_app_missing";
  return error;
}

function buildStravaAppSummary(userStravaApp, activeConnection = null) {
  const sharedAppAvailable = hasSharedStravaApp();
  const personalAppConfigured = Boolean(userStravaApp);
  const connectionSource = activeConnection?.userStravaAppId
    ? "personal"
    : activeConnection
      ? "shared"
      : personalAppConfigured
        ? "personal"
        : "shared";

  return {
    personalAppConfigured,
    connectionSource,
    sharedAppAvailable,
    callbackUrl: safeRedirectUri(),
    callbackDomain: safeCallbackDomain(),
    personalClientId: userStravaApp?.clientId || "",
    personalConfiguredAt: userStravaApp?.createdAt || null,
    personalUpdatedAt: userStravaApp?.updatedAt || null,
    activeConnectionUsesPersonalApp: Boolean(activeConnection?.userStravaAppId),
  };
}

function buildPersonalAuthSettings(userStravaApp) {
  if (!userStravaApp) {
    throw buildMissingPersonalStravaAppError();
  }

  return {
    source: "personal",
    appConfigId: userStravaApp.id,
    clientId: userStravaApp.clientId,
    clientSecret: decryptValue(userStravaApp.clientSecretEncrypted),
    redirectUri: safeRedirectUri(),
    scope: env.stravaScope,
    approvalPrompt: env.stravaApprovalPrompt,
  };
}

function buildSharedAuthSettings() {
  if (!hasSharedStravaApp()) {
    throw buildSharedStravaAppUnavailableError();
  }

  return {
    source: "shared",
    appConfigId: null,
    clientId: getSharedStravaClientId(),
    clientSecret: getSharedStravaClientSecret(),
    redirectUri: safeRedirectUri(),
    scope: env.stravaScope,
    approvalPrompt: env.stravaApprovalPrompt,
  };
}

async function findUserStravaApp(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    return null;
  }

  return tx.userStravaApp.findUnique({
    where: {
      appUserId,
    },
  });
}

async function runInTransaction(tx, callback) {
  if (typeof tx?.$transaction === "function") {
    return tx.$transaction(callback);
  }

  return callback(tx || prisma);
}

export async function getUserStravaAppSummary(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    return buildStravaAppSummary(null, null);
  }

  const [userStravaApp, activeConnection] = await Promise.all([
    findUserStravaApp(appUserId, { tx }),
    tx.stravaConnection.findFirst({
      where: {
        appUserId,
        isActive: true,
      },
      orderBy: {
        connectedAt: "desc",
      },
    }),
  ]);

  return buildStravaAppSummary(userStravaApp, activeConnection);
}

export async function resolveStravaAuthSettingsForUser(appUserId, { tx = prisma } = {}) {
  const userStravaApp = await findUserStravaApp(appUserId, { tx });

  if (userStravaApp) {
    return buildPersonalAuthSettings(userStravaApp);
  }

  return buildSharedAuthSettings();
}

export async function resolveStravaAuthSettingsFromState(
  appUserId,
  oauthState = {},
  { tx = prisma } = {},
) {
  const source = String(oauthState?.stravaAuthSource || "").trim();
  const userStravaAppId = String(oauthState?.userStravaAppId || "").trim();

  if (source === "personal") {
    const userStravaApp = userStravaAppId
      ? await tx.userStravaApp.findFirst({
          where: {
            id: userStravaAppId,
            appUserId,
          },
        })
      : await findUserStravaApp(appUserId, { tx });

    if (!userStravaApp) {
      throw buildMissingReferencedPersonalStravaAppError();
    }

    return buildPersonalAuthSettings(userStravaApp);
  }

  return buildSharedAuthSettings();
}

export async function resolveStravaAuthSettingsForConnection(
  connection,
  { tx = prisma } = {},
) {
  if (!connection) {
    throw buildHttpError(
      "A Strava connection is required.",
      "Aucune connexion Strava n'est disponible.",
      400,
    );
  }

  if (!connection.userStravaAppId) {
    return buildSharedAuthSettings();
  }

  const userStravaApp = await tx.userStravaApp.findFirst({
    where: {
      id: connection.userStravaAppId,
      appUserId: connection.appUserId,
    },
  });

  if (!userStravaApp) {
    throw buildMissingReferencedPersonalStravaAppError();
  }

  return buildPersonalAuthSettings(userStravaApp);
}

export async function upsertUserStravaApp(
  appUserId,
  { clientId, clientSecret } = {},
  { tx = prisma } = {},
) {
  if (!appUserId) {
    throw buildHttpError(
      "App user id is required.",
      "Connecte-toi pour configurer une application Strava personnelle.",
      401,
    );
  }

  return runInTransaction(tx, async (transaction) => {
    const existing = await findUserStravaApp(appUserId, { tx: transaction });
    const safeClientId = validateClientId(clientId);
    const nextSecretInput = normalizeClientSecret(clientSecret);
    const safeClientSecret = nextSecretInput
      ? validateClientSecret(nextSecretInput)
      : existing
        ? decryptValue(existing.clientSecretEncrypted)
        : validateClientSecret(nextSecretInput);
    const isChanged =
      !existing ||
      existing.clientId !== safeClientId ||
      Boolean(nextSecretInput);

    const userStravaApp = existing
      ? await transaction.userStravaApp.update({
          where: {
            id: existing.id,
          },
          data: {
            clientId: safeClientId,
            clientSecretEncrypted: isChanged
              ? encryptValue(safeClientSecret)
              : existing.clientSecretEncrypted,
          },
        })
      : await transaction.userStravaApp.create({
          data: {
            appUserId,
            clientId: safeClientId,
            clientSecretEncrypted: encryptValue(safeClientSecret),
          },
        });

    const deactivatedConnections = isChanged
      ? await deactivateOtherConnectionsForUser(appUserId, {
          tx: transaction,
        })
      : { count: 0 };

    return {
      userStravaApp,
      summary: buildStravaAppSummary(userStravaApp, null),
      reauthorizationRequired: deactivatedConnections.count > 0,
      deactivatedConnections: deactivatedConnections.count,
    };
  });
}

export async function deleteUserStravaApp(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    throw buildHttpError(
      "App user id is required.",
      "Connecte-toi pour modifier l'application Strava personnelle.",
      401,
    );
  }

  return runInTransaction(tx, async (transaction) => {
    const existing = await findUserStravaApp(appUserId, { tx: transaction });

    if (!existing) {
      return {
        removed: false,
        summary: buildStravaAppSummary(null, null),
        reauthorizationRequired: false,
        deactivatedConnections: 0,
      };
    }

    const deactivatedConnections = await transaction.stravaConnection.updateMany({
      where: {
        appUserId,
        userStravaAppId: existing.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    await transaction.userStravaApp.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      removed: true,
      summary: buildStravaAppSummary(null, null),
      reauthorizationRequired: deactivatedConnections.count > 0,
      deactivatedConnections: deactivatedConnections.count,
    };
  });
}

export function serializeStravaAppForAuthUser(userStravaApp, activeConnection = null) {
  return buildStravaAppSummary(userStravaApp, activeConnection);
}
