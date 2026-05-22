/**
 * performanceFcPerformanceModel.js — Modele metier pour l'onglet
 * `Performance > FC de performance` (page 15 du plan, mockup p.15).
 *
 * REFACTOR 2026-05-22 : alignement strict avec le mockup apres comparaison
 * initiale manquee. Changements majeurs :
 *   - 4 KPIs au lieu de 3 (FC repos devient KPI principal, plus discret)
 *   - Delta pills (vs periode precedente) sur chaque KPI
 *   - FC dans efforts cles categorise PAR TYPE D'EFFORT (et plus par
 *     distance race) : Montee longue / Seuil tempo / Intervalles longs /
 *     Intervalles courts / Competition
 *   - Indicateur affiche : % FC seuil (et non % FC max)
 *
 * Sources scientifiques :
 *   - FC seuil (Karvonen, Daniels T) : 88-92 % FC max ou FC moyenne sur efforts T pace
 *   - FC max (Tanaka 2001 : 208 - 0.7*age) ou setting utilisateur ou max observe
 *   - Derive cardiaque (Pa:Hr decoupling, Allen & Coggan 2010)
 *   - Categorisation effort : Daniels 2014 zones d'entrainement + duree
 */

import { isRunLikeActivity } from "./activityInsights.js";
import { buildDanielsTrainingPaces } from "./runningPerformance.js";
import { resolveMasterVdot } from "./vdotConsolidation.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 90;
const STABLE_SESSION_MIN_DURATION_SEC = 60 * 60; // 60 min mini pour la derive stable

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Helpers d'acces robustes : prefere les champs derives (__movingSeconds...)
 * s'ils existent (cas tests/buildActivityItems), sinon fallback sur les champs
 * bruts API (movingTime, totalElevationGain...). Resout le bug ou le modele
 * recevait des activites brutes sans champs derives -> empty states partout.
 */
function getMovingSeconds(a) {
  return toFiniteNumber(a?.__movingSeconds ?? a?.movingTime);
}
function getDistanceKm(a) {
  if (Number.isFinite(Number(a?.__distanceKm))) return Number(a.__distanceKm);
  const meters = toFiniteNumber(a?.distance);
  return meters > 0 ? meters / 1000 : 0;
}
function getElevation(a) {
  return toFiniteNumber(a?.__elevationGain ?? a?.totalElevationGain ?? a?.elevationGain);
}
function getPaceSeconds(a) {
  if (Number.isFinite(Number(a?.__paceSecondsPerKm)) && Number(a.__paceSecondsPerKm) > 0) {
    return Number(a.__paceSecondsPerKm);
  }
  const dur = getMovingSeconds(a);
  const km = getDistanceKm(a);
  return dur > 0 && km > 0 ? dur / km : 0;
}
function getActivityDate(a) {
  return safeDate(a?.__date) || safeDate(a?.startDateLocal) || safeDate(a?.startDate);
}

function formatBpm(value) {
  const n = Math.round(toFiniteNumber(value));
  return n > 0 ? `${n}` : "—";
}

function formatPercent(value, decimals = 1) {
  const n = toFiniteNumber(value);
  return `${n.toFixed(decimals).replace(".", ",")} %`;
}

function formatSignedBpm(value) {
  const n = Math.round(toFiniteNumber(value));
  if (n === 0) return "0 bpm";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n)} bpm`;
}

function formatSignedPercent(value) {
  const n = toFiniteNumber(value);
  if (Math.abs(n) < 0.05) return "0 %";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(1).replace(".", ",")} %`;
}

function filterByDateRange(activities, startDate, endDate) {
  return (Array.isArray(activities) ? activities : []).filter((a) => {
    if (!isRunLikeActivity(a)) return false;
    const d = getActivityDate(a);
    return d && (!startDate || d >= startDate) && (!endDate || d <= endDate);
  });
}

/**
 * Categorise une activite dans UN type d'effort principal.
 * Critères (Daniels 2014 + duree + denivele) :
 *   - Montee longue : durée >= 45 min + dénivelé/km >= 30 m
 *   - Seuil (tempo) : 20-40 min + pace ≈ T pace ±10 %
 *   - Intervalles longs : 30-60 min + pace ≈ I pace ±15 % (proxy sans laps)
 *   - Intervalles courts : 20-45 min + pace ≈ R pace ±15 %
 *   - Competition : activite avec prCount > 0 ou achievementCount >= 3
 *   - Sinon : ignoree pour cette analyse
 */
function categorizeEffortType(activity, { tPaceSeconds, iPaceSeconds, rPaceSeconds }) {
  const durMin = getMovingSeconds(activity) / 60;
  const distKm = getDistanceKm(activity);
  const elev = getElevation(activity);
  const pace = getPaceSeconds(activity);
  const prCount = toFiniteNumber(activity?.prCount);
  const achievementCount = toFiniteNumber(activity?.achievementCount);

  if (durMin <= 0 || distKm <= 0) return null;

  // Ordre : du plus specifique au plus general.
  // Sans analyse de laps, on classifie par DURATION + PACE moyenne (proxy).

  // 1. Competition (record perso ou achievements multiples)
  if ((prCount > 0 || achievementCount >= 3) && durMin >= 15) {
    return "competition";
  }

  // 2. Montee longue : duree >= 30 min + denivele >= 25 m/km
  if (durMin >= 30 && distKm > 0 && elev / distKm >= 25) {
    return "montee_longue";
  }

  // 3. Seuil (tempo) : pace MOYENNE proche de T (±15 %) + duree 20-60 min
  //    Daniels : tempo run sur 20-40 min a T pace, +/- WU/CD -> pace moy ~ T pace.
  //    Range : T pace * [0.92, 1.10].
  if (tPaceSeconds > 0 && durMin >= 20 && durMin <= 60
    && pace >= tPaceSeconds * 0.92 && pace <= tPaceSeconds * 1.10) {
    return "seuil_tempo";
  }

  // 4. Intervalles longs : pace I pace ±15 % + duree 30-90 min
  //    VMA longue / 5x1000m : warm-up + intervals + cool-down -> pace moy entre I et T.
  if (iPaceSeconds > 0 && durMin >= 30 && durMin <= 90
    && pace >= iPaceSeconds * 0.95 && pace <= iPaceSeconds * 1.20) {
    return "intervalles_longs";
  }

  // 5. Intervalles courts : pace plus rapide que T mais session courte avec
  //    beaucoup de recuperation (8x200, 10x400).
  //    Pace moy entre I et T*1.20 + duree 20-50 min.
  if (tPaceSeconds > 0 && durMin >= 20 && durMin <= 50
    && pace > tPaceSeconds * 1.10 && pace <= tPaceSeconds * 1.30) {
    return "intervalles_courts";
  }

  return null;
}

const EFFORT_TYPE_META = {
  montee_longue: {
    label: "Montée longue",
    durationRange: "45-90 min",
    color: "#22c55e",
    iconKey: "mountain",
  },
  seuil_tempo: {
    label: "Seuil (tempo)",
    durationRange: "20-40 min",
    color: "#1268f3",
    iconKey: "tempo",
  },
  intervalles_longs: {
    label: "Intervalles longs",
    durationRange: "3-8 min",
    color: "#fb923c",
    iconKey: "bolt",
  },
  intervalles_courts: {
    label: "Intervalles courts",
    durationRange: "30 s - 90 s",
    color: "#7c3aed",
    iconKey: "flash",
  },
  competition: {
    label: "Compétition",
    durationRange: "> 40 min",
    color: "#ef4444",
    iconKey: "trophy",
  },
};

/**
 * Calcule FC moyenne par type d'effort + % FC seuil.
 */
function buildEffortsByType({ runs, paces, fcSeuil }) {
  const tPace = (paces || []).find((p) => p.key === "T");
  const iPace = (paces || []).find((p) => p.key === "I");
  const rPace = (paces || []).find((p) => p.key === "R");
  const params = {
    tPaceSeconds: toFiniteNumber(tPace?.paceSecondsPerKm),
    iPaceSeconds: toFiniteNumber(iPace?.paceSecondsPerKm),
    rPaceSeconds: toFiniteNumber(rPace?.paceSecondsPerKm),
  };

  // Regroupe les activites par categorie
  const grouped = {};
  (Array.isArray(runs) ? runs : []).forEach((a) => {
    if (toFiniteNumber(a?.averageHeartrate) <= 0) return;
    const cat = categorizeEffortType(a, params);
    if (!cat) return;
    if (!grouped[cat]) grouped[cat] = { sumHr: 0, weight: 0, count: 0 };
    const dur = getMovingSeconds(a);
    grouped[cat].sumHr += toFiniteNumber(a.averageHeartrate) * dur;
    grouped[cat].weight += dur;
    grouped[cat].count += 1;
  });

  // Construit les rows dans l'ordre du mockup
  const ORDER = ["montee_longue", "seuil_tempo", "intervalles_longs", "intervalles_courts", "competition"];
  return ORDER.map((cat) => {
    const meta = EFFORT_TYPE_META[cat];
    const stats = grouped[cat];
    const avgHr = stats && stats.weight > 0 ? Math.round(stats.sumHr / stats.weight) : null;
    const pctFcSeuil = avgHr != null && fcSeuil > 0 ? Math.round((avgHr / fcSeuil) * 100) : null;
    return {
      key: cat,
      label: meta.label,
      durationRange: meta.durationRange,
      color: meta.color,
      iconKey: meta.iconKey,
      averageHr: avgHr,
      pctFcSeuil,
      sampleSize: stats?.count || 0,
    };
  });
}

/**
 * Estimation FC seuil (mesuree sur T sessions, sinon fallback 88 % FC max).
 */
function estimateFcSeuilFromRuns({ runs, tPaceSeconds, fcMax }) {
  if (!Array.isArray(runs) || runs.length === 0) return { value: 0, source: "unavailable" };
  const tToleranceMin = tPaceSeconds * 0.9;
  const tToleranceMax = tPaceSeconds * 1.10;
  const tSessions = runs.filter((a) => {
    const pace = getPaceSeconds(a);
    const hr = toFiniteNumber(a?.averageHeartrate);
    const dur = getMovingSeconds(a);
    return tPaceSeconds > 0 && pace >= tToleranceMin && pace <= tToleranceMax
      && hr > 0 && dur >= 600;
  });
  if (tSessions.length >= 2) {
    const totalWeight = tSessions.reduce((s, a) => s + getMovingSeconds(a), 0);
    if (totalWeight > 0) {
      const weightedHr = tSessions.reduce(
        (s, a) => s + toFiniteNumber(a.averageHeartrate) * getMovingSeconds(a),
        0,
      );
      return { value: Math.round(weightedHr / totalWeight), source: "measured", sampleSize: tSessions.length };
    }
  }
  if (fcMax > 0) return { value: Math.round(fcMax * 0.88), source: "estimated_fc_max" };
  return { value: 0, source: "unavailable" };
}

function estimateFcMaxFromRuns({ runs, settingsHeartRateMax }) {
  if (toFiniteNumber(settingsHeartRateMax) > 0) {
    return { value: Math.round(settingsHeartRateMax), source: "settings" };
  }
  const observed = (Array.isArray(runs) ? runs : [])
    .map((a) => toFiniteNumber(a?.maxHeartrate))
    .filter((n) => n > 0);
  if (observed.length === 0) return { value: 0, source: "unavailable" };
  return { value: Math.max(...observed), source: "observed" };
}

function decouplingMean(runs) {
  const longRuns = (Array.isArray(runs) ? runs : []).filter((a) => {
    const dur = getMovingSeconds(a);
    const dec = a?.cardiacDecouplingPercent;
    // Filtre les valeurs extremes (> 30 % en abs) qui sont probablement
    // des bugs de calcul (sortie tres irreguliere, montagne, etc.).
    return dur >= STABLE_SESSION_MIN_DURATION_SEC
      && dec != null && Number.isFinite(Number(dec))
      && Math.abs(Number(dec)) <= 30;
  });
  if (longRuns.length === 0) return { value: null, sampleSize: 0 };
  const sum = longRuns.reduce((s, a) => s + toFiniteNumber(a.cardiacDecouplingPercent), 0);
  return { value: sum / longRuns.length, sampleSize: longRuns.length };
}

function buildFcSeuilTrendWeekly({ runs, tPaceSeconds, referenceDate }) {
  const ref = safeDate(referenceDate) || new Date();
  const cutoff = new Date(ref.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY);
  const tToleranceMin = tPaceSeconds * 0.9;
  const tToleranceMax = tPaceSeconds * 1.10;
  const tSessions = (Array.isArray(runs) ? runs : []).filter((a) => {
    const d = getActivityDate(a);
    const pace = getPaceSeconds(a);
    const hr = toFiniteNumber(a?.averageHeartrate);
    return d && d >= cutoff && d <= ref && tPaceSeconds > 0
      && pace >= tToleranceMin && pace <= tToleranceMax && hr > 0;
  });
  const buckets = new Map();
  tSessions.forEach((a) => {
    const d = getActivityDate(a);
    const weekKey = `${d.getFullYear()}-W${Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * MS_PER_DAY))}`;
    const dur = getMovingSeconds(a);
    const hr = toFiniteNumber(a.averageHeartrate);
    const prev = buckets.get(weekKey) || { weight: 0, sumHr: 0, date: d };
    buckets.set(weekKey, {
      weight: prev.weight + dur,
      sumHr: prev.sumHr + hr * dur,
      date: d > prev.date ? d : prev.date,
    });
  });
  return Array.from(buckets.values())
    .filter((b) => b.weight > 0)
    .map((b) => ({ label: b.date.toISOString().slice(0, 10), value: Math.round(b.sumHr / b.weight) }))
    .sort((l, r) => new Date(l.label) - new Date(r.label));
}

function pickStableSampleSession(runs) {
  const candidates = (Array.isArray(runs) ? runs : []).filter((a) => {
    const dur = getMovingSeconds(a);
    const dec = a?.cardiacDecouplingPercent;
    return dur >= STABLE_SESSION_MIN_DURATION_SEC
      && dec != null && Number.isFinite(Number(dec))
      && Math.abs(Number(dec)) <= 30; // filtre extremes
  });
  if (candidates.length === 0) return null;
  candidates.sort((l, r) => {
    const ld = getActivityDate(l) || new Date(0);
    const rd = getActivityDate(r) || new Date(0);
    return rd - ld;
  });
  const a = candidates[0];
  const d = getActivityDate(a);
  return {
    activityId: a.stravaActivityId || a.id,
    name: a.name || "Sortie longue",
    date: d ? d.toISOString().slice(0, 10) : null,
    decouplingPercent: toFiniteNumber(a.cardiacDecouplingPercent),
    durationSeconds: getMovingSeconds(a),
    averageHr: toFiniteNumber(a.averageHeartrate) || null,
  };
}

/**
 * Hint tonal pour les KPIs (mockup p.15 : Stabilisée/Bonne/Excellente/À surveiller).
 */
function buildHint({ key, value, deltaValue }) {
  if (value == null || value === 0) return { label: "—", tone: "neutral" };
  switch (key) {
    case "fcSeuil":
    case "fcMax":
      // Stabilité = delta abs < 2 bpm
      if (Math.abs(toFiniteNumber(deltaValue)) <= 2) return { label: "Stabilisée", tone: "positive" };
      return { label: "Variable", tone: "warning" };
    case "decoupling":
      if (value < 5) return { label: "Bonne", tone: "positive" };
      if (value < 8) return { label: "Correcte", tone: "neutral" };
      return { label: "À surveiller", tone: "warning" };
    case "fcRepos":
      if (value < 50) return { label: "Excellente", tone: "positive" };
      if (value < 60) return { label: "Bonne", tone: "positive" };
      if (value < 70) return { label: "Correcte", tone: "neutral" };
      return { label: "À surveiller", tone: "warning" };
    default:
      return { label: "—", tone: "neutral" };
  }
}

/**
 * Lecture coach avec checks "Pour progresser" (mockup p.15).
 */
function buildReadingEffortV2({ fcSeuil, fcMax, decouplingValue, effortsByType }) {
  // Resume tone-aware
  let summary = "Données insuffisantes pour qualifier ta réponse cardiaque.";
  if (fcSeuil > 0 && fcMax > 0 && decouplingValue != null) {
    const ratio = Math.round((fcSeuil / fcMax) * 100);
    const stable = decouplingValue < 5;
    if (stable) {
      summary = `Ta fréquence cardiaque au seuil est stable (${ratio} % FC max) et ta dérive reste faible, signe d'une très bonne endurance et d'un bon contrôle maîtrisé de la durée.`;
    } else if (decouplingValue < 8) {
      summary = `Ta fréquence cardiaque au seuil est lisible (${ratio} % FC max) avec une dérive modérée. Il reste de la marge sur l'endurance fondamentale.`;
    } else {
      summary = `Ta dérive cardiaque (${formatPercent(decouplingValue)}) suggère que l'effort excède la capacité aérobie pour la durée. Allonge progressivement le volume facile.`;
    }
  } else if (fcSeuil > 0 && fcMax > 0) {
    const ratio = Math.round((fcSeuil / fcMax) * 100);
    summary = `FC seuil ≈ ${ratio} % de ta FC max (${fcSeuil} / ${fcMax} bpm). Pas encore assez de sorties longues pour mesurer la dérive cardiaque.`;
  }

  // Checks "Pour progresser" contextualises
  const checks = [];
  if (decouplingValue != null && decouplingValue >= 5) {
    checks.push("Allonge la durée de tes tempo runs.");
  } else {
    checks.push("Allonge la durée de tes tempo runs pour ancrer le seuil.");
  }
  const hasMontee = effortsByType?.find((e) => e.key === "montee_longue" && e.averageHr != null);
  if (!hasMontee) {
    checks.push("Intègre des blocs au seuil en terrain vallonné.");
  } else {
    checks.push("Continue tes blocs au seuil en terrain vallonné.");
  }
  checks.push("Surveille la dérive lors des sorties longues en chaleur.");

  return { summary, checks };
}

/**
 * Modele principal (refactor mockup p.15).
 */
export function buildFcPerformanceModel({
  scopeActivities = [],
  vdotProfile = null,
  vdotHistory = null,
  intensityModel = null,
  settings = {},
  referenceDate = null,
} = {}) {
  const reference = safeDate(referenceDate) || new Date();
  const cutoffCurrent = new Date(reference.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY);
  const cutoffPrevious = new Date(cutoffCurrent.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY);

  const currentRuns = filterByDateRange(scopeActivities, cutoffCurrent, reference);
  const previousRuns = filterByDateRange(scopeActivities, cutoffPrevious, cutoffCurrent);

  if (currentRuns.length === 0) {
    return {
      hasData: false,
      title: "FC de performance",
      emptyReason: "Pas encore assez de sorties récentes avec FC pour analyser ta réponse cardiaque.",
    };
  }

  // VDOT consolide (regle 70/30) + Daniels paces pour T pace seuil
  const resolved = resolveMasterVdot({ vdotProfile, vdotHistory });
  const masterVdot = resolved.value > 0 ? resolved.value : toFiniteNumber(vdotProfile?.vdot);
  const paces = masterVdot > 0 ? buildDanielsTrainingPaces(masterVdot) : [];
  const tPaceSeconds = toFiniteNumber((paces.find((p) => p.key === "T") || {}).paceSecondsPerKm);

  // === Calculs periode COURANTE ===
  const fcMaxCurrent = estimateFcMaxFromRuns({ runs: currentRuns, settingsHeartRateMax: settings.heartRateMax });
  const fcSeuilCurrent = estimateFcSeuilFromRuns({ runs: currentRuns, tPaceSeconds, fcMax: fcMaxCurrent.value });
  const decouplingCurrent = decouplingMean(currentRuns);
  const fcReposCurrent = toFiniteNumber(settings.restingHeartrate) > 0
    ? { value: Math.round(settings.restingHeartrate), source: "settings" }
    : { value: 0, source: "unavailable" };

  // === Calculs periode PRECEDENTE (pour deltas) ===
  const fcMaxPrev = estimateFcMaxFromRuns({ runs: previousRuns, settingsHeartRateMax: settings.heartRateMax });
  const fcSeuilPrev = estimateFcSeuilFromRuns({ runs: previousRuns, tPaceSeconds, fcMax: fcMaxPrev.value });
  const decouplingPrev = decouplingMean(previousRuns);

  // === Deltas ===
  const deltaFcSeuil = fcSeuilCurrent.value > 0 && fcSeuilPrev.value > 0
    ? fcSeuilCurrent.value - fcSeuilPrev.value
    : 0;
  const deltaFcMax = fcMaxCurrent.value > 0 && fcMaxPrev.value > 0
    ? fcMaxCurrent.value - fcMaxPrev.value
    : 0;
  const deltaDecoupling = decouplingCurrent.value != null && decouplingPrev.value != null
    ? decouplingCurrent.value - decouplingPrev.value
    : null;

  // === Hints tonaux ===
  const hintSeuil = buildHint({ key: "fcSeuil", value: fcSeuilCurrent.value, deltaValue: deltaFcSeuil, fcMax: fcMaxCurrent.value });
  const hintMax = buildHint({ key: "fcMax", value: fcMaxCurrent.value, deltaValue: deltaFcMax, fcMax: fcMaxCurrent.value });
  const hintDec = buildHint({ key: "decoupling", value: decouplingCurrent.value });
  const hintRepos = buildHint({ key: "fcRepos", value: fcReposCurrent.value });

  // === Mini trends 90j ===
  const fcSeuilTrend = buildFcSeuilTrendWeekly({ runs: currentRuns, tPaceSeconds, referenceDate: reference });
  const decouplingTrend = currentRuns
    .filter((a) => a?.cardiacDecouplingPercent != null
      && Math.abs(Number(a.cardiacDecouplingPercent)) <= 30)
    .map((a) => {
      const d = getActivityDate(a);
      return d ? { label: d.toISOString().slice(0, 10), value: toFiniteNumber(a.cardiacDecouplingPercent) } : null;
    })
    .filter(Boolean)
    .sort((l, r) => new Date(l.label) - new Date(r.label));

  // === FC dans efforts cles par TYPE D'EFFORT (mockup p.15) ===
  const effortsByType = buildEffortsByType({ runs: currentRuns, paces, fcSeuil: fcSeuilCurrent.value });

  // === Sortie longue stable exemple ===
  const stableSample = pickStableSampleSession(currentRuns);

  // === Lecture coach enrichie ===
  const reading = buildReadingEffortV2({
    fcSeuil: fcSeuilCurrent.value,
    fcMax: fcMaxCurrent.value,
    decouplingValue: decouplingCurrent.value,
    effortsByType,
  });

  // Synthese intensite legere
  const intensitySynthesis = (() => {
    const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];
    if (!zones.length) return { hasData: false };
    return { hasData: true, zones, totalDurationLabel: intensityModel?.totalDurationLabel || "" };
  })();

  return {
    hasData: true,
    title: "FC de performance",
    subtitle: "Comment ton cœur réagit dans les efforts clés.",
    kpi: {
      fcSeuil: {
        value: fcSeuilCurrent.value,
        formattedValue: formatBpm(fcSeuilCurrent.value),
        unit: "bpm",
        hint: hintSeuil.label,
        tone: hintSeuil.tone,
        delta: deltaFcSeuil,
        deltaLabel: deltaFcSeuil !== 0 ? `${formatSignedBpm(deltaFcSeuil)} vs 90 j préc.` : "",
        series: fcSeuilTrend,
        sourceHint: fcSeuilCurrent.source === "measured"
          ? `Mesurée sur ${fcSeuilCurrent.sampleSize} sorties au seuil`
          : fcSeuilCurrent.source === "estimated_fc_max"
            ? "Estimée 88 % FC max"
            : "Indisponible",
      },
      fcMax: {
        value: fcMaxCurrent.value,
        formattedValue: formatBpm(fcMaxCurrent.value),
        unit: "bpm",
        hint: hintMax.label,
        tone: hintMax.tone,
        delta: deltaFcMax,
        deltaLabel: deltaFcMax !== 0 ? `${formatSignedBpm(deltaFcMax)} vs 90 j préc.` : "",
        series: [],
        sourceHint: fcMaxCurrent.source === "settings" ? "Saisie réglages" : "Max observé 90 j",
      },
      decoupling: {
        value: decouplingCurrent.value,
        formattedValue: decouplingCurrent.value != null ? formatPercent(decouplingCurrent.value) : "—",
        unit: "",
        hint: hintDec.label,
        tone: hintDec.tone,
        delta: deltaDecoupling,
        deltaLabel: deltaDecoupling != null ? `${formatSignedPercent(deltaDecoupling)} vs 90 j préc.` : "",
        series: decouplingTrend,
        sampleSize: decouplingCurrent.sampleSize,
      },
      fcRepos: {
        value: fcReposCurrent.value,
        formattedValue: formatBpm(fcReposCurrent.value),
        unit: "bpm",
        hint: hintRepos.label,
        tone: hintRepos.tone,
        delta: 0,
        deltaLabel: "",
        series: [],
        sourceHint: fcReposCurrent.source === "settings" ? "Saisie réglages" : "Indisponible",
      },
    },
    effortsByType,
    fcSeuilEvolution: fcSeuilTrend,
    stableSample,
    intensitySynthesis,
    reading,
    warning: "Ces valeurs sont des estimations basées sur tes sorties récentes. Une mesure laboratoire reste la référence.",
  };
}
