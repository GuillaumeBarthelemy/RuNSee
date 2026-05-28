/**
 * progressionVolumeModel.js — Modele metier pour l'onglet
 * `Progression > Volume` (page 18 du mockup, spec section 7).
 *
 * Construit a partir des activites :
 *   - 4 KPIs hebdo moyennes (distance / temps / D+ / sorties) + delta annuel
 *   - 3 charts hebdo long terme (distance / temps / D+) avec moyenne glissante 4 sem
 *   - Composition du volume 12 dernieres semaines (Trail/Route/Sortie longue/Recup/Autre)
 *   - 'A retenir' messages contextualises
 */

import { buildWeeklySeries, buildWeeklyBuckets } from "./activityAggregations.js";
import { isRunLikeActivity } from "./activityInsights.js";
import { getSessionTypeDef, SESSION_TYPES } from "../constants/sessionTaxonomy.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROLLING_WINDOW_WEEKS = 4;
const COMPOSITION_WEEKS = 12;
const POLARISATION_WEEKS = 12;

// Regroupe les intensites taxonomie en 3 zones de polarisation classique.
const POLAR_BUCKETS = {
  low:  { label: "Facile (Z1-Z2)", color: "#22c55e" },
  mid:  { label: "Modéré (Z3-Z4)", color: "#eab308" },
  high: { label: "Intense (Z5+)",  color: "#ef4444" },
};

function intensityToPolarBucket(intensity) {
  if (intensity === "low") return "low";
  if (intensity === "mid") return "mid";
  if (intensity === "high") return "high";
  return null; // none / inconnu -> exclu de la polarisation
}

// Meta pour le chart empilé par intensité (toggle composition).
const INTENSITY_COMPOSITION_META = {
  low:  { label: "Facile (Z1-Z2)", color: "#22c55e" },
  mid:  { label: "Modéré (Z3-Z4)", color: "#eab308" },
  high: { label: "Intense (Z5+)",  color: "#ef4444" },
};

/**
 * Composition hebdomadaire par intensite (low/mid/high) sur 12 semaines,
 * en % de distance. Base sur la classification user. Memes buckets que
 * la composition par sport pour un toggle coherent.
 */
function buildIntensityCompositionData(activities, referenceDate) {
  const ref = safeDate(referenceDate) || new Date();
  const startDate = new Date(ref.getTime() - COMPOSITION_WEEKS * 7 * MS_PER_DAY);
  const buckets = buildWeeklyBuckets({
    startDate,
    endDate: ref,
    weeks: COMPOSITION_WEEKS,
    grouping: "calendar",
  });

  return buckets.map((bucket) => {
    const weekActs = (Array.isArray(activities) ? activities : []).filter((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d && d >= bucket.coverageStart && d <= bucket.coverageEnd && a?.userSessionType;
    });
    const totals = { low: 0, mid: 0, high: 0 };
    weekActs.forEach((a) => {
      const def = getSessionTypeDef(a.userSessionType);
      const bucketKey = def && (def.intensity === "low" || def.intensity === "mid" || def.intensity === "high")
        ? def.intensity
        : null;
      if (bucketKey) totals[bucketKey] += toFiniteNumber(a.distance) / 1000;
    });
    const total = totals.low + totals.mid + totals.high;
    const pct = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, total > 0 ? Math.round((v / total) * 100) : 0]),
    );
    return {
      label: bucket.shortLabel || bucket.period,
      total: Number(total.toFixed(1)),
      ...pct,
    };
  });
}

/**
 * Calcule la polarisation des seances classifiees sur les 12 dernieres
 * semaines : repartition low/mid/high (modele 80/20) + detail par type.
 * Base sur le NOMBRE de seances (plus parlant que le volume pour la
 * polarisation d'entrainement).
 */
function buildPolarisation(activities, referenceDate) {
  const ref = safeDate(referenceDate) || new Date();
  const startDate = new Date(ref.getTime() - POLARISATION_WEEKS * 7 * MS_PER_DAY);
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

  // Insight 80/20 : ratio facile vs (modere+intense)
  const easyPct = buckets.find((b) => b.key === "low")?.pct || 0;
  const hardPct = 100 - easyPct;

  return {
    hasData: true,
    total: classified,
    weeks: POLARISATION_WEEKS,
    buckets,
    byType,
    easyPct,
    hardPct,
  };
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatHM(hours) {
  const n = Math.max(0, toFiniteNumber(hours));
  if (n <= 0) return "—";
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}

function formatKm(value) {
  const n = toFiniteNumber(value);
  if (n <= 0) return "—";
  return `${n.toFixed(1).replace(".", ",")} km`;
}

function formatMeters(value) {
  const n = Math.round(toFiniteNumber(value));
  if (n <= 0) return "—";
  return `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} m`;
}

function formatSortiesPerWeek(value) {
  const n = toFiniteNumber(value);
  if (n <= 0) return "—";
  return n.toFixed(1).replace(".", ",");
}

function formatSignedPercent(value, decimals = 0) {
  const n = toFiniteNumber(value);
  if (Math.abs(n) < 0.5) return "—";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(decimals).replace(".", ",")} %`;
}

function formatSignedDelta(value, decimals = 1) {
  const n = toFiniteNumber(value);
  if (Math.abs(n) < 0.05) return "—";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(decimals).replace(".", ",")}`;
}

/**
 * Calcule moyenne glissante sur N points.
 */
function rollingAverage(values, window = ROLLING_WINDOW_WEEKS) {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1);
    const slice = values.slice(start, idx + 1);
    const sum = slice.reduce((s, v) => s + toFiniteNumber(v), 0);
    return slice.length > 0 ? sum / slice.length : 0;
  });
}

/**
 * Construit la serie hebdo + moyenne glissante depuis activites.
 */
function buildWeeklyChartData({ activities, metric, startDate, endDate }) {
  const series = buildWeeklySeries(activities, {
    metric,
    startDate,
    endDate,
    weeks: 200, // large pour couvrir periode complete
    grouping: "calendar",
  });
  const values = series.map((s) => toFiniteNumber(s.value));
  const rolling = rollingAverage(values, ROLLING_WINDOW_WEEKS);
  return series.map((s, idx) => ({
    label: s.shortLabel || s.period,
    periodDate: s.periodDate,
    value: values[idx],
    rolling: Number(rolling[idx].toFixed(1)),
  }));
}

/**
 * Categorise une activite pour la composition du volume :
 *   - Trail / Montagne : sport TrailRun OU elev/km >= 30
 *   - Route : Run avec elev/km < 30
 *   - Sortie longue : duration >= 90 min (override sur Route si applicable)
 *   - Recuperation : easy pace (avg pace > T pace * 1.3) ET duration < 45 min
 *   - Autre : Walk, Hike, VirtualRun
 */
function categorizeActivityForComposition(activity) {
  if (!isRunLikeActivity(activity)) {
    // Walk / Hike / autres → Autre
    return "autre";
  }
  const sport = String(activity?.sportType || activity?.type || "").toLowerCase();
  const distKm = toFiniteNumber(activity?.distance) / 1000;
  const elev = toFiniteNumber(activity?.totalElevationGain ?? activity?.elevationGain);
  const dur = toFiniteNumber(activity?.movingTime);
  const durMin = dur / 60;
  const elevPerKm = distKm > 0 ? elev / distKm : 0;

  // Trail prioritaire
  if (sport.includes("trail") || elevPerKm >= 30) {
    return "trail";
  }
  // Sortie longue (route)
  if (durMin >= 90) {
    return "sortie_longue";
  }
  // Recuperation (short + easy)
  if (durMin > 0 && durMin < 45) {
    const avgHr = toFiniteNumber(activity?.averageHeartrate);
    // Si FC mesuree et basse → recuperation; sinon par durée seule trop ambigu
    if (avgHr > 0 && avgHr < 140) return "recuperation";
  }
  return "route";
}

const COMPOSITION_META = {
  trail: { label: "Trail / Montagne", color: "#15803d" },
  route: { label: "Route", color: "#1268f3" },
  sortie_longue: { label: "Sortie longue", color: "#7c3aed" },
  recuperation: { label: "Récupération", color: "#22c55e" },
  autre: { label: "Autre", color: "#94a3b8" },
};

/**
 * Construit la composition du volume sur les N dernieres semaines.
 * Retourne un array de points : { label, trail, route, sortie_longue, ... }
 */
function buildCompositionData(activities, referenceDate) {
  const ref = safeDate(referenceDate) || new Date();
  const startDate = new Date(ref.getTime() - COMPOSITION_WEEKS * 7 * MS_PER_DAY);

  // Buckets par semaine
  const buckets = buildWeeklySeries(activities, {
    metric: "distanceKm",
    startDate,
    endDate: ref,
    weeks: COMPOSITION_WEEKS,
    grouping: "calendar",
  });

  // Pour chaque semaine, repartition par categorie
  return buckets.map((bucket) => {
    const weekActs = (Array.isArray(activities) ? activities : []).filter((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d && d >= bucket.coverageStart && d <= bucket.coverageEnd;
    });
    const totals = { trail: 0, route: 0, sortie_longue: 0, recuperation: 0, autre: 0 };
    weekActs.forEach((a) => {
      const cat = categorizeActivityForComposition(a);
      totals[cat] += toFiniteNumber(a.distance) / 1000;
    });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    // Convertir en %
    const pct = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, total > 0 ? Math.round((v / total) * 100) : 0]),
    );
    return {
      label: bucket.shortLabel || bucket.period,
      total: Number(total.toFixed(1)),
      ...pct,
    };
  });
}

/**
 * Calcule la moyenne hebdo et le % delta vs annee precedente.
 */
function buildKpiAggregate(activities, { startDate, endDate, prevStartDate, prevEndDate }) {
  function aggregateRange(start, end) {
    const items = (Array.isArray(activities) ? activities : []).filter((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d && d >= start && d <= end;
    });
    const totalKm = items.reduce((s, a) => s + toFiniteNumber(a.distance) / 1000, 0);
    const totalHours = items.reduce((s, a) => s + toFiniteNumber(a.movingTime) / 3600, 0);
    const totalElev = items.reduce((s, a) => s + toFiniteNumber(a.totalElevationGain ?? a.elevationGain), 0);
    const sorties = items.length;
    const weeks = Math.max(1, (end - start) / (7 * MS_PER_DAY));
    return {
      avgKm: totalKm / weeks,
      avgHours: totalHours / weeks,
      avgElev: totalElev / weeks,
      avgSorties: sorties / weeks,
    };
  }
  const current = aggregateRange(startDate, endDate);
  const previous = aggregateRange(prevStartDate, prevEndDate);
  function deltaPct(a, b) {
    if (b <= 0) return 0;
    return ((a - b) / b) * 100;
  }
  return {
    current,
    previous,
    deltas: {
      avgKm: deltaPct(current.avgKm, previous.avgKm),
      avgHours: deltaPct(current.avgHours, previous.avgHours),
      avgElev: deltaPct(current.avgElev, previous.avgElev),
      avgSortiesAbs: current.avgSorties - previous.avgSorties,
    },
  };
}

/**
 * Modele principal Progression > Volume.
 */
export function buildProgressionVolumeModel({ activities = [], referenceDate = null } = {}) {
  const ref = safeDate(referenceDate) || new Date();
  // Periode courante : 12 derniers mois
  const endDate = ref;
  const startDate = new Date(endDate.getTime() - 365 * MS_PER_DAY);
  // Periode precedente : 12 mois avant
  const prevEndDate = startDate;
  const prevStartDate = new Date(prevEndDate.getTime() - 365 * MS_PER_DAY);

  // Activites run-like
  const runs = (Array.isArray(activities) ? activities : []).filter(isRunLikeActivity);
  if (runs.length === 0) {
    return {
      hasData: false,
      title: "Progression — Volume",
      emptyReason: "Pas encore assez de sorties pour construire l'historique de volume.",
    };
  }

  // KPIs
  const agg = buildKpiAggregate(runs, { startDate, endDate, prevStartDate, prevEndDate });

  // Charts long terme (toutes les sorties run-like)
  const distanceChart = buildWeeklyChartData({
    activities: runs,
    metric: "distanceKm",
    startDate,
    endDate,
  });
  const timeChart = buildWeeklyChartData({
    activities: runs,
    metric: "durationHours",
    startDate,
    endDate,
  });
  const elevationChart = buildWeeklyChartData({
    activities: runs,
    metric: "elevationGain",
    startDate,
    endDate,
  });

  // Composition 12 dernieres semaines (toutes activites pour 'Autre' = Walk/Hike)
  const composition = buildCompositionData(activities, ref);

  // Polarisation (classification user) 12 dernieres semaines
  const polarisation = buildPolarisation(runs, ref);

  // Composition hebdo par intensite (pour le toggle du chart composition)
  const compositionByIntensity = buildIntensityCompositionData(runs, ref);

  // 'À retenir' messages contextualises
  const takeaways = buildTakeaways(agg);

  return {
    hasData: true,
    title: "Progression — Volume",
    kpi: [
      {
        key: "distance",
        label: "Distance hebdo moyenne",
        value: agg.current.avgKm,
        formattedValue: formatKm(agg.current.avgKm),
        formattedDelta: formatSignedPercent(agg.deltas.avgKm),
        deltaTone: agg.deltas.avgKm > 0 ? "positive" : agg.deltas.avgKm < 0 ? "warning" : "neutral",
        deltaLabel: `${formatSignedPercent(agg.deltas.avgKm)} vs année précédente`,
        iconKey: "location",
      },
      {
        key: "time",
        label: "Temps hebdo moyen",
        value: agg.current.avgHours,
        formattedValue: formatHM(agg.current.avgHours),
        formattedDelta: formatSignedPercent(agg.deltas.avgHours),
        deltaTone: agg.deltas.avgHours > 0 ? "positive" : agg.deltas.avgHours < 0 ? "warning" : "neutral",
        deltaLabel: `${formatSignedPercent(agg.deltas.avgHours)} vs année précédente`,
        iconKey: "clock",
      },
      {
        key: "elevation",
        label: "Dénivelé hebdo moyen",
        value: agg.current.avgElev,
        formattedValue: formatMeters(agg.current.avgElev),
        formattedDelta: formatSignedPercent(agg.deltas.avgElev),
        deltaTone: agg.deltas.avgElev > 0 ? "positive" : agg.deltas.avgElev < 0 ? "warning" : "neutral",
        deltaLabel: `${formatSignedPercent(agg.deltas.avgElev)} vs année précédente`,
        iconKey: "mountain",
      },
      {
        key: "sorties",
        label: "Sorties / semaine",
        value: agg.current.avgSorties,
        formattedValue: formatSortiesPerWeek(agg.current.avgSorties),
        formattedDelta: formatSignedDelta(agg.deltas.avgSortiesAbs, 1),
        deltaTone: agg.deltas.avgSortiesAbs > 0 ? "positive" : agg.deltas.avgSortiesAbs < 0 ? "warning" : "neutral",
        deltaLabel: `${formatSignedDelta(agg.deltas.avgSortiesAbs, 1)} vs année précédente`,
        iconKey: "calendar",
      },
    ],
    charts: {
      distance: distanceChart,
      time: timeChart,
      elevation: elevationChart,
    },
    composition,
    compositionMeta: COMPOSITION_META,
    compositionByIntensity,
    compositionByIntensityMeta: INTENSITY_COMPOSITION_META,
    polarisation,
    takeaways,
  };
}

function buildTakeaways(agg) {
  const items = [];
  // 1. Distance evolution
  if (agg.deltas.avgKm >= 5) {
    items.push({
      key: "distance",
      iconKey: "trend",
      title: "Progression continue",
      text: `Ta distance hebdomadaire moyenne a augmenté de ${formatSignedPercent(agg.deltas.avgKm)} sur la dernière année.`,
      tone: "positive",
    });
  } else if (agg.deltas.avgKm <= -10) {
    items.push({
      key: "distance",
      iconKey: "trend",
      title: "Volume en baisse",
      text: `Ta distance hebdo a baissé de ${formatSignedPercent(agg.deltas.avgKm)}. Vérifie si c'est volontaire ou si la fatigue s'installe.`,
      tone: "warning",
    });
  }
  // 2. Denivelé
  if (agg.deltas.avgElev >= 10) {
    items.push({
      key: "elevation",
      iconKey: "mountain",
      title: "Plus de dénivelé",
      text: `${formatSignedPercent(agg.deltas.avgElev)} de dénivelé hebdo moyen, signe d'une montée en intensité maîtrisée.`,
      tone: "positive",
    });
  }
  // 3. Sorties
  if (Math.abs(agg.deltas.avgSortiesAbs) >= 0.3) {
    const sign = agg.deltas.avgSortiesAbs > 0 ? "hausse" : "baisse";
    items.push({
      key: "sorties",
      iconKey: "calendar",
      title: `Régularité en ${sign}`,
      text: agg.deltas.avgSortiesAbs > 0
        ? `Tu réalises en moyenne ${formatSignedDelta(agg.deltas.avgSortiesAbs, 1)} sortie de plus par semaine que l'année dernière.`
        : `Tu réalises en moyenne ${Math.abs(agg.deltas.avgSortiesAbs).toFixed(1).replace(".", ",")} sortie de moins par semaine que l'année dernière.`,
      tone: agg.deltas.avgSortiesAbs > 0 ? "positive" : "warning",
    });
  }
  // 4. Tendance globale
  const positiveCount = [agg.deltas.avgKm, agg.deltas.avgHours, agg.deltas.avgElev]
    .filter((d) => d >= 5).length;
  if (positiveCount >= 2) {
    items.push({
      key: "trend",
      iconKey: "star",
      title: "Tendance durable",
      text: "Les courbes 4 semaines montrent une progression stable et constante.",
      tone: "positive",
    });
  }
  return items;
}
