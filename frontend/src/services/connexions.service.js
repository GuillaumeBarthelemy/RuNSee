import { disconnectStravaAccount } from "./auth.service.js";
import {
  connectGarmin as apiConnectGarmin,
  disconnectGarmin,
  enrichGarminActivities,
  getProviderStatuses,
  purgeGarminData as apiPurgeGarminData,
  syncRecentGarminRecovery,
} from "./externalProvider.service.js";
import { startIncrementalSync } from "./sync.service.js";

/**
 * GET /providers/status — Retourne le statut consolide de tous les providers
 * (strava + garmin) avec connection, lastSyncAt, lastErrorAt, etc.
 */
export async function fetchProviderStatuses() {
  return getProviderStatuses();
}

/**
 * Resynchronise Strava (incremental sync sur 7 derniers jours).
 */
export async function resyncStrava() {
  return startIncrementalSync();
}

/**
 * Resynchronise Garmin :
 *   1. sync-recent recovery snapshots (sommeil / HRV / FC repos)
 *   2. enrich activities (laps + samples)
 */
export async function resyncGarmin() {
  const recovery = await syncRecentGarminRecovery();
  // Best-effort enrich des activites recentes
  let enrich = null;
  try {
    enrich = await enrichGarminActivities({ limit: 10 });
  } catch (err) {
    // Non bloquant
    enrich = { error: err?.message };
  }
  return { recovery, enrich };
}

/**
 * Initie la connexion Strava (OAuth) en redirigeant vers l'URL d'auth.
 * Note : `getStravaLoginUrl()` du config/env est synchroniquement appelable.
 */
export async function connectStrava() {
  const { getStravaLoginUrl } = await import("../config/env.js");
  if (typeof window !== "undefined") {
    window.location.href = getStravaLoginUrl();
  }
}

/**
 * Deconnecte le compte Strava.
 */
export async function disconnectStrava() {
  return disconnectStravaAccount();
}

/**
 * Connecte Garmin avec email + password.
 */
export async function connectGarmin({ email, password }) {
  return apiConnectGarmin({ email, password });
}

/**
 * Deconnecte Garmin (revoke session).
 */
export async function disconnectGarminAccount() {
  return disconnectGarmin();
}

/**
 * Purge les donnees Garmin (recovery snapshots, fitness, etc.).
 * Requiert confirmation explicite (envoie `confirm: "PURGE_GARMIN_DATA"`).
 */
export async function purgeGarminData() {
  return apiPurgeGarminData({ confirm: "PURGE_GARMIN_DATA" });
}

/**
 * Helper : formate une date ISO en relatif court ("il y a 12 min", "il y a 3 h").
 */
export function formatRelativeDate(dateLike) {
  if (!dateLike) return "Jamais";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffMin < 24 * 60) {
    const h = Math.round(diffMin / 60);
    return `Il y a ${h} h`;
  }
  const days = Math.round(diffMin / (60 * 24));
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Re-export utile
export { getProviderStatuses };
export default {
  fetchProviderStatuses,
  resyncStrava,
  resyncGarmin,
  connectStrava,
  disconnectStrava,
  connectGarmin,
  disconnectGarminAccount,
  purgeGarminData,
  formatRelativeDate,
};
