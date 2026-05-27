import { randomBytes } from "node:crypto";
import env from "../config/env.js";

/**
 * Protection CSRF — double-submit cookie pattern.
 *
 * Principe :
 *   - Sur toute requete, un cookie `runsee_csrf` non-httpOnly est genere s'il
 *     n'existe pas (le client JS peut le lire).
 *   - Sur les methodes mutantes (POST/PUT/PATCH/DELETE), on exige que le
 *     header `X-CSRF-Token` corresponde exactement a la valeur du cookie.
 *
 * Hypothese : un attaquant cross-site ne peut pas LIRE le cookie (Same-Origin
 * Policy) ni le DEFINIR via Set-Cookie (il n'a pas le controle du domaine
 * cible). Donc il ne peut pas forger un header identique au cookie.
 *
 * Exemptions :
 *   - Methodes safe (GET/HEAD/OPTIONS) : pas de verification.
 *   - Endpoint OAuth callback Strava : exempte (redirect tiers vers backend).
 *
 * NB : ce mecanisme NE remplace PAS SameSite=Lax — c'est une couche
 * complementaire pour les browsers anciens ou cas particuliers.
 */

const CSRF_COOKIE_NAME = "runsee_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Endpoints qui ne peuvent pas porter le header CSRF (redirects tiers).
const CSRF_EXEMPT_PATHS = new Set([
  "/auth/strava/callback",
]);

function parseCookieHeader(headerValue) {
  const cookies = {};
  const raw = String(headerValue || "").trim();
  if (!raw) return cookies;
  for (const chunk of raw.split(";")) {
    const [name, ...rest] = chunk.split("=");
    const key = String(name || "").trim();
    if (!key) continue;
    cookies[key] = decodeURIComponent(rest.join("=").trim());
  }
  return cookies;
}

function generateCsrfToken() {
  return randomBytes(32).toString("base64url");
}

function buildCsrfError() {
  const err = new Error("CSRF token missing or invalid.");
  err.httpStatus = 403;
  err.userMessage = "Requete refusee (jeton de securite invalide). Recharge la page.";
  err.code = "CSRF_INVALID";
  return err;
}

/**
 * Middleware CSRF : a placer apres `express.json()` et avant les routes.
 */
export function csrfMiddleware(req, res, next) {
  const cookies = parseCookieHeader(req.headers?.cookie);
  let token = String(cookies[CSRF_COOKIE_NAME] || "").trim();

  // 1. Si pas de token, en generer un et le poser dans la reponse en cookie.
  //    Cookie httpOnly true : protege contre exfiltration via XSS (le JS
  //    n'a pas besoin de le lire — on transmet la valeur via header).
  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isSecureCookies,
      path: "/",
      // 7 jours : suffisamment pour ne pas alourdir le poll
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  // Transmet le token via response header (lisible cross-subdomain par le
  // JS frontend grace a Access-Control-Expose-Headers). Evite le probleme
  // ou api.runnsee.net pose un cookie que runsee.runnsee.net ne peut lire.
  res.setHeader("X-CSRF-Token", token);

  // 2. Sur methodes safe, on s'arrete la.
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // 3. Exemptions explicites
  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  // 4. Verifier le header matche le cookie
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || "").trim();
  if (!headerToken || headerToken !== token) {
    return next(buildCsrfError());
  }

  return next();
}

export const CSRF_CONSTANTS = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: "X-CSRF-Token",
};
