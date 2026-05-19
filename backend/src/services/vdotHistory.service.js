/**
 * vdotHistory.service.js — Consolide le VDOT quotidien d'un utilisateur
 * depuis 3 sources hiérarchisées, et écrit dans VdotHistorySnapshot
 * (source unique de vérité pour l'UI Performance).
 *
 * Logique de fallback (du plus précis au plus approximatif) :
 *
 *   1. Niveau 1 — Garmin wellness daily VO2max
 *      Source : ExternalDailyFitnessSnapshot.vo2MaxRunning du jour J.
 *      Précision : meilleure (Firstbeat consolide ses propres données
 *      sur les sorties récentes avec HR + GPS valides).
 *      Validation labo : Knaier 2019, r=0.93 vs VO2max gaz expirés.
 *      → VdotHistorySnapshot.source = "garmin"
 *
 *   2. Niveau 2 — Garmin per-activity VO2max
 *      Si pas de Niveau 1 pour J, on cherche la dernière activité
 *      enrichie sur les 7 derniers jours dont normalizedJson.vO2MaxValue
 *      est non-null. Cela permet d'avoir une valeur même si la sync
 *      wellness n'est pas activée.
 *      → VdotHistorySnapshot.source = "garmin"
 *
 *   3. Niveau 3 — Estimation interne Daniels
 *      Si rien de Garmin n'est dispo, on calcule un VDOT depuis la
 *      meilleure perf récente (régression Daniels 1979 / 2014).
 *      → VdotHistorySnapshot.source = "estimation_interne"
 *
 * Une seule ligne par (appUserId, snapshotDate). Upsert idempotent.
 *
 * Sources scientifiques :
 *   - Daniels J., Gilbert J. (1979) "Oxygen Power: Performance Tables
 *     for Distance Runners".
 *   - Daniels J. (2014) "Daniels' Running Formula" 3rd ed.
 *   - Knaier R. et al. (2019) "Validation of Garmin VO2max estimates",
 *     J Sci Med Sport 22(8).
 */

import prisma from "../config/prisma.js";
import { EXTERNAL_PROVIDER_CODES } from "./providers/externalProvider.constants.js";

const GARMIN_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PER_ACTIVITY_LOOKBACK_DAYS = 7;
const BEST_PERFORMANCE_LOOKBACK_DAYS = 90;

// ---------------------------------------------------------------------------
// Daniels VDOT — port backend (sans dep frontend)
// ---------------------------------------------------------------------------

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function oxygenCostFromVelocity(velocityMperMin) {
  const v = Math.max(0, toFiniteNumber(velocityMperMin));
  return 0.000104 * v * v + 0.182258 * v - 4.6;
}

function vo2maxPercentageFromDurationMinutes(durationMinutes) {
  const t = Math.max(0.1, toFiniteNumber(durationMinutes));
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
}

export function computeDanielsVdot({ distanceMeters, elapsedSeconds }) {
  const distance = toFiniteNumber(distanceMeters);
  const duration = toFiniteNumber(elapsedSeconds);
  const distanceKm = distance / 1000;
  const paceSecondsPerKm = distanceKm > 0 ? duration / distanceKm : 0;
  if (
    distance < 1500
    || distance > 50000
    || duration < 120
    || paceSecondsPerKm < 120
    || paceSecondsPerKm > 900
  ) {
    return 0;
  }
  const minutes = duration / 60;
  const velocity = distance / minutes;
  const oxygenCost = oxygenCostFromVelocity(velocity);
  const intensityFraction = vo2maxPercentageFromDurationMinutes(minutes);
  if (intensityFraction <= 0) return 0;
  const vdot = oxygenCost / intensityFraction;
  return Number.isFinite(vdot) && vdot > 0 ? Number(vdot.toFixed(1)) : 0;
}

// ---------------------------------------------------------------------------
// Helpers DB
// ---------------------------------------------------------------------------

function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ---------------------------------------------------------------------------
// Resolvers par niveau
// ---------------------------------------------------------------------------

/** Niveau 1 : Garmin wellness daily VO2max pour le jour exact. */
async function resolveLevel1(appUserId, date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const fitness = await prisma.externalDailyFitnessSnapshot.findFirst({
    where: {
      appUserId,
      sourceProvider: GARMIN_PROVIDER_CODE,
      snapshotDate: { gte: dayStart, lte: dayEnd },
      vo2MaxRunning: { not: null, gt: 0 },
    },
    orderBy: { snapshotDate: "desc" },
  });
  if (!fitness) return null;
  return {
    value: fitness.vo2MaxRunning,
    source: "garmin",
    notes: "Source: Garmin wellness daily VO2max (Firstbeat)",
  };
}

/** Niveau 2 : dernière activité enrichie ≤ 7 j avec vO2MaxValue non-null. */
async function resolveLevel2(appUserId, date) {
  const lookbackStart = startOfDay(new Date(date.getTime() - PER_ACTIVITY_LOOKBACK_DAYS * MS_PER_DAY));
  const dayEnd = endOfDay(date);
  const enrichments = await prisma.activityProviderEnrichment.findMany({
    where: {
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      activity: { startDate: { gte: lookbackStart, lte: dayEnd }, isMerged: false },
    },
    include: { activity: { select: { id: true, startDate: true } } },
    orderBy: { matchedAt: "desc" },
  });
  for (const enr of enrichments) {
    if (!enr.normalizedJson) continue;
    let parsed;
    try { parsed = JSON.parse(enr.normalizedJson); }
    catch { continue; }
    const vo2 = Number(parsed?.vO2MaxValue);
    if (Number.isFinite(vo2) && vo2 > 0) {
      return {
        value: vo2,
        source: "garmin",
        basedOnActivityId: enr.activity?.id || null,
        notes: "Source: Garmin per-activity VO2max",
      };
    }
  }
  return null;
}

/** Niveau 3 : meilleure perf récente (90 j) via régression Daniels. */
async function resolveLevel3(appUserId, date) {
  const lookbackStart = startOfDay(new Date(date.getTime() - BEST_PERFORMANCE_LOOKBACK_DAYS * MS_PER_DAY));
  const dayEnd = endOfDay(date);
  const activities = await prisma.activity.findMany({
    where: {
      appUserId,
      startDate: { gte: lookbackStart, lte: dayEnd },
      isMerged: false,
      type: { contains: "un" }, // Running / TrailRunning
      distance: { gte: 1500 },
      movingTime: { gte: 120 },
    },
    select: { id: true, distance: true, movingTime: true, startDate: true },
  });
  let best = { vdot: 0, activityId: null };
  for (const a of activities) {
    const v = computeDanielsVdot({
      distanceMeters: a.distance,
      elapsedSeconds: a.movingTime,
    });
    if (v > best.vdot) {
      best = { vdot: v, activityId: a.id };
    }
  }
  if (best.vdot <= 0) return null;
  return {
    value: best.vdot,
    source: "estimation_interne",
    basedOnActivityId: best.activityId,
    notes: "Source: estimation Daniels sur meilleure perf 90 j",
  };
}

// ---------------------------------------------------------------------------
// Consolidation publique
// ---------------------------------------------------------------------------

/**
 * Résout la valeur VDOT pour un (appUserId, date) en cascadant les 3 niveaux.
 * Retourne `null` si aucune source ne fournit de valeur.
 */
export async function resolveVdotForDate(appUserId, date) {
  return (
    await resolveLevel1(appUserId, date)
    || await resolveLevel2(appUserId, date)
    || await resolveLevel3(appUserId, date)
  );
}

/**
 * Écrit (upsert) un VdotHistorySnapshot pour le jour donné en consolidant
 * les 3 niveaux. Si aucune source n'a de valeur, ne fait rien.
 */
export async function upsertVdotHistoryForDate(appUserId, date) {
  const resolution = await resolveVdotForDate(appUserId, date);
  if (!resolution) return null;
  const snapshotDate = startOfDay(date);
  return prisma.vdotHistorySnapshot.upsert({
    where: { appUserId_snapshotDate: { appUserId, snapshotDate } },
    create: {
      appUserId,
      snapshotDate,
      vdotValue: resolution.value,
      source: resolution.source,
      basedOnActivityId: resolution.basedOnActivityId || null,
      notes: resolution.notes || null,
    },
    update: {
      vdotValue: resolution.value,
      source: resolution.source,
      basedOnActivityId: resolution.basedOnActivityId || null,
      notes: resolution.notes || null,
    },
  });
}

/**
 * Backfill VDOT history pour les N derniers jours.
 *
 * Idempotent. À lancer après une sync recovery + fitness fraîche.
 * Renvoie un résumé pour audit.
 */
export async function backfillVdotHistoryForUser(appUserId, { days = 90 } = {}) {
  const totalDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 90)));
  const today = startOfDay(new Date());
  const summary = { processed: 0, written: 0, perSource: { garmin: 0, estimation_interne: 0 } };

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(today.getTime() - i * MS_PER_DAY);
    summary.processed += 1;
    const result = await upsertVdotHistoryForDate(appUserId, date);
    if (result) {
      summary.written += 1;
      summary.perSource[result.source] = (summary.perSource[result.source] || 0) + 1;
    }
  }
  return summary;
}

/**
 * Liste les snapshots VDOT history d'un utilisateur, ordonnés ascendant.
 */
export async function listVdotHistoryForUser(appUserId, { days = 90 } = {}) {
  const totalDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 90)));
  const today = startOfDay(new Date());
  const start = new Date(today.getTime() - (totalDays - 1) * MS_PER_DAY);
  const snapshots = await prisma.vdotHistorySnapshot.findMany({
    where: {
      appUserId,
      snapshotDate: { gte: start, lte: endOfDay(today) },
    },
    orderBy: { snapshotDate: "asc" },
  });
  return {
    windowDays: totalDays,
    startDate: start.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    snapshots: snapshots.map((s) => ({
      date: s.snapshotDate.toISOString().slice(0, 10),
      vdotValue: s.vdotValue,
      source: s.source,
      basedOnActivityId: s.basedOnActivityId,
      notes: s.notes,
    })),
    latestSnapshot: snapshots.at(-1)
      ? {
          date: snapshots.at(-1).snapshotDate.toISOString().slice(0, 10),
          vdotValue: snapshots.at(-1).vdotValue,
          source: snapshots.at(-1).source,
        }
      : null,
  };
}
