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
// Fenetre de prise en compte des records pour le profil 5D.
// Reference : Mujika & Padilla 2003 — VO2max perd 1-2 %/mois en detraining
// mais reste 80-85 % a 12 mois. Une fenetre 365 jours avec decay au-dela de
// 90 jours est scientifiquement defendable.
const RECORDS_WINDOW_DAYS = 365;
const DECAY_START_DAYS = 90;
const DECAY_PER_MONTH = 0.01; // 1 % par mois

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

// (ageDecayFactor n'est plus utilise — la fenetre 365j + ponderation buildVdotProfile
// gerent la decroissance des records anciens. Conserve le constant DECAY_PER_MONTH
// pour documentation future si on reintroduit le decay.)
// Reference Mujika & Padilla 2003 : VO2max perd ~1 %/mois en detraining specifique.

/**
 * Normalise un VDOT d'axe RELATIVEMENT au VDOT master de l'utilisateur.
 * 50 = niveau equilibre (= master VDOT) ; > 50 = axe en avance ; < 50 = a developper.
 * Spread typique max entre axes (Daniels 2014) ~4 points VDOT.
 *
 * Exemple : master = 54, 5k = 56 -> deviation = +2 -> score = 50 + (2/4)*50 = 75
 */
function normalizeAxisVdotVsMaster(axisVdot, masterVdot) {
  const a = Number(axisVdot);
  const m = Number(masterVdot);
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(m) || m <= 0) return null;
  const deviation = a - m;
  const score = 50 + (deviation / 4) * 50;
  return Math.max(0, Math.min(100, score));
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
 * Selectionne le best record (plus rapide) sur la fenetre RECORDS_WINDOW_DAYS.
 * Decay age non applique ici (le master VDOT applique deja sa propre ponderation
 * recence via buildVdotProfile — appliquer le decay seulement sur les axes
 * specifiques creerait une incoherence avec le master).
 */
function vdotForDistance(records, distanceMeters, referenceDate) {
  if (!Array.isArray(records)) return null;
  const reference = safeDate(referenceDate) || new Date();
  const matches = records
    .filter((r) => r?.isAvailable && r?.elapsedSeconds > 0
      && r?.distanceMeters && Math.abs(r.distanceMeters - distanceMeters) < 100)
    .map((r) => {
      const date = safeDate(r?.activity?.startDateLocal || r?.activity?.startDate);
      const ageDays = date ? Math.max(0, (reference - date) / MS_PER_DAY) : 0;
      const rawVdot = calculateVdot({ distanceMeters, elapsedSeconds: r.elapsedSeconds });
      return { rawVdot, ageDays };
    })
    .filter((m) => m.ageDays <= RECORDS_WINDOW_DAYS && m.rawVdot > 0);
  if (!matches.length) return null;
  const best = matches.reduce((acc, m) => (!acc || m.rawVdot > acc.rawVdot ? m : acc), null);
  return best?.rawVdot ?? null;
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
 * Filtre records sur fenetre RECORDS_WINDOW_DAYS (365 jours).
 * Decay age applique en aval dans vdotForDistance (Mujika 2003).
 */
function filterRecordsInWindow(records, referenceDate) {
  if (!Array.isArray(records)) return [];
  const reference = safeDate(referenceDate) || new Date();
  const cutoff = new Date(reference.getTime() - RECORDS_WINDOW_DAYS * MS_PER_DAY);
  return records.filter((r) => {
    const date = safeDate(r?.activity?.startDateLocal || r?.activity?.startDate);
    if (!date) return true;
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
  economySignal = null,
} = {}) {
  const reference = safeDate(referenceDate) || new Date();

  // 1. Records sur fenetre 365j (decay age en aval, cf Mujika 2003).
  const allRecords = buildBestEffortRecords(scopeActivities);
  const recordsInWindow = filterRecordsInWindow(allRecords, reference);

  // 2. VDOT consolide (Daniels) sur tous les records exploitables sur 365j.
  const vdotProfile = buildVdotProfile({
    records: recordsInWindow.length ? recordsInWindow : allRecords,
    referenceDate: reference,
  });

  if (!vdotProfile?.hasData) {
    return {
      hasData: false,
      title: "VDOT & profil",
      emptyReason: "Nous avons besoin de plus d'activités récentes avec allure et fréquence cardiaque pour estimer ton profil.",
      recordsWindowDays: RECORDS_WINDOW_DAYS,
    };
  }

  // 3. Calcul des 5 axes.
  const RECORD_KEY_TO_METERS = {
    "5k": 5000,
    "10k": 10000,
    halfMarathon: 21097.5,
    marathon: 42195,
  };
  const recordsWithDistance = recordsInWindow
    .filter((r) => r?.isAvailable && r?.elapsedSeconds > 0)
    .map((r) => ({ ...r, distanceMeters: RECORD_KEY_TO_METERS[r.recordKey] || 0 }))
    .filter((r) => r.distanceMeters > 0);

  // CALIBRATION SCIENTIFIQUE — Headline vs reference axes :
  //
  // VO2max Garmin Firstbeat et VDOT Daniels ne sont PAS sur la meme echelle.
  // Garmin (Firstbeat) estime la VO2max avec l'economie de course individuelle
  // (HR + allure + cinetique). Daniels assume une economie de course MOYENNE.
  // Un coureur entraine -> economie > moyenne -> Garmin > Daniels (parfois 3-6 pts).
  //
  // Le headline KPI utilise Garmin (mieux calibre pour le niveau actuel).
  // Mais les axes du profil 5D sont CALCULES en Daniels (axisVdotDaniels) et
  // doivent etre compares au master Daniels (= vdotProfile.vdot consolide sur
  // les memes records). Comparer un axe Daniels vs un master Garmin produit
  // un biais systematique qui sous-evalue tous les axes.
  const latestVdotSnapshot = vdotHistory?.latestSnapshot
    || (Array.isArray(vdotHistory?.snapshots) && vdotHistory.snapshots.length
      ? vdotHistory.snapshots[vdotHistory.snapshots.length - 1]
      : null);
  const garminMasterVdot = latestVdotSnapshot && latestVdotSnapshot.source === "garmin"
    && Number.isFinite(Number(latestVdotSnapshot.vdotValue))
    && Number(latestVdotSnapshot.vdotValue) > 0
    ? Number(latestVdotSnapshot.vdotValue)
    : null;

  // Master utilise pour les calculs d'axes (toujours Daniels, scale-coherente).
  const vdotMasterDaniels = vdotProfile.vdot;
  // Master utilise pour le headline KPI (priorite Garmin, fallback Daniels).
  const vdotMaster = garminMasterVdot != null ? garminMasterVdot : vdotMasterDaniels;
  const vdotMasterSource = garminMasterVdot != null ? "garmin" : "daniels_internal";

  // VDOT specifiques par distance (avec decay age pour valoriser efforts < 90j
  // sans exclure les anciens records jusqu'a 365j).
  const vdot5k = vdotForDistance(recordsWithDistance, 5000, reference);
  const vdot10k = vdotForDistance(recordsWithDistance, 10000, reference);
  const vdotHalf = vdotForDistance(recordsWithDistance, 21097.5, reference);
  const vdotMarathon = vdotForDistance(recordsWithDistance, 42195, reference);

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
  // Si Riegel disponible : on utilise le score Riegel (deja centre 1.06 -> 50).
  // Sinon : on normalise le VDOT long (marathon ou semi) vs le master DANIELS
  // pour rester sur la meme echelle que les autres axes.
  const enduranceScore = riegelData?.score != null
    ? riegelData.score
    : (vdotMarathon || vdotHalf
      ? normalizeAxisVdotVsMaster(vdotMarathon || vdotHalf, vdotMasterDaniels) ?? 50
      : 50);

  // Endurance musculaire : 60/40 Hill/Endurance Garmin, fallback Riegel, fallback composite.
  const muscular = buildMuscularEnduranceAxis({
    enduranceScore: garminLatestFitnessSnapshot?.enduranceScore,
    hillScore: garminLatestFitnessSnapshot?.hillScore,
    riegelScore: riegelData?.score,
    activities: scopeActivities,
  });

  // Axes normalises RELATIVEMENT au master DANIELS (coherence d'echelle).
  // Voir bloc 'CALIBRATION SCIENTIFIQUE' plus haut : comparer un axe Daniels
  // a un master Garmin sous-evalue tous les axes a cause du biais d'economie
  // de course (Daniels assume moyenne, Garmin individualise).
  const vo2maxScore = 50; // par definition, master vs master -> 50.
  const vitesseScore = normalizeAxisVdotVsMaster(vdot5k, vdotMasterDaniels);
  const seuilScore = normalizeAxisVdotVsMaster(vdot10k || vdotHalf, vdotMasterDaniels);

  const axes = [
    {
      key: "vo2max",
      label: "VO₂max",
      score: vo2maxScore,
      detail: `VDOT consolidé ${vdotMaster.toFixed(1)} (Daniels 1979) — référence centrale du profil`,
    },
    {
      key: "vitesse",
      label: "Vitesse",
      score: vitesseScore != null ? vitesseScore : 50,
      detail: vdot5k
        ? `VDOT 5 km ${vdot5k.toFixed(1)} vs master ${vdotMaster.toFixed(1)}`
        : "Pas de record 5 km dans la fenêtre 365 j",
    },
    {
      key: "seuil",
      label: "Seuil",
      score: seuilScore != null ? seuilScore : 50,
      detail: vdot10k
        ? `VDOT 10 km ${vdot10k.toFixed(1)} (T-pace ~88 % VO₂max)`
        : vdotHalf
          ? `VDOT semi ${vdotHalf.toFixed(1)} (proxy seuil)`
          : "Pas de record 10 km/semi dans la fenêtre 365 j",
    },
    {
      key: "endurance",
      label: "Endurance",
      score: clamp01(enduranceScore),
      detail: riegelData
        ? `Exposant Riegel ${riegelData.exponent.toFixed(3)} (${riegelData.reference}) — 1.06 = équilibre`
        : vdotMarathon || vdotHalf
          ? `VDOT long ${(vdotMarathon || vdotHalf).toFixed(1)} vs master ${vdotMaster.toFixed(1)}`
          : "Pas de record marathon/semi dans la fenêtre 365 j",
    },
    {
      key: "muscular",
      label: "Endurance musculaire",
      score: clamp01(muscular.score),
      detail: muscular.detail,
      source: muscular.source,
    },
  ];

  // 4. Indicateurs cles estimes pour le card mockup p.13.
  // - threshold pace : T-pace Daniels (key 'T') = ~88 % VO2max
  // - 5k / 10k : race predictions Daniels
  // - VO2max estimee : VDOT (proxy ml/kg/min, cf Daniels 1979)
  const tPace = (vdotProfile.paces || []).find((p) => p.key === "T");
  const pred5k = (vdotProfile.racePredictions || []).find((p) => p.key === "5k");
  const pred10k = (vdotProfile.racePredictions || []).find((p) => p.key === "10k");
  const indicators = {
    thresholdPaceSecondsPerKm: tPace?.paceSecondsPerKm || 0,
    tenKPaceSecondsPerKm: pred10k?.paceSecondsPerKm || 0,
    fiveKPaceSecondsPerKm: pred5k?.paceSecondsPerKm || 0,
    // Economie de course threadee depuis le modele Vue d'ensemble (Lot Q6) :
    // valeur normalisee base 100 + hint (Bonne / Moins efficiente).
    economyValue: economySignal?.hasData ? economySignal.value : null,
    economyHint: economySignal?.hasData ? economySignal.hint : null,
  };
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

  // 6. À retenir style coach mockup p.13 (court, chaleureux).
  const masterLevel = describeVdotLevel(vdotMaster);
  const dominantAxis = axes.reduce((best, ax) => (!best || ax.score > best.score ? ax : best), null);
  const weakestAxis = axes.reduce(
    (worst, ax) => (!worst || (ax.score < worst.score && ax.score > 0) ? ax : worst),
    null,
  );
  // Wording coach : "Ton X est ton meilleur atout. Pour progresser, travaille Y et Z..."
  const COACH_AXIS_NAME = {
    endurance: "endurance",
    seuil: "seuil",
    vitesse: "vitesse",
    vo2max: "VO₂max",
    muscular: "endurance musculaire",
  };
  const paragraphs = [];
  if (dominantAxis) {
    paragraphs.push(`Ton ${COACH_AXIS_NAME[dominantAxis.key] || dominantAxis.label.toLowerCase()} est ton meilleur atout.`);
  }
  if (weakestAxis && dominantAxis && weakestAxis.key !== dominantAxis.key) {
    const weakName = COACH_AXIS_NAME[weakestAxis.key] || weakestAxis.label.toLowerCase();
    paragraphs.push(
      `Pour progresser, travaille régulièrement ta ${weakName} avec des séances courtes et intenses, tout en maintenant ta base aérobie.`,
    );
  }

  // 7. Delta 90j vs 90j precedents (sur vdotHistory).
  let delta90Days = null;
  if (Array.isArray(vdotHistory?.snapshots) && vdotHistory.snapshots.length > 2) {
    const sorted = [...vdotHistory.snapshots]
      .filter((s) => Number.isFinite(Number(s.vdotValue)))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length >= 4) {
      const mid = Math.floor(sorted.length / 2);
      const prevAvg = sorted.slice(0, mid).reduce((sum, s) => sum + Number(s.vdotValue), 0) / mid;
      const curAvg = sorted.slice(mid).reduce((sum, s) => sum + Number(s.vdotValue), 0) / (sorted.length - mid);
      const diff = curAvg - prevAvg;
      if (Math.abs(diff) >= 0.05) {
        delta90Days = {
          value: diff,
          label: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} vs 90 jours précédents`,
          tone: diff > 0 ? "positive" : "warning",
        };
      }
    }
  }

  return {
    hasData: true,
    title: "VDOT & profil",
    recordsWindowDays: RECORDS_WINDOW_DAYS,
    kpi: {
      vdot: vdotMaster,
      formattedVdot: vdotMaster.toFixed(1),
      level: masterLevel,
      source: vdotMasterSource,
      sourceLabel: vdotMasterSource === "garmin" ? "Garmin" : "Estimation interne",
    },
    history: Array.isArray(vdotHistory?.snapshots)
      ? vdotHistory.snapshots
        .filter((s) => Number.isFinite(Number(s.vdotValue)) && Number(s.vdotValue) > 0)
        .map((s) => ({ label: s.date, value: Number(s.vdotValue), source: s.source }))
      : [],
    profile5D: axes,
    keyIndicators,
    indicators,
    delta90Days,
    // Reference pour le radar / bars : master DANIELS (echelle native des axes).
    // Distinct du headline KPI qui peut etre Garmin.
    referenceVdot: vdotMasterDaniels,
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
