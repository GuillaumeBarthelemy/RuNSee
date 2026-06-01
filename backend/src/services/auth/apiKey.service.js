/**
 * apiKey.service.js
 *
 * Gestion des clés d'API personnelles RunNSee (/api/v1).
 *
 * Sécurité :
 *  - Token brut généré une seule fois (randomBytes 36 → base64url).
 *  - Format : "rns_live_<base64url 48 chars>" (~287 bits d'entropie).
 *  - Seul keyHash (sha256 hex) est persisté — jamais le token en clair.
 *  - keyPrefix = "rns_" + 6 premiers chars (identifiant visuel côté UI).
 *
 * Scopes supportés (read-only v1) :
 *   activities:read, recovery:read, fitness:read, objectives:read
 */

import { createHash, randomBytes } from "node:crypto";
import prisma from "../../config/prisma.js";

const TOKEN_PREFIX = "rns_live_";
const VALID_SCOPES = new Set([
  "activities:read",
  "recovery:read",
  "fitness:read",
  "objectives:read",
]);
const MAX_KEYS_PER_USER = 10;

export function hashApiKey(rawToken) {
  return createHash("sha256").update(String(rawToken)).digest("hex");
}

function buildPrefixFromRaw(rawToken) {
  // Ex: "rns_live_aBcDeF..." → "rns_aBcDeF"
  const body = rawToken.replace(TOKEN_PREFIX, "");
  return `rns_${body.slice(0, 6)}`;
}

function validateScopes(scopesArray) {
  const invalid = scopesArray.filter((s) => !VALID_SCOPES.has(s));
  if (invalid.length) {
    const err = new Error(`Scopes invalides : ${invalid.join(", ")}`);
    err.httpStatus = 422;
    err.code = "INVALID_SCOPES";
    throw err;
  }
}

/**
 * Crée une nouvelle clé d'API.
 * @returns {{ rawToken, apiKey }} — rawToken affiché UNE SEULE FOIS.
 */
export async function createApiKey(appUserId, { name, scopes, expiresAt } = {}) {
  if (!name || String(name).trim().length < 1) {
    const err = new Error("Le nom de la clé est requis.");
    err.httpStatus = 422;
    err.code = "API_KEY_NAME_REQUIRED";
    throw err;
  }

  const scopesList = Array.isArray(scopes) ? scopes : [...VALID_SCOPES];
  validateScopes(scopesList);

  const existingCount = await prisma.apiKey.count({
    where: { appUserId, revokedAt: null },
  });
  if (existingCount >= MAX_KEYS_PER_USER) {
    const err = new Error(`Maximum ${MAX_KEYS_PER_USER} clés actives par compte.`);
    err.httpStatus = 422;
    err.code = "API_KEY_LIMIT_REACHED";
    throw err;
  }

  const rawToken = TOKEN_PREFIX + randomBytes(36).toString("base64url");
  const keyHash = hashApiKey(rawToken);
  const keyPrefix = buildPrefixFromRaw(rawToken);

  const apiKey = await prisma.apiKey.create({
    data: {
      appUserId,
      name: String(name).trim(),
      keyPrefix,
      keyHash,
      scopes: scopesList.join(","),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return { rawToken, apiKey };
}

/**
 * Résout une clé depuis un token brut.
 * Met à jour lastUsedAt (throttled 5 min) si la clé est valide.
 * @returns {Object|null} — clé résolue ou null
 */
export async function resolveApiKey(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const hash = hashApiKey(token);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } });

  if (!apiKey) return null;
  if (apiKey.revokedAt) return null;
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) return null;

  // Throttled lastUsedAt (max 1 write / 5 min)
  const lastUsedMs = apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).getTime() : 0;
  if (Date.now() - lastUsedMs > 5 * 60 * 1000) {
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }

  return apiKey;
}

/**
 * Liste les clés actives (non révoquées) d'un utilisateur.
 * Ne retourne JAMAIS keyHash.
 */
export async function listApiKeys(appUserId) {
  return prisma.apiKey.findMany({
    where: { appUserId },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true,
      lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Révoque une clé (soft-delete : revokedAt = now).
 */
export async function revokeApiKey(appUserId, apiKeyId) {
  const existing = await prisma.apiKey.findFirst({
    where: { id: apiKeyId, appUserId },
  });
  if (!existing) {
    const err = new Error("Clé introuvable.");
    err.httpStatus = 404;
    err.code = "API_KEY_NOT_FOUND";
    throw err;
  }
  return prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revokedAt: new Date() },
    select: { id: true, revokedAt: true },
  });
}
