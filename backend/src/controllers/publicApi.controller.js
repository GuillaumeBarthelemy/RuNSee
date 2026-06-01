/**
 * publicApi.controller.js
 *
 * Controllers de l'API publique v1 (lecture seule).
 * Réutilise les repositories et services existants —
 * zéro duplication de logique métier.
 */
import prisma from "../config/prisma.js";
import { listActivities, getStoredActivityByPublicIdForUser } from "../repositories/activity.repository.js";
import { listRaceObjectives } from "../services/settings/raceObjective.service.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function sanitizeActivity(act) {
  // Exclut rawJson/summaryJson (payloads bruts Strava volumineux) et champs internes.
  const { rawJson, summaryJson, appUserId, athleteId, ...rest } = act;
  return rest;
}

// ---------------------------------------------------------------------------
// GET /api/v1/activities
// ---------------------------------------------------------------------------
export async function listActivitiesV1(req, res, next) {
  try {
    const { appUserId } = req.apiAuth;
    const from = parseDate(req.query.from);
    const to   = parseDate(req.query.to);
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
    const page  = parsePositiveInt(req.query.page, 1);

    const filters = {
      appUserId,
      ...(req.query.sport ? { sportType: req.query.sport } : {}),
      ...(from || to ? { from, to } : {}),
    };

    const all = await listActivities(filters);
    const total = all.length;
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit).map(sanitizeActivity);

    res.json({
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/v1/activities/:id
// ---------------------------------------------------------------------------
export async function getActivityV1(req, res, next) {
  try {
    const { appUserId } = req.apiAuth;
    const act = await getStoredActivityByPublicIdForUser(appUserId, req.params.id);
    if (!act) {
      const err = new Error("Activité introuvable.");
      err.httpStatus = 404;
      err.code = "ACTIVITY_NOT_FOUND";
      return next(err);
    }
    res.json({ data: sanitizeActivity(act) });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/v1/recovery   (snapshots Garmin : sommeil, VFC, FC repos, Body Battery…)
// ---------------------------------------------------------------------------
export async function listRecoveryV1(req, res, next) {
  try {
    const { appUserId } = req.apiAuth;
    const from  = parseDate(req.query.from);
    const to    = parseDate(req.query.to);
    const limit = Math.min(parsePositiveInt(req.query.limit, 90), 365);

    const where = { appUserId };
    if (from || to) {
      where.snapshotDate = {};
      if (from) where.snapshotDate.gte = new Date(from);
      if (to)   where.snapshotDate.lte = new Date(to);
    }

    const items = await prisma.externalDailyRecoverySnapshot.findMany({
      where,
      orderBy: { snapshotDate: "desc" },
      take: limit,
      select: {
        id: true, snapshotDate: true, sourceProvider: true,
        sleepDurationSeconds: true, sleepScore: true,
        hrvAvgMs: true, restingHr: true,
        stressAvg: true,
        bodyBatteryMorning: true, bodyBatteryMin: true, bodyBatteryMax: true, bodyBatteryEnd: true,
        trainingReadinessScore: true, trainingReadinessStatus: true,
        dataQuality: true,
      },
    });

    res.json({ data: items, meta: { count: items.length } });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/v1/fitness   (snapshots physiologiques : VO2max Garmin, endurance score…)
// ---------------------------------------------------------------------------
export async function listFitnessV1(req, res, next) {
  try {
    const { appUserId } = req.apiAuth;
    const from  = parseDate(req.query.from);
    const to    = parseDate(req.query.to);
    const limit = Math.min(parsePositiveInt(req.query.limit, 90), 365);

    const where = { appUserId };
    if (from || to) {
      where.snapshotDate = {};
      if (from) where.snapshotDate.gte = new Date(from);
      if (to)   where.snapshotDate.lte = new Date(to);
    }

    const items = await prisma.externalDailyFitnessSnapshot.findMany({
      where,
      orderBy: { snapshotDate: "desc" },
      take: limit,
      select: {
        id: true, snapshotDate: true, sourceProvider: true,
        vo2MaxRunning: true, vo2MaxCycling: true,
        fitnessAge: true,
        enduranceScore: true, enduranceScoreLevel: true,
        hillScore: true, hillScoreLevel: true,
        dataQuality: true,
      },
    });

    res.json({ data: items, meta: { count: items.length } });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/v1/objectives   (courses objectifs)
// ---------------------------------------------------------------------------
export async function listObjectivesV1(req, res, next) {
  try {
    const { appUserId } = req.apiAuth;
    // listRaceObjectives retourne { races, activeRace } déjà sérialisés
    // (serializeRaceObjective n'expose pas les champs internes).
    const { races, activeRace } = await listRaceObjectives(appUserId);
    res.json({ data: races, meta: { activeRaceId: activeRace?.id ?? null, count: races.length } });
  } catch (err) { next(err); }
}
