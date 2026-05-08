const MIN_ACTIVITY_DISTANCE_KM = 1;
const MIN_ACTIVITY_DURATION_SECONDS = 8 * 60;
const MIN_SEGMENT_DURATION_SECONDS = 10;
const FLAT_GRADE_RATIO = 0.03;

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value, decimals = 1) {
  const multiplier = 10 ** decimals;
  return Math.round(toNumber(value) * multiplier) / multiplier;
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

function getDistanceKm(activity = {}) {
  const meters = toNumber(activity.distance ?? activity.__distanceMeters);
  if (meters > 0) return meters / 1000;
  return toNumber(activity.distanceKm ?? activity.__distanceKm);
}

function getDurationSeconds(activity = {}) {
  return toNumber(activity.movingTime ?? activity.moving_time ?? activity.elapsedTime ?? activity.elapsed_time);
}

function getElevationGainMeters(activity = {}) {
  return Math.max(0, toNumber(
    activity.totalElevationGain
      ?? activity.total_elevation_gain
      ?? activity.elevationGain
      ?? activity.__elevationGain,
  ));
}

function getElevationLossMeters(activity = {}) {
  return Math.max(0, toNumber(
    activity.totalElevationLoss
      ?? activity.total_elevation_loss
      ?? activity.elevationLoss
      ?? activity.__elevationLoss,
  ));
}

function normalizeSegment(segment = {}) {
  const distanceMeters = toNumber(segment.distance);
  const durationSeconds = toNumber(segment.moving_time ?? segment.movingTime ?? segment.elapsed_time ?? segment.elapsedTime);
  const elevationDiff = toNumber(segment.elevation_difference ?? segment.elevationDifference);

  return {
    distanceKm: distanceMeters > 0 ? distanceMeters / 1000 : 0,
    durationSeconds,
    elevationDiff,
    gradeRatio: distanceMeters > 0 ? elevationDiff / distanceMeters : 0,
  };
}

function getSegments(activity = {}) {
  const payload = parseJsonSafe(activity.rawJson) || parseJsonSafe(activity.summaryJson);
  if (!payload) return [];

  const splitsMetric = Array.isArray(payload.splits_metric) ? payload.splits_metric : [];
  const laps = Array.isArray(payload.laps) ? payload.laps : [];
  return (splitsMetric.length ? splitsMetric : laps)
    .map(normalizeSegment)
    .filter((segment) => segment.durationSeconds >= MIN_SEGMENT_DURATION_SECONDS);
}

function classifyTerrain(elevationGainPerKm, distanceKm) {
  if (distanceKm > 0 && distanceKm < 4 && elevationGainPerKm >= 90) {
    return {
      key: "vertical_like",
      label: "Vertical-like",
      isTrailRelevant: true,
    };
  }

  if (elevationGainPerKm > 50) {
    return {
      key: "mountain_trail",
      label: "Trail montagne",
      isTrailRelevant: true,
    };
  }

  if (elevationGainPerKm >= 25) {
    return {
      key: "rolling_trail",
      label: "Trail roulant",
      isTrailRelevant: true,
    };
  }

  if (elevationGainPerKm >= 10) {
    return {
      key: "hilly",
      label: "Vallonne",
      isTrailRelevant: true,
    };
  }

  return {
    key: "flat_road",
    label: "Route / plat",
    isTrailRelevant: false,
  };
}

function classifyDataQuality({ distanceKm, durationSeconds, elevationGain, segmentCount }) {
  if (distanceKm < MIN_ACTIVITY_DISTANCE_KM || durationSeconds < MIN_ACTIVITY_DURATION_SECONDS) {
    return {
      key: "insufficient_activity",
      label: "Activite trop courte",
      isUsable: false,
    };
  }

  if (!elevationGain && segmentCount < 3) {
    return {
      key: "missing_altitude",
      label: "Altitude absente",
      isUsable: false,
    };
  }

  if (segmentCount < 3) {
    return {
      key: "summary_only",
      label: "Altitude indicative",
      isUsable: true,
    };
  }

  return {
    key: "sufficient",
    label: "Altitude suffisante",
    isUsable: true,
  };
}

function classifyLoad(value, moderateThreshold, highThreshold) {
  if (value >= highThreshold) {
    return {
      key: "high",
      label: "elevee",
      tone: "danger",
    };
  }
  if (value >= moderateThreshold) {
    return {
      key: "moderate",
      label: "moderee",
      tone: "warning",
    };
  }
  return {
    key: "low",
    label: "faible",
    tone: "neutral",
  };
}

function buildSegmentSummary(segments = []) {
  let ascentTimeSeconds = 0;
  let descentTimeSeconds = 0;
  let flatTimeSeconds = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let longestClimbMeters = 0;
  let longestDescentMeters = 0;
  let currentClimbMeters = 0;
  let currentDescentMeters = 0;

  segments.forEach((segment) => {
    if (segment.gradeRatio > FLAT_GRADE_RATIO && segment.elevationDiff > 0) {
      ascentTimeSeconds += segment.durationSeconds;
      elevationGain += segment.elevationDiff;
      currentClimbMeters += segment.elevationDiff;
      longestDescentMeters = Math.max(longestDescentMeters, currentDescentMeters);
      currentDescentMeters = 0;
      return;
    }

    if (segment.gradeRatio < -FLAT_GRADE_RATIO && segment.elevationDiff < 0) {
      descentTimeSeconds += segment.durationSeconds;
      elevationLoss += Math.abs(segment.elevationDiff);
      currentDescentMeters += Math.abs(segment.elevationDiff);
      longestClimbMeters = Math.max(longestClimbMeters, currentClimbMeters);
      currentClimbMeters = 0;
      return;
    }

    flatTimeSeconds += segment.durationSeconds;
    longestClimbMeters = Math.max(longestClimbMeters, currentClimbMeters);
    longestDescentMeters = Math.max(longestDescentMeters, currentDescentMeters);
    currentClimbMeters = 0;
    currentDescentMeters = 0;
  });

  return {
    ascentTimeSeconds,
    descentTimeSeconds,
    flatTimeSeconds,
    elevationGain,
    elevationLoss,
    longestClimbMeters: Math.max(longestClimbMeters, currentClimbMeters),
    longestDescentMeters: Math.max(longestDescentMeters, currentDescentMeters),
  };
}

function getActivityDate(activity = {}) {
  const parsed = new Date(activity.startDateLocal || activity.startDate || activity.date || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinDays(activity, referenceDate, days) {
  const activityDate = getActivityDate(activity);
  const endDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate || Date.now());
  if (!activityDate || Number.isNaN(endDate.getTime())) return false;
  const diffMs = endDate.getTime() - activityDate.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

export function buildTrailProfile(activity = {}) {
  const distanceKm = getDistanceKm(activity);
  const durationSeconds = getDurationSeconds(activity);
  const storedElevationGain = getElevationGainMeters(activity);
  const storedElevationLoss = getElevationLossMeters(activity);
  const segments = getSegments(activity);
  const segmentSummary = buildSegmentSummary(segments);
  const elevationGain = segmentSummary.elevationGain > 0 ? segmentSummary.elevationGain : storedElevationGain;
  const elevationLoss = segmentSummary.elevationLoss > 0 ? segmentSummary.elevationLoss : storedElevationLoss;
  const elevationGainPerKm = distanceKm > 0 ? elevationGain / distanceKm : 0;
  const elevationLossPerKm = distanceKm > 0 ? elevationLoss / distanceKm : 0;
  const terrain = classifyTerrain(elevationGainPerKm, distanceKm);
  const dataQuality = classifyDataQuality({
    distanceKm,
    durationSeconds,
    elevationGain,
    segmentCount: segments.length,
  });
  const downhillLoadValue = elevationLoss + elevationLossPerKm * 8;
  const uphillLoadValue = elevationGain + elevationGainPerKm * 5;
  const downhillLoad = classifyLoad(downhillLoadValue, 350, 700);
  const uphillLoad = classifyLoad(uphillLoadValue, 450, 900);
  const hasTrailContext = dataQuality.isUsable && terrain.isTrailRelevant;

  return {
    hasData: dataQuality.isUsable,
    hasTrailContext,
    distanceKm: round(distanceKm, 2),
    durationSeconds,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    elevationGainPerKm: round(elevationGainPerKm, 1),
    elevationLossPerKm: round(elevationLossPerKm, 1),
    ascentTimeSeconds: Math.round(segmentSummary.ascentTimeSeconds),
    descentTimeSeconds: Math.round(segmentSummary.descentTimeSeconds),
    flatTimeSeconds: Math.round(segmentSummary.flatTimeSeconds),
    longestClimbMeters: Math.round(segmentSummary.longestClimbMeters),
    longestDescentMeters: Math.round(segmentSummary.longestDescentMeters),
    terrain,
    dataQuality,
    downhillLoad,
    uphillLoad,
    message: hasTrailContext
      ? `${terrain.label} : ${round(elevationGainPerKm, 1)} m D+/km.`
      : "Pas de lecture trail utile pour cette activite.",
  };
}

export function buildTrailContextSummary(activities = [], options = {}) {
  const referenceDate = options.referenceDate || new Date();
  const recentActivities = activities.filter((activity) => isWithinDays(activity, referenceDate, 7));
  const last72hActivities = activities.filter((activity) => isWithinDays(activity, referenceDate, 3));
  const profiles = recentActivities.map(buildTrailProfile).filter((profile) => profile.hasData);
  const trailProfiles = profiles.filter((profile) => profile.hasTrailContext);
  const downhill72h = last72hActivities
    .map(buildTrailProfile)
    .filter((profile) => profile.hasData)
    .reduce((sum, profile) => sum + profile.elevationLoss, 0);
  const elevationGain7d = profiles.reduce((sum, profile) => sum + profile.elevationGain, 0);
  const elevationLoss7d = profiles.reduce((sum, profile) => sum + profile.elevationLoss, 0);
  const hasActiveTrailObjective = Boolean(options.activeRace?.elevationGainMeters || options.activeRace?.terrainType);
  const hasRecentTrail = trailProfiles.length > 0;
  const hasHighDownhillLoad = downhill72h >= 700;
  const shouldShow = Boolean(hasActiveTrailObjective || hasRecentTrail || hasHighDownhillLoad || elevationGain7d >= 1200);

  if (!shouldShow) {
    return {
      shouldShow: false,
      context: "",
      vigilance: "",
      tone: "neutral",
      profiles,
    };
  }

  let tone = "neutral";
  let context = hasRecentTrail
    ? `Contexte trail : ${Math.round(elevationGain7d)} m D+ et ${Math.round(elevationLoss7d)} m D- sur 7 jours.`
    : "Objectif ou contexte trail détecté, sans grosse exposition récente.";
  let vigilance = "";

  if (hasHighDownhillLoad) {
    tone = "warning";
    vigilance = "Vigilance : limite les descentes rapides aujourd'hui.";
  } else if (elevationGain7d >= 1200) {
    tone = "warning";
    vigilance = "Vigilance : bloc vallonné récent, garde une intensité maîtrisée.";
  } else if (hasActiveTrailObjective) {
    context = hasRecentTrail
      ? context
      : "Spécificité trail à suivre par rapport à ton objectif.";
  }

  return {
    shouldShow,
    context,
    vigilance,
    tone,
    profiles,
    elevationGain7d: Math.round(elevationGain7d),
    elevationLoss7d: Math.round(elevationLoss7d),
    downhill72h: Math.round(downhill72h),
  };
}

export function buildTrailAnalyticsSummary(activities = []) {
  const profiles = activities.map(buildTrailProfile).filter((profile) => profile.hasData);
  const trailProfiles = profiles.filter((profile) => profile.hasTrailContext);
  const totalDistanceKm = profiles.reduce((sum, profile) => sum + profile.distanceKm, 0);
  const trailDistanceKm = trailProfiles.reduce((sum, profile) => sum + profile.distanceKm, 0);
  const elevationGain = profiles.reduce((sum, profile) => sum + profile.elevationGain, 0);
  const elevationLoss = profiles.reduce((sum, profile) => sum + profile.elevationLoss, 0);
  const ascentTimeSeconds = profiles.reduce((sum, profile) => sum + profile.ascentTimeSeconds, 0);
  const descentTimeSeconds = profiles.reduce((sum, profile) => sum + profile.descentTimeSeconds, 0);
  const maxClimb = profiles.reduce((max, profile) => Math.max(max, profile.longestClimbMeters), 0);
  const maxDescent = profiles.reduce((max, profile) => Math.max(max, profile.longestDescentMeters), 0);
  const highDownhillCount = profiles.filter((profile) => profile.downhillLoad.key === "high").length;

  return {
    hasData: profiles.length > 0,
    profiles,
    trailActivities: trailProfiles.length,
    totalActivities: profiles.length,
    totalDistanceKm: round(totalDistanceKm, 1),
    trailDistanceKm: round(trailDistanceKm, 1),
    trailSharePercent: totalDistanceKm > 0 ? Math.round((trailDistanceKm / totalDistanceKm) * 100) : 0,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    elevationGainPerKm: totalDistanceKm > 0 ? round(elevationGain / totalDistanceKm, 1) : 0,
    elevationLossPerKm: totalDistanceKm > 0 ? round(elevationLoss / totalDistanceKm, 1) : 0,
    ascentTimeSeconds: Math.round(ascentTimeSeconds),
    descentTimeSeconds: Math.round(descentTimeSeconds),
    longestClimbMeters: Math.round(maxClimb),
    longestDescentMeters: Math.round(maxDescent),
    downhillTone: highDownhillCount > 0 || elevationLoss >= 1200 ? "warning" : "neutral",
    insight: profiles.length
      ? `Sur la selection : ${Math.round(elevationGain)} m D+ et ${Math.round(elevationLoss)} m D-.`
      : "Pas assez de donnees altitude exploitables sur la selection.",
  };
}
