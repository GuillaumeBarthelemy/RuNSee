/**
 * apiKey.middleware.js
 *
 * Authentification par clé d'API (Bearer token).
 * Utilisé exclusivement sur /api/v1/* (lecture seule).
 *
 * Flux :
 *  - loadApiKeyAuth : lit Authorization: Bearer <token>, résout la clé,
 *    peuple req.apiAuth = { appUserId, scopes: Set } si valide.
 *  - requireApiAuth : vérifie que la clé est présente.
 *  - requireScope(scope) : vérifie un scope spécifique.
 */

import { resolveApiKey } from "../services/auth/apiKey.service.js";

function buildApiKeyError(message, code, status = 401) {
  const err = new Error(message);
  err.httpStatus = status;
  err.code = code;
  err.userMessage = message;
  return err;
}

/**
 * Lit et résout le Bearer token. Non bloquant si absent
 * (pour permettre de combiner avec d'autres auth si besoin futur).
 */
export async function loadApiKeyAuth(req, res, next) {
  try {
    const authHeader = String(req.headers?.authorization || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      req.apiAuth = null;
      return next();
    }

    const rawToken = authHeader.slice(7).trim();
    const apiKey = await resolveApiKey(rawToken);

    if (!apiKey) {
      req.apiAuth = null;
      return next();
    }

    req.apiAuth = {
      appUserId: apiKey.appUserId,
      apiKeyId: apiKey.id,
      scopes: new Set(apiKey.scopes.split(",").map((s) => s.trim())),
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

/** Bloque si aucune clé valide n'a été résolue. */
export function requireApiAuth(req, res, next) {
  if (!req.apiAuth?.appUserId) {
    return next(buildApiKeyError(
      "Clé d'API manquante ou invalide. Fournis un header Authorization: Bearer rns_live_...",
      "API_KEY_REQUIRED",
      401,
    ));
  }
  return next();
}

/** Bloque si la clé ne possède pas le scope requis. */
export function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiAuth?.scopes?.has(scope)) {
      return next(buildApiKeyError(
        `Ce endpoint requiert le scope '${scope}'.`,
        "SCOPE_REQUIRED",
        403,
      ));
    }
    return next();
  };
}
