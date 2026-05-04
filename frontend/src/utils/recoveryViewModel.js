/**
 * recoveryViewModel.js
 *
 * Transforms raw ExternalDailyRecoverySnapshot[] into a normalized view-model
 * used by TodayRecoveryCard and PerformancePhysioCard.
 *
 * Convention: snapshots are sorted ascending by snapshotDate.
 */

/** Last N days of sparkline history shown in the card */
const SPARKLINE_DAYS = 14;

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
  const recentAvg = safeMean(series, 3);
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

  return {
    hasData: true,
    sleep,
    hrv,
    restingHr,
    stress,
    bodyBattery,
    coverage,
    confidenceLabel,
  };
}
