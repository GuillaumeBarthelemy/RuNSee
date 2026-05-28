import { getSessionTypeDef, SESSION_TYPES } from "../constants/sessionTaxonomy.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Regroupe les intensites taxonomie en 3 zones de polarisation classique.
export const POLAR_BUCKETS = {
  low:  { label: "Facile (Z1-Z2)", color: "#22c55e" },
  mid:  { label: "Modéré (Z3-Z4)", color: "#eab308" },
  high: { label: "Intense (Z5+)",  color: "#ef4444" },
};

// Types consideres "qualite/intensite" (séances structurees).
export const QUALITY_SESSION_TYPES = new Set([
  "vma_courte", "vma_longue", "seuil", "tempo", "cote", "fartlek", "competition",
]);

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function intensityToPolarBucket(intensity) {
  if (intensity === "low") return "low";
  if (intensity === "mid") return "mid";
  if (intensity === "high") return "high";
  return null;
}

/**
 * Calcule la polarisation des seances classifiees sur une fenetre (en
 * nombre de seances) : repartition low/mid/high (modele 80/20) + detail
 * par type.
 *
 * @param {Array} activities
 * @param {Object} opts — { weeks = 12, referenceDate = now }
 * @returns {{ hasData, total, weeks, buckets[], byType[], easyPct, hardPct }}
 */
export function buildSessionPolarisation(activities = [], { weeks = 12, referenceDate = null } = {}) {
  const ref = safeDate(referenceDate) || new Date();
  const startDate = new Date(ref.getTime() - weeks * 7 * MS_PER_DAY);
  const recent = (Array.isArray(activities) ? activities : []).filter((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    return d && d >= startDate && d <= ref && a?.userSessionType;
  });

  const bucketCounts = { low: 0, mid: 0, high: 0 };
  const typeCounts = {};
  let classified = 0;

  recent.forEach((a) => {
    const def = getSessionTypeDef(a.userSessionType);
    if (!def) return;
    const bucket = intensityToPolarBucket(def.intensity);
    if (!bucket) return;
    bucketCounts[bucket] += 1;
    typeCounts[a.userSessionType] = (typeCounts[a.userSessionType] || 0) + 1;
    classified += 1;
  });

  if (classified === 0) {
    return { hasData: false };
  }

  const buckets = Object.entries(POLAR_BUCKETS).map(([key, def]) => ({
    key,
    label: def.label,
    color: def.color,
    count: bucketCounts[key],
    pct: Math.round((bucketCounts[key] / classified) * 100),
  }));

  const byType = SESSION_TYPES
    .filter((t) => typeCounts[t.key])
    .map((t) => ({
      key: t.key,
      label: t.label,
      icon: t.icon,
      count: typeCounts[t.key],
      pct: Math.round((typeCounts[t.key] / classified) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const easyPct = buckets.find((b) => b.key === "low")?.pct || 0;

  return {
    hasData: true,
    total: classified,
    weeks,
    buckets,
    byType,
    easyPct,
    hardPct: 100 - easyPct,
  };
}

/**
 * Compte les seances "qualite" (intensite structuree) classifiees sur la
 * fenetre. Sert au KPI fiabilise "Seances de qualite".
 * @returns {{ count, total, sharePct } | null} null si aucune classification
 */
export function countQualitySessions(activities = [], { weeks = 12, referenceDate = null } = {}) {
  const ref = safeDate(referenceDate) || new Date();
  const startDate = new Date(ref.getTime() - weeks * 7 * MS_PER_DAY);
  const recent = (Array.isArray(activities) ? activities : []).filter((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    return d && d >= startDate && d <= ref;
  });
  const classified = recent.filter((a) => a?.userSessionType);
  if (classified.length === 0) return null;
  const count = classified.filter((a) => QUALITY_SESSION_TYPES.has(a.userSessionType)).length;
  return {
    count,
    total: classified.length,
    sharePct: Math.round((count / classified.length) * 100),
  };
}
