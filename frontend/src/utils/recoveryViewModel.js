/**
 * recoveryViewModel.js
 *
 * Transforms raw ExternalDailyRecoverySnapshot[] into a normalized view-model
 * used by TodayRecoveryCard and PerformancePhysioCard.
 *
 * Convention: snapshots are sorted ascending by snapshotDate.
 */

/** Last N days of sparkline history shown in the card.
 * 14 days for visual smoothness, but `recentAvg` (displayed value) uses
 * the last 7 days only — alignement avec la moyenne 7 j affichée par
 * l'app Garmin Connect. */
const SPARKLINE_DAYS = 14;
const RECENT_AVG_DAYS = 7;

/** Baseline window: days −35 to −8 relative to the most recent snapshot */
const BASELINE_OFFSET_START = -35;
const BASELINE_OFFSET_END = -8;

/** Minimum number of baseline days required to compute a delta */
const BASELINE_MIN_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute a simple mean, ignoring null / 0 values.
 * Returns null when fewer than `minCount` valid samples exist.
 */
function safeMean(values, minCount = 1) {
  const valid = values.filter((v) => v != null && v > 0);
  if (valid.length < minCount) return null;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
}

/**
 * Return a tone string based on a signed delta relative to baseline.
 * tone: "good" | "neutral" | "warning" | null
 */
function deltaToTone(delta, positiveIsGood, warningThreshold, goodThreshold) {
  if (delta == null) return null;
  const signed = positiveIsGood ? delta : -delta;
  if (signed <= -warningThreshold) return "warning";
  if (signed >= goodThreshold) return "good";
  return "neutral";
}

/**
 * Extract a numeric field from each snapshot, returning an array ordered by
 * snapshotDate (ascending).  Null is returned for dates with no valid data.
 */
function extractSeries(snapshots, field) {
  return snapshots.map((s) => {
    const v = s[field];
    return v != null && v > 0 ? v : null;
  });
}

// ---------------------------------------------------------------------------
// buildMetricModel
// ---------------------------------------------------------------------------

/**
 * Build a per-metric sub-model.
 *
 * @param {Array} recentSnapshots - last SPARKLINE_DAYS snapshots
 * @param {Array} baselineSnapshots - baseline window snapshots
 * @param {string} field - snapshot field name
 * @param {Object} opts
 *   - positiveIsGood {boolean} — true for HRV/sleep, false for restingHr
 *   - warningThresholdPct {number} — % deviation considered a warning
 *   - goodThresholdPct {number} — % deviation considered good
 * @returns {{ series, latestValue, recentAvg, baselineAvg, deltaPct, tone }}
 */
function buildMetricModel(recentSnapshots, baselineSnapshots, field, opts = {}) {
  const {
    positiveIsGood = true,
    warningThresholdPct = 8,
    goodThresholdPct = 5,
  } = opts;

  const series = extractSeries(recentSnapshots, field);
  const latestValue = [...series].reverse().find((v) => v != null) ?? null;
  // recentAvg = moyenne des 7 derniers jours (matche l'agrégat affiché par Garmin Connect)
  const recentAvg = safeMean(series.slice(-RECENT_AVG_DAYS), 3);
  const baselineSeries = extractSeries(baselineSnapshots, field);
  const baselineAvg = safeMean(baselineSeries, BASELINE_MIN_DAYS);

  let deltaPct = null;
  let tone = null;

  if (recentAvg != null && baselineAvg != null && baselineAvg !== 0) {
    deltaPct = ((recentAvg - baselineAvg) / baselineAvg) * 100;
    tone = deltaToTone(deltaPct, positiveIsGood, warningThresholdPct, goodThresholdPct);
  } else if (latestValue != null) {
    tone = "neutral";
  }

  return { series, latestValue, recentAvg, baselineAvg, deltaPct, tone };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a full recovery view-model from raw snapshots.
 *
 * @param {Array} snapshots - ExternalDailyRecoverySnapshot[], ascending by date
 * @returns {RecoveryViewModel}
 */
export function buildRecoveryViewModel(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      hasData: false,
      sleep: null,
      hrv: null,
      restingHr: null,
      stress: null,
      bodyBattery: null,
      coverage: 0,
      confidenceLabel: "Pas de données",
    };
  }

  // Sort ascending just in case
  const sorted = [...snapshots].sort((a, b) => {
    const ad = a.snapshotDate ? new Date(a.snapshotDate).getTime() : 0;
    const bd = b.snapshotDate ? new Date(b.snapshotDate).getTime() : 0;
    return ad - bd;
  });

  const recentSnapshots = sorted.slice(-SPARKLINE_DAYS);
  const total = sorted.length;

  // Baseline: days at positions [total + BASELINE_OFFSET_START … total + BASELINE_OFFSET_END]
  const baselineStart = clamp(total + BASELINE_OFFSET_START, 0, total);
  const baselineEnd = clamp(total + BASELINE_OFFSET_END, 0, total);
  const baselineSnapshots = sorted.slice(baselineStart, baselineEnd);

  const sleep = buildMetricModel(recentSnapshots, baselineSnapshots, "sleepScore", {
    positiveIsGood: true,
    warningThresholdPct: 10,
    goodThresholdPct: 5,
  });

  const hrv = buildMetricModel(recentSnapshots, baselineSnapshots, "hrvAvgMs", {
    positiveIsGood: true,
    warningThresholdPct: 8,
    goodThresholdPct: 5,
  });

  const restingHr = buildMetricModel(recentSnapshots, baselineSnapshots, "restingHr", {
    positiveIsGood: false, // lower is better
    warningThresholdPct: 5,
    goodThresholdPct: 3,
  });

  const stress = buildMetricModel(recentSnapshots, baselineSnapshots, "stressAvg", {
    positiveIsGood: false,
    warningThresholdPct: 15,
    goodThresholdPct: 8,
  });

  const bodyBattery = buildMetricModel(recentSnapshots, baselineSnapshots, "bodyBatteryMorning", {
    positiveIsGood: true,
    warningThresholdPct: 10,
    goodThresholdPct: 5,
  });

  // Coverage: % of the last 14 days that have a non-null sleepScore
  const validDays = recentSnapshots.filter((s) => s.sleepScore != null && s.sleepScore > 0).length;
  const coverage = Math.round((validDays / SPARKLINE_DAYS) * 100);

  let confidenceLabel;
  if (coverage >= 80) {
    confidenceLabel = "Données fiables";
  } else if (coverage >= 50) {
    confidenceLabel = "Données partielles";
  } else {
    confidenceLabel = "Données insuffisantes";
  }

  // --- Aptitude RuNSee : score composite 0-100 (formule transparente) ----
  // Cf. GLOSSAIRE.md entrée "trainingReadinessRunsee".
  // Poids : sommeil 0.30, VFC 0.30, FC repos 0.20, stress 0.10, énergie 0.10.
  // Sources :
  //   - Plews et al. (2013), Sports Medicine
  //   - Buchheit (2014), Front Physiol
  //   - Le Meur et al. (2013), Med Sci Sports Exerc
  const readiness = computeRunseeReadiness({ sleep, hrv, restingHr, stress, bodyBattery });

  return {
    hasData: true,
    sleep,
    hrv,
    restingHr,
    stress,
    bodyBattery,
    coverage,
    confidenceLabel,
    readiness,
  };
}

/**
 * Calcul de l'Aptitude RuNSee (0-100) à partir des sous-modèles.
 *
 * Chaque composante normalisée dans [0, 1] :
 *  - sleep : score sommeil / 100
 *  - hrv : delta VFC vs baseline, mappé linéairement sur [-15 %, +15 %]
 *  - restingHr : delta inversé, mappé sur [+8 %, -8 %] (lower-is-better)
 *  - stress : (100 - stress) / 100 (lower-is-better)
 *  - energyLevel : valeur / 100
 *
 * Si une composante n'est pas calculable, son poids est redistribué.
 *
 * @returns {{ score: number|null, confidence: "Haute"|"Moyenne"|"Faible" }}
 */
function computeRunseeReadiness({ sleep, hrv, restingHr, stress, bodyBattery }) {
  const components = [
    { weight: 0.30, value: normalizeSleep(sleep) },
    { weight: 0.30, value: normalizeHrvDelta(hrv) },
    { weight: 0.20, value: normalizeRestingHrDelta(restingHr) },
    { weight: 0.10, value: normalizeStress(stress) },
    { weight: 0.10, value: normalizeEnergy(bodyBattery) },
  ];

  const valid = components.filter((c) => c.value != null);
  if (valid.length === 0) {
    return { score: null, confidence: "Faible" };
  }

  const totalWeight = valid.reduce((acc, c) => acc + c.weight, 0);
  const weightedSum = valid.reduce((acc, c) => acc + c.weight * c.value, 0);
  const score = Math.round((weightedSum / totalWeight) * 100);

  // Confiance basée sur le poids couvert
  let confidence;
  if (totalWeight >= 0.85) confidence = "Haute";
  else if (totalWeight >= 0.50) confidence = "Moyenne";
  else confidence = "Faible";

  return { score, confidence };
}

function normalizeSleep(sleep) {
  if (!sleep || sleep.recentAvg == null) return null;
  return clamp(sleep.recentAvg / 100, 0, 1);
}

function normalizeHrvDelta(hrv) {
  if (!hrv || hrv.deltaPct == null) {
    // fallback sur la valeur absolue normalisée si pas de delta dispo
    return null;
  }
  // Mapping linéaire : -15 % → 0, 0 % → 0.5, +15 % → 1
  return clamp((hrv.deltaPct + 15) / 30, 0, 1);
}

function normalizeRestingHrDelta(restingHr) {
  if (!restingHr || restingHr.deltaPct == null) return null;
  // Inversé : -8 % → 1, 0 → 0.5, +8 % → 0
  return clamp((-restingHr.deltaPct + 8) / 16, 0, 1);
}

function normalizeStress(stress) {
  if (!stress || stress.recentAvg == null) return null;
  // Inversé : 0 → 1, 100 → 0
  return clamp((100 - stress.recentAvg) / 100, 0, 1);
}

function normalizeEnergy(bodyBattery) {
  if (!bodyBattery || bodyBattery.recentAvg == null) return null;
  return clamp(bodyBattery.recentAvg / 100, 0, 1);
}
