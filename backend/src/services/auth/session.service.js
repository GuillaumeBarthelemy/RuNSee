import { createHash, randomBytes } from "node:crypto";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";

const SESSION_TTL_MS = env.sessionTtlDays * 24 * 60 * 60 * 1000;
// Throttle pour eviter une ecriture DB a chaque requete : on ne met a jour
// lastSeenAt que si la derniere maj date de plus de 5 min.
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

function hashSessionToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function parseCookieHeader(headerValue) {
  const cookies = {};
  const rawHeader = String(headerValue || "").trim();

  if (!rawHeader) {
    return cookies;
  }

  for (const chunk of rawHeader.split(";")) {
    const [rawName, ...rawValueParts] = chunk.split("=");
    const name = String(rawName || "").trim();

    if (!name) {
      continue;
    }

    const rawValue = rawValueParts.join("=").trim();
    cookies[name] = decodeURIComponent(rawValue);
  }

  return cookies;
}

function getRequestIpAddress(req) {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  return req.ip || null;
}

export function readSessionTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers?.cookie);
  return String(cookies[env.sessionCookieName] || "").trim();
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isSecureCookies,
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export function setSessionCookie(res, token) {
  res.cookie(env.sessionCookieName, token, getSessionCookieOptions());
}

export function clearSessionCookie(res) {
  res.cookie(env.sessionCookieName, "", {
    ...getSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function createUserSession(appUserId, req) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.userSession.create({
    data: {
      appUserId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt,
      lastSeenAt: new Date(),
      ipAddress: getRequestIpAddress(req),
      userAgent: req.get("user-agent") || null,
    },
  });

  return {
    rawToken,
    session,
  };
}

export async function resolveSessionFromToken(rawToken) {
  const token = String(rawToken || "").trim();

  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      appUser: true,
    },
  });

  if (!session) {
    return null;
  }

  const now = Date.now();
  const expiresAt = new Date(session.expiresAt).getTime();

  if (
    session.revokedAt ||
    Number.isNaN(expiresAt) ||
    expiresAt <= now ||
    session.appUser?.status === "disabled"
  ) {
    // Marque la session revoked si pas deja fait. Erreur loggee (cf Lot 1
    // .catch silencieux). Si l'update echoue on retourne null quand meme.
    if (!session.revokedAt) {
      try {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
      } catch (err) {
        console.warn("[session] failed to mark session revoked", {
          sessionId: session.id,
          error: err?.message,
        });
      }
    }

    return null;
  }

  // Throttled lastSeenAt update : ecriture DB max 1x / 5 min / session.
  const lastSeenAtMs = session.lastSeenAt
    ? new Date(session.lastSeenAt).getTime()
    : 0;
  if (now - lastSeenAtMs > LAST_SEEN_THROTTLE_MS) {
    try {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now) },
      });
      session.lastSeenAt = new Date(now);
    } catch (err) {
      // Non bloquant : on continue meme si l'update echoue.
      console.warn("[session] failed to update lastSeenAt", {
        sessionId: session.id,
        error: err?.message,
      });
    }
  }

  return session;
}

export async function revokeSessionById(sessionId) {
  if (!sessionId) {
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
