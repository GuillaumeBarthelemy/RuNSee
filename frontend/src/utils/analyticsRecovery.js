/**
 * analyticsRecovery.js — helpers pour l'onglet "Sommeil & récupération" (PDF p.11).
 *
 * Source unique : ExternalDailyRecoverySnapshot[] (Garmin Wellness daily).
 * Champs consommés : sleepDurationSeconds, sleepScore, hrvAvgMs, restingHr,
 * stressAvg, bodyBatteryMax, trainingReadinessScore.
 *
 * Convention : tous les helpers tolèrent les valeurs null/0 (jours sans
 * données). On retourne `null` pour signaler une absence, jamais `0`.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function snapshotDate(s) {
  // Le serializer API expose `date` (string YYYY-MM-DD) ; en interne le
  // modèle Prisma utilise `snapshotDate` (DateTime). On accepte les deux.
  const raw = s?.date || s?.snapshotDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function meanIgnoreNull(values) {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// ---------------------------------------------------------------------------
// Window aggregator — moyenne par métrique sur [start, end]
// ---------------------------------------------------------------------------

function aggregateWindow(snapshots, start, end) {
  const filtered = snapshots.filter((s) => {
    const d = snapshotDate(s);
    return d && d >= start && d <= end;
  });
  if (!filtered.length) {
    return {
      sleepHours: null, hrvMs: null, restingHr: null,
      stress: null, readinessPct: null, count: 0,
    };
  }
  const sleepSeconds = meanIgnoreNull(filtered.map((s) => safeNum(s.sleepDurationSeconds)));
  const sleepHours = sleepSeconds != null ? sleepSeconds / 3600 : null;
  const hrvMs = meanIgnoreNull(filtered.map((s) => safeNum(s.hrvAvgMs)));
  const restingHr = meanIgnoreNull(filtered.map((s) => safeNum(s.restingHr)));
  const stress = meanIgnoreNull(filtered.map((s) => safeNum(s.stressAvg)));
  // Décision A : on privilégie notre readiness composite si calculé en amont
  // (passé séparément). Ici on fournit aussi la version Garmin (trainingReadinessScore)
  // comme fallback.
  const readinessGarmin = meanIgnoreNull(filtered.map((s) => safeNum(s.trainingReadinessScore)));
  const bodyBatteryMax = meanIgnoreNull(filtered.map((s) => safeNum(s.bodyBatteryMax)));
  return {
    sleepHours,
    hrvMs,
    restingHr,
    stress,
    readinessGarmin,
    bodyBatteryMax,
    count: filtered.length,
  };
}

// ---------------------------------------------------------------------------
// Rolling 30j vs 30j précédents (décision B)
// ---------------------------------------------------------------------------

export function buildRecoveryRolling30(snapshots = [], endDate = new Date(), readinessOverride = null) {
  const e = endDate instanceof Date ? endOfDay(endDate) : endOfDay(new Date());
  const startCurrent = startOfDay(new Date(e.getTime() - 29 * MS_PER_DAY));
  const endPrevious = new Date(startCurrent.getTime() - 1);
  const startPrevious = startOfDay(new Date(endPrevious.getTime() - 29 * MS_PER_DAY));

  const current = aggregateWindow(snapshots, startCurrent, e);
  const previous = aggregateWindow(snapshots, startPrevious, endPrevious);

  // Si l'on a un readinessOverride (notre score composite), on l'utilise pour
  // l'État de récupération. Sinon fallback Garmin trainingReadinessScore.
  // Note : le readinessOverride correspond à la valeur AGRÉGÉE actuelle (pas
  // une moyenne) car il vient de buildRecoveryViewModel sur snapshots récents.
  if (Number.isFinite(readinessOverride)) {
    current.readinessPct = readinessOverride;
  } else {
    current.readinessPct = current.readinessGarmin;
  }
  previous.readinessPct = previous.readinessGarmin;

  function deltaPct(c, p) {
    if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
    return Math.round(((c - p) / p) * 100);
  }
  function deltaAbs(c, p, decimals = 0) {
    if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
    const d = c - p;
    const m = 10 ** decimals;
    return Math.round(d * m) / m;
  }

  return {
    current,
    previous,
    deltaAbs: {
      sleepHours: deltaAbs(current.sleepHours, previous.sleepHours, 2),
      hrvMs: deltaAbs(current.hrvMs, previous.hrvMs, 0),
      restingHr: deltaAbs(current.restingHr, previous.restingHr, 0),
      stress: deltaAbs(current.stress, previous.stress, 0),
      readinessPct: deltaAbs(current.readinessPct, previous.readinessPct, 0),
    },
    deltaPct: {
      sleepHours: deltaPct(current.sleepHours, previous.sleepHours),
      hrvMs: deltaPct(current.hrvMs, previous.hrvMs),
      restingHr: deltaPct(current.restingHr, previous.restingHr),
      stress: deltaPct(current.stress, previous.stress),
      readinessPct: deltaPct(current.readinessPct, previous.readinessPct),
    },
  };
}

// ---------------------------------------------------------------------------
// Séries journalières pour les charts §4 et §5
// ---------------------------------------------------------------------------

export function buildRecoveryDailySeries(snapshots = [], endDate = new Date(), nDays = 7) {
  const e = endDate instanceof Date ? endOfDay(endDate) : endOfDay(new Date());
  const byKey = new Map();
  for (const s of snapshots) {
    const d = snapshotDate(s);
    if (!d) continue;
    const dd = startOfDay(d);
    const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    byKey.set(key, s);
  }

  const out = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const d = startOfDay(new Date(e.getTime() - i * MS_PER_DAY));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const s = byKey.get(key);
    const sleepHours = s && safeNum(s.sleepDurationSeconds) != null
      ? Math.round((s.sleepDurationSeconds / 3600) * 100) / 100
      : null;
    // Récupération % : on prend bodyBatteryMax comme proxy "énergie disponible"
    // Si trainingReadinessScore présent, on utilise lui (plus fidèle "récupération").
    const recoveryPct = s
      ? (safeNum(s.trainingReadinessScore) ?? safeNum(s.bodyBatteryMax))
      : null;
    const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
    const shortDayLabel = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" });
    out.push({
      date: d,
      label: dayLabel,
      shortLabel: shortDayLabel,
      sleepHours,
      recoveryPct,
      hrvMs: s ? safeNum(s.hrvAvgMs) : null,
      restingHr: s ? safeNum(s.restingHr) : null,
      stress: s ? safeNum(s.stressAvg) : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Classification (tone + hint) par métrique
// ---------------------------------------------------------------------------

/** Sommeil — durée NSF 2015 / AASM 2015 */
export function classifySleep(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return { tone: 3, hint: "—" };
  if (hours < 6)   return { tone: 4, hint: "Insuffisant" };
  if (hours < 7)   return { tone: 3, hint: "Limite" };
  if (hours <= 9)  return { tone: 1, hint: "Bonne qualité" };
  return                 { tone: 3, hint: "Excessif" };
}

/** HRV RMSSD — Plews & Laursen 2013 (athlète endurance) */
export function classifyHrv(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return { tone: 3, hint: "—" };
  if (ms < 40)   return { tone: 4, hint: "Faible" };
  if (ms < 60)   return { tone: 3, hint: "Moyen" };
  if (ms <= 100) return { tone: 1, hint: "Bon" };
  return               { tone: 1, hint: "Excellent" };
}

/** FC repos — ACSM 2018 athlète entraîné */
export function classifyRestingHr(bpm) {
  if (!Number.isFinite(bpm) || bpm <= 0) return { tone: 3, hint: "—" };
  if (bpm < 50)  return { tone: 1, hint: "Excellente" };
  if (bpm <= 60) return { tone: 1, hint: "Dans la norme" };
  if (bpm <= 70) return { tone: 2, hint: "Correcte" };
  return               { tone: 4, hint: "Élevée" };
}

/** Stress — Garmin Firstbeat 0-100 */
export function classifyStress(value) {
  if (!Number.isFinite(value)) return { tone: 3, hint: "—" };
  if (value <= 25) return { tone: 1, hint: "Repos" };
  if (value <= 50) return { tone: 2, hint: "Modéré" };
  if (value <= 75) return { tone: 4, hint: "Élevé" };
  return                 { tone: 5, hint: "Très élevé" };
}

/** Readiness composite — Halson 2014 / Plews 2013 / Buchheit 2014 */
export function classifyReadiness(pct) {
  if (!Number.isFinite(pct)) return { tone: 3, hint: "—" };
  if (pct < 30)  return { tone: 5, hint: "Faible" };
  if (pct < 50)  return { tone: 4, hint: "Modérée" };
  if (pct < 70)  return { tone: 2, hint: "Bon" };
  return               { tone: 1, hint: "Excellent" };
}

// ---------------------------------------------------------------------------
// Recommandation dynamique (§6, décision D — Halson 2014 + Plews/Buchheit)
// ---------------------------------------------------------------------------

export function buildRecoveryRecommendation(readinessPct) {
  if (!Number.isFinite(readinessPct)) {
    return {
      title: "Données insuffisantes",
      body: "Reconnecte ta source de récupération (sommeil, HRV, FC repos) pour une recommandation personnalisée.",
      tone: 3,
    };
  }
  if (readinessPct < 30) {
    return {
      title: "Récupération à prioriser",
      body: "Priorise sommeil, hydratation et récupération active avant toute séance intense.",
      tone: 5,
    };
  }
  if (readinessPct < 50) {
    return {
      title: "Récupération modérée",
      body: "Adapte l'intensité aux signaux du corps, privilégie le volume facile.",
      tone: 4,
    };
  }
  if (readinessPct < 70) {
    return {
      title: "Bonne dynamique",
      body: "Maintiens ton hygiène de vie et écoute tes sensations. Tu peux soutenir la charge.",
      tone: 2,
    };
  }
  return {
    title: "Excellent état",
    body: "Profite-en pour stimuler l'organisme tout en restant à l'écoute des signaux.",
    tone: 1,
  };
}
