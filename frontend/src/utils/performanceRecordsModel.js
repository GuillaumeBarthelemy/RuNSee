/**
 * performanceRecordsModel.js — Modele metier pour l'onglet
 * `Performance > Records` (page 16 du plan Lot Performance V5).
 *
 * Construit a partir des activites :
 *   - 4 records Route : 5k / 10k / Semi-marathon / Marathon
 *   - 4 records Trail : Trail 10 km / 20 km / 50 km / Dénivelé+ max
 *   - Top 5 meilleurs segments (depuis rawJson.segment_efforts)
 *   - Progression : delta vs record precedent + tendance %
 *   - Historique : timeline des PR (records + dates de battue)
 *   - Conseil du jour : stat motivante % records ameliores
 */

import {
  buildBestEffortRecords,
  isRunLikeActivity,
} from "./activityInsights.js";
import { getActivityRawPayload } from "./parsedRawCache.js";

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRaceTime(seconds) {
  const n = Math.max(0, Math.round(toFiniteNumber(seconds)));
  if (n <= 0) return "—";
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSignedTimeDelta(seconds) {
  const n = Math.round(toFiniteNumber(seconds));
  if (n === 0) return "—";
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : "-";
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m > 0) return `${sign}${m}:${String(s).padStart(2, "0")}`;
  return `${sign}0:${String(s).padStart(2, "0")}`;
}

function formatSignedPercent(value, decimals = 1) {
  const n = toFiniteNumber(value);
  if (Math.abs(n) < 0.05) return "0 %";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(decimals).replace(".", ",")} %`;
}

function formatShortDate(dateStr) {
  const d = safeDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function isTrailActivity(activity = {}) {
  const sport = String(activity?.sportType || activity?.type || "").toLowerCase();
  const text = `${activity?.name || ""} ${activity?.description || ""}`.toLowerCase();
  return sport.includes("trail") || text.includes("trail");
}

/**
 * Records ROUTE : 5k / 10k / Semi / Marathon depuis buildBestEffortRecords.
 */
function buildRouteRecords(activities) {
  // Filtre activites NON trail uniquement
  const routeActs = (Array.isArray(activities) ? activities : [])
    .filter((a) => isRunLikeActivity(a) && !isTrailActivity(a));
  const records = buildBestEffortRecords(routeActs);
  const LABELS = { "5k": "5 km", "10k": "10 km", halfMarathon: "Semi-marathon", marathon: "Marathon" };
  return (records || [])
    .filter((r) => r?.isAvailable && r?.elapsedSeconds > 0)
    .map((r) => ({
      key: r.recordKey,
      label: LABELS[r.recordKey] || r.recordLabel,
      category: "route",
      categoryLabel: "Route",
      value: r.elapsedSeconds,
      formattedValue: formatRaceTime(r.elapsedSeconds),
      date: r.activity?.startDateLocal || r.activity?.startDate || null,
      formattedDate: formatShortDate(r.activity?.startDateLocal || r.activity?.startDate),
      previousElapsedSeconds: r.previousElapsedSeconds || null,
      previousDate: r.previousActivity?.startDateLocal || r.previousActivity?.startDate || null,
      isOfficial: r.isOfficial,
      pillType: "RP",
      activity: r.activity,
    }));
}

/**
 * Records TRAIL : 10 km, 20 km, 50 km, max D+ depuis activites trail.
 */
function buildTrailRecords(activities) {
  const trailActs = (Array.isArray(activities) ? activities : [])
    .filter((a) => isRunLikeActivity(a) && isTrailActivity(a));

  if (trailActs.length === 0) return [];

  // Pour chaque cible : trouver l'activite trail la plus rapide qui couvre la distance
  const TARGETS = [
    { key: "trail10k", label: "Trail 10 km", minMeters: 9000, maxMeters: 13000 },
    { key: "trail20k", label: "Trail 20 km", minMeters: 18000, maxMeters: 25000 },
    { key: "trail50k", label: "Trail 50 km", minMeters: 45000, maxMeters: 60000 },
  ];

  const records = TARGETS.map((target) => {
    const matching = trailActs.filter((a) => {
      const dist = toFiniteNumber(a.distance);
      return dist >= target.minMeters && dist <= target.maxMeters;
    });
    if (matching.length === 0) return null;
    // Tri par temps ascendant pour avoir le meilleur
    matching.sort((a, b) => toFiniteNumber(a.movingTime) - toFiniteNumber(b.movingTime));
    const best = matching[0];
    const previous = matching[1] || null;
    return {
      key: target.key,
      label: target.label,
      category: "trail",
      categoryLabel: "Trail",
      value: toFiniteNumber(best.movingTime),
      formattedValue: formatRaceTime(best.movingTime),
      date: best.startDateLocal || best.startDate || null,
      formattedDate: formatShortDate(best.startDateLocal || best.startDate),
      previousElapsedSeconds: previous ? toFiniteNumber(previous.movingTime) : null,
      previousDate: previous?.startDateLocal || previous?.startDate || null,
      isOfficial: true,
      pillType: "RP",
      activity: best,
    };
  }).filter(Boolean);

  // Record D+ maximum : trail activity avec le plus grand denivele
  const sortedByElev = [...trailActs].sort(
    (a, b) => toFiniteNumber(b.totalElevationGain ?? b.elevationGain) - toFiniteNumber(a.totalElevationGain ?? a.elevationGain),
  );
  const topElev = sortedByElev[0];
  if (topElev && toFiniteNumber(topElev.totalElevationGain ?? topElev.elevationGain) > 500) {
    const elev = toFiniteNumber(topElev.totalElevationGain ?? topElev.elevationGain);
    records.push({
      key: "elevationMax",
      label: "Dénivelé+ record",
      category: "trail",
      categoryLabel: "Trail",
      value: elev,
      formattedValue: `${Math.round(elev)} m`,
      date: topElev.startDateLocal || topElev.startDate || null,
      formattedDate: formatShortDate(topElev.startDateLocal || topElev.startDate),
      previousElapsedSeconds: null,
      previousDate: null,
      isElevation: true,
      isOfficial: true,
      pillType: "RP",
      activity: topElev,
    });
  }

  return records;
}

/**
 * Top 5 meilleurs segments (rawJson.segment_efforts).
 * Critere : pr_rank = 1 (PR Strava), trie par achievement_count desc puis elapsed asc.
 */
function buildBestSegments(activities) {
  const allEfforts = [];
  (Array.isArray(activities) ? activities : []).forEach((a) => {
    if (!isRunLikeActivity(a)) return;
    const payload = getActivityRawPayload(a);
    const efforts = Array.isArray(payload?.segment_efforts) ? payload.segment_efforts : [];
    efforts.forEach((eff) => {
      // PR Strava uniquement (pr_rank = 1)
      if (Number(eff?.pr_rank) !== 1) return;
      const elapsed = toFiniteNumber(eff?.elapsed_time);
      if (elapsed <= 0) return;
      const segment = eff?.segment || {};
      allEfforts.push({
        segmentId: eff.segment?.id || eff.segment_id || `${a.id}-${eff.name}`,
        name: eff.name || segment.name || "Segment",
        distanceM: toFiniteNumber(segment.distance || eff.distance),
        elevationHigh: toFiniteNumber(segment.elevation_high),
        elevationLow: toFiniteNumber(segment.elevation_low),
        elevationDiff: toFiniteNumber(segment.elevation_high) - toFiniteNumber(segment.elevation_low),
        elapsedSeconds: elapsed,
        achievementCount: toFiniteNumber(eff.achievement_count),
        date: a.startDateLocal || a.startDate || null,
        category: isTrailActivity(a) ? "trail" : "route",
        activityId: a.id || a.stravaActivityId,
      });
    });
  });

  // Tri par elapsed asc + achievement_count desc, dedupe par segmentId
  const seen = new Set();
  const deduped = allEfforts
    .sort((l, r) => (r.achievementCount - l.achievementCount) || (l.elapsedSeconds - r.elapsedSeconds))
    .filter((e) => {
      if (seen.has(e.segmentId)) return false;
      seen.add(e.segmentId);
      return true;
    })
    .slice(0, 5);

  return deduped.map((e, idx) => ({
    rank: idx + 1,
    name: e.name,
    distanceKm: e.distanceM > 0 ? e.distanceM / 1000 : 0,
    formattedDistance: e.distanceM > 0 ? `${(e.distanceM / 1000).toFixed(1).replace(".", ",")} km` : "—",
    elevationDiff: e.elevationDiff,
    formattedElevation: e.elevationDiff > 0 ? `${Math.round(e.elevationDiff)} m D+` : "",
    elapsedSeconds: e.elapsedSeconds,
    formattedElapsed: formatRaceTime(e.elapsedSeconds),
    category: e.category,
    categoryLabel: e.category === "trail" ? "Trail" : "Route",
    pillType: "RP",
    achievementCount: e.achievementCount,
    date: e.date,
  }));
}

/**
 * Progression : pour chaque record, delta vs record precedent.
 */
function buildProgressionRows(allRecords) {
  return (allRecords || [])
    .filter((r) => r.previousElapsedSeconds != null && r.value > 0)
    .map((r) => {
      const delta = r.value - r.previousElapsedSeconds;
      const pct = r.previousElapsedSeconds > 0 ? (delta / r.previousElapsedSeconds) * 100 : 0;
      return {
        key: r.key,
        label: r.label,
        categoryLabel: r.categoryLabel,
        evolutionSeconds: delta,
        formattedEvolution: r.isElevation
          ? `${delta > 0 ? "+" : ""}${Math.round(delta)} m`
          : formatSignedTimeDelta(delta),
        trendPercent: pct,
        formattedTrend: formatSignedPercent(pct),
        // Pour le temps : delta negatif = amelioration = positive tone
        // Pour le denivele : delta positif = amelioration = positive tone
        tone: r.isElevation
          ? (delta > 0 ? "positive" : delta < 0 ? "warning" : "neutral")
          : (delta < 0 ? "positive" : delta > 0 ? "warning" : "neutral"),
      };
    });
}

/**
 * Historique : tous les records qui ont battu un precedent, tries desc par date.
 */
function buildHistoryRows(allRecords) {
  return (allRecords || [])
    .filter((r) => r.previousElapsedSeconds != null && r.value > 0)
    .map((r) => {
      const delta = r.value - r.previousElapsedSeconds;
      const pct = r.previousElapsedSeconds > 0 ? (delta / r.previousElapsedSeconds) * 100 : 0;
      return {
        key: `${r.key}-${r.date}`,
        date: r.date,
        formattedDate: r.formattedDate,
        category: r.category,
        categoryLabel: r.categoryLabel,
        label: r.label,
        newRecord: r.formattedValue,
        previousRecord: r.isElevation
          ? `${Math.round(r.previousElapsedSeconds)} m`
          : formatRaceTime(r.previousElapsedSeconds),
        previousDate: r.previousDate,
        formattedPreviousDate: r.previousDate ? formatShortDate(r.previousDate) : "—",
        formattedEvolution: r.isElevation
          ? `${delta > 0 ? "+" : ""}${Math.round(delta)} m`
          : formatSignedTimeDelta(delta),
        formattedTrend: formatSignedPercent(pct),
        tone: r.isElevation
          ? (delta > 0 ? "positive" : "warning")
          : (delta < 0 ? "positive" : "warning"),
        source: "GPS",
        confidence: { label: "Élevée", tone: "positive" },
      };
    })
    .sort((l, r) => {
      const ld = safeDate(l.date) || new Date(0);
      const rd = safeDate(r.date) || new Date(0);
      return rd - ld;
    });
}

/**
 * Modele principal Records.
 */
export function buildRecordsModel({ scopeActivities = [] } = {}) {
  const routeRecords = buildRouteRecords(scopeActivities);
  const trailRecords = buildTrailRecords(scopeActivities);
  const allRecords = [...routeRecords, ...trailRecords];

  if (allRecords.length === 0) {
    return {
      hasData: false,
      title: "Records",
      emptyReason: "Pas encore de records exploitables. Ajoute des sorties avec best efforts pour activer cette vue.",
    };
  }

  const segments = buildBestSegments(scopeActivities);
  const progression = buildProgressionRows(allRecords);
  const history = buildHistoryRows(allRecords);

  // Stat conseil : % de records ameliores cette annee
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const thisYearRecords = allRecords.filter((r) => {
    const d = safeDate(r.date);
    return d && d >= yearStart;
  });
  const improvedShare = allRecords.length > 0
    ? Math.round((thisYearRecords.length / allRecords.length) * 100)
    : 0;

  return {
    hasData: true,
    title: "Records",
    bestTimes: {
      route: routeRecords,
      trail: trailRecords,
      all: allRecords,
    },
    bestSegments: segments,
    progression,
    history,
    stats: {
      totalRecords: allRecords.length,
      improvedThisYear: thisYearRecords.length,
      improvedShare,
    },
    coachAdvice: improvedShare >= 50
      ? `La constance paie : tu as battu ${thisYearRecords.length} records cette année. Garde le cap et continue de construire ta progression !`
      : `${thisYearRecords.length} records battus cette année. Continue à varier les distances pour faire progresser tes repères.`,
  };
}
