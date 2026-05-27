import prisma from "../../config/prisma.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { normalizeEmail, validatePassword } from "./user-auth.service.js";

function buildHttpError(message, userMessage, status) {
  const error = new Error(message);
  error.httpStatus = status;
  error.userMessage = userMessage;
  return error;
}

const ALLOWED_LANGUAGES = new Set(["fr", "en"]);
const ALLOWED_THEMES = new Set(["light", "dark", "auto"]);
const ALLOWED_UNITS = new Set(["metric", "imperial"]);
const ALLOWED_DENSITIES = new Set(["comfort", "compact"]);

function sanitizeString(value, { maxLen = 80 } = {}) {
  const v = String(value ?? "").trim();
  if (v.length > maxLen) return v.slice(0, maxLen);
  return v;
}

function isPlausibleTimezone(tz) {
  // Validation legere : format "Region/City" alphanum + '/' + '_'
  return /^[A-Za-z]+\/[A-Za-z_+\-/0-9]+$/.test(String(tz || ""));
}

/**
 * Met a jour le profil personnel (firstName, lastName, email, language, timezone).
 * Le `displayName` est recompose depuis firstName + lastName si presents.
 *
 * @param {Object} params
 * @param {string} params.appUserId
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.email]
 * @param {string} [params.language]
 * @param {string} [params.timezone]
 * @returns {Promise<Object>} updated user
 */
export async function updateProfile({ appUserId, firstName, lastName, email, language, timezone }) {
  if (!appUserId) throw buildHttpError("Missing user id", "Utilisateur introuvable.", 400);

  // Validation in-memory : on accumule data + flags d'intention sans toucher
  // la DB tant que tout n'est pas valide. Reduit le risque de write partiel.
  const data = {};
  let needsCurrent = false;

  if (firstName !== undefined) {
    const v = sanitizeString(firstName, { maxLen: 50 });
    if (v.length > 0 && v.length < 2) {
      throw buildHttpError("Invalid firstName.", "Le prénom doit contenir au moins 2 caractères.", 400);
    }
    data.firstName = v || null;
    needsCurrent = true;
  }

  if (lastName !== undefined) {
    const v = sanitizeString(lastName, { maxLen: 50 });
    if (v.length > 0 && v.length < 2) {
      throw buildHttpError("Invalid lastName.", "Le nom doit contenir au moins 2 caractères.", 400);
    }
    data.lastName = v || null;
    needsCurrent = true;
  }

  let normalizedEmail = null;
  let rawEmail = null;
  if (email !== undefined) {
    rawEmail = sanitizeString(email, { maxLen: 254 });
    if (rawEmail.length === 0) {
      throw buildHttpError("Invalid email.", "L'adresse e-mail est requise.", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      throw buildHttpError("Invalid email.", "Adresse e-mail invalide.", 400);
    }
    normalizedEmail = normalizeEmail(rawEmail);
    needsCurrent = true;
  }

  if (language !== undefined) {
    const v = String(language).trim().toLowerCase();
    if (!ALLOWED_LANGUAGES.has(v)) {
      throw buildHttpError("Invalid language.", "Langue non supportée.", 400);
    }
    data.language = v;
  }

  if (timezone !== undefined) {
    const v = String(timezone).trim();
    if (v && !isPlausibleTimezone(v)) {
      throw buildHttpError("Invalid timezone.", "Fuseau horaire invalide.", 400);
    }
    data.timezone = v || "Europe/Paris";
  }

  if (Object.keys(data).length === 0 && normalizedEmail === null) {
    return prisma.appUser.findUnique({ where: { id: appUserId } });
  }

  // Transaction : 1 seul fetch (current) + verif unicite email + update.
  // Garantit l'atomicite et evite le TOCTOU sur emailNormalized.
  return prisma.$transaction(async (tx) => {
    const current = needsCurrent
      ? await tx.appUser.findUnique({
          where: { id: appUserId },
          select: { id: true, firstName: true, lastName: true, emailNormalized: true },
        })
      : null;

    if (needsCurrent && !current) {
      throw buildHttpError("User not found.", "Utilisateur introuvable.", 404);
    }

    if (normalizedEmail !== null && current.emailNormalized !== normalizedEmail) {
      const conflict = await tx.appUser.findUnique({
        where: { emailNormalized: normalizedEmail },
        select: { id: true },
      });
      if (conflict && conflict.id !== appUserId) {
        throw buildHttpError("Email already in use.", "Cette adresse e-mail est déjà utilisée.", 409);
      }
      data.email = rawEmail;
      data.emailNormalized = normalizedEmail;
    }

    if (data.firstName !== undefined || data.lastName !== undefined) {
      const fn = data.firstName ?? current.firstName ?? "";
      const ln = data.lastName ?? current.lastName ?? "";
      const composed = `${fn || ""} ${ln || ""}`.trim();
      if (composed.length >= 2) {
        data.displayName = composed;
      }
    }

    if (Object.keys(data).length === 0) {
      return current;
    }

    return tx.appUser.update({ where: { id: appUserId }, data });
  });
}

/**
 * Met a jour uniquement les preferences UI (theme, units, density).
 */
export async function updatePreferences({ appUserId, theme, units, density }) {
  if (!appUserId) throw buildHttpError("Missing user id", "Utilisateur introuvable.", 400);
  const data = {};
  if (theme !== undefined) {
    const v = String(theme).trim().toLowerCase();
    if (!ALLOWED_THEMES.has(v)) {
      throw buildHttpError("Invalid theme.", "Thème non supporté.", 400);
    }
    data.themePreference = v;
  }
  if (units !== undefined) {
    const v = String(units).trim().toLowerCase();
    if (!ALLOWED_UNITS.has(v)) {
      throw buildHttpError("Invalid units.", "Unités non supportées.", 400);
    }
    data.unitsPreference = v;
  }
  if (density !== undefined) {
    const v = String(density).trim().toLowerCase();
    if (!ALLOWED_DENSITIES.has(v)) {
      throw buildHttpError("Invalid density.", "Densité non supportée.", 400);
    }
    data.densityPreference = v;
  }
  if (Object.keys(data).length === 0) {
    return prisma.appUser.findUnique({ where: { id: appUserId } });
  }
  return prisma.appUser.update({ where: { id: appUserId }, data });
}

/**
 * Change le mot de passe utilisateur :
 *   - Verifie l'ancien mdp
 *   - Hashe et stocke le nouveau
 *   - Revoque toutes les autres sessions (l'appel courant peut etre conserve par
 *     le controller en passant currentSessionId).
 *
 * @param {Object} params
 * @param {string} params.appUserId
 * @param {string} params.oldPassword
 * @param {string} params.newPassword
 * @param {string} [params.currentSessionId] — si fourni, ne revoque pas cette session
 */
export async function changePassword({ appUserId, oldPassword, newPassword, currentSessionId = null }) {
  if (!appUserId) throw buildHttpError("Missing user id", "Utilisateur introuvable.", 400);

  const user = await prisma.appUser.findUnique({ where: { id: appUserId } });
  if (!user) throw buildHttpError("User not found.", "Utilisateur introuvable.", 404);

  if (!user.passwordHash) {
    throw buildHttpError("No password set.", "Aucun mot de passe configuré sur ce compte.", 400);
  }

  const safeOld = String(oldPassword || "");
  const valid = await verifyPassword(safeOld, user.passwordHash);
  if (!valid) {
    throw buildHttpError("Invalid current password.", "Mot de passe actuel incorrect.", 401);
  }

  const safeNew = validatePassword(newPassword);
  if (safeNew === safeOld) {
    throw buildHttpError(
      "Same password.",
      "Le nouveau mot de passe doit être différent de l'ancien.",
      400,
    );
  }

  const newHash = await hashPassword(safeNew);
  await prisma.appUser.update({
    where: { id: appUserId },
    data: { passwordHash: newHash },
  });

  // Revoque les autres sessions
  const where = {
    appUserId,
    revokedAt: null,
  };
  if (currentSessionId) where.id = { not: currentSessionId };

  const result = await prisma.userSession.updateMany({
    where,
    data: { revokedAt: new Date() },
  });

  return { revokedSessionsCount: result.count };
}

/**
 * Liste les sessions actives de l'utilisateur.
 */
export async function listSessions({ appUserId, currentSessionId = null }) {
  if (!appUserId) throw buildHttpError("Missing user id", "Utilisateur introuvable.", 400);

  const sessions = await prisma.userSession.findMany({
    where: {
      appUserId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      lastSeenAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return sessions.map((s) => ({
    ...s,
    isCurrent: currentSessionId ? s.id === currentSessionId : false,
  }));
}

/**
 * Revoque une session precise (de l'utilisateur courant).
 */
export async function revokeSession({ appUserId, sessionId }) {
  if (!appUserId || !sessionId) {
    throw buildHttpError("Missing params.", "Paramètres manquants.", 400);
  }
  const result = await prisma.userSession.updateMany({
    where: { id: sessionId, appUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) {
    throw buildHttpError("Session not found.", "Session introuvable.", 404);
  }
  return { revoked: true };
}

/**
 * Revoque toutes les sessions sauf celle en cours.
 */
export async function revokeOtherSessions({ appUserId, currentSessionId }) {
  if (!appUserId) throw buildHttpError("Missing user id", "Utilisateur introuvable.", 400);
  const where = { appUserId, revokedAt: null };
  if (currentSessionId) where.id = { not: currentSessionId };
  const result = await prisma.userSession.updateMany({
    where,
    data: { revokedAt: new Date() },
  });
  return { revokedSessionsCount: result.count };
}
