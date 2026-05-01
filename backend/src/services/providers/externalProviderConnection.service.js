import prisma from "../../config/prisma.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";

export function normalizeProviderCode(providerCode) {
  return String(providerCode || "").trim().toLowerCase();
}

export function assertSupportedProviderCode(providerCode) {
  const normalizedProviderCode = normalizeProviderCode(providerCode);
  const supportedProviderCodes = new Set(Object.values(EXTERNAL_PROVIDER_CODES));

  if (!supportedProviderCodes.has(normalizedProviderCode)) {
    const error = new Error(`Unsupported external provider: ${providerCode || "-"}.`);
    error.httpStatus = 400;
    error.userMessage = "Cette source de donnees externe n'est pas supportee par RunNSee.";
    throw error;
  }

  return normalizedProviderCode;
}

export function buildExternalProviderConnectionSummary(connection) {
  if (!connection) {
    return {
      providerCode: "",
      status: EXTERNAL_PROVIDER_STATUSES.DISCONNECTED,
      connected: false,
      consentAccepted: false,
      displayName: "",
      accountIdentifier: "",
      connectedAt: null,
      lastSyncAt: null,
      lastBackfillStartedAt: null,
      lastBackfillEndedAt: null,
      lastErrorCode: "",
      lastErrorMessage: "",
      lastErrorAt: null,
    };
  }

  return {
    id: connection.id,
    providerCode: connection.providerCode,
    status: connection.status || EXTERNAL_PROVIDER_STATUSES.DISCONNECTED,
    connected: [
      EXTERNAL_PROVIDER_STATUSES.CONNECTED,
      EXTERNAL_PROVIDER_STATUSES.SYNCING,
    ].includes(connection.status),
    consentAccepted: Boolean(connection.consentAcceptedAt),
    displayName: connection.displayName || "",
    accountIdentifier: connection.accountIdentifier || "",
    connectedAt: connection.connectedAt || null,
    disconnectedAt: connection.disconnectedAt || null,
    lastSyncAt: connection.lastSyncAt || null,
    lastBackfillStartedAt: connection.lastBackfillStartedAt || null,
    lastBackfillEndedAt: connection.lastBackfillEndedAt || null,
    lastErrorCode: connection.lastErrorCode || "",
    lastErrorMessage: connection.lastErrorMessage || "",
    lastErrorAt: connection.lastErrorAt || null,
  };
}

export async function findExternalProviderConnectionForUser(
  appUserId,
  providerCode,
  { tx = prisma } = {},
) {
  if (!appUserId) {
    return null;
  }

  const normalizedProviderCode = assertSupportedProviderCode(providerCode);

  return tx.externalProviderConnection.findUnique({
    where: {
      appUserId_providerCode: {
        appUserId,
        providerCode: normalizedProviderCode,
      },
    },
  });
}

export async function listExternalProviderConnectionsForUser(appUserId, { tx = prisma } = {}) {
  if (!appUserId) {
    return [];
  }

  const connections = await tx.externalProviderConnection.findMany({
    where: {
      appUserId,
    },
    orderBy: [
      { providerCode: "asc" },
      { createdAt: "asc" },
    ],
  });

  return connections.map((connection) => buildExternalProviderConnectionSummary(connection));
}

export async function upsertExternalProviderConnectionState({
  appUserId,
  providerCode,
  status = EXTERNAL_PROVIDER_STATUSES.DISCONNECTED,
  encryptedSession = undefined,
  displayName = undefined,
  accountIdentifier = undefined,
  consentAcceptedAt = undefined,
  connectedAt = undefined,
  disconnectedAt = undefined,
  lastSyncAt = undefined,
  lastBackfillStartedAt = undefined,
  lastBackfillEndedAt = undefined,
  lastErrorCode = undefined,
  lastErrorMessage = undefined,
  lastErrorAt = undefined,
  tx = prisma,
}) {
  if (!appUserId) {
    const error = new Error("Missing authenticated user for external-provider connection.");
    error.httpStatus = 401;
    error.userMessage = "Connecte-toi pour gerer cette source de donnees.";
    throw error;
  }

  const normalizedProviderCode = assertSupportedProviderCode(providerCode);
  const updateData = {
    status,
    ...(typeof encryptedSession !== "undefined" ? { encryptedSession } : {}),
    ...(typeof displayName !== "undefined" ? { displayName } : {}),
    ...(typeof accountIdentifier !== "undefined" ? { accountIdentifier } : {}),
    ...(typeof consentAcceptedAt !== "undefined" ? { consentAcceptedAt } : {}),
    ...(typeof connectedAt !== "undefined" ? { connectedAt } : {}),
    ...(typeof disconnectedAt !== "undefined" ? { disconnectedAt } : {}),
    ...(typeof lastSyncAt !== "undefined" ? { lastSyncAt } : {}),
    ...(typeof lastBackfillStartedAt !== "undefined" ? { lastBackfillStartedAt } : {}),
    ...(typeof lastBackfillEndedAt !== "undefined" ? { lastBackfillEndedAt } : {}),
    ...(typeof lastErrorCode !== "undefined" ? { lastErrorCode } : {}),
    ...(typeof lastErrorMessage !== "undefined" ? { lastErrorMessage } : {}),
    ...(typeof lastErrorAt !== "undefined" ? { lastErrorAt } : {}),
  };

  return tx.externalProviderConnection.upsert({
    where: {
      appUserId_providerCode: {
        appUserId,
        providerCode: normalizedProviderCode,
      },
    },
    create: {
      appUserId,
      providerCode: normalizedProviderCode,
      ...updateData,
    },
    update: updateData,
  });
}
