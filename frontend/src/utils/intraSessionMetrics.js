// Indicateurs intra-seance : derive cardiaque, Variability Index, time-in-zone par seance,
// cadence + amplitude. Tous calculus sur les splits / laps Strava deja stockes en base.
//
// References :
//   - Derive cardiaque : Joe Friel, The Triathlete's Training Bible.
//   - Variability Index : adaptation puissance -> course (Coggan, 2003).
//   - Cadence : Cavanagh & Williams (1982), pas optimal vers 180 spm.

import { resolveHeartRateZoneConfig } from "./heartRatePreferences.js";

const MIN_DECOUPLING_DURATION_SECONDS = 60 * 60; // 1 h pour qu'une derive ait du sens.
const MAX_AEROBIC_HR_RATIO = 0.82; // au-dessus, ce n'est plus EF -> derive non lisible.

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseJsonSafe(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeSplit(segment = {}) {
  const distanceKm = toFiniteNumber(segment?.distance) > 0
    ? toFiniteNumber(segment?.distance) / 1000
    : 0;
  const durationSeconds = toFiniteNumber(
    segment?.moving_time
      ?? segment?.movingTime
      ?? segment?.elapsed_time
      ?? segment?.elapsedTime,
  );
  const speedFromDistance = durationSeconds > 0 && distanceKm > 0
    ? (distanceKm / durationSeconds) * 3600
    : 0;
  const speedFromAvg = toFiniteNumber(segment?.average_speed ?? segment?.averageSpeed) * 3.6;
  const speedKmh = speedFromDistance || speedFromAvg;

  return {
    distanceKm,
    durationSeconds,
    speedKmh,
    paceSecondsPerKm: distanceKm > 0 ? durationSeconds / distanceKm : 0,
    heartRate: toFiniteNumber(segment?.average_heartrate ?? segment?.averageHeartrate ?? segment?.heartRate),
    cadenceSpm: toFiniteNumber(segment?.average_cadence ?? segment?.averageCadence) * 2,
    elevationDiff: toFiniteNumber(segment?.elevation_difference ?? segment?.elevationDifference),
  };
}

function getSplitsFromActivity(activity = {}) {
  const payload = parseJsonSafe(activity?.rawJson) || parseJsonSafe(activity?.summaryJson);

  if (!payload) {
    return [];
  }

  const splitsMetric = Array.isArray(payload.splits_metric) ? payload.splits_metric : [];
  if (splitsMetric.length) {
    return splitsMetric.map(normalizeSplit).filter((split) => split.durationSeconds > 0);
  }

  const laps = Array.isArray(payload.laps) ? payload.laps : [];
  return laps.map(normalizeSplit).filter((split) => split.durationSeconds > 0);
}

// =====================================================================
// Derive cardiaque (Sprint 6.1)
// =====================================================================
//
// Strategie :
//   1. On exige >= 60 min de sortie en endurance fondamentale (FC moyenne <= 82% FCmax).
//   2. On separe les splits en deux moities egales en duree.
//   3. On calcule pour chaque moitie la "puissance aerobie ratio" = vitesse / FC.
//   4. La derive est l'ecart relatif entre les deux moities (positif = FC qui monte
//      pour la meme allure ou allure qui baisse pour la meme FC).
//
// La metrique est utile pour les sorties longues steady-state ; sur des seances
// type fartlek ou intervalles le calcul perd son sens.
export function buildAerobicDecouplingProfile(activity = {}, options = {}) {
  const splits = getSplitsFromActivity(activity);
  const totalSeconds = toFiniteNumber(activity?.movingTime);
  const averageHr = toFiniteNumber(activity?.averageHeartrate);
  const heartRateConfig = resolveHeartRateZoneConfig({
    preferences: options.heartRatePreferences || options.settings || {},
    estimatedMaxHeartrate: options.estimatedMaxHeartrate || 0,
  });
  const maxHeartrate = toFiniteNumber(heartRateConfig?.maxHeartrate);

  if (totalSeconds < MIN_DECOUPLING_DURATION_SECONDS) {
    return {
      hasData: false,
      message: "La derive cardiaque demande au moins 60 minutes de sortie pour etre lisible.",
    };
  }

  if (!averageHr || !maxHeartrate) {
    return {
      hasData: false,
      message: "Sortie sans cardio fiable ou sans FC max disponible : derive cardiaque non calculable.",
    };
  }

  const aerobicRatio = averageHr / maxHeartrate;
  if (aerobicRatio > MAX_AEROBIC_HR_RATIO) {
    return {
      hasData: false,
      message: "Sortie trop intense (FC moyenne > 82 % FC max) : la derive cardiaque n'est pas lisible.",
      aerobicRatio,
    };
  }

  if (splits.length < 4) {
    return {
      hasData: false,
      message: "Pas assez de splits enrichis pour estimer la derive cardiaque (minimum 4 splits).",
    };
  }

  const filteredSplits = splits.filter((split) => split.heartRate > 0 && split.speedKmh > 0);
  if (filteredSplits.length < 4) {
    return {
      hasData: false,
      message: "Splits cardio incomplets : impossible de mesurer la derive sur cette seance.",
    };
  }

  const cumulative = filteredSplits.reduce((acc, split) => {
    const previous = acc.length ? acc[acc.length - 1].cumulative : 0;
    acc.push({ split, cumulative: previous + split.durationSeconds });
    return acc;
  }, []);
  const totalSplitSeconds = cumulative[cumulative.length - 1].cumulative;
  const halfPoint = totalSplitSeconds / 2;
  const firstHalf = cumulative.filter((entry) => entry.cumulative <= halfPoint).map((entry) => entry.split);
  const secondHalf = cumulative.filter((entry) => entry.cumulative > halfPoint).map((entry) => entry.split);

  if (!firstHalf.length || !secondHalf.length) {
    return {
      hasData: false,
      message: "La sortie n'est pas suffisamment decoupee pour mesurer la derive.",
    };
  }

  const ratioForHalf = (halfSplits) => {
    const totalDuration = halfSplits.reduce((sum, s) => sum + s.durationSeconds, 0);
    if (!totalDuration) return 0;

    const avgSpeedKmh = halfSplits.reduce((sum, s) => sum + s.speedKmh * s.durationSeconds, 0) / totalDuration;
    const avgHr = halfSplits.reduce((sum, s) => sum + s.heartRate * s.durationSeconds, 0) / totalDuration;
    return avgHr > 0 ? avgSpeedKmh / avgHr : 0;
  };

  const ratio1 = ratioForHalf(firstHalf);
  const ratio2 = ratioForHalf(secondHalf);

  if (!ratio1 || !ratio2) {
    return {
      hasData: false,
      message: "FC ou allure non exploitable sur l'une des moities.",
    };
  }

  // decouplingPercent : positif quand le ratio se degrade entre la 1e et la 2e moitie
  // (FC qui monte pour la meme vitesse, ou vitesse qui baisse pour la meme FC).
  const decouplingPercent = ((ratio1 - ratio2) / ratio1) * 100;

  let tone = "positive";
  let label = "Excellente base aerobie";
  if (decouplingPercent >= 8) {
    tone = "danger";
    label = "Base aerobie a renforcer";
  } else if (decouplingPercent >= 5) {
    tone = "warning";
    label = "Base aerobie limite";
  } else if (decouplingPercent >= 3) {
    tone = "neutral";
    label = "Base aerobie correcte";
  }

  return {
    hasData: true,
    decouplingPercent: Math.round(decouplingPercent * 10) / 10,
    label,
    tone,
    aerobicRatio: Math.round(aerobicRatio * 100) / 100,
    firstHalfSpeedKmh: Math.round(firstHalf.reduce((sum, s) => sum + s.speedKmh * s.durationSeconds, 0) / firstHalf.reduce((sum, s) => sum + s.durationSeconds, 0) * 10) / 10,
    secondHalfSpeedKmh: Math.round(secondHalf.reduce((sum, s) => sum + s.speedKmh * s.durationSeconds, 0) / secondHalf.reduce((sum, s) => sum + s.durationSeconds, 0) * 10) / 10,
    firstHalfHr: Math.round(firstHalf.reduce((sum, s) => sum + s.heartRate * s.durationSeconds, 0) / firstHalf.reduce((sum, s) => sum + s.durationSeconds, 0)),
    secondHalfHr: Math.round(secondHalf.reduce((sum, s) => sum + s.heartRate * s.durationSeconds, 0) / secondHalf.reduce((sum, s) => sum + s.durationSeconds, 0)),
    message: decouplingPercent >= 0
      ? "La derive est l'ecart relatif entre la 1re et la 2e moitie : positive = FC qui monte ou allure qui baisse."
      : "Derive negative : tu as accelere ou tu as recupere en seconde moitie a FC stable. Bon signe d'aisance.",
  };
}

// =====================================================================
// Variability Index (Sprint 6.2)
// =====================================================================
//
// VI = vitesse normalisee / vitesse moyenne. En course on prend la moyenne
// quadratique des vitesses split (proxy de la NP) divisee par la vitesse moyenne.
// Une valeur proche de 1 = effort lineaire ; au-dessus de 1.10 = effort tres
// fractionne ou allure tres variable.
export function buildVariabilityIndex(activity = {}) {
  const splits = getSplitsFromActivity(activity).filter((split) => split.speedKmh > 0 && split.durationSeconds > 0);

  if (splits.length < 4) {
    return {
      hasData: false,
      message: "Variability Index : il faut au moins 4 splits exploitables.",
    };
  }

  const totalDuration = splits.reduce((sum, s) => sum + s.durationSeconds, 0);
  if (!totalDuration) {
    return { hasData: false, message: "Pas de duree exploitable." };
  }

  const meanSpeed = splits.reduce((sum, s) => sum + s.speedKmh * s.durationSeconds, 0) / totalDuration;
  // Vitesse normalisee : moyenne quadratique ponderee par la duree de chaque split.
  const variance = splits.reduce(
    (sum, s) => sum + Math.pow(s.speedKmh, 2) * s.durationSeconds,
    0,
  ) / totalDuration;
  const normalizedSpeed = Math.sqrt(variance);

  if (!meanSpeed) {
    return { hasData: false, message: "Vitesse moyenne nulle." };
  }

  const variabilityIndex = normalizedSpeed / meanSpeed;

  let tone = "positive";
  let label = "Effort lineaire";
  if (variabilityIndex >= 1.15) {
    tone = "warning";
    label = "Effort tres fractionne";
  } else if (variabilityIndex >= 1.07) {
    tone = "neutral";
    label = "Effort module";
  }

  return {
    hasData: true,
    variabilityIndex: Math.round(variabilityIndex * 100) / 100,
    label,
    tone,
    meanSpeedKmh: Math.round(meanSpeed * 10) / 10,
    normalizedSpeedKmh: Math.round(normalizedSpeed * 10) / 10,
    splitCount: splits.length,
    message: variabilityIndex >= 1.10
      ? "Allures tres variables : intervalles, fartlek ou terrain accidente."
      : "Allure relativement homogene : sortie continue.",
  };
}

// =====================================================================
// Time-in-zone par seance (Sprint 6.3)
// =====================================================================
//
// Reutilise la classification de zones FC standard. On parcourt les splits FC
// disponibles et on totalise la duree par zone.
export function buildSessionTimeInZone(activity = {}, options = {}) {
  const splits = getSplitsFromActivity(activity).filter((split) => split.heartRate > 0 && split.durationSeconds > 0);
  const heartRateConfig = resolveHeartRateZoneConfig({
    preferences: options.heartRatePreferences || options.settings || {},
    estimatedMaxHeartrate: options.estimatedMaxHeartrate || toFiniteNumber(activity?.maxHeartrate),
  });

  if (!heartRateConfig?.maxHeartrate || !splits.length) {
    return {
      hasData: false,
      zones: [],
      totalSeconds: 0,
      message: !splits.length
        ? "Pas de splits enrichis avec FC sur cette seance."
        : "FC max indisponible : impossible de classer les splits par zone.",
    };
  }

  const baseZones = (heartRateConfig.zones || []).map((zone) => ({
    key: zone.key,
    shortLabel: zone.shortLabel,
    label: zone.label,
    minHeartrate: zone.minHeartrate,
    maxHeartrate: zone.maxHeartrate,
    rangeLabel: zone.rangeLabel,
    durationSeconds: 0,
  }));

  splits.forEach((split) => {
    const zoneIndex = baseZones.findIndex((zone) => split.heartRate <= toFiniteNumber(zone.maxHeartrate));
    const targetIndex = zoneIndex >= 0 ? zoneIndex : Math.max(0, baseZones.length - 1);
    baseZones[targetIndex].durationSeconds += split.durationSeconds;
  });

  const totalSeconds = baseZones.reduce((sum, zone) => sum + zone.durationSeconds, 0);

  return {
    hasData: totalSeconds > 0,
    totalSeconds,
    referenceMaxHeartrate: heartRateConfig.maxHeartrate,
    usingEstimatedMaxHeartrate: heartRateConfig.usingEstimatedMaxHeartrate,
    zones: baseZones.map((zone) => ({
      ...zone,
      durationMinutes: Math.round((zone.durationSeconds / 60) * 10) / 10,
      sharePercent: totalSeconds > 0 ? Math.round((zone.durationSeconds / totalSeconds) * 100) : 0,
    })),
    message: "Temps passe par zone FC sur cette seance, classe selon les zones actives en Administration.",
  };
}

// =====================================================================
// Cadence + amplitude (Sprint 6.4)
// =====================================================================
//
// Strava fournit `average_cadence` qui correspond aux pas/minute par jambe pour
// la course (a multiplier par 2 pour obtenir la cadence en pas/minute totale,
// reperes 160-180 spm pour un coureur typique). L'amplitude (longueur de pas)
// est deduite : amplitude = vitesse / cadence.
export function buildCadenceProfile(activity = {}) {
  const cadenceRaw = toFiniteNumber(activity?.averageCadence);
  const speedMps = toFiniteNumber(activity?.averageSpeed);

  if (cadenceRaw <= 0 || speedMps <= 0) {
    return {
      hasData: false,
      message: "Cadence non disponible pour cette seance.",
    };
  }

  // Strava donne cadence par jambe en course. *2 pour la cadence totale (spm).
  const cadenceSpm = cadenceRaw * 2;
  const strideLengthMeters = (speedMps * 60) / cadenceSpm;

  let cadenceTone = "neutral";
  let cadenceLabel = "Cadence basse";
  if (cadenceSpm >= 175) {
    cadenceTone = "positive";
    cadenceLabel = "Cadence elevee";
  } else if (cadenceSpm >= 165) {
    cadenceTone = "positive";
    cadenceLabel = "Cadence dans la cible";
  } else if (cadenceSpm >= 155) {
    cadenceTone = "neutral";
    cadenceLabel = "Cadence moyenne";
  }

  return {
    hasData: true,
    cadenceSpm: Math.round(cadenceSpm),
    strideLengthMeters: Math.round(strideLengthMeters * 100) / 100,
    cadenceTone,
    cadenceLabel,
    message: "Cadence en pas/min totale (Strava x2). Amplitude = vitesse moyenne / cadence. Cibles indicatives : 165-180 spm chez un coureur d'endurance.",
  };
}
