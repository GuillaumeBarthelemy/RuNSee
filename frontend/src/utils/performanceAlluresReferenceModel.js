/**
 * performanceAlluresReferenceModel.js — Modele metier pour l'onglet
 * `Performance > Allures de référence` (page 14 du plan Lot Performance V5).
 *
 * Transforme un vdotProfile (Daniels) + vdotHistory + race predictions en :
 *   - 7 cartes d'allures (Z1 Facile -> Z5 1 km)
 *   - Barres comparaison (ecart vs allure facile)
 *   - Evolution allure seuil (mini chart 30j)
 *   - Equivalences prudentes (plages 1k/5k/10k/Semi/Marathon)
 *   - Zones d'allure Daniels (Z1-Z5)
 *   - Texte coach "comment utiliser"
 *
 * Sources scientifiques :
 *   - Daniels 1979/2014 (E/M/T/I/R paces a partir de % VO2max)
 *   - Riegel 1981 (predictions race)
 *   - VMA = vVO2max ≈ Daniels I pace (intensity 98 %)
 */

import {
  buildDanielsTrainingPaces,
  buildRoadRacePredictions,
  describeVdotLevel,
} from "./runningPerformance.js";
import { resolveMasterVdot } from "./vdotConsolidation.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
 * Formate un nombre de secondes/km en pace M:SS.
 */
function formatPaceSeconds(secondsPerKm) {
  const n = Math.max(0, Math.round(toFiniteNumber(secondsPerKm)));
  if (n <= 0) return "—";
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

/**
 * Formate un ecart signe entre 2 paces (en secondes/km).
 * delta > 0 = plus lent (positif), delta < 0 = plus rapide (negatif).
 */
function formatPaceDelta(deltaSeconds) {
  const n = Math.round(toFiniteNumber(deltaSeconds));
  if (n === 0) return "—";
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : "-";
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m > 0) return `${sign}${m}:${String(s).padStart(2, "0")}`;
  return `${sign}0:${String(s).padStart(2, "0")}`;
}

/**
 * Calcule la VMA (vitesse maximale aerobie) en secondes/km a partir du VDOT.
 * VMA correspond a la pace vVO2max (intensity 100 %), proche de l'allure I de
 * Daniels (98 %). On utilise la pace I comme proxy VMA.
 */
function vmaPaceSecondsPerKmFromPaces(paces) {
  const iPace = (paces || []).find((p) => p.key === "I");
  return toFiniteNumber(iPace?.paceSecondsPerKm);
}

/**
 * Construit les 7 cartes d'allures depuis vdotProfile.
 * Mapping :
 *   - Allure facile (Z1)  : Daniels E (65 % VO2max)
 *   - Endurance (Z2)      : Daniels E haut de zone (75 % VO2max — interpolation)
 *   - Marathon (Z3)       : Daniels M (84 %)
 *   - Seuil (Z4)          : Daniels T (88 %)
 *   - 10 km (Z4-Z5)       : race prediction 10k
 *   - 5 km (Z5)           : race prediction 5k
 *   - 1 km (Z5)           : Daniels I (98 %) — intervalles courts
 */
function buildPaceCards({ paces, racePredictions, vmaSeconds }) {
  const ePace = (paces || []).find((p) => p.key === "E");
  const mPace = (paces || []).find((p) => p.key === "M");
  const tPace = (paces || []).find((p) => p.key === "T");
  const iPace = (paces || []).find((p) => p.key === "I");
  const pred5k = (racePredictions || []).find((p) => p.key === "5k");
  const pred10k = (racePredictions || []).find((p) => p.key === "10k");

  // Endurance Z2 : interpolation entre E (65 %) et M (84 %) ~ 75 % VO2max.
  // Cf. Daniels : "Endurance" / "Steady" runs sont ~75-80 %.
  const enduranceSeconds = ePace && mPace
    ? Math.round((toFiniteNumber(ePace.paceSecondsPerKm) + toFiniteNumber(mPace.paceSecondsPerKm)) / 2 + 10)
    : toFiniteNumber(ePace?.paceSecondsPerKm);

  const cards = [
    {
      key: "facile",
      label: "Allure facile",
      zone: "Zone Z1",
      color: "#3b82f6",
      paceSecondsPerKm: toFiniteNumber(ePace?.paceSecondsPerKm),
    },
    {
      key: "endurance",
      label: "Endurance",
      zone: "Zone Z2",
      color: "#22c55e",
      paceSecondsPerKm: enduranceSeconds,
    },
    {
      key: "marathon",
      label: "Marathon",
      zone: "Zone Z3",
      color: "#fb923c",
      paceSecondsPerKm: toFiniteNumber(mPace?.paceSecondsPerKm),
    },
    {
      key: "seuil",
      label: "Seuil",
      zone: "Zone Z4",
      color: "#f59e0b",
      paceSecondsPerKm: toFiniteNumber(tPace?.paceSecondsPerKm),
    },
    {
      key: "10k",
      label: "10 km",
      zone: "Entre Z4 et Z5",
      color: "#ef4444",
      paceSecondsPerKm: toFiniteNumber(pred10k?.paceSecondsPerKm),
    },
    {
      key: "5k",
      label: "5 km",
      zone: "Zone Z5",
      color: "#ef4444",
      paceSecondsPerKm: toFiniteNumber(pred5k?.paceSecondsPerKm),
    },
    {
      key: "1k",
      label: "1 km",
      zone: "Zone Z5",
      color: "#7c3aed",
      paceSecondsPerKm: toFiniteNumber(iPace?.paceSecondsPerKm),
    },
  ];

  return cards.map((card) => ({
    ...card,
    formattedPace: formatPaceSeconds(card.paceSecondsPerKm),
    vmaDeltaSeconds: card.paceSecondsPerKm > 0 && vmaSeconds > 0
      ? card.paceSecondsPerKm - vmaSeconds
      : null,
    formattedVmaDelta: card.paceSecondsPerKm > 0 && vmaSeconds > 0
      ? `${formatPaceDelta(card.paceSecondsPerKm - vmaSeconds)} à la VMA`
      : "",
  }));
}

/**
 * Construit les lignes de la comparaison (ecart vs allure facile).
 * Format prêt pour le bar chart horizontal.
 */
function buildComparisonRows(paceCards) {
  const facileSeconds = paceCards.find((c) => c.key === "facile")?.paceSecondsPerKm || 0;
  if (facileSeconds <= 0) return [];

  return paceCards.map((card) => {
    const delta = card.paceSecondsPerKm > 0 ? card.paceSecondsPerKm - facileSeconds : null;
    return {
      key: card.key,
      label: card.label,
      zoneLabel: card.zone,
      paceSecondsPerKm: card.paceSecondsPerKm,
      formattedPace: card.formattedPace,
      deltaSeconds: delta,
      formattedDelta: delta != null ? formatPaceDelta(delta) : "—",
      color: card.color,
    };
  });
}

/**
 * Evolution de l'allure seuil sur la fenetre 30j (mini chart).
 * Utilise vdotHistory pour interpoler le T pace correspondant a chaque VDOT.
 * Pour la simplicite, on utilise un ratio fixe T/VDOT = 88 % VO2max -> ~T pace.
 */
function buildThresholdEvolution(vdotHistory, referenceDate, currentTPaceSeconds) {
  const reference = safeDate(referenceDate) || new Date();
  const cutoff = new Date(reference.getTime() - 30 * MS_PER_DAY);
  const snapshots = Array.isArray(vdotHistory?.snapshots) ? vdotHistory.snapshots : [];

  // Filtre 30 jours + valeurs VDOT exploitables
  const points = snapshots
    .filter((s) => {
      const d = safeDate(s?.date);
      return d && d >= cutoff && d <= reference && Number.isFinite(Number(s?.vdotValue)) && Number(s.vdotValue) > 0;
    })
    .map((s) => {
      const v = Number(s.vdotValue);
      // Approche pragmatique : on calcule T pace via ratio. Daniels T pace est
      // proportionnelle a 1/sqrt(VDOT) approximativement, mais pour un mini chart
      // une regle plus simple suffit : si VDOT actuel = currentVDOT et T courant
      // = currentTPace, alors T(V) = currentTPace × (currentVDOT/V) (lineaire).
      // Approximation acceptable sur petit range VDOT.
      const ratio = currentTPaceSeconds > 0 && v > 0 ? currentTPaceSeconds * (Number(snapshots.at(-1)?.vdotValue || v) / v) : 0;
      return { label: s.date, value: Math.round(ratio) };
    })
    .filter((p) => p.value > 0);

  if (points.length < 2) {
    return { hasData: false, points: [], summary: null };
  }

  const firstValue = points[0].value;
  const lastValue = points.at(-1).value;
  const deltaSeconds = lastValue - firstValue; // > 0 = plus lent, < 0 = plus rapide
  return {
    hasData: true,
    points,
    summary: {
      lastValue,
      formattedLastValue: formatPaceSeconds(lastValue),
      deltaSeconds,
      formattedDelta: formatPaceDelta(deltaSeconds),
      tone: deltaSeconds < -2 ? "positive" : deltaSeconds > 2 ? "warning" : "neutral",
      trendLabel: deltaSeconds < -2 ? "En amélioration" : deltaSeconds > 2 ? "En retrait" : "Stable",
    },
  };
}

/**
 * Construit la table d'equivalences prudentes (plage +/- 5s/km).
 * Distances : 1k / 5k / 10k / Semi / Marathon.
 *
 * Fallback 1k : les racePredictions Daniels ne couvrent que 5k/10k/semi/marathon.
 * On utilise le I pace (Daniels, 98 % VO2max) comme equivalent 1km, le plus
 * pertinent scientifiquement pour cette distance courte intense.
 */
function buildEquivalencesTable(racePredictions, paces) {
  const PRED_BY_KEY = {};
  (racePredictions || []).forEach((p) => { PRED_BY_KEY[p.key] = p; });

  // Fallback 1k : I pace Daniels (~ VMA, courses courtes 3-5 min).
  if (!PRED_BY_KEY["1k"]) {
    const iPace = (paces || []).find((p) => p.key === "I");
    if (iPace && toFiniteNumber(iPace.paceSecondsPerKm) > 0) {
      const ip = toFiniteNumber(iPace.paceSecondsPerKm);
      PRED_BY_KEY["1k"] = {
        key: "1k",
        paceSecondsPerKm: ip,
        predictedSeconds: ip * 1, // 1 km = pace * 1
      };
    }
  }

  const rows = [
    { key: "1k", label: "1 km", distanceKm: 1.00, distanceMeters: 1000 },
    { key: "5k", label: "5 km", distanceKm: 5.00, distanceMeters: 5000 },
    { key: "10k", label: "10 km", distanceKm: 10.00, distanceMeters: 10000 },
    { key: "halfMarathon", label: "Semi-marathon", distanceKm: 21.10, distanceMeters: 21097.5 },
    { key: "marathon", label: "Marathon", distanceKm: 42.20, distanceMeters: 42195 },
  ];

  return rows.map((row) => {
    const pred = PRED_BY_KEY[row.key];
    const paceSecondsPerKm = toFiniteNumber(pred?.paceSecondsPerKm);
    const predictedSeconds = toFiniteNumber(pred?.predictedSeconds);
    if (paceSecondsPerKm <= 0 || predictedSeconds <= 0) {
      return {
        ...row,
        formattedDistance: `${row.distanceKm.toFixed(2)} km`.replace(".", ","),
        formattedPaceRange: "—",
        formattedTimeRange: "—",
      };
    }
    // Plage prudente : +/-5s/km sur l'allure -> +/-(distance × 5) sur le temps
    const paceLow = paceSecondsPerKm - 3;
    const paceHigh = paceSecondsPerKm + 5;
    const timeLow = Math.round(paceLow * row.distanceKm);
    const timeHigh = Math.round(paceHigh * row.distanceKm);
    return {
      ...row,
      formattedDistance: `${row.distanceKm.toFixed(2)} km`.replace(".", ","),
      formattedPaceRange: `${formatPaceSeconds(paceLow)} - ${formatPaceSeconds(paceHigh)}`,
      formattedTimeRange: `${formatRaceTime(timeLow)} - ${formatRaceTime(timeHigh)}`,
    };
  });
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

/**
 * Construit la table Zones d'allure Daniels Z1-Z5 avec plages calculées.
 */
function buildZonesTable(paceCards) {
  const facile = paceCards.find((c) => c.key === "facile")?.paceSecondsPerKm || 0;
  const endurance = paceCards.find((c) => c.key === "endurance")?.paceSecondsPerKm || 0;
  const marathon = paceCards.find((c) => c.key === "marathon")?.paceSecondsPerKm || 0;
  const seuil = paceCards.find((c) => c.key === "seuil")?.paceSecondsPerKm || 0;
  const tenK = paceCards.find((c) => c.key === "10k")?.paceSecondsPerKm || 0;

  return [
    {
      key: "z1",
      label: "Z1 Facile",
      color: "#3b82f6",
      formattedRange: facile > 0 ? `≤ ${formatPaceSeconds(facile)}` : "—",
      usage: "Récupération, sorties très faciles",
    },
    {
      key: "z2",
      label: "Z2 Endurance",
      color: "#22c55e",
      formattedRange: facile > 0 && endurance > 0
        ? `${formatPaceSeconds(facile)} - ${formatPaceSeconds(endurance)}`
        : "—",
      usage: "Endurance fondamentale",
    },
    {
      key: "z3",
      label: "Z3 Marathon",
      color: "#fb923c",
      formattedRange: endurance > 0 && marathon > 0
        ? `${formatPaceSeconds(endurance)} - ${formatPaceSeconds(marathon)}`
        : "—",
      usage: "Sorties longues, spécifique marathon",
    },
    {
      key: "z4",
      label: "Z4 Seuil",
      color: "#f59e0b",
      formattedRange: marathon > 0 && seuil > 0
        ? `${formatPaceSeconds(marathon)} - ${formatPaceSeconds(seuil)}`
        : "—",
      usage: "Seuil, tempo, travail au seuil",
    },
    {
      key: "z5",
      label: "Z5 VO₂max",
      color: "#ef4444",
      formattedRange: tenK > 0 ? `≤ ${formatPaceSeconds(tenK)}` : "—",
      usage: "Intervalles courts, VO₂max, vitesse",
    },
  ];
}

const USAGE_TIPS = [
  {
    key: "terrain",
    title: "Adapte selon le terrain",
    text: "En montée, accepte de ralentir ; en descente, contrôle ton allure.",
  },
  {
    key: "fc",
    title: "Écoute ton corps et ta FC",
    text: "Les allures sont des guides ; la sensation d'effort prime.",
  },
  {
    key: "plan",
    title: "Planifie intelligemment",
    text: "Alterne les intensités, prévois de la récupération et progresse.",
  },
  {
    key: "reeval",
    title: "Réévalue régulièrement",
    text: "Tes allures évoluent avec l'entraînement. Reste à l'écoute de tes données.",
  },
];

const WARNING_TEXT = "Ces allures sont des repères. Elles peuvent varier selon le profil, le dénivelé, la fatigue et les conditions.";

/**
 * Construit le modele complet pour l'onglet Allures de référence.
 *
 * @param {Object} options
 * @param {Object} options.vdotProfile - Output buildVdotProfile (paces + racePredictions + vdot)
 * @param {Object} options.vdotHistory - Output getVdotHistory (snapshots)
 * @param {Date}   options.referenceDate
 */
export function buildAlluresReferenceModel({ vdotProfile = null, vdotHistory = null, referenceDate = null } = {}) {
  // Headline (subtitle) : VO2max Garmin prioritaire (displayValue).
  // Calculs des paces : mix 70/30 (calculationValue) pour rester aligne sur
  // la performance race tout en creditant la capacite courante.
  const resolved = resolveMasterVdot({ vdotProfile, vdotHistory });
  const masterVdot = resolved.calculationValue; // utilise pour buildDanielsTrainingPaces
  const masterVdotSource = resolved.displaySource;
  const displayVdot = resolved.displayValue;

  if (!(masterVdot > 0)) {
    return {
      hasData: false,
      title: "Allures de référence",
      emptyReason: "Estimation indisponible. Plus de records récents sont nécessaires pour calculer tes allures.",
      warning: WARNING_TEXT,
    };
  }

  // Recalcul des paces sur le master VDOT (Garmin ou Daniels fallback) pour
  // assurer la coherence inter-onglets (VDOT&profil utilise la meme cascade).
  const paces = buildDanielsTrainingPaces(masterVdot);
  const racePredictions = buildRoadRacePredictions(masterVdot);
  const vmaSeconds = vmaPaceSecondsPerKmFromPaces(paces);

  const paceCards = buildPaceCards({ paces, racePredictions, vmaSeconds });
  const comparisonRows = buildComparisonRows(paceCards);
  const thresholdEvolution = buildThresholdEvolution(
    vdotHistory,
    referenceDate,
    paceCards.find((c) => c.key === "seuil")?.paceSecondsPerKm || 0,
  );
  const equivalences = buildEquivalencesTable(racePredictions, paces);
  const zones = buildZonesTable(paceCards);

  return {
    hasData: true,
    title: "Tes allures de référence",
    // Affichage : VO2max Garmin (displayValue). Calculs paces sur mix 70/30.
    subtitle: `VO₂max ${Math.round(displayVdot)} ${resolved.displaySourceLabel ? `(${resolved.displaySourceLabel})` : ""} — allures calibrées sur tes records.`,
    vdotValue: displayVdot,
    formattedVdot: Math.round(displayVdot).toString(),
    vdotSource: masterVdotSource,
    vdotSourceLabel: resolved.displaySourceLabel,
    vdotLevel: describeVdotLevel(displayVdot),
    vmaSecondsPerKm: vmaSeconds,
    paceCards,
    comparisonRows,
    thresholdEvolution,
    equivalences,
    zones,
    usageTips: USAGE_TIPS,
    warning: WARNING_TEXT,
  };
}
