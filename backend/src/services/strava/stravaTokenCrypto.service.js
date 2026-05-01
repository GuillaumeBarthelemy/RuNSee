import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import env from "../../config/env.js";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

export function isStravaTokenStorageReady() {
  return Boolean(String(env.stravaTokenEncryptionKey || "").trim());
}

function getEncryptionKey() {
  const rawValue = String(env.stravaTokenEncryptionKey || "").trim();

  if (!rawValue) {
    throw buildHttpError(
      "RUNSEE_STRAVA_TOKEN_ENCRYPTION_KEY is not configured.",
      "La securisation des tokens Strava n'est pas configuree cote serveur.",
      503,
    );
  }

  return createHash("sha256").update(rawValue).digest();
}

export function isEncryptedStravaTokenPayload(payload) {
  const rawPayload = String(payload || "").trim();

  if (!rawPayload) {
    return false;
  }

  const [version, iv, authTag, encrypted] = rawPayload.split(".");
  return version === ENCRYPTION_VERSION && Boolean(iv && authTag && encrypted);
}

export function encryptStravaToken(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  if (isEncryptedStravaTokenPayload(rawValue)) {
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

export function decryptStravaToken(payload) {
  const rawPayload = String(payload || "").trim();

  if (!rawPayload) {
    return "";
  }

  if (!isEncryptedStravaTokenPayload(rawPayload)) {
    return rawPayload;
  }

  const [version, iv, authTag, encrypted] = rawPayload.split(".");

  if (version !== ENCRYPTION_VERSION || !iv || !authTag || !encrypted) {
    throw buildHttpError(
      "Unsupported encrypted Strava token payload.",
      "Un token Strava stocke cote serveur est invalide.",
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
