// Construit le profil "course objectif" courant : countdown, chrono predit
// pour la distance choisie, allure cible et plan de taper recommande.
//
// Le taper s'inspire du modele Mujika (2010) : reduction progressive du volume
// (-30 a -50 %) sur 10 a 21 jours selon la distance, avec maintien de
// l'intensite jusqu'a J-7. Le TSB cible le jour J est entre +10 et +25.
//
// References :
//   - Mujika I (2010), Intense training: the key to optimal performance before
//     and during the taper. Scand J Med Sci Sports 20 Suppl 2: 24-31.
//   - Bosquet et al. (2007), Effects of tapering on performance: a meta-analysis.

import { calculateVdot, paceFromVdotAndIntensity } from "./runningPerformance.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function safeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRiegelPredictionSeconds(referenceSeconds, referenceDistanceMeters, targetDistanceMeters) {
  if (referenceSeconds <= 0 || referenceDistanceMeters <= 0 || targetDistanceMeters <= 0) {
    return 0;
  }

  const ratio = targetDistanceMeters / referenceDistanceMeters;
  return referenceSeconds * Math.pow(ratio, 1.06);
}

function pickClosestRecord(records = [], distanceMeters = 0) {
  return records
    .filter((record) => record?.isAvailable && record?.elapsedSeconds > 0)
    .map((record) => ({
      ...record,
      distanceDelta: Math.abs(toFiniteNumber(record?.distanceMeters || 0) - distanceMeters),
    }))
    .sort((left, right) => left.distanceDelta - right.distanceDelta)[0] || null;
}

function getTaperWindowDays(distanceMeters) {
  if (distanceMeters >= 30000) return 21; // marathon : 3 semaines
  if (distanceMeters >= 18000) return 14; // semi : 2 semaines
  if (distanceMeters >= 8000) return 10;  // 10 km : 10 jours
  return 7;                                // 5 km / sprint : 1 semaine
}

function getRecommendedTsbTarget(distanceMeters) {
  if (distanceMeters >= 30000) return 20;
  if (distanceMeters >= 18000) return 15;
  return 10;
}

// Construit la table de taper jour par jour (volume relatif au CTL courant).
function buildTaperPlan({ daysToRace, ctl, atl, distanceMeters }) {
  if (daysToRace <= 0 || ctl <= 0) {
    return [];
  }

  const taperDays = getTaperWindowDays(distanceMeters);
  const planLength = Math.min(daysToRace, taperDays);
  const tsbTarget = getRecommendedTsbTarget(distanceMeters);

  // Cible : passer du TSB courant au TSB cible le jour J en reduisant
  // progressivement la charge journaliere.
  // On simule jour par jour avec une charge cible decroissante.
  let projectedCtl = ctl;
  let projectedAtl = atl;
  const plan = [];

  for (let day = planLength; day >= 1; day -= 1) {
    // Volume relatif decroissant : commence a ~ 80 % du CTL/7 (charge jour normale)
    // et finit a ~ 30 % a J-1.
    const progress = (planLength - day) / Math.max(1, planLength - 1);
    const dailyLoadRatio = 0.80 - (progress * 0.50);
    const dailyLoad = Math.max(0, ctl * dailyLoadRatio / 7);

    projectedCtl = projectedCtl + ((dailyLoad - projectedCtl) / 42);
    projectedAtl = projectedAtl + ((dailyLoad - projectedAtl) / 7);
    const projectedTsb = projectedCtl - projectedAtl;

    plan.push({
      daysBefore: day,
      dailyLoad: Math.round(dailyLoad),
      projectedCtl: Math.round(projectedCtl * 10) / 10,
      projectedAtl: Math.round(projectedAtl * 10) / 10,
      projectedTsb: Math.round(projectedTsb * 10) / 10,
      label: day >= 7 ? "Volume en reduction, intensite preservee" : day >= 3 ? "Allegement marque, qualites courtes" : "Affutage final, sortie de jambes",
    });
  }

  return {
    planDays: plan,
    tsbTarget,
    taperWindow: planLength,
    expectedFinalTsb: plan.length ? plan[plan.length - 1].projectedTsb : null,
  };
}

function computeRacePrediction({ records = [], distanceMeters = 0 }) {
  if (!records.length || distanceMeters <= 0) {
    return null;
  }

  // 1. Chercher un record pour la distance demandee (proche).
  const closestRecord = pickClosestRecord(records, distanceMeters);

  // 2. Calculer un VDOT pondere si plusieurs records sont disponibles.
  const candidates = records
    .filter((record) => record?.isAvailable && record?.elapsedSeconds > 0)
    .map((record) => calculateVdot({
      distanceMeters: toFiniteNumber(record?.distanceMeters),
      elapsedSeconds: toFiniteNumber(record?.elapsedSeconds),
    }))
    .filter((vdot) => vdot > 0);

  const averageVdot = candidates.length
    ? candidates.reduce((sum, value) => sum + value, 0) / candidates.length
    : 0;

  // 3. Predictions :
  //   - Riegel a partir du record le plus proche
  //   - Daniels (allure equivalente a partir du VDOT, 88-105 % VO2max selon distance)
  const riegelSeconds = closestRecord
    ? getRiegelPredictionSeconds(
      toFiniteNumber(closestRecord.elapsedSeconds),
      toFiniteNumber(closestRecord.distanceMeters),
      distanceMeters,
    )
    : 0;

  // Pourcentage VO2max cible selon la distance (Daniels) :
  let intensityPercent = 88;
  if (distanceMeters <= 5500) intensityPercent = 98;
  else if (distanceMeters <= 11000) intensityPercent = 94;
  else if (distanceMeters <= 22000) intensityPercent = 90;
  else intensityPercent = 84;

  const danielsPaceSecondsPerKm = paceFromVdotAndIntensity(averageVdot, intensityPercent);
  const danielsSeconds = danielsPaceSecondsPerKm > 0
    ? Math.round((distanceMeters / 1000) * danielsPaceSecondsPerKm)
    : 0;

  // Combinaison : moyenne entre Riegel et Daniels, en privilegiant Riegel si
  // le record est proche en distance (delta < 50 %).
  const riegelWeight = closestRecord
    ? Math.max(0.4, 1 - (closestRecord.distanceDelta / distanceMeters))
    : 0;
  const danielsWeight = danielsSeconds > 0 ? 0.6 : 0;
  const totalWeight = riegelWeight + danielsWeight;

  let consolidatedSeconds = 0;
  if (totalWeight > 0) {
    consolidatedSeconds = (
      (riegelSeconds * riegelWeight) + (danielsSeconds * danielsWeight)
    ) / totalWeight;
  } else if (riegelSeconds > 0) {
    consolidatedSeconds = riegelSeconds;
  } else if (danielsSeconds > 0) {
    consolidatedSeconds = danielsSeconds;
  }

  const distanceKm = distanceMeters / 1000;
  const targetPaceSecondsPerKm = consolidatedSeconds > 0
    ? Math.round((consolidatedSeconds / distanceKm) * 10) / 10
    : 0;

  return {
    predictedSeconds: Math.round(consolidatedSeconds),
    targetPaceSecondsPerKm,
    riegelSeconds: Math.round(riegelSeconds),
    danielsSeconds: Math.round(danielsSeconds),
    danielsPaceSecondsPerKm,
    averageVdot: Math.round(averageVdot * 10) / 10,
    referenceRecord: closestRecord,
  };
}

export function buildRaceObjectiveProfile({
  race = null,
  loadModel = {},
  vdotProfile = null,
  bestEffortRecords = [],
  referenceDate = null,
} = {}) {
  if (!race) {
    return {
      hasRace: false,
      message: "Aucune course objectif active. Renseigne ta prochaine course dans Administration pour activer le countdown et le plan de taper.",
    };
  }

  const today = referenceDate ? startOfDay(safeDate(referenceDate) || new Date()) : startOfDay(new Date());
  const raceDate = startOfDay(safeDate(race?.raceDate) || new Date());
  const daysToRace = Math.round((raceDate.getTime() - today.getTime()) / MS_PER_DAY);
  const distanceMeters = toFiniteNumber(race?.distanceMeters);

  const recordsForPrediction = Array.isArray(bestEffortRecords) ? bestEffortRecords : [];

  const prediction = computeRacePrediction({
    records: recordsForPrediction,
    distanceMeters,
  }) || {};

  const lastPoint = Array.isArray(loadModel?.chartData)
    ? loadModel.chartData[loadModel.chartData.length - 1]
    : null;
  const ctl = toFiniteNumber(lastPoint?.ctl);
  const atl = toFiniteNumber(lastPoint?.atl);

  const taper = buildTaperPlan({
    daysToRace,
    ctl,
    atl,
    distanceMeters,
  }) || {};

  // Etat global : avant taper / en taper / le jour / passe.
  let phaseLabel;
  let phaseTone;
  if (daysToRace < 0) {
    phaseLabel = "Course passee";
    phaseTone = "neutral";
  } else if (daysToRace === 0) {
    phaseLabel = "Jour J";
    phaseTone = "positive";
  } else if (daysToRace <= taper.taperWindow) {
    phaseLabel = "Taper en cours";
    phaseTone = "positive";
  } else {
    phaseLabel = "Phase de preparation";
    phaseTone = "neutral";
  }

  const targetPaceSecondsPerKm = toFiniteNumber(race?.targetPaceSecondsPerKm) || prediction.targetPaceSecondsPerKm || 0;
  const userTargetSeconds = targetPaceSecondsPerKm > 0 && distanceMeters > 0
    ? Math.round((distanceMeters / 1000) * targetPaceSecondsPerKm)
    : 0;

  return {
    hasRace: true,
    race: {
      id: race.id,
      name: race.name,
      raceDate,
      distanceMeters,
      targetPaceSecondsPerKm: toFiniteNumber(race?.targetPaceSecondsPerKm) || null,
      notes: race?.notes || "",
    },
    daysToRace,
    phase: { label: phaseLabel, tone: phaseTone },
    prediction,
    userTargetSeconds,
    recommendedTargetPaceSecondsPerKm: prediction.targetPaceSecondsPerKm,
    vdot: vdotProfile?.vdot || prediction.averageVdot || 0,
    taper,
  };
}
