/**
 * performanceFcPerformanceModel.js — Modele metier pour l'onglet
 * `Performance > FC de performance` (page 15 du plan Lot Performance V5).
 *
 * Objectif (spec section 10) : analyser la capacite a gerer l'effort cardiaque
 * sur les efforts cles. PAS de doublon avec :
 *   - Analyse > Sommeil & recuperation (VFC, sommeil, energie, stress)
 *   - Analyse > Intensites (distribution complete zones sur periode)
 *
 * Sources scientifiques :
 *   - FC seuil (Karvonen, Daniels T) : 88-92 % FC max ou FC moyenne sur efforts T pace
 *   - FC max (Tanaka 2001 : 208 - 0.7*age) ou setting utilisateur ou max observe
 *   - Derive cardiaque (Pa:Hr decoupling, Allen & Coggan 2010) : ratio FC/allure 1ere vs 2eme moitie
 *   - FC dans efforts cles : FC moyenne sur best efforts 5k/10k/semi/marathon
 */

import {
  buildBestEffortRecords,
  isRunLikeActivity,
} from "./activityInsights.js";
import { buildDanielsTrainingPaces } from "./runningPerformance.js";
import { resolveMasterVdot } from "./vdotConsolidation.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 90;
const STABLE_SESSION_MIN_DURATION_SEC = 60 * 60; // 60 min mini pour la derive stable
const KEY_EFFORT_LABELS = {
  "5k": "5 km",
  "10k": "10 km",
  halfMarathon: "Semi-marathon",
  marathon: "Marathon",
};

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBpm(value) {
  const n = Math.round(toFiniteNumber(value));
  return n > 0 ? `${n}` : "—";
}

function formatPercent(value, decimals = 1) {
  const n = toFiniteNumber(value);
  return `${n.toFixed(decimals).replace(".", ",")} %`;
}

function filterRecentRuns(activities, referenceDate) {
  const ref = safeDate(referenceDate) || new Date();
  const cutoff = new Date(ref.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY);
  return (Array.isArray(activities) ? activities : [])
    .filter((a) => isRunLikeActivity(a))
    .filter((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate || a?.__date);
      return d && d >= cutoff && d <= ref;
    });
}

/**
 * FC seuil estimee : FC moyenne sur les sessions au T pace Daniels.
 * Si pas assez de sessions T, fallback sur 88 % de la FC max.
 */
function estimateFcSeuil({ runs, tPaceSeconds, fcMax }) {
  if (!Array.isArray(runs) || runs.length === 0) return { value: 0, source: "unavailable" };
  // Tolerance 10 % autour du T pace pour capter les sessions "tempo".
  const tToleranceMin = tPaceSeconds * 0.9;
  const tToleranceMax = tPaceSeconds * 1.10;
  const tSessions = runs.filter((a) => {
    const pace = toFiniteNumber(a?.__paceSecondsPerKm);
    const hr = toFiniteNumber(a?.averageHeartrate);
    return pace >= tToleranceMin && pace <= tToleranceMax && hr > 0;
  });
  if (tSessions.length >= 2) {
    const totalWeight = tSessions.reduce((s, a) => s + toFiniteNumber(a?.__movingSeconds), 0);
    if (totalWeight > 0) {
      const weightedHr = tSessions.reduce(
        (s, a) => s + toFiniteNumber(a.averageHeartrate) * toFiniteNumber(a.__movingSeconds),
        0,
      );
      return {
        value: Math.round(weightedHr / totalWeight),
        source: "measured",
        sampleSize: tSessions.length,
      };
    }
  }
  // Fallback : 88 % FC max (proxy seuil Daniels T)
  if (fcMax > 0) {
    return { value: Math.round(fcMax * 0.88), source: "estimated_fc_max" };
  }
  return { value: 0, source: "unavailable" };
}

/**
 * FC max : settings.heartRateMax si renseignee, sinon max observee sur 90j.
 */
function estimateFcMax({ runs, settingsHeartRateMax }) {
  if (toFiniteNumber(settingsHeartRateMax) > 0) {
    return { value: Math.round(settingsHeartRateMax), source: "settings" };
  }
  const observed = (Array.isArray(runs) ? runs : [])
    .map((a) => toFiniteNumber(a?.maxHeartrate))
    .filter((n) => n > 0);
  if (observed.length === 0) return { value: 0, source: "unavailable" };
  return { value: Math.max(...observed), source: "observed" };
}

/**
 * Derive cardiaque moyenne sur sorties longues > 60 min.
 */
function buildDecouplingStats(runs) {
  const longRuns = (Array.isArray(runs) ? runs : []).filter((a) => {
    const dur = toFiniteNumber(a?.__movingSeconds);
    const dec = a?.cardiacDecouplingPercent;
    return dur >= STABLE_SESSION_MIN_DURATION_SEC && dec != null && Number.isFinite(Number(dec));
  });
  if (longRuns.length === 0) return { value: null, sampleSize: 0 };
  const sum = longRuns.reduce((s, a) => s + toFiniteNumber(a.cardiacDecouplingPercent), 0);
  return { value: sum / longRuns.length, sampleSize: longRuns.length };
}

/**
 * Mini trend de la FC seuil sur la fenetre 90j.
 * Regroupe par buckets (semaines) puis calcule la FC moyenne ponderee.
 */
function buildFcSeuilTrend({ runs, tPaceSeconds, referenceDate }) {
  const ref = safeDate(referenceDate) || new Date();
  const cutoff = new Date(ref.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY);
  const tToleranceMin = tPaceSeconds * 0.9;
  const tToleranceMax = tPaceSeconds * 1.10;
  const tSessions = (Array.isArray(runs) ? runs : []).filter((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate || a?.__date);
    const pace = toFiniteNumber(a?.__paceSecondsPerKm);
    const hr = toFiniteNumber(a?.averageHeartrate);
    return d && d >= cutoff && d <= ref && pace >= tToleranceMin && pace <= tToleranceMax && hr > 0;
  });
  // Bucketise par semaine (label = date debut semaine).
  const buckets = new Map();
  tSessions.forEach((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate || a?.__date);
    const weekKey = `${d.getFullYear()}-W${Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * MS_PER_DAY))}`;
    const dur = toFiniteNumber(a.__movingSeconds);
    const hr = toFiniteNumber(a.averageHeartrate);
    const prev = buckets.get(weekKey) || { weight: 0, sumHr: 0, date: d };
    buckets.set(weekKey, {
      weight: prev.weight + dur,
      sumHr: prev.sumHr + hr * dur,
      date: d > prev.date ? d : prev.date,
    });
  });
  const points = Array.from(buckets.values())
    .filter((b) => b.weight > 0)
    .map((b) => ({
      label: b.date.toISOString().slice(0, 10),
      value: Math.round(b.sumHr / b.weight),
    }))
    .sort((l, r) => new Date(l.label) - new Date(r.label));
  return points;
}

/**
 * FC moyenne sur les best efforts (5k/10k/semi/marathon).
 */
function buildKeyEffortsHr(records) {
  return (Array.isArray(records) ? records : [])
    .filter((r) => r?.isAvailable && r?.activity)
    .map((r) => {
      const hr = toFiniteNumber(r.activity?.averageHeartrate);
      const max = toFiniteNumber(r.activity?.maxHeartrate);
      const label = KEY_EFFORT_LABELS[r.recordKey] || r.recordLabel || r.recordKey;
      return {
        key: r.recordKey,
        label,
        averageHr: hr > 0 ? hr : null,
        maxHr: max > 0 ? max : null,
        elapsedSeconds: r.elapsedSeconds,
      };
    });
}

/**
 * Selectionne une sortie longue stable pour exemple de derive cardiaque.
 * Critere : sortie >= 60 min avec cardiacDecouplingPercent disponible,
 * la plus recente.
 */
function pickStableSampleSession(runs) {
  const candidates = (Array.isArray(runs) ? runs : []).filter((a) => {
    const dur = toFiniteNumber(a?.__movingSeconds);
    const dec = a?.cardiacDecouplingPercent;
    return dur >= STABLE_SESSION_MIN_DURATION_SEC && dec != null && Number.isFinite(Number(dec));
  });
  if (candidates.length === 0) return null;
  // Trie par date desc, prend le plus recent.
  candidates.sort((l, r) => {
    const ld = safeDate(l?.startDateLocal || l?.startDate || l?.__date) || new Date(0);
    const rd = safeDate(r?.startDateLocal || r?.startDate || r?.__date) || new Date(0);
    return rd - ld;
  });
  const a = candidates[0];
  return {
    activityId: a.stravaActivityId || a.id,
    name: a.name || "Sortie longue",
    date: safeDate(a?.startDateLocal || a?.startDate)?.toISOString().slice(0, 10) || null,
    decouplingPercent: toFiniteNumber(a.cardiacDecouplingPercent),
    durationSeconds: toFiniteNumber(a.__movingSeconds),
    averageHr: toFiniteNumber(a.averageHeartrate) || null,
  };
}

/**
 * Synthese intensite cardiaque legere : reuse l'intensityModel passe en input
 * (deja calcule pour la vue d'ensemble).
 */
function buildIntensitySynthesis(intensityModel) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];
  if (!zones.length) return { hasData: false, zones: [], easyShare: 0, harderShare: 0 };
  const easyShare = zones
    .filter((z) => ["z1", "z2"].includes(String(z.key).toLowerCase()))
    .reduce((s, z) => s + toFiniteNumber(z.share), 0);
  const harderShare = zones
    .filter((z) => ["z3", "z4", "z5"].includes(String(z.key).toLowerCase()))
    .reduce((s, z) => s + toFiniteNumber(z.share), 0);
  return {
    hasData: true,
    zones,
    easyShare,
    harderShare,
    totalDurationSeconds: toFiniteNumber(intensityModel?.totalDurationSeconds),
    totalDurationLabel: intensityModel?.totalDurationLabel || "",
  };
}

/**
 * Lecture coach de l'effort cardiaque.
 */
function buildReadingEffort({ fcSeuil, fcMax, decouplingValue }) {
  const paragraphs = [];
  if (fcSeuil.value > 0 && fcMax.value > 0) {
    const ratio = Math.round((fcSeuil.value / fcMax.value) * 100);
    paragraphs.push(
      `FC seuil ≈ ${ratio} % de ta FC max (${fcSeuil.value} / ${fcMax.value} bpm). Une cible solide se situe entre 88 et 92 % (Daniels T-pace).`,
    );
  }
  if (decouplingValue != null) {
    if (decouplingValue < 5) {
      paragraphs.push(
        `Dérive cardiaque moyenne ${formatPercent(decouplingValue)} sur tes sorties longues : excellent contrôle aérobie (Allen & Coggan : < 5 % = base bien posée).`,
      );
    } else if (decouplingValue < 8) {
      paragraphs.push(
        `Dérive cardiaque moyenne ${formatPercent(decouplingValue)} : zone correcte mais perfectible (Allen & Coggan : 5-8 % = base à consolider).`,
      );
    } else {
      paragraphs.push(
        `Dérive cardiaque moyenne ${formatPercent(decouplingValue)} : signal que l'effort excède la capacité aérobie pour la durée. Augmente progressivement le volume facile.`,
      );
    }
  }
  if (!paragraphs.length) {
    paragraphs.push("Pas encore assez de sorties exploitables avec FC pour qualifier ta réponse cardiaque.");
  }
  return paragraphs;
}

/**
 * Modele principal pour l'onglet FC de performance.
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
  const runs = filterRecentRuns(scopeActivities, reference);

  if (runs.length === 0) {
    return {
      hasData: false,
      title: "FC de performance",
      emptyReason: "Pas encore assez de sorties récentes avec FC pour analyser ta réponse cardiaque.",
    };
  }

  // VDOT consolide (regle 70/30) pour deduire le T pace seuil.
  const resolved = resolveMasterVdot({ vdotProfile, vdotHistory });
  const masterVdot = resolved.value > 0 ? resolved.value : toFiniteNumber(vdotProfile?.vdot);
  const paces = masterVdot > 0 ? buildDanielsTrainingPaces(masterVdot) : [];
  const tPaceSeconds = toFiniteNumber((paces.find((p) => p.key === "T") || {}).paceSecondsPerKm);

  // FC max + FC seuil + Derive
  const fcMax = estimateFcMax({ runs, settingsHeartRateMax: settings.heartRateMax });
  const fcSeuil = estimateFcSeuil({ runs, tPaceSeconds, fcMax: fcMax.value });
  const decoupling = buildDecouplingStats(runs);

  // Mini trends
  const fcSeuilTrend = buildFcSeuilTrend({ runs, tPaceSeconds, referenceDate: reference });
  const decouplingTrend = runs
    .filter((a) => a?.cardiacDecouplingPercent != null)
    .map((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate || a?.__date);
      return d
        ? { label: d.toISOString().slice(0, 10), value: toFiniteNumber(a.cardiacDecouplingPercent) }
        : null;
    })
    .filter(Boolean)
    .sort((l, r) => new Date(l.label) - new Date(r.label));

  // Efforts cles
  const records = buildBestEffortRecords(scopeActivities);
  const keyEffortsHr = buildKeyEffortsHr(records);

  // Derive cardiaque stable (sortie exemple)
  const stableSample = pickStableSampleSession(runs);

  // Synthese intensite
  const intensitySynthesis = buildIntensitySynthesis(intensityModel);

  // Lecture coach
  const readingParagraphs = buildReadingEffort({
    fcSeuil,
    fcMax,
    decouplingValue: decoupling.value,
  });

  // FC repos discret
  const fcRepos = toFiniteNumber(settings.restingHeartrate) > 0
    ? { value: Math.round(settings.restingHeartrate), source: "settings" }
    : null;

  return {
    hasData: true,
    title: "FC de performance",
    subtitle: "Comment ton cœur réagit dans les efforts clés.",
    kpi: {
      fcSeuil: {
        value: fcSeuil.value,
        formattedValue: formatBpm(fcSeuil.value),
        unit: "bpm",
        hint: fcSeuil.source === "measured"
          ? `Mesurée sur ${fcSeuil.sampleSize} sorties au seuil`
          : fcSeuil.source === "estimated_fc_max"
            ? "Estimée 88 % FC max"
            : "Indisponible",
        tone: "neutral",
        series: fcSeuilTrend,
      },
      fcMax: {
        value: fcMax.value,
        formattedValue: formatBpm(fcMax.value),
        unit: "bpm",
        hint: fcMax.source === "settings" ? "Saisie réglages" : fcMax.source === "observed" ? "Max observée 90 j" : "Indisponible",
        tone: "neutral",
        // FC max stable -> on n'affiche pas de trend (constante)
        series: [],
      },
      decoupling: {
        value: decoupling.value,
        formattedValue: decoupling.value != null ? formatPercent(decoupling.value) : "—",
        unit: "",
        hint: decoupling.value == null
          ? "Pas assez de sorties longues"
          : decoupling.value < 5 ? "Très bon" : decoupling.value < 8 ? "Correct" : "À surveiller",
        tone: decoupling.value == null ? "neutral" : decoupling.value < 5 ? "positive" : decoupling.value < 8 ? "neutral" : "warning",
        series: decouplingTrend,
        sampleSize: decoupling.sampleSize,
      },
    },
    fcRepos,
    keyEffortsHr,
    fcSeuilEvolution: fcSeuilTrend,
    stableSample,
    intensitySynthesis,
    readingParagraphs,
    warning: "Ces valeurs sont des estimations basées sur tes sorties récentes. Une mesure laboratoire reste la référence.",
  };
}
