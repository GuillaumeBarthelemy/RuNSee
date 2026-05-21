/**
 * performanceVdotProfileModel.js — Modele metier pour l'onglet
 * `Performance > VDOT & profil` (page 13 du plan Lot Performance V5).
 *
 * Construit un profil 5D scientifiquement defendable a partir des records
 * route + activites recentes + (optionnel) snapshots Garmin Firstbeat
 * (Endurance Score / Hill Score / VO2max).
 *
 * Cascade par axe :
 *   - VO2max     : VDOT consolide (Daniels 1979)
 *   - Vitesse    : VDOT specifique 5 km (proxy VO2max sur effort court)
 *   - Seuil      : VDOT specifique 10 km ou semi (T-pace, ~88% VO2max)
 *   - Endurance  : exposant Riegel marathon/5k (Joyner 1991)
 *   - Endurance musculaire : 0.6 x Hill Score + 0.4 x Endurance Score Garmin
 *                            fallback Riegel + composite D+/durée
 *
 * Tous les axes normalises 0-100 :
 *   - 50 = niveau moyen amateur (VDOT 45)
 *   - 80+ = competiteur
 *   - 30- = debutant
 *
 * Stabilisation : fenetre fixe 90 jours glissants (alignee sur graphique
 * Evolution VDOT). Independant du filtre periode courant.
 */

import {
  buildVdotProfile,
  calculateVdot,
  describeVdotLevel,
} from "./runningPerformance.js";
import { buildBestEffortRecords, isRunLikeActivity } from "./activityInsights.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STABILIZATION_WINDOW_DAYS = 90;

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(value) {
  return Math.max(0, Math.min(100, value));
}

function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Normalise un VDOT brut (typique 30-85) sur l'echelle 0-100 du profil.
 * - VDOT 30 -> score 0   (debutant)
 * - VDOT 45 -> score 50  (amateur moyen)
 * - VDOT 60 -> score 80  (competiteur)
 * - VDOT 75 -> score 100 (elite)
 */
function normalizeVdotToScore(vdot) {
  const v = Number(vdot);
  if (!Number.isFinite(v) || v <= 0) return 0;
  // Piecewise linear 30 -> 0, 45 -> 50, 60 -> 80, 75+ -> 100
  if (v <= 30) return 0;
  if (v <= 45) return ((v - 30) / 15) * 50;
  if (v <= 60) return 50 + ((v - 45) / 15) * 30;
  if (v <= 75) return 80 + ((v - 60) / 15) * 20;
  return 100;
}

/**
 * Calcule l'exposant Riegel a partir de 2 records (un court, un long).
 * exposant = log(t_long / t_court) / log(d_long / d_court)
 * - Reference theorique Riegel 1981 : exposant = 1.06
 * - Coureur endurance forte : < 1.06 (perte moindre sur les longs)
 * - Coureur vitesse-dominant : > 1.06 (perte importante sur les longs)
 * Mapping 0-100 :
 *   exposant <= 1.00 -> 100
 *   exposant = 1.06  -> 50
 *   exposant >= 1.15 -> 0
 */
function riegelExponent({ tShort, dShort, tLong, dLong }) {
  if (!(tShort > 0) || !(dShort > 0) || !(tLong > 0) || !(dLong > 0)) return null;
  if (dLong <= dShort) return null;
  return Math.log(tLong / tShort) / Math.log(dLong / dShort);
}

function riegelToScore(exponent) {
  if (exponent == null) return null;
  if (exponent <= 1.00) return 100;
  if (exponent <= 1.06) return 100 - ((exponent - 1.00) / 0.06) * 50;
  if (exponent <= 1.15) return 50 - ((exponent - 1.06) / 0.09) * 50;
  return 0;
}

/**
 * Normalise Garmin Endurance Score (echelle officielle Firstbeat
 * typique 3500-8500) vers 0-100.
 */
function normalizeEnduranceScoreToScore(rawScore) {
  const n = Number(rawScore);
  if (!Number.isFinite(n) || n <= 0) return null;
  // 3500 -> 30 (Untrained/Fair), 5500 -> 50 (Trained), 7000 -> 75 (Excellent),
  // 8500+ -> 95+ (Superior). Piecewise.
  if (n <= 3500) return Math.max(0, (n / 3500) * 30);
  if (n <= 5500) return 30 + ((n - 3500) / 2000) * 20;
  if (n <= 7000) return 50 + ((n - 5500) / 1500) * 25;
  if (n <= 8500) return 75 + ((n - 7000) / 1500) * 20;
  return Math.min(100, 95 + ((n - 8500) / 1500) * 5);
}

/**
 * Garmin Hill Score est typiquement deja sur 0-100 dans la doc Garmin :
 * Beginner (0-30) / Established (30-60) / Strong (60-80) / Athlete (80-95) / Elite (95+).
 * On le retourne tel quel (clampe).
 */
function normalizeHillScoreToScore(rawScore) {
  const n = Number(rawScore);
  if (!Number.isFinite(n) || n <= 0) return null;
  return clamp01(n);
}

/**
 * Calcule un VDOT specifique pour une distance cible a partir des records.
 * Retourne null si pas de record exploitable pour cette distance.
 */
function vdotForDistance(records, distanceMeters) {
  if (!Array.isArray(records)) return null;
  const matches = records.filter(
    (r) => r?.isAvailable && r?.elapsedSeconds > 0
      && r?.distanceMeters && Math.abs(r.distanceMeters - distanceMeters) < 100,
  );
  if (!matches.length) return null;
  const best = matches.reduce(
    (acc, r) => (!acc || r.elapsedSeconds < acc.elapsedSeconds ? r : acc),
    null,
  );
  if (!best) return null;
  return calculateVdot({
    distanceMeters,
    elapsedSeconds: best.elapsedSeconds,
  });
}

/**
 * Score "Endurance musculaire" — cascade 60/40 Hill/Endurance avec
 * fallback Riegel et composite D+/durée.
 */
function buildMuscularEnduranceAxis({ enduranceScore, hillScore, riegelScore, activities }) {
  const hill = normalizeHillScoreToScore(hillScore);
  const endurance = normalizeEnduranceScoreToScore(enduranceScore);

  if (hill != null && endurance != null) {
    return {
      score: clamp01(0.6 * hill + 0.4 * endurance),
      source: "garmin_hill_endurance",
      detail: "60 % Hill Score + 40 % Endurance Score (Garmin Firstbeat)",
    };
  }
  if (hill != null) {
    return { score: hill, source: "garmin_hill", detail: "Garmin Hill Score (D+ specifique)" };
  }
  if (endurance != null) {
    return { score: endurance, source: "garmin_endurance", detail: "Garmin Endurance Score (effort long)" };
  }
  if (riegelScore != null) {
    return { score: riegelScore, source: "riegel", detail: "Exposant Riegel 5 km / marathon" };
  }
  // Fallback N3 composite : durée moyenne weekly + part sorties D+/km >= 30 m
  const runs = (Array.isArray(activities) ? activities : []).filter(isRunLikeActivity);
  if (!runs.length) return { score: 0, source: "insufficient", detail: "Pas assez de données" };
  const weeklyMinutes = runs.reduce(
    (sum, a) => sum + toFiniteNumber(a?.movingTime) / 60,
    0,
  ) / Math.max(1, runs.length / 4); // normalise sur ~4 sem
  const hillyShare = runs.filter((a) => {
    const dist = toFiniteNumber(a?.distance) / 1000;
    const gain = toFiniteNumber(a?.elevationGain);
    return dist > 0 && gain / dist >= 30;
  }).length / runs.length;
  // Mapping arbitraire : 180 min/sem volume + 30 % hilly -> ~60
  const composite = clamp01((weeklyMinutes / 180) * 35 + hillyShare * 65);
  return {
    score: composite,
    source: "composite",
    detail: "Composite volume + % sorties D+ ≥ 30 m/km",
  };
}

/**
 * Filtre records sur fenetre 90 jours pour stabilisation (decision utilisateur).
 */
function filterRecordsRecent(records, referenceDate) {
  if (!Array.isArray(records)) return [];
  const reference = safeDate(referenceDate) || new Date();
  const cutoff = new Date(reference.getTime() - STABILIZATION_WINDOW_DAYS * MS_PER_DAY);
  return records.filter((r) => {
    const date = safeDate(r?.activity?.startDateLocal || r?.activity?.startDate);
    if (!date) return true; // garde si date manquante, on ne va pas exclure
    return date >= cutoff && date <= reference;
  });
}

/**
 * Construit le modele complet pour l'onglet VDOT & profil.
 */
export function buildVdotProfileTabModel({
  scopeActivities = [],
  vdotHistory = null,
  confidence = null,
  referenceDate = null,
  garminLatestFitnessSnapshot = null,
} = {}) {
  const reference = safeDate(referenceDate) || new Date();

  // 1. Records consolides sur la fenetre 90j (stabilisation).
  const allRecords = buildBestEffortRecords(scopeActivities);
  const recentRecords = filterRecordsRecent(allRecords, reference);

  // 2. VDOT consolide (Daniels) sur les recent records.
  const vdotProfile = buildVdotProfile({
    records: recentRecords.length ? recentRecords : allRecords,
    referenceDate: reference,
  });

  if (!vdotProfile?.hasData) {
    return {
      hasData: false,
      title: "VDOT & profil",
      emptyReason: "Nous avons besoin de plus d'activités récentes avec allure et fréquence cardiaque pour estimer ton profil.",
      stabilizationWindowDays: STABILIZATION_WINDOW_DAYS,
    };
  }

  // 3. Calcul des 5 axes.
  // Mapping recordKey -> distance meters pour pouvoir filtrer par distance
  // (les records renvoyes par buildBestEffortRecords ne carry pas distanceMeters,
  // seulement recordKey + recordLabel + elapsedSeconds).
  const RECORD_KEY_TO_METERS = {
    "5k": 5000,
    "10k": 10000,
    halfMarathon: 21097.5,
    marathon: 42195,
  };
  const recordsWithDistance = recentRecords
    .filter((r) => r?.isAvailable && r?.elapsedSeconds > 0)
    .map((r) => ({ ...r, distanceMeters: RECORD_KEY_TO_METERS[r.recordKey] || 0 }))
    .filter((r) => r.distanceMeters > 0);

  const vdotMaster = vdotProfile.vdot;
  const vdot5k = vdotForDistance(recordsWithDistance, 5000);
  const vdot10k = vdotForDistance(recordsWithDistance, 10000);
  const vdotHalf = vdotForDistance(recordsWithDistance, 21097.5);
  const vdotMarathon = vdotForDistance(recordsWithDistance, 42195);

  // Axe Endurance : Riegel 5k -> marathon (fallback semi si marathon manquant).
  let riegelData = null;
  const r5k = recordsWithDistance.find((r) => Math.abs(r.distanceMeters - 5000) < 100);
  const rMarathon = recordsWithDistance.find((r) => Math.abs(r.distanceMeters - 42195) < 200);
  const rHalf = recordsWithDistance.find((r) => Math.abs(r.distanceMeters - 21097.5) < 100);
  if (r5k && rMarathon) {
    const exp = riegelExponent({
      tShort: r5k.elapsedSeconds, dShort: 5000,
      tLong: rMarathon.elapsedSeconds, dLong: 42195,
    });
    riegelData = { exponent: exp, score: riegelToScore(exp), reference: "marathon vs 5 km" };
  } else if (r5k && rHalf) {
    const exp = riegelExponent({
      tShort: r5k.elapsedSeconds, dShort: 5000,
      tLong: rHalf.elapsedSeconds, dLong: 21097.5,
    });
    riegelData = { exponent: exp, score: riegelToScore(exp), reference: "semi vs 5 km" };
  }
  const enduranceScore = riegelData?.score != null
    ? riegelData.score
    : normalizeVdotToScore(vdotMarathon || vdotHalf || vdotMaster);

  // Endurance musculaire : 60/40 Hill/Endurance Garmin, fallback Riegel, fallback composite.
  const muscular = buildMuscularEnduranceAxis({
    enduranceScore: garminLatestFitnessSnapshot?.enduranceScore,
    hillScore: garminLatestFitnessSnapshot?.hillScore,
    riegelScore: riegelData?.score,
    activities: scopeActivities,
  });

  const axes = [
    {
      key: "vo2max",
      label: "VO₂max",
      score: clamp01(normalizeVdotToScore(vdotMaster)),
      detail: `VDOT consolidé ${vdotMaster.toFixed(1)} (Daniels 1979)`,
    },
    {
      key: "vitesse",
      label: "Vitesse",
      score: vdot5k ? clamp01(normalizeVdotToScore(vdot5k)) : 0,
      detail: vdot5k ? `VDOT 5 km ${vdot5k.toFixed(1)}` : "Pas de record 5 km récent",
    },
    {
      key: "seuil",
      label: "Seuil",
      score: (vdot10k || vdotHalf)
        ? clamp01(normalizeVdotToScore(vdot10k || vdotHalf))
        : 0,
      detail: vdot10k
        ? `VDOT 10 km ${vdot10k.toFixed(1)} (T-pace ~88 % VO₂max)`
        : vdotHalf
          ? `VDOT semi ${vdotHalf.toFixed(1)} (proxy seuil)`
          : "Pas de record 10 km/semi récent",
    },
    {
      key: "endurance",
      label: "Endurance",
      score: clamp01(enduranceScore),
      detail: riegelData
        ? `Exposant Riegel ${riegelData.exponent.toFixed(3)} (${riegelData.reference})`
        : "Estimation VDOT marathon faute de records 5 km + long",
    },
    {
      key: "muscular",
      label: "Endurance musculaire",
      score: clamp01(muscular.score),
      detail: muscular.detail,
      source: muscular.source,
    },
  ];

  // 4. Indicateurs cles estimes (paces et race predictions).
  const keyIndicators = (vdotProfile.racePredictions || []).slice(0, 4);

  // 5. Limites de lecture (top 3).
  const limits = [
    {
      title: "Échantillon",
      text: "Le VDOT estime un potentiel à partir de records récents maximaux. Sans course-test ni effort soutenu sur la fenêtre, la valeur peut sous-estimer ton niveau ou se figer.",
    },
    {
      title: "Terrain",
      text: "La méthode Daniels suppose une référence route plate. Trail, dénivelé et conditions techniques biaisent l'effort équivalent et donc le VDOT.",
    },
    {
      title: "Variabilité physiologique",
      text: "Le VDOT prédit la VO₂max théorique, pas l'économie de course individuelle, la cinétique lactate, l'hydratation ou la motivation. Une mesure laboratoire reste la référence.",
    },
  ];

  // 6. À retenir scientifique.
  const masterScore = normalizeVdotToScore(vdotMaster);
  const masterLevel = describeVdotLevel(vdotMaster);
  const dominantAxis = axes.reduce((best, ax) => (!best || ax.score > best.score ? ax : best), null);
  const weakestAxis = axes.reduce((worst, ax) => (!worst || ax.score < worst.score ? ax : worst), null);
  const paragraphs = [
    `VDOT ${vdotMaster.toFixed(1)} (Daniels 1979), niveau « ${masterLevel.label || "consolidé"} ». Score profil global ${Math.round(masterScore)}/100.`,
  ];
  if (dominantAxis && weakestAxis && dominantAxis.key !== weakestAxis.key) {
    paragraphs.push(
      `Profil dominant : ${dominantAxis.label} (${Math.round(dominantAxis.score)}/100). Axe le plus en retrait : ${weakestAxis.label} (${Math.round(weakestAxis.score)}/100) — cible privilégiée pour ton prochain bloc.`,
    );
  }

  return {
    hasData: true,
    title: "VDOT & profil",
    stabilizationWindowDays: STABILIZATION_WINDOW_DAYS,
    kpi: {
      vdot: vdotMaster,
      formattedVdot: vdotMaster.toFixed(1),
      level: masterLevel,
      profileScore: Math.round(masterScore),
    },
    history: Array.isArray(vdotHistory?.snapshots)
      ? vdotHistory.snapshots
        .filter((s) => Number.isFinite(Number(s.vdotValue)) && Number(s.vdotValue) > 0)
        .map((s) => ({ label: s.date, value: Number(s.vdotValue), source: s.source }))
      : [],
    profile5D: axes,
    keyIndicators,
    confidence,
    limits,
    takeaway: { paragraphs, tone: masterLevel?.tone || "neutral" },
    sources: {
      garminEnduranceScore: garminLatestFitnessSnapshot?.enduranceScore ?? null,
      garminHillScore: garminLatestFitnessSnapshot?.hillScore ?? null,
      riegelExponent: riegelData?.exponent ?? null,
    },
  };
}
