import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";
import prisma from "../../config/prisma.js";
import {
  buildExternalProviderConnectionSummary,
  findExternalProviderConnectionForUser,
  upsertExternalProviderConnectionState,
} from "./externalProviderConnection.service.js";
import { loginGarminconnect } from "./garminconnectBridge.service.js";
import {
  buildGarminConnectionWithRecoveryStatus,
  getGarminRecoveryBackfillStatus,
} from "./garminRecoveryBackfill.service.js";
import {
  decryptProviderSessionPayload,
  encryptProviderSessionPayload,
  isProviderSessionStorageReady,
} from "./providerSessionCrypto.service.js";

const GARMIN_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;
const GARMIN_RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;
const PURGE_CONFIRMATION_TOKEN = "PURGE_GARMIN";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeGarminStatus(status) {
  const candidate = normalizeString(status).toLowerCase();

  if (candidate === "mfa_required") {
    return EXTERNAL_PROVIDER_STATUSES.MFA_REQUIRED;
  }

  if (candidate === "connected") {
    return EXTERNAL_PROVIDER_STATUSES.CONNECTED;
  }

  return EXTERNAL_PROVIDER_STATUSES.ERROR;
}

function buildPublicConnectionResult(connection, extras = {}) {
  return {
    connection: buildExternalProviderConnectionSummary(connection),
    ...extras,
  };
}

function extractGarminProfile(result = {}, email = "") {
  const profile = result?.profile && typeof result.profile === "object" ? result.profile : {};
  const accountIdentifier = normalizeString(profile.accountIdentifier) || normalizeString(email);
  const displayName = normalizeString(profile.displayName) || accountIdentifier;

  return {
    accountIdentifier,
    displayName,
  };
}

function buildGarminErrorCode(result = {}) {
  return normalizeString(result.code) || "GARMINCONNECT_ERROR";
}

function buildGarminErrorMessage(result = {}) {
  return normalizeString(result.message) || "Connexion Garmin impossible.";
}

function getRateLimitRemainingMinutes(connection) {
  if (connection?.lastErrorCode !== "GARMINCONNECT_RATE_LIMITED" || !connection?.lastErrorAt) {
    return 0;
  }

  const elapsedMs = Date.now() - new Date(connection.lastErrorAt).getTime();
  const remainingMs = GARMIN_RATE_LIMIT_COOLDOWN_MS - elapsedMs;

  return remainingMs > 0 ? Math.ceil(remainingMs / 60000) : 0;
}

function canResumeMfaChallenge(connection, mfaCode) {
  return Boolean(
    mfaCode
      && connection?.status === EXTERNAL_PROVIDER_STATUSES.MFA_REQUIRED
      && connection?.encryptedSession,
  );
}

function buildMfaChallengeFromConnection(connection) {
  if (!connection?.encryptedSession) {
    return null;
  }

  try {
    const sessionPayload = decryptProviderSessionPayload(connection.encryptedSession, { parseJson: true });

    if (sessionPayload?.schema === "garminconnect-mfa-challenge-v1") {
      return sessionPayload;
    }
  } catch {
    return null;
  }

  return null;
}

function shouldKeepMfaChallenge(existingConnection, result = {}) {
  if (existingConnection?.status !== EXTERNAL_PROVIDER_STATUSES.MFA_REQUIRED) {
    return false;
  }

  return [
    "GARMINCONNECT_RATE_LIMITED",
    "GARMINCONNECT_AUTHENTICATION_FAILED",
    "GARMINCONNECT_CONNECTION_FAILED",
  ].includes(buildGarminErrorCode(result));
}

function resolveGarminErrorStatus(result = {}) {
  const errorCode = buildGarminErrorCode(result);

  if (errorCode === "GARMINCONNECT_RATE_LIMITED") {
    return 429;
  }

  return result?.retryable ? 502 : 400;
}

export async function getGarminConnectionStatus(appUserId) {
  const connection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);
  return buildGarminConnectionWithRecoveryStatus(appUserId, connection);
}

export async function connectGarminForUser(appUserId, payload = {}) {
  const email = normalizeString(payload.email);
  const password = String(payload.password || "");
  const mfaCode = normalizeString(payload.mfaCode);
  const consentAccepted = Boolean(payload.consentAccepted);

  if (!consentAccepted) {
    throw buildHttpError(
      "Garmin experimental consent is required.",
      "Valide le consentement experimental Garmin avant de continuer.",
    );
  }

  if (!email || !password) {
    throw buildHttpError(
      "Garmin credentials are required.",
      "Renseigne ton email et ton mot de passe Garmin pour lancer la connexion.",
    );
  }

  if (!isProviderSessionStorageReady()) {
    throw buildHttpError(
      "External-provider session encryption is not configured.",
      "La securisation des sessions Garmin n'est pas configuree cote serveur.",
      503,
    );
  }

  const existingConnection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);
  const rateLimitRemainingMinutes = getRateLimitRemainingMinutes(existingConnection);
  const canAttemptMfaResume = canResumeMfaChallenge(existingConnection, mfaCode);
  const mfaChallenge = canAttemptMfaResume
    ? buildMfaChallengeFromConnection(existingConnection)
    : null;
  const shouldResumeMfa = Boolean(mfaChallenge);

  if (rateLimitRemainingMinutes > 0 && !shouldResumeMfa) {
    const error = buildHttpError(
      "Garmin rate limit cooldown is active.",
      `Garmin limite temporairement les connexions. Attends environ ${rateLimitRemainingMinutes} min avant de reessayer.`,
      429,
    );
    error.connection = buildExternalProviderConnectionSummary(existingConnection);
    throw error;
  }

  await upsertExternalProviderConnectionState({
    appUserId,
    providerCode: GARMIN_PROVIDER_CODE,
    status: EXTERNAL_PROVIDER_STATUSES.CONNECTING,
    encryptedSession: shouldResumeMfa ? undefined : null,
    consentAcceptedAt: new Date(),
    lastErrorCode: null,
    lastErrorMessage: null,
    lastErrorAt: null,
  });

  let result = null;

  try {
    result = await loginGarminconnect({ email, password, mfaCode, mfaChallenge });
  } catch (error) {
    await upsertExternalProviderConnectionState({
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      status: EXTERNAL_PROVIDER_STATUSES.ERROR,
      consentAcceptedAt: new Date(),
      lastErrorCode: "GARMINCONNECT_BRIDGE_ERROR",
      lastErrorMessage: error.userMessage || "Connexion Garmin impossible.",
      lastErrorAt: new Date(),
    });

    throw error;
  }

  const normalizedStatus = normalizeGarminStatus(result?.status);

  if (normalizedStatus === EXTERNAL_PROVIDER_STATUSES.MFA_REQUIRED) {
    const connection = await upsertExternalProviderConnectionState({
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      status: EXTERNAL_PROVIDER_STATUSES.MFA_REQUIRED,
      encryptedSession: result?.challenge
        ? encryptProviderSessionPayload(result.challenge)
        : undefined,
      consentAcceptedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
      lastErrorAt: null,
    });

    return buildPublicConnectionResult(connection, {
      recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
      mfaRequired: true,
      message: "Garmin demande un code de validation. Garde le mot de passe saisi et ajoute le code recu.",
    });
  }

  if (normalizedStatus !== EXTERNAL_PROVIDER_STATUSES.CONNECTED) {
    const keepMfaChallenge = shouldKeepMfaChallenge(existingConnection, result);
    const connection = await upsertExternalProviderConnectionState({
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      status: keepMfaChallenge
        ? EXTERNAL_PROVIDER_STATUSES.MFA_REQUIRED
        : EXTERNAL_PROVIDER_STATUSES.ERROR,
      consentAcceptedAt: new Date(),
      lastErrorCode: buildGarminErrorCode(result),
      lastErrorMessage: buildGarminErrorMessage(result),
      lastErrorAt: new Date(),
    });

    const error = buildHttpError(
      `Garmin connection failed: ${buildGarminErrorCode(result)}.`,
      buildGarminErrorMessage(result),
      resolveGarminErrorStatus(result),
    );
    error.connection = buildExternalProviderConnectionSummary(connection);
    throw error;
  }

  const profile = extractGarminProfile(result, email);
  const connection = await upsertExternalProviderConnectionState({
    appUserId,
    providerCode: GARMIN_PROVIDER_CODE,
    status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
    encryptedSession: encryptProviderSessionPayload(result.session),
    displayName: profile.displayName,
    accountIdentifier: profile.accountIdentifier,
    consentAcceptedAt: new Date(),
    connectedAt: new Date(),
    disconnectedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    lastErrorAt: null,
  });

  return buildPublicConnectionResult(connection, {
    recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
    mfaRequired: false,
    message: "Garmin est connecte. Tu peux lancer la recuperation progressive depuis l'administration.",
  });
}

export async function disconnectGarminForUser(appUserId) {
  const connection = await upsertExternalProviderConnectionState({
    appUserId,
    providerCode: GARMIN_PROVIDER_CODE,
    status: EXTERNAL_PROVIDER_STATUSES.DISCONNECTED,
    encryptedSession: null,
    displayName: null,
    accountIdentifier: null,
    connectedAt: null,
    disconnectedAt: new Date(),
    lastErrorCode: null,
    lastErrorMessage: null,
    lastErrorAt: null,
  });

  return buildPublicConnectionResult(connection, {
    recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
    message: "Garmin est deconnecte. Les sessions stockees ont ete supprimees.",
  });
}

export async function purgeGarminDataForUser(appUserId, { confirm } = {}) {
  if (confirm !== PURGE_CONFIRMATION_TOKEN) {
    throw buildHttpError(
      "Garmin purge confirmation is invalid.",
      "Confirme la purge Garmin avec le texte exact PURGE_GARMIN.",
      400,
    );
  }

  const recoveryBackfill = await getGarminRecoveryBackfillStatus(appUserId);

  if (recoveryBackfill?.isRunning) {
    throw buildHttpError(
      "Cannot purge Garmin data while recovery sync is running.",
      "Une recuperation Garmin est en cours. Attends la fin avant de purger les donnees.",
      409,
    );
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const activityProviderEnrichments = await tx.activityProviderEnrichment.deleteMany({
      where: {
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
      },
    });
    const recoverySnapshots = await tx.externalDailyRecoverySnapshot.deleteMany({
      where: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
      },
    });
    const rawData = await tx.externalProviderRawData.deleteMany({
      where: {
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
      },
    });
    const connections = await tx.externalProviderConnection.deleteMany({
      where: {
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
      },
    });

    return {
      activityProviderEnrichments: activityProviderEnrichments.count,
      recoverySnapshots: recoverySnapshots.count,
      rawData: rawData.count,
      connections: connections.count,
    };
  });

  return {
    connection: null,
    recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
    deleted,
    message: "Toutes les donnees Garmin non officielles de ce compte ont ete purgees.",
  };
}

export async function getGarminSyncMetrics(appUserId) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [
    connection,
    totalSnapshots,
    snapshotsLast30Days,
    rawErrorsLast30Days,
    latestSnapshot,
  ] = await Promise.all([
    findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE),
    prisma.externalDailyRecoverySnapshot.count({
      where: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
      },
    }),
    prisma.externalDailyRecoverySnapshot.count({
      where: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
        snapshotDate: {
          gte: since,
        },
      },
    }),
    prisma.externalProviderRawData.count({
      where: {
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
        status: "error",
        syncedAt: {
          gte: since,
        },
      },
    }),
    prisma.externalDailyRecoverySnapshot.findFirst({
      where: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
      },
      orderBy: {
        syncedAt: "desc",
      },
      select: {
        snapshotDate: true,
        syncedAt: true,
        dataQuality: true,
      },
    }),
  ]);

  const connectionErrorCount = connection?.lastErrorAt && new Date(connection.lastErrorAt) >= since ? 1 : 0;

  return {
    totalSnapshots,
    snapshotsLast30Days,
    errorsLast30Days: rawErrorsLast30Days + connectionErrorCount,
    lastSyncAt: connection?.lastSyncAt || latestSnapshot?.syncedAt || null,
    latestSnapshotDate: latestSnapshot?.snapshotDate || null,
    latestSnapshotQuality: latestSnapshot?.dataQuality || null,
    connectionStatus: connection?.status || EXTERNAL_PROVIDER_STATUSES.DISCONNECTED,
    lastErrorCode: connection?.lastErrorCode || null,
    lastErrorAt: connection?.lastErrorAt || null,
  };
}
