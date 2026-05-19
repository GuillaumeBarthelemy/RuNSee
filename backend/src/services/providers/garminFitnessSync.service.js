/**
 * garminFitnessSync.service.js — Sync quotidienne des métriques fitness Garmin
 * (VO2max running/cycling, fitness age, acclimatations chaleur/altitude).
 *
 * Source scientifique : Garmin Connect `api.get_max_metrics(date)`, endpoint
 * `/userstats-service/wellness/<userId>/maxmetrics`. VO2max running calculé
 * par algorithme Firstbeat (validation labo Knaier 2019, r=0.93).
 *
 * Architecture :
 *   - Stocke les données brutes dans `ExternalDailyFitnessSnapshot`
 *     (séparé de `ExternalDailyRecoverySnapshot` qui gère sommeil/VFC/stress).
 *   - Une ligne par (appUserId, sourceProvider, snapshotDate).
 *   - Upsert idempotent.
 *
 * Convention d'extraction du payload Garmin :
 *   - `payload.generic.vo2MaxPreciseValue` ou `payload.generic.vo2MaxValue` (running)
 *   - `payload.cycling.vo2MaxPreciseValue` ou `payload.cycling.vo2MaxValue` (cycling)
 *   - `payload.generic.fitnessAge`
 *   - `payload.heatAltitudeAcclimation.heatAcclimationPercentage`
 *   - `payload.heatAltitudeAcclimation.altitudeAcclimationPercentage`
 */

import prisma from "../../config/prisma.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_DATA_QUALITIES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";
import { findExternalProviderConnectionForUser } from "./externalProviderConnection.service.js";
import { fetchGarminFitnessDays } from "./garminconnectBridge.service.js";
import { decryptProviderSessionPayload } from "./providerSessionCrypto.service.js";

const GARMIN_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function buildUtcDate(dateKey) {
  // dateKey "YYYY-MM-DD" -> Date UTC à minuit
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildRecentDates(days) {
  const todayKey = formatDateKey(new Date());
  const today = buildUtcDate(todayKey);
  const totalDays = Math.max(1, Math.min(180, Math.floor(Number(days) || 1)));
  const result = [];
  for (let i = 0; i < totalDays; i++) {
    result.push(formatDateKey(new Date(today.getTime() - i * MS_PER_DAY)));
  }
  return result;
}

/**
 * Extrait les valeurs utiles du payload `get_max_metrics`.
 * Tolère plusieurs shapes selon la version Garmin Connect.
 */
export function extractFitnessSnapshotFromPayload(rawPayload, date) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return {
      snapshotDate: buildUtcDate(date),
      vo2MaxRunning: null,
      vo2MaxCycling: null,
      fitnessAge: null,
      heatAcclimationPercent: null,
      altitudeAcclimationPercent: null,
      dataQuality: EXTERNAL_PROVIDER_DATA_QUALITIES.PARTIAL,
    };
  }

  const generic = rawPayload.generic || {};
  const cycling = rawPayload.cycling || {};
  const heatAltitude = rawPayload.heatAltitudeAcclimation || rawPayload.heatAcclimation || {};

  const vo2Running = toNumberOrNull(
    generic.vo2MaxPreciseValue ?? generic.vo2MaxValue ?? generic.vo2max ?? generic.vO2MaxValue,
  );
  const vo2Cycling = toNumberOrNull(
    cycling.vo2MaxPreciseValue ?? cycling.vo2MaxValue ?? cycling.vo2max ?? cycling.vO2MaxValue,
  );
  const fitnessAge = toIntOrNull(generic.fitnessAge);
  const heatPct = toIntOrNull(
    heatAltitude.heatAcclimationPercentage ?? heatAltitude.heatAcclimation,
  );
  const altPct = toIntOrNull(
    heatAltitude.altitudeAcclimationPercentage ?? heatAltitude.altitudeAcclimation,
  );

  // Qualité : complete si on a au moins vo2MaxRunning, partial sinon
  const dataQuality = vo2Running != null
    ? EXTERNAL_PROVIDER_DATA_QUALITIES.COMPLETE
    : EXTERNAL_PROVIDER_DATA_QUALITIES.PARTIAL;

  return {
    snapshotDate: buildUtcDate(date),
    vo2MaxRunning: vo2Running,
    vo2MaxCycling: vo2Cycling,
    fitnessAge,
    heatAcclimationPercent: heatPct,
    altitudeAcclimationPercent: altPct,
    dataQuality,
  };
}

/**
 * Sync N jours de fitness data pour un utilisateur.
 *
 * @param {string} appUserId
 * @param {Object} options
 * @param {number} [options.days=30] Nb de jours à synchroniser (descendant depuis aujourd'hui)
 * @param {Array<string>} [options.dates] Dates explicites YYYY-MM-DD (prioritaire sur days)
 * @returns {Promise<{ status, syncedCount, errors }>}
 */
export async function syncGarminFitnessForUser(appUserId, options = {}) {
  const connection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);
  if (!connection || connection.status !== EXTERNAL_PROVIDER_STATUSES.CONNECTED || !connection.encryptedSession) {
    return {
      status: "no_connection",
      message: "Garmin n'est pas connecté pour cet utilisateur.",
      syncedCount: 0,
    };
  }

  const session = decryptProviderSessionPayload(connection.encryptedSession, { parseJson: true });
  const dates = Array.isArray(options.dates) && options.dates.length
    ? options.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : buildRecentDates(options.days ?? 30);

  if (!dates.length) {
    return { status: "no_dates", syncedCount: 0 };
  }

  const bridgeResult = await fetchGarminFitnessDays({ session, dates });

  if (bridgeResult?.status === "expired") {
    return { status: "expired", syncedCount: 0, message: bridgeResult.message };
  }
  if (bridgeResult?.status === "rate_limited" || bridgeResult?.code === "GARMINCONNECT_RATE_LIMITED") {
    return { status: "rate_limited", syncedCount: 0, message: bridgeResult.message };
  }
  if (bridgeResult?.status !== "success") {
    return {
      status: "error",
      syncedCount: 0,
      code: bridgeResult?.code || "GARMINCONNECT_FITNESS_ERROR",
      message: bridgeResult?.message || "Erreur de récupération des données fitness Garmin.",
    };
  }

  const days = Array.isArray(bridgeResult.days) ? bridgeResult.days : [];
  let syncedCount = 0;
  const errors = [];

  for (const day of days) {
    const date = day?.date;
    if (!date) continue;
    if (Array.isArray(day.errors) && day.errors.length) {
      errors.push({ date, errors: day.errors });
    }
    const extracted = extractFitnessSnapshotFromPayload(day.raw, date);
    // Skip si aucune donnée utile (vo2MaxRunning null et tout le reste aussi)
    if (
      extracted.vo2MaxRunning == null
      && extracted.vo2MaxCycling == null
      && extracted.fitnessAge == null
    ) {
      continue;
    }

    await prisma.externalDailyFitnessSnapshot.upsert({
      where: {
        appUserId_sourceProvider_snapshotDate: {
          appUserId,
          sourceProvider: GARMIN_PROVIDER_CODE,
          snapshotDate: extracted.snapshotDate,
        },
      },
      create: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
        ...extracted,
      },
      update: {
        ...extracted,
        syncedAt: new Date(),
      },
    });
    syncedCount += 1;
  }

  return {
    status: "success",
    syncedCount,
    requestedCount: dates.length,
    errors,
  };
}

/**
 * Liste les snapshots fitness d'un utilisateur sur N jours, ordonnés
 * du plus ancien au plus récent.
 */
export async function listGarminFitnessSnapshotsForUser(appUserId, { days = 56 } = {}) {
  const totalDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 56)));
  const endDate = buildUtcDate(formatDateKey(new Date()));
  const startDate = new Date(endDate.getTime() - (totalDays - 1) * MS_PER_DAY);

  const snapshots = await prisma.externalDailyFitnessSnapshot.findMany({
    where: {
      appUserId,
      sourceProvider: GARMIN_PROVIDER_CODE,
      snapshotDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { snapshotDate: "asc" },
  });

  return {
    sourceProvider: GARMIN_PROVIDER_CODE,
    windowDays: totalDays,
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
    snapshots: snapshots.map((s) => ({
      date: formatDateKey(s.snapshotDate),
      sourceProvider: s.sourceProvider,
      vo2MaxRunning: s.vo2MaxRunning,
      vo2MaxCycling: s.vo2MaxCycling,
      fitnessAge: s.fitnessAge,
      heatAcclimationPercent: s.heatAcclimationPercent,
      altitudeAcclimationPercent: s.altitudeAcclimationPercent,
      dataQuality: s.dataQuality,
      syncedAt: s.syncedAt,
    })),
    latestSnapshotDate: snapshots.at(-1)?.snapshotDate
      ? formatDateKey(snapshots.at(-1).snapshotDate)
      : null,
  };
}
