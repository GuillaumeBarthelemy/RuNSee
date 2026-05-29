/**
 * crossDataAnalytics.js
 *
 * Croisement Garmin × Strava : helper de contexte de récupération autour d'une
 * activité (snapshot avant/après + deltas vs baseline 28 j).
 *
 * Note : les analyses de patterns personnels (qualité↔récup, charge↔sommeil,
 * monotonie↔VFC) ont été retirées (jamais câblées en UI et basées sur des
 * noms de champs erronés). Voir l'historique git si besoin de les ressusciter.
 *
 * Convention :
 * - Toutes les fonctions sont pures et tolèrent un dataset vide ou partiel.
 * - Aucun ML ni modèle prédictif : statistiques descriptives uniquement.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(dateKey, offset) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offset);
  return toDateKey(dt);
}

function safeMean(values) {
  const valid = values.filter((v) => v != null && Number.isFinite(v) && v > 0);
  if (!valid.length) return null;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
}

// ---------------------------------------------------------------------------
// Helper exposé pour ActivityRecoveryContextCard (D3)
// ---------------------------------------------------------------------------

/**
 * Pour une activité donnée, retourne le snapshot avant (J, mesuré la nuit
 * précédente) et le snapshot après (J+1, mesuré la nuit suivante), avec
 * deltas vs baseline 28 j.
 */
export function getRecoveryContextForActivity({ activity, snapshots = [] } = {}) {
  if (!activity || !Array.isArray(snapshots) || snapshots.length === 0) {
    return { before: null, after: null, hasData: false };
  }

  const dateKey = toDateKey(activity.startDateLocal || activity.startDate);
  if (!dateKey) return { before: null, after: null, hasData: false };

  const map = new Map();
  for (const s of snapshots) {
    const key = toDateKey(s?.snapshotDate);
    if (key) map.set(key, s);
  }

  const before = map.get(dateKey) || null;
  const after = map.get(shiftDays(dateKey, 1)) || null;

  // Baseline 28 j sur les snapshots qui précèdent le jour de l'activité
  const baselineSnaps = snapshots
    .filter((s) => {
      const k = toDateKey(s?.snapshotDate);
      return k && k < dateKey;
    })
    .slice(-28);

  const baselineSleepSec = safeMean(baselineSnaps.map((s) => s.sleepDurationSeconds));
  const baselineHrv = safeMean(baselineSnaps.map((s) => s.hrvAvgMs));
  const baselineRestingHr = safeMean(baselineSnaps.map((s) => s.restingHr));

  function decorate(snapshot) {
    if (!snapshot) return null;
    return {
      snapshotDate: snapshot.snapshotDate,
      sleepDurationSeconds: snapshot.sleepDurationSeconds || null,
      sleepScore: snapshot.sleepScore || null,
      hrvAvgMs: snapshot.hrvAvgMs || null,
      restingHr: snapshot.restingHr || null,
      stressAvg: snapshot.stressAvg || null,
      bodyBatteryMorning: snapshot.bodyBatteryMorning || null,
      sleepDeltaMin: snapshot.sleepDurationSeconds && baselineSleepSec
        ? Math.round((snapshot.sleepDurationSeconds - baselineSleepSec) / 60)
        : null,
      hrvDeltaPct: snapshot.hrvAvgMs && baselineHrv
        ? Math.round(((snapshot.hrvAvgMs - baselineHrv) / baselineHrv) * 100 * 10) / 10
        : null,
      restingHrDeltaBpm: snapshot.restingHr && baselineRestingHr
        ? Math.round(snapshot.restingHr - baselineRestingHr)
        : null,
    };
  }

  return {
    before: decorate(before),
    after: decorate(after),
    hasData: Boolean(before || after),
  };
}
