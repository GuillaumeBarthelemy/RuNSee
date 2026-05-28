import prisma from "../../config/prisma.js";

/**
 * Benchmark d'une activite vs l'historique du meme type d'effort / distance
 * comparable. Sert au "vs N-1" du KPI strip de la fiche detail.
 *
 * Methode :
 *   - Reference = activites du meme sport (running), dans une bande de
 *     distance +/- 20 %, hors l'activite courante, sur les 12 derniers mois.
 *   - On compare a la MEDIANE de la reference (robuste aux outliers) pour
 *     distance, allure (s/km) et FC moyenne.
 *
 * @returns {{ hasData, sampleSize, distance, pace, heartRate }}
 *   chaque metrique : { value, median, deltaPct, betterIsLower } | null
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DISTANCE_BAND = 0.20;       // +/- 20 %
const LOOKBACK_DAYS = 365;
const MIN_SAMPLE = 3;

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function paceSecPerKm(activity) {
  const dist = Number(activity.distance);
  const time = Number(activity.movingTime);
  if (!(dist > 0) || !(time > 0)) return null;
  return time / (dist / 1000);
}

function deltaPct(value, ref) {
  if (!Number.isFinite(value) || !Number.isFinite(ref) || ref === 0) return null;
  return Math.round(((value - ref) / ref) * 1000) / 10;
}

export async function buildActivityBenchmark(appUserId, currentActivity) {
  if (!appUserId || !currentActivity) return { hasData: false };

  const distance = Number(currentActivity.distance);
  if (!(distance > 0)) return { hasData: false };

  const sport = currentActivity.sportType || currentActivity.type || null;
  const since = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY);
  const minDist = distance * (1 - DISTANCE_BAND);
  const maxDist = distance * (1 + DISTANCE_BAND);

  const peers = await prisma.activity.findMany({
    where: {
      appUserId,
      id: { not: currentActivity.id },
      ...(sport ? { sportType: sport } : {}),
      distance: { gte: minDist, lte: maxDist },
      startDate: { gte: since },
      isMerged: false,
    },
    select: { distance: true, movingTime: true, averageHeartrate: true },
    take: 100,
  });

  if (peers.length < MIN_SAMPLE) {
    return { hasData: false, sampleSize: peers.length };
  }

  const medDistance = median(peers.map((p) => Number(p.distance)));
  const medPace = median(peers.map((p) => paceSecPerKm(p)).filter(Number.isFinite));
  const medHr = median(peers.map((p) => Number(p.averageHeartrate)).filter((v) => v > 0));

  const curPace = paceSecPerKm(currentActivity);
  const curHr = Number(currentActivity.averageHeartrate) > 0
    ? Number(currentActivity.averageHeartrate)
    : null;

  return {
    hasData: true,
    sampleSize: peers.length,
    distance: medDistance != null
      ? { value: distance, median: medDistance, deltaPct: deltaPct(distance, medDistance), betterIsLower: false }
      : null,
    pace: (medPace != null && curPace != null)
      ? { value: curPace, median: medPace, deltaPct: deltaPct(curPace, medPace), betterIsLower: true }
      : null,
    heartRate: (medHr != null && curHr != null)
      ? { value: curHr, median: medHr, deltaPct: deltaPct(curHr, medHr), betterIsLower: true }
      : null,
  };
}
