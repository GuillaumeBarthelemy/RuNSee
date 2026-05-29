const LEVELS = {
  high: {
    label: "Confiance élevée",
    title: "Confiance élevée",
    tone: "positive",
    min: 85,
  },
  medium: {
    label: "Confiance moyenne",
    title: "Confiance moyenne",
    tone: "warning",
    min: 55,
  },
  low: {
    label: "Confiance faible",
    title: "Confiance faible",
    tone: "negative",
    min: 25,
  },
  insufficient: {
    label: "Données insuffisantes",
    title: "Données insuffisantes",
    tone: "neutral",
    min: 0,
  },
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(left, right = new Date()) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (!leftDate || !rightDate) return Infinity;
  return Math.abs(rightDate.getTime() - leftDate.getTime()) / 86400000;
}

function getActivityDate(activity = {}) {
  return toDate(activity.startDateLocal || activity.startDate || activity.date);
}

function countWith(activities = [], predicate = () => false) {
  return activities.reduce((count, activity) => count + (predicate(activity) ? 1 : 0), 0);
}

function hasDistance(activity = {}) {
  return toNumber(activity.distance) > 0 || toNumber(activity.distanceMeters) > 0 || toNumber(activity.distanceKm) > 0;
}

function hasDuration(activity = {}) {
  return toNumber(activity.movingTime) > 0 || toNumber(activity.movingTimeSeconds) > 0 || toNumber(activity.elapsedTime) > 0;
}

function hasHeartrate(activity = {}) {
  return toNumber(activity.averageHeartrate) > 0 || toNumber(activity.maxHeartrate) > 0;
}

function hasElevationGain(activity = {}) {
  return toNumber(activity.totalElevationGain) > 0 || toNumber(activity.elevationGain) > 0;
}

function hasElevationLoss(activity = {}) {
  return toNumber(activity.totalElevationLoss) > 0 || toNumber(activity.elevationLoss) > 0;
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasSplits(activity = {}) {
  if (Array.isArray(activity.splitsMetric) && activity.splitsMetric.length > 0) {
    return true;
  }
  // rawJson peut etre un objet deja parse OU une chaine JSON brute.
  const raw = parseMaybeJson(activity.rawJson);
  return Array.isArray(raw?.splits_metric) && raw.splits_metric.length > 0;
}

function hasRecentSnapshot(snapshots = [], referenceDate = new Date(), maxAgeDays = 3) {
  return snapshots.some((snapshot) => {
    const snapshotDate = snapshot?.calendarDate || snapshot?.date || snapshot?.createdAt;
    return daysBetween(snapshotDate, referenceDate) <= maxAgeDays;
  });
}

function isRunLike(activity = {}) {
  const sport = String(activity.sportType || activity.type || activity.name || "").toLowerCase();
  return sport.includes("run")
    || sport.includes("course")
    || sport.includes("trail")
    || sport.includes("foot");
}

function isHikeLike(activity = {}) {
  const sport = String(activity.sportType || activity.type || activity.name || "").toLowerCase();
  return sport.includes("hike")
    || sport.includes("walk")
    || sport.includes("randonn");
}

function makeCheck({
  id,
  passed = false,
  partial = false,
  weight = 10,
  positive = "",
  warning = "",
  missing = "",
  recommendation = "",
}) {
  return {
    id,
    passed: Boolean(passed),
    partial: Boolean(partial && !passed),
    weight: Math.max(0, toNumber(weight, 0)),
    positive,
    warning,
    missing,
    recommendation,
  };
}

function levelFromScore(score, hasAnySignal) {
  if (!hasAnySignal || score < LEVELS.low.min) return "insufficient";
  if (score >= LEVELS.high.min) return "high";
  if (score >= LEVELS.medium.min) return "medium";
  return "low";
}

function buildSummary(level, positiveSignals = [], warnings = [], missingData = []) {
  if (level === "high") {
    return positiveSignals.slice(0, 2).join(". ") || "Les donnees disponibles soutiennent bien cette lecture.";
  }

  if (level === "medium") {
    return warnings[0] || missingData[0] || "Analyse exploitable, avec quelques limites a garder en tete.";
  }

  if (level === "low") {
    return warnings[0] || missingData[0] || "Lecture prudente : plusieurs signaux restent fragiles.";
  }

  return missingData[0] || "Pas assez de donnees exploitables pour conclure sereinement.";
}

export function buildConfidenceResult({ scope = "generic", checks = [] } = {}) {
  const safeChecks = checks.filter(Boolean);
  const totalWeight = safeChecks.reduce((sum, check) => sum + Math.max(0, toNumber(check.weight, 0)), 0);
  const earnedWeight = safeChecks.reduce((sum, check) => {
    if (check.passed) return sum + check.weight;
    if (check.partial) return sum + (check.weight * 0.5);
    return sum;
  }, 0);
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const hasAnySignal = safeChecks.some((check) => check.passed || check.partial);
  const level = levelFromScore(score, hasAnySignal);
  const meta = LEVELS[level];
  const positiveSignals = safeChecks
    .filter((check) => check.passed && check.positive)
    .map((check) => check.positive);
  const warnings = safeChecks
    .filter((check) => (check.partial || (!check.passed && check.warning)) && check.warning)
    .map((check) => check.warning);
  const missingData = safeChecks
    .filter((check) => !check.passed && !check.partial && check.missing)
    .map((check) => check.missing);
  const recommendations = safeChecks
    .filter((check) => !check.passed && check.recommendation)
    .map((check) => check.recommendation);

  return {
    level,
    score,
    scope,
    title: meta.title,
    label: meta.label,
    tone: meta.tone,
    summary: buildSummary(level, positiveSignals, warnings, missingData),
    positiveSignals: [...new Set(positiveSignals)].slice(0, 4),
    warnings: [...new Set(warnings)].slice(0, 4),
    missingData: [...new Set(missingData)].slice(0, 4),
    recommendations: [...new Set(recommendations)].slice(0, 3),
  };
}

export function buildTodayConfidence({
  activities = [],
  loadModel = {},
  recoverySnapshots = [],
  referenceDate = new Date(),
  duplicateFree = true,
} = {}) {
  const recentActivities = activities.filter((activity) => daysBetween(getActivityDate(activity), referenceDate) <= 7);
  const hrCoverage = recentActivities.length ? countWith(recentActivities, hasHeartrate) / recentActivities.length : 0;
  const hasLoad = toNumber(loadModel?.summary?.periodLoad ?? loadModel?.summary?.load ?? loadModel?.periodLoad) > 0
    || Array.isArray(loadModel?.chartData) && loadModel.chartData.some((point) => toNumber(point.load) > 0);

  return buildConfidenceResult({
    scope: "today",
    checks: [
      makeCheck({
        id: "recent_activities",
        passed: recentActivities.length >= 2,
        partial: recentActivities.length === 1,
        weight: 24,
        positive: "Activites recentes disponibles",
        warning: "Peu d'activites recentes sur 7 jours",
        missing: "Aucune activite recente exploitable",
      }),
      makeCheck({
        id: "load",
        passed: hasLoad,
        weight: 22,
        positive: "Charge recente exploitable",
        missing: "Charge recente absente",
      }),
      makeCheck({
        id: "heartrate",
        passed: hrCoverage >= 0.7,
        partial: hrCoverage > 0,
        weight: 18,
        positive: "Frequence cardiaque bien couverte",
        warning: "Frequence cardiaque partielle",
        missing: "Frequence cardiaque absente",
      }),
      makeCheck({
        id: "recovery",
        passed: hasRecentSnapshot(recoverySnapshots, referenceDate, 3),
        partial: hasRecentSnapshot(recoverySnapshots, referenceDate, 7),
        weight: 18,
        positive: "Recovery Garmin recent",
        warning: "Recovery Garmin moins recent",
        missing: "Recovery Garmin recent absent",
      }),
      makeCheck({
        id: "duplicates",
        passed: duplicateFree,
        weight: 18,
        positive: "Aucun doublon provider detecte",
        warning: "Doublons provider a verifier",
      }),
    ],
  });
}

export function buildAnalyticsConfidence({
  activities = [],
  periodActivities = [],
  trailModel = {},
  recoverySnapshots = [],
  referenceDate = new Date(),
} = {}) {
  const scopedActivities = periodActivities.length ? periodActivities : activities;
  const hrCoverage = scopedActivities.length ? countWith(scopedActivities, hasHeartrate) / scopedActivities.length : 0;
  const elevationCoverage = scopedActivities.length ? countWith(scopedActivities, hasElevationGain) / scopedActivities.length : 0;
  const lossCoverage = scopedActivities.length ? countWith(scopedActivities, hasElevationLoss) / scopedActivities.length : 0;

  return buildConfidenceResult({
    scope: "analytics",
    checks: [
      makeCheck({
        id: "period_size",
        passed: scopedActivities.length >= 8,
        partial: scopedActivities.length >= 3,
        weight: 25,
        positive: "Periode suffisamment alimentee",
        warning: "Peu d'activites sur la periode",
        missing: "Periode trop pauvre pour lire une tendance",
      }),
      makeCheck({
        id: "heart_rate",
        passed: hrCoverage >= 0.65,
        partial: hrCoverage > 0,
        weight: 20,
        positive: "Couverture cardio exploitable",
        warning: "Couverture cardio partielle",
        missing: "Cardio absent sur la selection",
      }),
      makeCheck({
        id: "elevation_gain",
        passed: elevationCoverage >= 0.75,
        partial: elevationCoverage > 0,
        weight: 15,
        positive: "Denivele positif bien renseigne",
        warning: "Denivele positif partiel",
      }),
      makeCheck({
        id: "elevation_loss",
        passed: lossCoverage >= 0.5 || !trailModel?.hasData,
        partial: lossCoverage > 0,
        weight: 15,
        positive: trailModel?.hasData ? "Denivele negatif exploitable" : "Lecture trail non dominante",
        warning: "Denivele negatif partiel pour la lecture trail",
      }),
      makeCheck({
        id: "recovery",
        passed: hasRecentSnapshot(recoverySnapshots, referenceDate, 7),
        partial: recoverySnapshots.length > 0,
        weight: 10,
        positive: "Recovery Garmin disponible",
        warning: "Recovery Garmin ancien ou partiel",
      }),
      makeCheck({
        id: "merged_excluded",
        passed: !scopedActivities.some((activity) => activity?.isMerged),
        weight: 15,
        positive: "Activites fusionnees exclues des lectures",
        warning: "Activites fusionnees a verifier",
      }),
    ],
  });
}

export function buildPerformanceConfidence({
  activities = [],
  vdotProfile = {},
  bestEfforts = {},
  referenceDate = new Date(),
} = {}) {
  const runActivities = activities.filter((activity) => isRunLike(activity) && !isHikeLike(activity));
  const recentRuns = runActivities.filter((activity) => daysBetween(getActivityDate(activity), referenceDate) <= 90);
  const records = Array.isArray(bestEfforts?.records) ? bestEfforts.records : [];
  const availableRecords = records.filter((record) => record?.isAvailable !== false && toNumber(record?.elapsedSeconds || record?.recordSeconds) > 0);

  return buildConfidenceResult({
    scope: "performance",
    checks: [
      makeCheck({
        id: "road_runs",
        passed: recentRuns.length >= 5,
        partial: recentRuns.length >= 2,
        weight: 25,
        positive: "Courses recentes suffisantes",
        warning: "Peu de courses recentes comparables",
        missing: "Pas assez de courses recentes",
      }),
      makeCheck({
        id: "records",
        passed: availableRecords.length >= 2,
        partial: availableRecords.length === 1,
        weight: 25,
        positive: "Records route exploitables",
        warning: "Un seul repere route fiable",
        missing: "Records route insuffisants",
      }),
      makeCheck({
        id: "vdot",
        passed: Boolean(vdotProfile?.hasData),
        weight: 20,
        positive: "VO2max consolide disponible",
        missing: "VO2max non calculable",
      }),
      makeCheck({
        id: "heart_rate",
        passed: runActivities.length > 0 && countWith(runActivities, hasHeartrate) / runActivities.length >= 0.5,
        partial: countWith(runActivities, hasHeartrate) > 0,
        weight: 15,
        positive: "Cardio disponible pour relire l'effort",
        warning: "Cardio partiel sur les sorties route",
      }),
      makeCheck({
        id: "hikes_excluded",
        passed: activities.some(isHikeLike) ? runActivities.length > 0 : true,
        weight: 15,
        positive: "Randonees separees des performances route",
        warning: "Typage route/trail a verifier",
      }),
    ],
  });
}

export function buildObjectiveConfidence({
  race = null,
  profile = {},
  activities = [],
  recoverySnapshots = [],
  referenceDate = new Date(),
} = {}) {
  const hasRace = Boolean(race || profile?.hasRace);

  if (!hasRace) {
    return buildConfidenceResult({
      scope: "objective",
      checks: [
        makeCheck({
          id: "race",
          passed: false,
          weight: 100,
          missing: "Aucun objectif actif",
        }),
      ],
    });
  }

  const raceDistance = toNumber(race?.distanceMeters || profile?.race?.distanceMeters);
  const raceElevationGain = toNumber(race?.elevationGainMeters || profile?.race?.elevationGainMeters);
  const recentActivities = activities.filter((activity) => daysBetween(getActivityDate(activity), referenceDate) <= 42);
  const longRecent = recentActivities.some((activity) => {
    const distanceMeters = toNumber(activity.distance || activity.distanceMeters || activity.distanceKm * 1000);
    return distanceMeters >= Math.min(Math.max(raceDistance * 0.45, 12000), 30000);
  });
  const trailObjective = raceElevationGain > 300 || String(race?.terrainType || profile?.race?.terrainType || "").toLowerCase().includes("trail");

  return buildConfidenceResult({
    scope: "objective",
    checks: [
      makeCheck({
        id: "race",
        passed: hasRace,
        weight: 20,
        positive: "Objectif actif renseigne",
        missing: "Aucun objectif actif",
      }),
      makeCheck({
        id: "distance",
        passed: raceDistance > 0,
        weight: 15,
        positive: "Distance objectif renseignee",
        missing: "Distance objectif manquante",
      }),
      makeCheck({
        id: "recent_block",
        passed: recentActivities.length >= 8,
        partial: recentActivities.length >= 3,
        weight: 20,
        positive: "Bloc recent suffisant",
        warning: "Bloc recent encore court",
        missing: "Historique recent insuffisant",
      }),
      makeCheck({
        id: "long_run",
        passed: hasRace && (longRecent || !raceDistance),
        partial: recentActivities.some(hasDistance),
        weight: 15,
        positive: "Sortie longue recente presente",
        warning: "Sortie longue specifique a verifier",
      }),
      makeCheck({
        id: "trail_specificity",
        passed: hasRace && (!trailObjective || (countWith(recentActivities, hasElevationGain) > 0 && countWith(recentActivities, hasElevationLoss) > 0)),
        partial: hasRace && (!trailObjective || countWith(recentActivities, hasElevationGain) > 0),
        weight: 15,
        positive: trailObjective ? "Specificite trail partiellement couverte" : "Objectif route plus simple a qualifier",
        warning: "D- ou exposition trail recents incomplets",
      }),
      makeCheck({
        id: "recovery",
        passed: hasRecentSnapshot(recoverySnapshots, referenceDate, 7),
        partial: recoverySnapshots.length > 0,
        weight: 15,
        positive: "Recovery recent disponible",
        warning: "Recovery recent a completer",
      }),
    ],
  });
}

export function buildActivityTrailConfidence({
  activity = {},
  trailProfile = {},
} = {}) {
  return buildConfidenceResult({
    scope: "activityTrail",
    checks: [
      makeCheck({
        id: "trail_context",
        passed: Boolean(trailProfile?.hasTrailContext),
        partial: Boolean(trailProfile?.hasData),
        weight: 20,
        positive: "Contexte trail identifiable",
        warning: "Profil peu trail ou peu vallonne",
        missing: "Pas de donnees altitude exploitables",
      }),
      makeCheck({
        id: "elevation_gain",
        passed: hasElevationGain(activity) || toNumber(trailProfile?.elevationGain) > 0,
        weight: 20,
        positive: "D+ disponible",
        missing: "D+ absent",
      }),
      makeCheck({
        id: "elevation_loss",
        passed: hasElevationLoss(activity) || toNumber(trailProfile?.elevationLoss) > 0,
        partial: toNumber(trailProfile?.elevationLossPerKm) > 0,
        weight: 25,
        positive: "D- disponible",
        warning: "D- partiel",
        missing: "D- absent : charge descente fragile",
      }),
      makeCheck({
        id: "splits",
        passed: hasSplits(activity),
        partial: Boolean(activity?.rawJson),
        weight: 15,
        positive: "Splits ou details disponibles",
        warning: "Details activite partiels",
      }),
      makeCheck({
        id: "distance_duration",
        passed: hasDistance(activity) && hasDuration(activity),
        weight: 20,
        positive: "Distance et duree disponibles",
        missing: "Distance ou duree absente",
      }),
    ],
  });
}
