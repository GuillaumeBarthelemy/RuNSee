import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Rate limiters — Lot 1 sécurité critique.
 *
 * Trois niveaux :
 *   - global : 300 req / 15 min / IP (protection DoS basique)
 *   - auth   : 10 req / 15 min / IP (login / signup / password / sessions)
 *   - garmin : 5  req / 15 min / IP (connexion Garmin coûteuse côté bridge)
 *
 * `standardHeaders: true` expose RateLimit-* (RFC 6585bis).
 * `legacyHeaders: false` désactive X-RateLimit-* (legacy).
 *
 * NB : limiter par IP est imparfait derriere un CGNAT (mobile 4G/5G) ou un
 * proxy d'entreprise. Pour les endpoints auth, on combine IP + email (s'il
 * est present dans le body) pour limiter le risque de blocage collectif.
 */

function authKeyGenerator(req) {
  const ipKey = ipKeyGenerator(req.ip);
  const email = String(req.body?.email || "").trim().toLowerCase();
  return email ? `${ipKey}:${email}` : ipKey;
}

function buildLimiter({ windowMs, max, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res /*, next */) => {
      res.status(429).json({
        message,
        error: {
          code: "RATE_LIMITED",
          message,
        },
      });
    },
  });
}

export const globalRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Trop de requêtes. Réessaie dans quelques minutes.",
});

export const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Trop de tentatives. Réessaie dans 15 minutes.",
  keyGenerator: authKeyGenerator,
});

export const garminConnectRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Trop de tentatives de connexion Garmin. Réessaie dans 15 minutes.",
});

// Rate limiter dédié à l'API publique (/api/v1).
// Clé = hash de la clé d'API si présente, sinon IP.
// 120 req / min par clé (usage raisonnable pour scripts/dashboards).
export const publicApiRateLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Trop de requêtes API. Limite : 120 req/min.",
  keyGenerator: (req) => {
    const auth = String(req.headers?.authorization || "").slice(0, 64);
    return auth || ipKeyGenerator(req.ip);
  },
});
