import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import env from "../../config/env.js";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
// Versions supportees pour le decryptage. La version d'ecriture par defaut
// est `provider-v1`. Pour migrer vers une nouvelle cle :
//   1. Definir RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS = ancienne cle
//      RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY = nouvelle cle
//   2. Lancer `npm run providers:reencrypt` pour re-chiffrer tous les
//      payloads existants avec la nouvelle cle.
//   3. Une fois termine, retirer RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS.
const ENCRYPTION_VERSION = "provider-v1";
const SUPPORTED_VERSIONS = new Set(["provider-v1"]);
const IV_LENGTH = 12;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function normalizeSessionPayload(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return JSON.stringify(value);
}

export function isProviderSessionStorageReady() {
  return Boolean(String(env.providerTokenEncryptionKey || "").trim());
}

function getEncryptionKey() {
  const rawValue = String(env.providerTokenEncryptionKey || "").trim();

  if (!rawValue) {
    throw buildHttpError(
      "RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY is not configured.",
      "La securisation des sessions de fournisseurs externes n'est pas configuree cote serveur.",
      503,
    );
  }

  return createHash("sha256").update(rawValue).digest();
}

/**
 * Liste des cles candidates pour le DECRYPTAGE :
 *   - cle courante (RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY)
 *   - ancienne cle (RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS) si definie
 * Pendant une rotation, on essaie d'abord la nouvelle puis l'ancienne.
 */
function getCandidateDecryptionKeys() {
  const keys = [];
  const current = String(env.providerTokenEncryptionKey || "").trim();
  if (current) keys.push(createHash("sha256").update(current).digest());
  const previous = String(process.env.RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS || "").trim();
  if (previous) keys.push(createHash("sha256").update(previous).digest());
  return keys;
}

export function isEncryptedProviderSessionPayload(payload) {
  const rawPayload = String(payload || "").trim();

  if (!rawPayload) {
    return false;
  }

  const [version, iv, authTag, encrypted] = rawPayload.split(".");
  return version === ENCRYPTION_VERSION && Boolean(iv && authTag && encrypted);
}

export function encryptProviderSessionPayload(value) {
  const rawValue = normalizeSessionPayload(value);

  if (!rawValue) {
    return "";
  }

  if (isEncryptedProviderSessionPayload(rawValue)) {
    return rawValue;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(rawValue, "utf8"),
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

export function decryptProviderSessionPayload(payload, { parseJson = false } = {}) {
  const rawPayload = String(payload || "").trim();

  if (!rawPayload) {
    return parseJson ? null : "";
  }

  if (!isEncryptedProviderSessionPayload(rawPayload)) {
    return parseJson ? JSON.parse(rawPayload) : rawPayload;
  }

  const [version, iv, authTag, encrypted] = rawPayload.split(".");

  if (!SUPPORTED_VERSIONS.has(version) || !iv || !authTag || !encrypted) {
    throw buildHttpError(
      "Unsupported encrypted external-provider session payload.",
      "Une session de fournisseur externe stockee cote serveur est invalide.",
      500,
    );
  }

  // Essaie chaque cle candidate (rotation : on tente nouvelle puis ancienne).
  const candidates = getCandidateDecryptionKeys();
  let lastError = null;
  for (const key of candidates) {
    try {
      const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        key,
        Buffer.from(iv, "base64url"),
      );
      decipher.setAuthTag(Buffer.from(authTag, "base64url"));
      const decryptedValue = Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      return parseJson ? JSON.parse(decryptedValue) : decryptedValue;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || buildHttpError(
    "Failed to decrypt provider session.",
    "Impossible de dechiffrer la session du fournisseur externe.",
    500,
  );
}
