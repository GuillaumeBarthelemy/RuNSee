// Profil de performance Daniels : VO2max (~ VO2max) et allures cibles E/M/T/I/R.
//
// Reference : Jack Daniels, Daniels' Running Formula (4e ed., 2022). Les formules
// utilisees ci-dessous sont les regressions Daniels & Gilbert publiees a l'origine
// dans Oxygen power: performance tables for distance runners (1979) et reprises
// telles quelles dans le livre.

const RUN_DISTANCE_TARGETS = [
  { key: "5k", distanceMeters: 5000, label: "5 km", weight: 1 },
  { key: "10k", distanceMeters: 10000, label: "10 km", weight: 1.05 },
  { key: "halfMarathon", distanceMeters: 21097.5, label: "Semi-marathon", weight: 1 },
  { key: "marathon", distanceMeters: 42195, label: "Marathon", weight: 0.8 },
];

export const ROAD_RACE_PREDICTION_TARGETS = RUN_DISTANCE_TARGETS;

// Pourcentages de VO2max cibles pour chaque allure d'entrainement Daniels.
// Source : Daniels (2022), Table 5.2.
export const DANIELS_PACE_INTENSITIES = [
  { key: "E", label: "Endurance fondamentale (E)", percentage: 65, range: "65-78 % VO2max", description: "Sorties longues et footings de recuperation. Allure conversationnelle." },
  { key: "M", label: "Allure marathon (M)", percentage: 84, range: "80-85 % VO2max", description: "Allure cible course de fond longue, soutenable 2 a 3 heures." },
  { key: "T", label: "Seuil (T)", percentage: 88, range: "86-88 % VO2max", description: "Tempo runs ou cruise intervals : 20 a 60 minutes cumulees." },
  { key: "I", label: "VO2max (I)", percentage: 98, range: "95-100 % VO2max", description: "Intervalles 3 a 5 minutes, cible developpement aerobie maximal." },
  { key: "R", label: "Vitesse pure (R)", percentage: 105, range: "~ 105 % VO2max", description: "Intervalles courts 200 a 400 m, economie de course et puissance neuromusculaire." },
];

const ROAD_TRAINING_PACE_TARGETS = [
  {
    key: "EF",
    label: "EF",
    fullLabel: "Endurance fondamentale",
    range: "Conversationnel",
    description: "Footings faciles, recuperation et sorties longues controlees.",
  },
  {
    key: "S1",
    label: "S1",
    fullLabel: "Endurance active",
    range: "Aerobie soutenue",
    description: "Allure solide mais maitrisee, sous le seuil lactique.",
  },
  {
    key: "S2",
    label: "S2",
    fullLabel: "Seuil / tempo",
    range: "Seuil lactique",
    description: "Tempo, seuil et intervalles longs autour de l'allure soutenable 45-60 min.",
  },
  {
    key: "VO2",
    label: "VO2max",
    fullLabel: "Intervalles VO2max",
    range: "3-5 min",
    description: "Fractions de 3 a 5 minutes, proche de l'allure 3-5 km.",
  },
  {
    key: "R",
    label: "Vitesse",
    fullLabel: "Vitesse / economie",
    range: "200-400 m",
    description: "Repetitions courtes pour economie de course et puissance neuromusculaire.",
  },
];

// Plages indicatives pour qualifier le VO2max (orientees coureur amateur a competiteur).
// Daniels publie les valeurs pour des athletes de toutes categories ; on garde une grille
// simple, a affiner si besoin.
export const VDOT_THRESHOLDS = [
  { max: 35, label: "Decouverte", tone: "neutral" },
  { max: 45, label: "Amateur regulier", tone: "neutral" },
  { max: 55, label: "Competiteur amateur", tone: "positive" },
  { max: 65, label: "Niveau regional", tone: "positive" },
  { max: Infinity, label: "Niveau national / elite", tone: "positive" },
];

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Calcule la consommation d'oxygene (ml/kg/min) pour une vitesse v en m/min,
// d'apres la regression de Daniels : 0.000104 v^2 + 0.182258 v - 4.6.
function oxygenCostFromVelocity(velocityMperMin) {
  const v = Math.max(0, toFiniteNumber(velocityMperMin));
  return 0.000104 * v * v + 0.182258 * v - 4.6;
}

// Pourcentage de VO2max soutenu sur une duree t en minutes, regression Daniels :
// 0.8 + 0.1894393 * exp(-0.012778 t) + 0.2989558 * exp(-0.1932605 t).
function vo2maxPercentageFromDurationMinutes(durationMinutes) {
  const t = Math.max(0.1, toFiniteNumber(durationMinutes));
  return (
    0.8
    + 0.1894393 * Math.exp(-0.012778 * t)
    + 0.2989558 * Math.exp(-0.1932605 * t)
  );
}

// VO2max a partir d'un effort (distance + temps).
// Retourne 0 si l'effort n'est pas exploitable (distance/temps absurdes).
export function calculateVdot({ distanceMeters, elapsedSeconds }) {
  const distance = toFiniteNumber(distanceMeters);
  const duration = toFiniteNumber(elapsedSeconds);
  const distanceKm = distance / 1000;
  const paceSecondsPerKm = distanceKm > 0 ? duration / distanceKm : 0;

  if (
    distance < 1500
    || distance > 50000
    || duration < 120
    || paceSecondsPerKm < 120
    || paceSecondsPerKm > 900
  ) {
    return 0;
  }

  const minutes = duration / 60;
  const velocity = distance / minutes;
  const oxygenCost = oxygenCostFromVelocity(velocity);
  const intensityFraction = vo2maxPercentageFromDurationMinutes(minutes);

  if (intensityFraction <= 0) {
    return 0;
  }

  const vdot = oxygenCost / intensityFraction;
  return Number.isFinite(vdot) && vdot > 0 ? Number(vdot.toFixed(1)) : 0;
}

// Inversion : a partir d'un VO2max et d'un pourcentage de VO2max cible,
// retourne l'allure (sec/km) a maintenir. Utilise pour deriver les allures Daniels.
export function paceFromVdotAndIntensity(vdot, intensityPercentage) {
  const targetVo2 = toFiniteNumber(vdot) * (toFiniteNumber(intensityPercentage) / 100);

  if (targetVo2 <= 0) {
    return 0;
  }

  // Resout 0.000104 v^2 + 0.182258 v - 4.6 = targetVo2 pour v en m/min.
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - targetVo2;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return 0;
  }

  const velocity = (-b + Math.sqrt(discriminant)) / (2 * a);

  if (!Number.isFinite(velocity) || velocity <= 0) {
    return 0;
  }

  // velocite en m/min -> pace en s/km : 1000 m / v (m/min) * 60 s/min
  return Math.round((60000 / velocity) * 10) / 10;
}

// Derive les allures Daniels (E/M/T/I/R) a partir d'un VO2max.
export function buildDanielsTrainingPaces(vdot) {
  const safeVdot = toFiniteNumber(vdot);

  if (safeVdot <= 0) {
    return DANIELS_PACE_INTENSITIES.map((entry) => ({
      ...entry,
      paceSecondsPerKm: 0,
    }));
  }

  return DANIELS_PACE_INTENSITIES.map((entry) => ({
    ...entry,
    paceSecondsPerKm: paceFromVdotAndIntensity(safeVdot, entry.percentage),
  }));
}

function getPredictionPace(predictions = [], key) {
  const entry = predictions.find((prediction) => prediction?.key === key);
  return toFiniteNumber(entry?.paceSecondsPerKm);
}

function buildTrainingPaceRange({ faster = 0, slower = 0 }) {
  const safeFaster = Math.max(0, toFiniteNumber(faster));
  const safeSlower = Math.max(0, toFiniteNumber(slower));

  if (safeFaster <= 0 || safeSlower <= 0) {
    return { faster: 0, slower: 0 };
  }

  return {
    faster: Math.min(safeFaster, safeSlower),
    slower: Math.max(safeFaster, safeSlower),
  };
}

export function buildRoadTrainingPaces(vdot, racePredictions = []) {
  const safeVdot = toFiniteNumber(vdot);
  const fallbackPaces = buildDanielsTrainingPaces(safeVdot);
  const fallbackByKey = Object.fromEntries(fallbackPaces.map((entry) => [entry.key, entry.paceSecondsPerKm]));
  const pace5k = getPredictionPace(racePredictions, "5k") || fallbackByKey.I || 0;
  const pace10k = getPredictionPace(racePredictions, "10k") || fallbackByKey.T || 0;
  const paceHalf = getPredictionPace(racePredictions, "halfMarathon") || 0;
  const thresholdPace = pace10k > 0 && paceHalf > 0
    ? Math.round((((pace10k + 10) + Math.max(paceHalf - 8, pace10k + 8)) / 2) * 10) / 10
    : fallbackByKey.T || 0;

  const ranges = {
    // Ces plages suivent une traduction pratique des reperes Daniels/Pfitzinger :
    // facile largement plus lent que 10 km, endurance active sous seuil, seuil autour
    // de l'allure soutenable 45-60 min, VO2 proche 3-5 km, vitesse plus rapide que 5 km.
    EF: buildTrainingPaceRange({ faster: pace10k + 60, slower: pace10k + 100 }),
    S1: buildTrainingPaceRange({ faster: pace10k + 35, slower: pace10k + 55 }),
    S2: buildTrainingPaceRange({ faster: thresholdPace - 4, slower: thresholdPace + 5 }),
    VO2: buildTrainingPaceRange({ faster: pace5k - 5, slower: pace5k + 8 }),
    R: buildTrainingPaceRange({ faster: pace5k - 25, slower: pace5k - 12 }),
  };

  return ROAD_TRAINING_PACE_TARGETS.map((entry) => {
    const range = ranges[entry.key] || { faster: 0, slower: 0 };
    const paceSecondsPerKm = range.faster > 0 && range.slower > 0
      ? Math.round(((range.faster + range.slower) / 2) * 10) / 10
      : fallbackByKey[entry.key] || 0;

    return {
      ...entry,
      paceSecondsPerKm,
      paceRangeSecondsPerKm: range,
    };
  });
}

export function predictRaceTimeFromVdot({ vdot, distanceMeters }) {
  const safeVdot = toFiniteNumber(vdot);
  const distance = toFiniteNumber(distanceMeters);

  if (safeVdot <= 0 || distance <= 0) {
    return 0;
  }

  const distanceKm = distance / 1000;
  let lowerSeconds = Math.max(120, distanceKm * 120);
  let upperSeconds = Math.min(distanceKm * 900, 9 * 3600);

  for (let index = 0; index < 48; index += 1) {
    const midpoint = (lowerSeconds + upperSeconds) / 2;
    const midpointVdot = calculateVdot({
      distanceMeters: distance,
      elapsedSeconds: midpoint,
    });

    if (midpointVdot > safeVdot) {
      lowerSeconds = midpoint;
    } else {
      upperSeconds = midpoint;
    }
  }

  return Math.round((lowerSeconds + upperSeconds) / 2);
}

export function buildRoadRacePredictions(vdot, options = {}) {
  const safeVdot = toFiniteNumber(vdot);
  const candidates = Array.isArray(options.candidates) ? options.candidates : [];

  return ROAD_RACE_PREDICTION_TARGETS.map((target) => {
    const danielsSeconds = predictRaceTimeFromVdot({
      vdot: safeVdot,
      distanceMeters: target.distanceMeters,
    });
    const predictedSeconds = buildHybridRacePrediction({
      danielsSeconds,
      target,
      candidates,
    });
    const distanceKm = target.distanceMeters / 1000;

    return {
      ...target,
      predictedSeconds,
      paceSecondsPerKm: predictedSeconds > 0 && distanceKm > 0
        ? Math.round((predictedSeconds / distanceKm) * 10) / 10
        : 0,
    };
  });
}

export function describeVdotLevel(vdot) {
  const safeVdot = toFiniteNumber(vdot);

  if (safeVdot <= 0) {
    return { label: "-", tone: "neutral" };
  }

  return VDOT_THRESHOLDS.find((threshold) => safeVdot < threshold.max) || VDOT_THRESHOLDS[VDOT_THRESHOLDS.length - 1];
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, toFiniteNumber(value)));
}

function predictRiegelTime(sourceSeconds, sourceDistanceMeters, targetDistanceMeters, exponent) {
  const seconds = toFiniteNumber(sourceSeconds);
  const sourceDistance = toFiniteNumber(sourceDistanceMeters);
  const targetDistance = toFiniteNumber(targetDistanceMeters);

  if (seconds <= 0 || sourceDistance <= 0 || targetDistance <= 0) {
    return 0;
  }

  return seconds * Math.pow(targetDistance / sourceDistance, exponent);
}

function deriveObservedExponent(candidates = [], leftKey, rightKey, fallback) {
  const left = candidates.find((candidate) => candidate.recordKey === leftKey && toFiniteNumber(candidate.elapsedSeconds) > 0);
  const right = candidates.find((candidate) => candidate.recordKey === rightKey && toFiniteNumber(candidate.elapsedSeconds) > 0);

  if (!left || !right) {
    return fallback;
  }

  const exponent = Math.log(toFiniteNumber(right.elapsedSeconds) / toFiniteNumber(left.elapsedSeconds))
    / Math.log(toFiniteNumber(right.distanceMeters) / toFiniteNumber(left.distanceMeters));

  return Number.isFinite(exponent) ? exponent : fallback;
}

function getRaceProjectionExponent(sourceKey, targetKey, candidates = []) {
  const shortExponent = clampValue(deriveObservedExponent(candidates, "5k", "10k", 1.06), 1.02, 1.09);
  const longExponent = clampValue(deriveObservedExponent(candidates, "10k", "halfMarathon", 1.12), 1.08, 1.16);

  if (sourceKey === "marathon" || targetKey === "marathon") {
    return longExponent;
  }

  if (sourceKey === "halfMarathon" || targetKey === "halfMarathon") {
    return Math.min(1.11, Math.max(1.07, (longExponent + 1.08) / 2));
  }

  return shortExponent;
}

function weightedAverageEstimates(estimates = []) {
  const validEstimates = estimates
    .map((estimate) => ({
      seconds: toFiniteNumber(estimate.seconds),
      weight: Math.max(0, toFiniteNumber(estimate.weight)),
    }))
    .filter((estimate) => estimate.seconds > 0 && estimate.weight > 0);
  const totalWeight = validEstimates.reduce((sum, estimate) => sum + estimate.weight, 0);

  if (!validEstimates.length || totalWeight <= 0) {
    return 0;
  }

  return Math.round(
    validEstimates.reduce((sum, estimate) => sum + estimate.seconds * estimate.weight, 0) / totalWeight,
  );
}

function buildHybridRacePrediction({ danielsSeconds = 0, target = {}, candidates = [] } = {}) {
  const estimates = [];
  const targetKey = target.key;
  const targetDistance = toFiniteNumber(target.distanceMeters);
  const directCandidate = candidates.find((candidate) => candidate.recordKey === targetKey && toFiniteNumber(candidate.elapsedSeconds) > 0);
  const hasLongRoadSource = candidates.some(
    (candidate) => ["10k", "halfMarathon", "marathon"].includes(candidate.recordKey) && toFiniteNumber(candidate.elapsedSeconds) > 0,
  );

  if (danielsSeconds > 0 && (targetKey !== "marathon" || !hasLongRoadSource)) {
    estimates.push({
      seconds: danielsSeconds,
      weight: targetKey === "halfMarathon" ? 1.35 : 0.65,
    });
  }

  candidates.forEach((candidate) => {
    const sourceSeconds = toFiniteNumber(candidate.elapsedSeconds);
    const sourceDistance = toFiniteNumber(candidate.distanceMeters);

    if (sourceSeconds <= 0 || sourceDistance <= 0 || targetDistance <= 0) {
      return;
    }

    if (targetKey === "marathon" && sourceDistance < 9500) {
      return;
    }

    const distanceRatio = Math.max(sourceDistance, targetDistance) / Math.max(1, Math.min(sourceDistance, targetDistance));

    if (targetKey !== "marathon" && distanceRatio > 3) {
      return;
    }

    if (targetKey === "halfMarathon" && sourceDistance < 9000) {
      return;
    }

    if (targetKey === "5k" && sourceDistance > 11000) {
      return;
    }

    const exponent = getRaceProjectionExponent(candidate.recordKey, targetKey, candidates);
    const prediction = predictRiegelTime(sourceSeconds, sourceDistance, targetDistance, exponent);
    const proximityWeight = 1 / Math.pow(distanceRatio, 0.55);
    const directWeight = candidate.recordKey === targetKey ? 2.1 : 1;
    const longWeight = targetKey === "marathon" && candidate.recordKey === "halfMarathon" ? 1.35 : 1;
    const sourceWeight = Math.max(0.45, toFiniteNumber(candidate.compositeWeight) || toFiniteNumber(candidate.weight) || 1);

    estimates.push({
      seconds: prediction,
      weight: sourceWeight * proximityWeight * directWeight * longWeight,
    });
  });

  const predictedSeconds = weightedAverageEstimates(estimates) || Math.round(danielsSeconds);

  if (directCandidate?.elapsedSeconds > 0 && predictedSeconds > 0) {
    return Math.min(predictedSeconds, Math.round(directCandidate.elapsedSeconds));
  }

  return predictedSeconds;
}

function getRecordReliabilityWeight(candidate = {}) {
  if (candidate.isOfficial && candidate.sourceType === "best-effort") {
    return 1.15;
  }

  if (candidate.isOfficial) {
    return 1.05;
  }

  if (candidate.sourceType === "named-activity") {
    return 0.85;
  }

  return 0.95;
}

function getRecordTerrainWeight(candidate = {}) {
  if (candidate.isTrailLike) {
    return 0.65;
  }

  if (candidate.elevationGainPerKm >= 25) {
    return 0.70;
  }

  if (candidate.elevationGainPerKm >= 15) {
    return 0.85;
  }

  return 1;
}

function getRecordRecencyWeight(ageDays) {
  if (ageDays === null || ageDays === undefined) {
    return 0.75;
  }

  const safeAge = Math.max(0, toFiniteNumber(ageDays));

  if (safeAge <= 120) {
    return 1;
  }

  if (safeAge <= 365) {
    return 1 - ((safeAge - 120) / 245) * 0.35;
  }

  return 0.45;
}

function getWeightedMedian(candidates = []) {
  const sorted = [...candidates].sort((left, right) => left.vdot - right.vdot);
  const totalWeight = sorted.reduce((sum, candidate) => sum + candidate.compositeWeight, 0);
  let cumulativeWeight = 0;

  for (const candidate of sorted) {
    cumulativeWeight += candidate.compositeWeight;

    if (cumulativeWeight >= totalWeight / 2) {
      return candidate.vdot;
    }
  }

  return sorted[sorted.length - 1]?.vdot || 0;
}

function getActivityDistanceKm(activity = {}, fallbackDistanceMeters = 0) {
  const explicitDistanceKm = toFiniteNumber(activity?.__distanceKm);
  if (explicitDistanceKm > 0) {
    return explicitDistanceKm;
  }

  const distanceMeters = toFiniteNumber(activity?.distance);
  if (distanceMeters > 0) {
    return distanceMeters / 1000;
  }

  return toFiniteNumber(fallbackDistanceMeters) / 1000;
}

function getActivityElevationGain(activity = {}) {
  return toFiniteNumber(activity?.__elevationGain ?? activity?.totalElevationGain);
}

function isTrailLikeActivity(activity = {}) {
  const sport = String(activity?.sportType || activity?.type || "").toLowerCase();
  const text = `${activity?.name || ""} ${activity?.description || ""}`.toLowerCase();
  return sport.includes("trail") || text.includes("trail");
}

function describeConfidence(score = 0) {
  const safeScore = Math.max(0, Math.min(100, Math.round(toFiniteNumber(score))));

  if (safeScore >= 75) {
    return { score: safeScore, label: "Haute", tone: "positive" };
  }

  if (safeScore >= 58) {
    return { score: safeScore, label: "Correcte", tone: "neutral" };
  }

  if (safeScore >= 40) {
    return { score: safeScore, label: "Moyenne", tone: "warning" };
  }

  return { score: safeScore, label: "Prudente", tone: "danger" };
}

function getRaceConfidenceScore({ record = null, candidate = null, target = {}, finalCandidates = [] } = {}) {
  let score = 28;

  if (record?.isAvailable) {
    score += 14;
  }

  if (record?.isOfficial) {
    score += 12;
  }

  if (record?.sourceType === "best-effort" || record?.sourceType === "best-effort-linked-activity") {
    score += 8;
  }

  if (candidate?.ageDays !== null && candidate?.ageDays !== undefined) {
    if (candidate.ageDays <= 120) {
      score += 12;
    } else if (candidate.ageDays <= 365) {
      score += 8;
    } else {
      score += 2;
    }
  }

  if (candidate && finalCandidates.some((entry) => entry.recordKey === candidate.recordKey)) {
    score += 10;
  }

  if (candidate && !candidate.isTrailLike && candidate.elevationGainPerKm < 12) {
    score += 10;
  } else if (candidate?.isTrailLike || candidate?.elevationGainPerKm >= 25) {
    score -= 12;
  }

  if (target.key === "marathon") {
    score -= 12;
  } else if (target.key === "halfMarathon") {
    score -= 4;
  }

  return Math.max(15, Math.min(95, score));
}

function buildRoadRaceRows({ records = [], predictions = [], weightedCandidates = [], finalCandidates = [] } = {}) {
  return ROAD_RACE_PREDICTION_TARGETS.map((target) => {
    const record = records.find((entry) => entry?.recordKey === target.key) || null;
    const candidate = weightedCandidates.find((entry) => entry.recordKey === target.key) || null;
    const prediction = predictions.find((entry) => entry.key === target.key) || null;
    const confidence = describeConfidence(getRaceConfidenceScore({
      record,
      candidate,
      target,
      finalCandidates,
    }));
    const predictedSeconds = toFiniteNumber(prediction?.predictedSeconds);
    const recordSeconds = record?.isAvailable ? toFiniteNumber(record.elapsedSeconds) : 0;
    const distanceKm = target.distanceMeters / 1000;

    return {
      ...target,
      recordSeconds,
      recordPaceSecondsPerKm: recordSeconds > 0 && distanceKm > 0
        ? Math.round((recordSeconds / distanceKm) * 10) / 10
        : 0,
      record,
      predictedSeconds,
      predictedPaceSecondsPerKm: prediction?.paceSecondsPerKm || 0,
      confidence,
      isTerrainLimited: Boolean(candidate?.isTrailLike || candidate?.elevationGainPerKm >= 25),
    };
  });
}

function describeRoadProfile(finalCandidates = []) {
  const shortCandidates = finalCandidates.filter((candidate) => ["5k", "10k"].includes(candidate.recordKey));
  const longCandidates = finalCandidates.filter((candidate) => ["halfMarathon", "marathon"].includes(candidate.recordKey));
  const average = (items) => {
    if (!items.length) return 0;
    return items.reduce((sum, item) => sum + item.vdot, 0) / items.length;
  };
  const shortVdot = average(shortCandidates);
  const longVdot = average(longCandidates);

  if (shortVdot > 0 && longVdot > 0) {
    const delta = shortVdot - longVdot;
    if (delta >= 2) {
      return "Profil plus rapide sur court que sur long : potentiel vitesse fort, endurance specifique a consolider.";
    }

    if (delta <= -2) {
      return "Profil endurant : tes distances longues soutiennent bien ton niveau court.";
    }
  }

  return "Profil route equilibre sur les records retenus.";
}

// Construit le profil VO2max a partir d'un set de records route deja calcule par
// buildBestEffortRecords (5 km / 10 km / semi / marathon).
// Strategie :
//  1. Pour chaque distance disponible, calculer un VO2max candidat.
//  2. Ponderer par fiabilite de la source, recence et specificite de distance.
//  3. Consolider autour de la mediane ponderee pour limiter les records aberrants.
//  4. Deriver les allures d'entrainement et les projections route avec le meme VO2max.
export function buildVdotProfile({ records = [], referenceDate = null } = {}) {
  const safeRecords = Array.isArray(records) ? records : [];
  const reference = safeDate(referenceDate) || new Date();

  const candidates = safeRecords
    .map((record) => {
      const target = RUN_DISTANCE_TARGETS.find((entry) => entry.key === record?.recordKey);

      if (!target || !record?.isAvailable || !record?.elapsedSeconds) {
        return null;
      }

      const activityDate = safeDate(record?.activity?.startDateLocal || record?.activity?.startDate);
      const ageDays = activityDate
        ? Math.max(0, Math.round((reference - activityDate) / 86400000))
        : null;
      const vdot = calculateVdot({
        distanceMeters: target.distanceMeters,
        elapsedSeconds: record.elapsedSeconds,
      });

      if (vdot <= 0) {
        return null;
      }

      return {
        recordKey: target.key,
        recordLabel: target.label,
        distanceMeters: target.distanceMeters,
        elapsedSeconds: record.elapsedSeconds,
        paceSecondsPerKm: record.paceSecondsPerKm || Math.round((record.elapsedSeconds / (target.distanceMeters / 1000)) * 10) / 10,
        ageDays,
        vdot,
        weight: target.weight,
        isOfficial: record.isOfficial === true,
        sourceType: record.sourceType || "",
        activity: record.activity || null,
        isTrailLike: isTrailLikeActivity(record.activity),
        elevationGainPerKm: getActivityElevationGain(record.activity) / Math.max(1, getActivityDistanceKm(record.activity, target.distanceMeters)),
      };
    })
    .filter(Boolean);

  if (!candidates.length) {
    return {
      hasData: false,
      vdot: 0,
      level: describeVdotLevel(0),
      paces: buildDanielsTrainingPaces(0),
      roadPaces: buildRoadTrainingPaces(0),
      source: null,
      sampleSize: 0,
      usedSampleSize: 0,
      racePredictions: buildRoadRacePredictions(0),
      raceRows: buildRoadRaceRows({ records: safeRecords, predictions: buildRoadRacePredictions(0) }),
      confidence: describeConfidence(0),
      profileSummary: "Pas encore assez de records route comparables.",
      message: "Pas encore de record route exploitable pour estimer ton VO2max.",
    };
  }

  // Pondere fiabilite + recence + priorite distance.
  const weightedCandidates = candidates.map((candidate) => {
    const recencyWeight = getRecordRecencyWeight(candidate.ageDays);
    const reliabilityWeight = getRecordReliabilityWeight(candidate);

    return {
      ...candidate,
      recencyWeight,
      reliabilityWeight,
      terrainWeight: getRecordTerrainWeight(candidate),
      compositeWeight: candidate.weight * recencyWeight * reliabilityWeight * getRecordTerrainWeight(candidate),
    };
  });

  const medianVdot = getWeightedMedian(weightedCandidates);
  const robustCandidates = weightedCandidates.length >= 3
    ? weightedCandidates.filter((candidate) => Math.abs(candidate.vdot - medianVdot) <= Math.max(3, medianVdot * 0.08))
    : weightedCandidates;
  const finalCandidates = robustCandidates.length ? robustCandidates : weightedCandidates;
  const totalWeight = finalCandidates.reduce((sum, candidate) => sum + candidate.compositeWeight, 0);
  const weightedVdot = totalWeight > 0
    ? finalCandidates.reduce((sum, candidate) => sum + candidate.vdot * candidate.compositeWeight, 0) / totalWeight
    : 0;
  const consolidatedVdot = Number(weightedVdot.toFixed(1));
  const racePredictions = buildRoadRacePredictions(consolidatedVdot, { candidates: finalCandidates });
  const raceRows = buildRoadRaceRows({
    records: safeRecords,
    predictions: racePredictions,
    weightedCandidates,
    finalCandidates,
  });
  const averageConfidence = raceRows.length
    ? raceRows.reduce((sum, row) => sum + row.confidence.score, 0) / raceRows.length
    : 0;

  // Source = effort dont le VO2max est le plus proche de la valeur consolidee.
  const sortedByDistance = [...finalCandidates].sort(
    (left, right) => Math.abs(left.vdot - consolidatedVdot) - Math.abs(right.vdot - consolidatedVdot),
  );
  const source = sortedByDistance[0] || null;

  return {
    hasData: true,
    vdot: consolidatedVdot,
    vo2maxEstimate: consolidatedVdot,
    level: describeVdotLevel(consolidatedVdot),
    paces: buildDanielsTrainingPaces(consolidatedVdot),
    roadPaces: buildRoadTrainingPaces(consolidatedVdot, racePredictions),
    racePredictions,
    raceRows,
    source,
    sampleSize: candidates.length,
    usedSampleSize: finalCandidates.length,
    candidates: weightedCandidates,
    confidence: describeConfidence(averageConfidence),
    profileSummary: describeRoadProfile(finalCandidates),
    message: source
      ? `VO2max consolide a partir de ${finalCandidates.length}/${candidates.length} record(s) route. Source principale : ${source.recordLabel}.`
      : "VO2max estime sur tes records route recents.",
  };
}
