/**
 * unitsFormatter.js — Helpers de formatage selon la preference utilisateur
 * (metric | imperial). Utilisable via `useUserPreferences()`.
 *
 * Note : la majorite des composants existants utilisent toujours km/m en dur.
 * Ce helper sert pour les nouveaux composants ; la migration progressive
 * des helpers existants viendra dans un lot dedie.
 */

const KM_PER_MI = 1.609344;
const M_PER_FT = 0.3048;

export function formatDistance(km, units = "metric", { decimals = 1 } = {}) {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (units === "imperial") {
    const mi = n / KM_PER_MI;
    return `${mi.toFixed(decimals).replace(".", ",")} mi`;
  }
  return `${n.toFixed(decimals).replace(".", ",")} km`;
}

export function formatElevation(meters, units = "metric", { decimals = 0 } = {}) {
  const n = Number(meters);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (units === "imperial") {
    const ft = n / M_PER_FT;
    return `${Math.round(ft).toLocaleString("fr-FR").replace(/\s/g, " ")} ft`;
  }
  return `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ")} m${decimals > 0 ? "" : ""}`;
}

export function formatPaceSecPerKm(secPerKm, units = "metric") {
  const n = Number(secPerKm);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const sec = units === "imperial" ? n * KM_PER_MI : n;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}/${units === "imperial" ? "mi" : "km"}`;
}
