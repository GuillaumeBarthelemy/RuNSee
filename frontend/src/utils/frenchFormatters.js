/**
 * frenchFormatters.js — Formatters d'affichage en convention française :
 *   - Decimaux : virgule au lieu du point (`1,08` pas `1.08`)
 *   - Pourcentages : espace avant `%` (`74 %`)
 *   - Allures : `MM:SS /km` ou `M:SS /km` (sans zero-padding initial, espace avant `/`)
 *   - Durees : `MM:SS`, `Hh MM` selon contexte
 *
 * Centralise pour eviter les divergences entre composants.
 * Decision projet (2026-05) : transverse a toute l'app RunNSee.
 */

// Espace insecable U+00A0
const NBSP = String.fromCharCode(160);

function isNullish(value) {
  if (value === null || value === undefined || value === "") return true;
  const n = Number(value);
  return !Number.isFinite(n);
}

/**
 * Formate un nombre decimal avec virgule francaise. Retourne em-dash si null.
 */
export function formatDecimalFr(value, decimals = 2) {
  if (isNullish(value)) return "—";
  return Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Entier avec espaces de groupes francais (1 234 567). */
export function formatIntegerFr(value) {
  if (isNullish(value)) return "—";
  return Number(value).toLocaleString("fr-FR");
}

/** Pourcentage avec espace insecable : "74 %". */
export function formatPercentFr(value, decimals = 0) {
  if (isNullish(value)) return "—";
  const formatted = Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted}${NBSP}%`;
}

/** Allure : "5:12 /km" (sans zero-padding initial, espace insecable avant /km). */
export function formatPaceFr(secondsPerKm) {
  if (isNullish(secondsPerKm) || Number(secondsPerKm) <= 0) return "—";
  const n = Number(secondsPerKm);
  const min = Math.floor(n / 60);
  const sec = Math.round(n - min * 60);
  return `${min}:${String(sec).padStart(2, "0")}${NBSP}/km`;
}

/**
 * Duree adaptative : "MM:SS" si < 1h, "Hh MM" sinon.
 */
export function formatDurationFr(seconds) {
  if (isNullish(seconds) || Number(seconds) <= 0) return "—";
  const n = Number(seconds);
  const hours = Math.floor(n / 3600);
  const remaining = n - hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = Math.round(remaining - minutes * 60);

  if (hours > 0) {
    return `${hours}h${NBSP}${String(minutes).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Toujours MM:SS avec zero-padding minutes (ex. "04:40" pour 280 sec).
 * Utilise pour la legende Zones FC.
 */
export function formatDurationMmSsFr(seconds) {
  if (isNullish(seconds) || Number(seconds) < 0) return "—";
  const n = Number(seconds);
  const totalMinutes = Math.floor(n / 60);
  const secs = Math.round(n - totalMinutes * 60);
  return `${String(totalMinutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Heures fractionnaires : "1h 50" / "9h 48" / "30 min". */
export function formatDurationHmFr(hoursFloat) {
  if (isNullish(hoursFloat) || Number(hoursFloat) <= 0) return "—";
  const n = Number(hoursFloat);
  const hours = Math.floor(n);
  const minutes = Math.round((n - hours) * 60);
  if (hours > 0) {
    return `${hours}h${NBSP}${String(minutes).padStart(2, "0")}`;
  }
  return `${minutes}${NBSP}min`;
}

/** Delta signe avec virgule : "+1,2" / "-0,5". */
export function formatSignedDecimalFr(value, decimals = 1) {
  if (isNullish(value)) return "";
  const n = Number(value);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${abs}`;
}

/** Plage de dates : "30 avr. - 4 mai". */
export function formatDateRangeFr(start, end) {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} - ${e.getDate()} ${s.toLocaleDateString("fr-FR", { month: "short" })}`;
  }
  return `${s.getDate()} ${s.toLocaleDateString("fr-FR", { month: "short" })} - ${e.getDate()} ${e.toLocaleDateString("fr-FR", { month: "short" })}`;
}

/** Date courte : "12 mai 2025". */
export function formatShortDateFr(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
