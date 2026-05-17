/**
 * analyticsIntensities.js — helpers spécifiques à l'onglet Intensités (PDF p.10).
 *
 * Conventions zones (5 zones FC alignées Seiler 2010 / Treff 2019) :
 *   Z1 Récupération  (< 65 % FCmax)
 *   Z2 Endurance     (65 – 75 %)
 *   Z3 Tempo         (76 – 87 %)
 *   Z4 Seuil         (88 – 95 %)
 *   Z5 VO₂max        (> 95 %)
 *
 * Le modèle de zones est construit par `buildHeartRateLoadDistribution`
 * (trainingIntelligence.js) — on consomme ses zones, on ré-étiquette pour
 * coller au mockup et on agrège pour 6 sections distinctes.
 */

import { buildConsolidatedIntensityDistributionModel } from "./trainingMetrics.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Couleurs séries fidèles au mockup PDF page 10.
export const ZONE_COLORS = {
  z1: "#3B82F6",
  z2: "#22C55E",
  z3: "#F97316",
  z4: "#EF4444",
  z5: "#475569",
};

// Libellés FR alignés mockup (Z3 "Tempo", Z5 "VO₂max")
export const ZONE_LABELS = {
  z1: "Récupération",
  z2: "Endurance",
  z3: "Tempo",
  z4: "Seuil",
  z5: "VO₂max",
};

function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function activityDate(a) {
  const raw = a?.startDateLocal || a?.startDate || a?.start_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isTrail(a) {
  const t = String(a?.sportType || a?.type || "").toLowerCase();
  return t.includes("trail");
}
function isRoadRun(a) {
  const t = String(a?.sportType || a?.type || "").toLowerCase();
  // "Run" exact ou contient "run" mais PAS "trail"
  return t.includes("run") && !t.includes("trail");
}

/**
 * Compose un libellé court de zone (Z1, Z2…) en mappant zone.key → libellé FR
 * mockup. Garde le label custom de l'utilisateur s'il diffère du défaut.
 */
export function decorateZone(zone) {
  const key = (zone?.key || "").toLowerCase();
  return {
    ...zone,
    color: ZONE_COLORS[key] || "#94a3b8",
    displayLabel: ZONE_LABELS[key] || zone?.shortLabel || zone?.label || "",
  };
}

// ---------------------------------------------------------------------------
// 1. KPI agrégés (temps total / séances qualité / allure soutenue)
// ---------------------------------------------------------------------------

export function buildIntensityKpi(intensityModel = {}, activities = [], range = null) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];

  // Temps total (sec) tracké dans les zones
  const totalSeconds = zones.reduce((s, z) => s + safeNum(z.durationSeconds), 0);

  // Allure soutenue = Z3 + Z4 + Z5
  const sustainedSeconds = zones
    .filter((z) => ["z3", "z4", "z5"].includes((z.key || "").toLowerCase()))
    .reduce((s, z) => s + safeNum(z.durationSeconds), 0);

  // Séances de qualité = activités avec FC moyenne ≥ 88 % FCmax OU FC max ≥ 95 %.
  // On filtre PAR PÉRIODE pour rester cohérent avec totalSeconds / sustainedSeconds
  // (sinon on retombe sur le cumul total user, biaisé).
  const start = range?.start instanceof Date ? range.start : null;
  const end = range?.end instanceof Date ? range.end : null;
  const inRange = (d) => {
    if (!start || !end) return true;
    return d >= start && d <= end;
  };
  const filteredActivities = activities.filter((a) => {
    const d = activityDate(a);
    return d && inRange(d);
  });

  const ref = safeNum(intensityModel?.referenceMaxHeartrate);
  let qualitySessionCount = 0;
  if (ref > 0) {
    for (const a of filteredActivities) {
      const hr = safeNum(a?.averageHeartrate);
      if (hr <= 0) continue;
      const maxHr = safeNum(a?.maxHeartrate);
      const meanRatio = hr / ref;
      const maxRatio = maxHr > 0 ? maxHr / ref : 0;
      if (meanRatio >= 0.88 || maxRatio >= 0.95) {
        qualitySessionCount += 1;
      }
    }
  }

  const totalActivities = filteredActivities.length;

  return {
    totalSeconds,
    totalHours: totalSeconds / 3600,
    sustainedSeconds,
    sustainedHours: sustainedSeconds / 3600,
    sustainedShare: totalSeconds > 0 ? Math.round((sustainedSeconds / totalSeconds) * 100) : 0,
    qualitySessionCount,
    qualitySessionShare: totalActivities > 0
      ? Math.round((qualitySessionCount / totalActivities) * 100)
      : 0,
    totalActivities,
  };
}

// ---------------------------------------------------------------------------
// 2. Évolution hebdomadaire — 5 zones × 6 semaines (durée en heures)
// ---------------------------------------------------------------------------

export function buildIntensityWeeklySeries(activities = [], options = {}) {
  const end = options.endDate instanceof Date ? new Date(options.endDate) : new Date();
  const nWeeks = Math.max(1, Number(options.nWeeks) || 6);
  const settings = options.settings || {};

  const series = [];
  for (let i = nWeeks - 1; i >= 0; i--) {
    const wEnd = new Date(end.getTime() - i * 7 * MS_PER_DAY);
    wEnd.setHours(23, 59, 59, 999);
    const wStart = new Date(wEnd.getTime() - 6 * MS_PER_DAY);
    wStart.setHours(0, 0, 0, 0);

    const model = buildConsolidatedIntensityDistributionModel(activities, {
      startDate: wStart,
      endDate: wEnd,
      settings,
    });
    const zones = Array.isArray(model?.zones) ? model.zones : [];
    const weekData = {
      start: wStart,
      end: wEnd,
      label: formatWeekRange(wStart, wEnd),
      z1: 0, z2: 0, z3: 0, z4: 0, z5: 0,
      isCurrent: i === 0,
    };
    for (const z of zones) {
      const k = (z.key || "").toLowerCase();
      if (k in weekData) weekData[k] = Math.round(safeNum(z.durationSeconds) / 360) / 10; // heures arrondies 0.1
    }
    series.push(weekData);
  }
  return series;
}

function formatWeekRange(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return "";
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString("fr-FR", { month: "short" })}`;
  }
  return `${start.getDate()} ${start.toLocaleDateString("fr-FR", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("fr-FR", { month: "short" })}`;
}

// ---------------------------------------------------------------------------
// 3. Route vs Trail
// ---------------------------------------------------------------------------

/**
 * Construit la comparaison Route vs Trail.
 *
 * Retourne `null` si l'un des deux types est vide (carte cachée par UI).
 */
export function buildIntensityRouteVsTrail(activities = [], options = {}) {
  const settings = options.settings || {};
  const start = options.startDate;
  const end = options.endDate;

  const roadActs = activities.filter(isRoadRun);
  const trailActs = activities.filter(isTrail);

  if (!roadActs.length || !trailActs.length) {
    return null;
  }

  const roadModel = buildConsolidatedIntensityDistributionModel(roadActs, {
    startDate: start, endDate: end, settings,
  });
  const trailModel = buildConsolidatedIntensityDistributionModel(trailActs, {
    startDate: start, endDate: end, settings,
  });

  return {
    road: summarizeDominantZone(roadModel),
    trail: summarizeDominantZone(trailModel),
  };
}

function summarizeDominantZone(model) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  if (!zones.length) return null;
  // Zone dominante = celle avec la plus grande durationShare
  const sorted = [...zones].sort((a, b) => safeNum(b.durationShare) - safeNum(a.durationShare));
  const top = sorted[0];
  if (!top || safeNum(top.durationShare) === 0) return null;
  return {
    zoneKey: (top.key || "").toLowerCase(),
    zoneLabel: ZONE_LABELS[(top.key || "").toLowerCase()] || top.shortLabel || "",
    sharePercent: Math.round(safeNum(top.durationShare)),
    activitiesCount: zones.length > 0
      ? Math.round(safeNum(model?.trackedDurationMinutes || 0))
      : 0,
  };
}

// ---------------------------------------------------------------------------
// 4. Comparaison rolling 30 j (current vs previous 30 days)
// ---------------------------------------------------------------------------

export function buildIntensityRolling30Comparison(activities = [], endDate = new Date(), settings = {}) {
  const e = endDate instanceof Date ? new Date(endDate) : new Date();
  e.setHours(23, 59, 59, 999);
  const startCurrent = new Date(e.getTime() - 29 * MS_PER_DAY);
  startCurrent.setHours(0, 0, 0, 0);
  const endPrevious = new Date(startCurrent.getTime() - 1);
  const startPrevious = new Date(endPrevious.getTime() - 29 * MS_PER_DAY);
  startPrevious.setHours(0, 0, 0, 0);

  function snapshot(start, end) {
    const filtered = activities.filter((a) => {
      const d = activityDate(a);
      return d && d >= start && d <= end;
    });
    const model = buildConsolidatedIntensityDistributionModel(filtered, {
      startDate: start, endDate: end, settings,
    });
    const kpi = buildIntensityKpi(model, filtered, { start, end });
    return { model, kpi, activities: filtered };
  }

  const current = snapshot(startCurrent, e);
  const previous = snapshot(startPrevious, endPrevious);

  function pct(c, p) {
    return p > 0 ? Math.round(((c - p) / p) * 100) : null;
  }

  return {
    current,
    previous,
    deltaPct: {
      totalHours: pct(current.kpi.totalHours, previous.kpi.totalHours),
      sustainedHours: pct(current.kpi.sustainedHours, previous.kpi.sustainedHours),
      qualitySessionCount: pct(current.kpi.qualitySessionCount, previous.kpi.qualitySessionCount),
    },
    delta: {
      totalHours: Math.round((current.kpi.totalHours - previous.kpi.totalHours) * 10) / 10,
      sustainedHours: Math.round((current.kpi.sustainedHours - previous.kpi.sustainedHours) * 10) / 10,
      qualitySessionCount: current.kpi.qualitySessionCount - previous.kpi.qualitySessionCount,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Classifications scientifiques (Lecture intensité + Footer + bullets)
// ---------------------------------------------------------------------------

/** Calcule la part Z1+Z2 (foncier) en % du temps tracké. */
export function shareZ1Z2(model) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  return zones
    .filter((z) => ["z1", "z2"].includes((z.key || "").toLowerCase()))
    .reduce((s, z) => s + safeNum(z.durationShare), 0);
}

/** Part Z3+Z4+Z5. */
export function shareZ3Z5(model) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  return zones
    .filter((z) => ["z3", "z4", "z5"].includes((z.key || "").toLowerCase()))
    .reduce((s, z) => s + safeNum(z.durationShare), 0);
}

/** Part Z4+Z5 (HIT). */
export function shareZ4Z5(model) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  return zones
    .filter((z) => ["z4", "z5"].includes((z.key || "").toLowerCase()))
    .reduce((s, z) => s + safeNum(z.durationShare), 0);
}

/** Nb de zones utilisées ≥ 2 % du temps. */
export function activeZonesCount(model) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  return zones.filter((z) => safeNum(z.durationShare) >= 2).length;
}

/**
 * Classification "Endurance dominante" (Seiler 2010 + Stöggl & Sperlich 2014).
 * Élite endurance = 75-85 % LIT. Amateur structuré ≥ 70 % LIT.
 */
export function classifyEndurance(z1z2) {
  if (z1z2 >= 75) return { tone: 1, tag: "Point fort", color: "endurance" };
  if (z1z2 >= 60) return { tone: 2, tag: "Bon", color: "endurance" };
  return { tone: 4, tag: "Perfectible", color: "endurance" };
}

/**
 * Classification "Intensité modérée" (Z3-Z5).
 * Seiler polarized : HIT 10-25 %, total Z3-Z5 = 15-30 %. > 35 % = surcharge.
 */
export function classifyModerate(z3z5) {
  if (z3z5 < 20)  return { tone: 4, tag: "Trop bas", color: "moderate" };
  if (z3z5 > 35)  return { tone: 4, tag: "Trop élevé", color: "moderate" };
  return                { tone: 2, tag: "Équilibré", color: "moderate" };
}

/**
 * Classification "Variété" (nb de zones ≥ 2 %).
 * Treff 2019 Polarization Index requiert présence sur l'ensemble du spectre.
 */
export function classifyVariety(nbZones) {
  if (nbZones >= 5) return { tone: 1, tag: "Complet", color: "variety" };
  if (nbZones >= 4) return { tone: 2, tag: "Diversifié", color: "variety" };
  return                  { tone: 3, tag: "À élargir", color: "variety" };
}

/**
 * Texte footer "À retenir" en fonction du profil global.
 */
export function buildFooterTakeaway(model) {
  const z1z2 = shareZ1Z2(model);
  const z3z5 = shareZ3Z5(model);
  if (z1z2 >= 75) {
    return "Tu construis une base solide en endurance. Continue à intégrer des séances qualitatives pour élever ton niveau.";
  }
  if (z3z5 > 35) {
    return "Charge qualitative élevée. Pense à équilibrer avec plus de Z1-Z2 pour favoriser la récupération.";
  }
  if (z1z2 >= 60 && z3z5 < 20) {
    return "Foncier en construction. Ajoute progressivement des séances qualitatives pour stimuler la progression.";
  }
  return "Profil mixte. Continue à varier les stimuli pour optimiser la progression.";
}
