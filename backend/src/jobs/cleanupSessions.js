import prisma from "../config/prisma.js";

/**
 * Purge des sessions expirees ou revoked depuis plus de 30 jours.
 *
 * Doit etre lance periodiquement (quotidien) au demarrage du backend
 * via `startSessionCleanupJob()`. La premiere execution est differee de
 * 60s pour ne pas bloquer le boot.
 */

const RETENTION_DAYS = 30;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const INITIAL_DELAY_MS = 60 * 1000; // 1 min apres boot

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { revokedAt: { lt: cutoff } },
        ],
      },
    });

    if (result.count > 0) {
      console.info(`[cleanupSessions] purged ${result.count} expired/revoked sessions older than ${RETENTION_DAYS}d`);
    }
    return result.count;
  } catch (err) {
    console.error("[cleanupSessions] failed", { error: err?.message });
    return 0;
  }
}

let timerHandle = null;

export function startSessionCleanupJob() {
  if (timerHandle) return;

  // Lancement initial differe
  setTimeout(() => {
    cleanupExpiredSessions().catch(() => {});
    timerHandle = setInterval(() => {
      cleanupExpiredSessions().catch(() => {});
    }, RUN_INTERVAL_MS);
    if (timerHandle && typeof timerHandle.unref === "function") {
      // Permet a Node de sortir si plus rien d'autre ne tourne (tests)
      timerHandle.unref();
    }
  }, INITIAL_DELAY_MS);
}

export function stopSessionCleanupJob() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}
