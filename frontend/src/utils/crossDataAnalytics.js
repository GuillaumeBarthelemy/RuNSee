/**
 * crossDataAnalytics.js
 *
 * Croisement Garmin × Strava : produit des statistiques personnelles à partir
 * des activités (Strava) et des snapshots de récupération (Garmin).
 *
 * Convention :
 * - Toutes les fonctions sont pures et tolèrent un dataset vide ou partiel.
 * - Toutes retournent `hasData: false` si l'échantillon est trop petit.
 * - Aucun ML ni modèle prédictif : statistiques descriptives uniquement.
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MIN_DAYS_FOR_PATTERNS = 60;
const MIN_ACTIVITIES_FOR_PATTERNS = 20;

const QUALITY_HR_RATIO_THRESHOLD = 0.85; // FC moy / FC max → effort intense
const QUALITY_MIN_SAMPLE = 5; // mini d'activités qualité pour donner un %

const SLEEP_BANDS = [
  { key: "light", min: 0, max: 50, label: "< 50 pts" },
  { key: "moderate", min: 50, max: 150, label: "50-150 pts" },
  { key: "hard", min: 150, max: 300, label: "150-300 pts" },
  { key: "veryHard", min: 300, max: Infinity, label: "> 300 pts" },
];

const MONOTONY_BANDS = [
  { key: "low", min: 0, max: 1.5, label: "< 1.5" },
  { key: "moderate", min: 1.5, max: 2.2, label: "1.5 - 2.2" },
  { key: "high", min: 2.2, max: Infinity, label: "> 2.2" },
];

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

function classifyConfidence(sampleSize) {
  if (sampleSize >= 25) return "Haute";
  if (sampleSize >= 10) return "Moyenne";
  return "Faible";
}

function isQualitySession(activity) {
  if (!activity) return false;
  const pace = Number(activity.__paceSecondsPerKm);
  if (!Number.isFinite(pace) || pace <= 0) return false;

  // Critère 1 : label d'intensité dominante mentionnant Z3+
  const label = String(activity.dominantIntensityLabel || "").toLowerCase();
  if (/z3|z4|z5|seuil|haute/i.test(label)) return true;

  // Critère 2 : ratio FC moyenne / FC max élevé
  const avgHr = Number(activity.averageHeartRate);
  const maxHr = Number(activity.maxHeartRate);
  if (avgHr > 0 && maxHr > 0 && avgHr / maxHr >= QUALITY_HR_RATIO_THRESHOLD) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// D1.1 — joinActivitiesWithRecovery
// ---------------------------------------------------------------------------

/**
 * Joint chaque activité avec :
 * - le snapshot Garmin du jour de l'activité (J)
 * - le snapshot du jour précédent (J-1, particulièrement le sommeil de la veille)
 *
 * @param {Object} args
 * @param {Array} args.activities - liste d'activités Strava
 * @param {Array} args.snapshots - liste de ExternalDailyRecoverySnapshot
 * @returns {Array<{ activity, recoveryDay, recoveryEve }>}
 */
export function joinActivitiesWithRecovery({ activities = [], snapshots = [] } = {}) {
  if (!Array.isArray(activities) || !Array.isArray(snapshots)) return [];

  const snapshotMap = new Map();
  for (const s of snapshots) {
    const key = toDateKey(s?.snapshotDate);
    if (key) snapshotMap.set(key, s);
  }

  return activities
    .map((activity) => {
      const dateKey = toDateKey(activity?.startDateLocal || activity?.startDate);
      if (!dateKey) return null;

      const recoveryDay = snapshotMap.get(dateKey) || null;
      const recoveryEve = snapshotMap.get(shiftDays(dateKey, -1)) || null;

      return { activity, recoveryDay, recoveryEve };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// D1.2 — analyzeQualityVsRecovery
// ---------------------------------------------------------------------------

/**
 * Identifie la part des séances qualité tombant sur des jours avec
 * récupération au vert (HRV >= baseline ET sommeil veille >= baseline).
 *
 * @param {Array} joined - sortie de joinActivitiesWithRecovery
 */
export function analyzeQualityVsRecovery(joined = []) {
  const empty = {
    sampleSize: 0,
    qualitySessionsAnalyzed: 0,
    pctOnGoodRecoveryDays: null,
    insight: "",
    confidence: "Faible",
    hasData: false,
  };
  if (!Array.isArray(joined) || joined.length < QUALITY_MIN_SAMPLE) return empty;

  // Baselines globales (sur tout le dataset disponible) — médianes simples
  const allHrv = joined
    .map((j) => j.recoveryDay?.hrvAvgMs)
    .filter((v) => v != null && v > 0);
  const allEveSleep = joined
    .map((j) => j.recoveryEve?.sleepDurationSeconds)
    .filter((v) => v != null && v > 0);

  if (allHrv.length < 5 || allEveSleep.length < 5) return empty;

  const hrvBaseline = safeMean(allHrv);
  const sleepBaseline = safeMean(allEveSleep);
  if (hrvBaseline == null || sleepBaseline == null) return empty;

  const qualitySessions = joined.filter((j) => isQualitySession(j.activity));
  if (qualitySessions.length < QUALITY_MIN_SAMPLE) {
    return { ...empty, sampleSize: joined.length, qualitySessionsAnalyzed: qualitySessions.length };
  }

  const onGoodDays = qualitySessions.filter((j) => {
    const hrv = j.recoveryDay?.hrvAvgMs;
    const eveSleep = j.recoveryEve?.sleepDurationSeconds;
    return hrv != null && hrv >= hrvBaseline
      && eveSleep != null && eveSleep >= sleepBaseline;
  });

  const pct = onGoodDays.length / qualitySessions.length;
  const pctRounded = Math.round(pct * 100);

  return {
    sampleSize: joined.length,
    qualitySessionsAnalyzed: qualitySessions.length,
    pctOnGoodRecoveryDays: pct,
    insight: `${pctRounded} % de tes séances qualité tombent quand HRV et sommeil sont au vert.`,
    confidence: classifyConfidence(qualitySessions.length),
    hasData: true,
  };
}

// ---------------------------------------------------------------------------
// D1.3 — analyzeChargeImpactOnSleep
// ---------------------------------------------------------------------------

/**
 * Pour chaque activité, regarde le sommeil de la nuit suivante (J) vs la
 * baseline globale, stratifié par bande de charge.
 */
export function analyzeChargeImpactOnSleep(joined = []) {
  const empty = {
    sampleSize: 0,
    bands: SLEEP_BANDS.reduce((acc, b) => ({ ...acc, [b.key]: { count: 0, avgSleepDeltaMin: null } }), {}),
    insight: "",
    confidence: "Faible",
    hasData: false,
  };
  if (!Array.isArray(joined) || joined.length < QUALITY_MIN_SAMPLE) return empty;

  // Baseline sommeil = moyenne sur tous les recoveryDay disponibles
  const allSleep = joined
    .map((j) => j.recoveryDay?.sleepDurationSeconds)
    .filter((v) => v != null && v > 0);
  if (allSleep.length < 7) return empty;

  const sleepBaselineSec = safeMean(allSleep);
  if (sleepBaselineSec == null) return empty;

  // Stratification
  const bandsAccu = SLEEP_BANDS.reduce((acc, b) => ({ ...acc, [b.key]: [] }), {});
  let totalSamples = 0;

  for (const j of joined) {
    const load = Number(j.activity?.__loadValue || j.activity?.estimatedLoad?.value || 0);
    const sleepAfterSec = Number(j.recoveryDay?.sleepDurationSeconds || 0);
    if (!(load > 0) || !(sleepAfterSec > 0)) continue;

    const band = SLEEP_BANDS.find((b) => load >= b.min && load < b.max);
    if (!band) continue;

    const deltaMin = (sleepAfterSec - sleepBaselineSec) / 60;
    bandsAccu[band.key].push(deltaMin);
    totalSamples += 1;
  }

  if (totalSamples < QUALITY_MIN_SAMPLE) return empty;

  const bands = SLEEP_BANDS.reduce((acc, b) => {
    const samples = bandsAccu[b.key];
    acc[b.key] = {
      count: samples.length,
      avgSleepDeltaMin: samples.length > 0
        ? Math.round(samples.reduce((a, v) => a + v, 0) / samples.length)
        : null,
    };
    return acc;
  }, {});

  // Insight : prend la bande la plus chargée avec au moins 3 échantillons
  const significantBand = [...SLEEP_BANDS].reverse().find((b) => bands[b.key].count >= 3);
  let insight = "";
  if (significantBand) {
    const delta = bands[significantBand.key].avgSleepDeltaMin;
    const sign = delta >= 0 ? "+" : "";
    insight = `Après une séance ${significantBand.label}, ton sommeil ${
      delta >= 0 ? "monte" : "descend"
    } de ${sign}${delta} min en moyenne.`;
  }

  return {
    sampleSize: totalSamples,
    bands,
    insight,
    confidence: classifyConfidence(totalSamples),
    hasData: true,
  };
}

// ---------------------------------------------------------------------------
// D1.4 — analyzeMonotonyVsHrv
// ---------------------------------------------------------------------------

/**
 * Stratifie les semaines par monotonie de Foster et compare la HRV moyenne
 * de chaque bande.
 *
 * @param {Array} joined - sortie de joinActivitiesWithRecovery
 * @param {Object} varianceProfile - objet retourné par buildLoadVarianceProfile
 *   (utilisé seulement comme indicateur global ; pour la stratification on
 *   recalcule la monotonie semaine par semaine à partir des dailyLoads).
 */
export function analyzeMonotonyVsHrv(joined = []) {
  const empty = {
    sampleSize: 0,
    bands: MONOTONY_BANDS.reduce((acc, b) => ({ ...acc, [b.key]: { weeks: 0, avgHrv: null } }), {}),
    insight: "",
    confidence: "Faible",
    hasData: false,
  };
  if (!Array.isArray(joined) || joined.length < 14) return empty;

  // Indexer les snapshots par dateKey via les recoveryDay du joined
  const hrvByDate = new Map();
  for (const j of joined) {
    if (j.recoveryDay?.snapshotDate && j.recoveryDay.hrvAvgMs > 0) {
      const key = toDateKey(j.recoveryDay.snapshotDate);
      if (key) hrvByDate.set(key, j.recoveryDay.hrvAvgMs);
    }
  }
  if (hrvByDate.size < 14) return empty;

  // Charges journalières via __loadValue
  const loadByDate = new Map();
  for (const j of joined) {
    const dateKey = toDateKey(j.activity?.startDateLocal || j.activity?.startDate);
    const load = Number(j.activity?.__loadValue || j.activity?.estimatedLoad?.value || 0);
    if (dateKey && load > 0) {
      loadByDate.set(dateKey, (loadByDate.get(dateKey) || 0) + load);
    }
  }
  if (loadByDate.size < 7) return empty;

  // Construire des fenêtres glissantes de 7 jours
  const sortedDates = [...new Set([...loadByDate.keys(), ...hrvByDate.keys()])].sort();
  if (sortedDates.length < 14) return empty;

  const bandsAccu = MONOTONY_BANDS.reduce((acc, b) => ({ ...acc, [b.key]: [] }), {});

  // On échantillonne tous les 7 jours pour éviter le chevauchement
  for (let i = 0; i + 7 <= sortedDates.length; i += 7) {
    const window = sortedDates.slice(i, i + 7);
    const dailyLoads = window.map((d) => loadByDate.get(d) || 0);
    const sum = dailyLoads.reduce((a, v) => a + v, 0);
    if (sum <= 0) continue;

    const mean = sum / 7;
    const variance = dailyLoads.reduce((acc, v) => acc + (v - mean) ** 2, 0) / 7;
    const stdDev = Math.sqrt(variance);
    const monotony = stdDev > 0 ? mean / stdDev : 7;

    const hrvVals = window.map((d) => hrvByDate.get(d)).filter((v) => v != null && v > 0);
    if (hrvVals.length < 4) continue; // au moins 4 nuits HRV sur la semaine
    const hrvMean = hrvVals.reduce((a, v) => a + v, 0) / hrvVals.length;

    const band = MONOTONY_BANDS.find((b) => monotony >= b.min && monotony < b.max);
    if (band) bandsAccu[band.key].push(hrvMean);
  }

  const bands = MONOTONY_BANDS.reduce((acc, b) => {
    const samples = bandsAccu[b.key];
    acc[b.key] = {
      weeks: samples.length,
      avgHrv: samples.length > 0
        ? Math.round((samples.reduce((a, v) => a + v, 0) / samples.length) * 10) / 10
        : null,
    };
    return acc;
  }, {});

  const totalWeeks = Object.values(bands).reduce((sum, b) => sum + b.weeks, 0);
  if (totalWeeks < 3) return empty;

  // Insight : compare bande "high" à bande "low" si les deux ont des données
  let insight = "";
  if (bands.high.weeks >= 1 && bands.low.weeks >= 1 && bands.high.avgHrv && bands.low.avgHrv) {
    const diffPct = ((bands.high.avgHrv - bands.low.avgHrv) / bands.low.avgHrv) * 100;
    const direction = diffPct >= 0 ? "plus haute" : "plus basse";
    insight = `Tes semaines avec monotonie > 2.2 ont une HRV moyenne ${Math.abs(Math.round(diffPct))} % ${direction} que tes semaines bien variées.`;
  } else if (bands.moderate.weeks >= 2 && bands.moderate.avgHrv) {
    insight = `Sur tes semaines à monotonie modérée, ton HRV moyenne est de ${bands.moderate.avgHrv} ms.`;
  }

  return {
    sampleSize: totalWeeks,
    bands,
    insight,
    confidence: classifyConfidence(totalWeeks * 5), // pondère pour qu'une semaine ≈ 5 séances
    hasData: Boolean(insight),
  };
}

// ---------------------------------------------------------------------------
// D1.5 — buildPersonalPatterns (orchestrateur)
// ---------------------------------------------------------------------------

/**
 * Orchestrateur : produit les 3 analyses + un méta-flag de fiabilité globale.
 *
 * @param {Object} args
 * @param {Array} args.activities
 * @param {Array} args.snapshots
 * @param {Object} [args.varianceProfile]
 */
export function buildPersonalPatterns({ activities = [], snapshots = [] } = {}) {
  const joined = joinActivitiesWithRecovery({ activities, snapshots });

  const validSnapshotDays = snapshots.filter(
    (s) => s.sleepScore != null && s.sleepScore > 0 && s.hrvAvgMs != null && s.hrvAvgMs > 0,
  ).length;
  const activityCount = activities.length;

  const hasMinimumData = validSnapshotDays >= MIN_DAYS_FOR_PATTERNS
    && activityCount >= MIN_ACTIVITIES_FOR_PATTERNS;

  const qualityVsRecovery = analyzeQualityVsRecovery(joined);
  const chargeImpactOnSleep = analyzeChargeImpactOnSleep(joined);
  const monotonyVsHrv = analyzeMonotonyVsHrv(joined);

  const presentInsights = [qualityVsRecovery, chargeImpactOnSleep, monotonyVsHrv]
    .filter((a) => a.hasData);

  let globalConfidence;
  if (!hasMinimumData) {
    globalConfidence = "Faible";
  } else if (presentInsights.length >= 2 && presentInsights.every((a) => a.confidence === "Haute")) {
    globalConfidence = "Haute";
  } else if (presentInsights.length >= 2) {
    globalConfidence = "Moyenne";
  } else {
    globalConfidence = "Faible";
  }

  return {
    qualityVsRecovery,
    chargeImpactOnSleep,
    monotonyVsHrv,
    globalConfidence,
    hasMinimumData,
    daysAnalyzed: validSnapshotDays,
    activitiesAnalyzed: activityCount,
  };
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
