// Dérive cardiaque (Pa:Hr decoupling) — service backend.
//
// Précalcule l'indicateur par activité au moment du fetch détaillé Strava et
// stocke le résultat dans Activity.cardiacDecouplingPercent. Permet d'agréger
// sur la Vue d'ensemble Analyse sans recharger les splits côté frontend.
//
// Port du calcul frontend (frontend/src/utils/cardiacDecoupling.js) — algorithme
// identique pour préserver la parité entre fiche détail (calcul à la volée
// côté frontend) et liste agrégée (champ précalculé backend).
//
// Référence : Allen H, Coggan AR (2010), Training and Racing with a Power
// Meter, 2e éd. — chapitre Aerobic Decoupling.

import prisma from "../config/prisma.js";

const MIN_SPLIT_DISTANCE_M = 500;

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Calcule la dérive cardiaque à partir d'une liste de splits.
 *
 * @param {Array<{distance, averageSpeed, averageHeartrate}>} splits
 * @returns {number|null} pourcentage arrondi 0.1 ou null si calcul impossible
 */
export function calculateCardiacDecouplingPercent(splits = []) {
  const valid = (Array.isArray(splits) ? splits : []).filter((split) => {
    const distance = toFiniteNumber(split?.distance);
    const speed = toFiniteNumber(split?.averageSpeed ?? split?.average_speed);
    const hr = toFiniteNumber(split?.averageHeartrate ?? split?.average_heartrate);
    return distance >= MIN_SPLIT_DISTANCE_M && speed > 0 && hr > 0;
  });

  if (valid.length < 2) return null;

  const midpoint = Math.floor(valid.length / 2);
  const firstHalf = valid.slice(0, midpoint);
  const secondHalf = valid.slice(midpoint);
  if (firstHalf.length === 0 || secondHalf.length === 0) return null;

  const meanEf = (group) => {
    const totalDist = group.reduce((acc, s) => acc + toFiniteNumber(s.distance), 0);
    if (totalDist <= 0) return 0;
    const weighted = group.reduce((acc, s) => {
      const speed = toFiniteNumber(s.averageSpeed ?? s.average_speed);
      const hr = toFiniteNumber(s.averageHeartrate ?? s.average_heartrate);
      if (speed <= 0 || hr <= 0) return acc;
      return acc + (speed / hr) * toFiniteNumber(s.distance);
    }, 0);
    return weighted / totalDist;
  };

  const ef1 = meanEf(firstHalf);
  const ef2 = meanEf(secondHalf);
  if (ef1 <= 0 || ef2 <= 0) return null;

  const decouplingPercent = ((ef1 - ef2) / ef1) * 100;
  return Math.round(decouplingPercent * 10) / 10;
}

/**
 * Extrait les splits depuis un payload Strava détaillé brut (rawJson parsé).
 * Strava expose deux variantes : `splits_metric` (km) et `splits_standard` (mile).
 * On privilégie splits_metric.
 */
export function extractStravaSplitsFromPayload(parsedPayload) {
  if (!parsedPayload || typeof parsedPayload !== "object") return [];
  if (Array.isArray(parsedPayload.splits_metric) && parsedPayload.splits_metric.length > 0) {
    return parsedPayload.splits_metric;
  }
  if (Array.isArray(parsedPayload.splitsMetric) && parsedPayload.splitsMetric.length > 0) {
    return parsedPayload.splitsMetric;
  }
  if (Array.isArray(parsedPayload.splits_standard) && parsedPayload.splits_standard.length > 0) {
    return parsedPayload.splits_standard;
  }
  return [];
}

/**
 * Recalcule et persiste cardiacDecouplingPercent pour une activité dont le
 * rawJson contient des splits. À appeler après fetch détaillé Strava.
 *
 * @param {string} activityId
 * @returns {Promise<{ updated: boolean, decouplingPercent: number|null }>}
 */
export async function recomputeCardiacDecouplingForActivity(activityId) {
  if (!activityId) return { updated: false, decouplingPercent: null };

  const activity = await prisma.activity.findUnique({
    where: { id: String(activityId) },
    select: { id: true, rawJson: true },
  });
  if (!activity || !activity.rawJson) {
    return { updated: false, decouplingPercent: null };
  }

  let parsed = null;
  try { parsed = JSON.parse(activity.rawJson); } catch { return { updated: false, decouplingPercent: null }; }

  const splits = extractStravaSplitsFromPayload(parsed);
  const decouplingPercent = calculateCardiacDecouplingPercent(splits);

  await prisma.activity.update({
    where: { id: activity.id },
    data: {
      cardiacDecouplingPercent: decouplingPercent,
      cardiacDecouplingComputedAt: new Date(),
    },
  });

  return { updated: true, decouplingPercent };
}

/**
 * Backfill : recalcule cardiacDecouplingPercent pour toutes les activités d'un
 * utilisateur (ou globalement si appUserId est null) qui ont un rawJson mais
 * pas encore de valeur précalculée.
 *
 * @param {Object} options
 * @param {string|null} options.appUserId
 * @param {number} options.batchSize
 * @returns {Promise<{ processed: number, computed: number }>}
 */
export async function backfillCardiacDecoupling({ appUserId = null, batchSize = 100 } = {}) {
  const where = {
    rawJson: { not: null },
    cardiacDecouplingComputedAt: null,
  };
  if (appUserId) where.appUserId = appUserId;

  const candidates = await prisma.activity.findMany({
    where,
    select: { id: true },
    take: batchSize,
  });

  let processed = 0;
  let computed = 0;
  for (const a of candidates) {
    const result = await recomputeCardiacDecouplingForActivity(a.id);
    processed += 1;
    if (result.decouplingPercent != null) computed += 1;
  }
  return { processed, computed };
}
