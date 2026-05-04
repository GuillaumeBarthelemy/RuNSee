/**
 * recoveryCorrelations.js
 *
 * Aligns ExternalDailyRecoverySnapshot[] with a training load time series to
 * produce a unified day-by-day correlation dataset for RecoveryVsLoadChart.
 */

/**
 * Normalise a date string or Date to "YYYY-MM-DD".
 */
function toDateKey(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Build an aligned correlation dataset.
 *
 * @param {Array} snapshots  ExternalDailyRecoverySnapshot[] (any order)
 * @param {Array} loadSeries Array of { date: string, load: number } (from loadModel.chartData)
 * @param {number} days      Window size in days (default 56)
 * @returns {{ points: CorrelationPoint[], hasData: boolean }}
 *
 * CorrelationPoint shape:
 * {
 *   dateKey: string,          // "YYYY-MM-DD"
 *   load: number | null,
 *   sleepScore: number | null,
 *   hrvAvgMs: number | null,
 *   restingHr: number | null,
 *   bodyBattery: number | null,
 * }
 */
export function buildRecoveryCorrelationDataset(snapshots, loadSeries, days = 56) {
  if (!Array.isArray(snapshots) || !Array.isArray(loadSeries)) {
    return { points: [], hasData: false };
  }

  // Index snapshots by date key
  const snapshotMap = new Map();
  for (const s of snapshots) {
    const key = toDateKey(s.snapshotDate);
    if (key) snapshotMap.set(key, s);
  }

  // Index load series by date key — keep last `days` entries
  const loadEntries = loadSeries
    .filter((p) => p && p.date)
    .map((p) => ({ dateKey: toDateKey(p.date), load: typeof p.load === "number" ? p.load : null }))
    .filter((p) => p.dateKey)
    .slice(-days);

  const points = loadEntries.map(({ dateKey, load }) => {
    const s = snapshotMap.get(dateKey) || null;
    return {
      dateKey,
      load,
      sleepScore: s && s.sleepScore > 0 ? s.sleepScore : null,
      hrvAvgMs: s && s.hrvAvgMs > 0 ? s.hrvAvgMs : null,
      restingHr: s && s.restingHr > 0 ? s.restingHr : null,
      bodyBattery:
        s && (s.bodyBatteryMorning > 0 || s.bodyBatteryEnd > 0)
          ? (s.bodyBatteryMorning ?? s.bodyBatteryEnd)
          : null,
    };
  });

  const hasData = points.some(
    (p) => p.sleepScore != null || p.hrvAvgMs != null || p.restingHr != null,
  );

  return { points, hasData };
}
