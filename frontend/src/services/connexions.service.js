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
 * Le backend exige consentAccepted: true (consentement experimental Garmin).
 */
export async function connectGarmin({ email, password, mfaCode = undefined, consentAccepted = true }) {
  return apiConnectGarmin({ email, password, mfaCode, consentAccepted });
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
 * Helper : formate une date ISO en relatif court.
 * Gere passe ("Il y a 12 min") ET futur ("Dans 8 min").
 */
export function formatRelativeDate(dateLike) {
  if (!dateLike) return "Jamais";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = date.getTime() - now; // > 0 = futur, < 0 = passe
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const isFuture = diffMs > 0;
  if (absMin < 1) return "À l'instant";
  const prefix = isFuture ? "Dans" : "Il y a";
  if (absMin < 60) return `${prefix} ${absMin} min`;
  const absH = Math.round(absMin / 60);
  if (absMin < 24 * 60) return `${prefix} ${absH} h`;
  const absDays = Math.round(absMin / (60 * 24));
  if (absDays < 7) return `${prefix} ${absDays} j`;
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
