import { buildAerobicDecouplingProfile } from "./intraSessionMetrics.js";
import { getActivityPublicId } from "./activityLinks.js";
import { isRunLikeActivity } from "./activityInsights.js";

const DAY_MS = 86400000;
const SEVERITY_ORDER = {
  danger: 0,
  warning: 1,
  info: 2,
  positive: 3,
  neutral: 4,
};
const FAMILY_ORDER = {
  surcharge: 1,
  structure: 2,
  volume: 3,
  progression: 4,
  data: 5,
};
const ALERT_FAMILY_BY_KEY = {
  "surcharge-tsb": "surcharge",
  "atl-superieur-ctl": "surcharge",
  "monotonie-elevee": "surcharge",
  "acwr-pic": "surcharge",
  detraining: "surcharge",
  "course-imminente-tsb-bas": "surcharge",
  "strain-monotonie-cumules": "surcharge",
  "chute-fraicheur-brutale": "surcharge",
  "derive-cardiaque-excessive": "surcharge",
  "progression-ctl-trop-rapide": "surcharge",
  "forme-ideale": "surcharge",
  "polarisation-zone-grise": "structure",
  "pas-de-qualite-21j": "structure",
  "volume-sans-intensite": "structure",
  "saut-de-monotonie": "structure",
  "polarisation-ideale": "structure",
  "aucune-activite-7j": "volume",
  "aucune-activite-14j": "volume",
  "volume-hebdo-casse": "volume",
  "pas-de-sortie-longue": "volume",
  "streak-long-sans-repos": "volume",
  "plateau-efficience": "progression",
  "regression-efficience": "progression",
  "progression-ctl-saine": "progression",
  "vdot-en-hausse": "progression",
  "vdot-en-baisse": "progression",
  "nouveau-record": "progression",
  "fc-repos-non-renseignee": "data",
  "fc-max-non-renseignee": "data",
  "cardio-absent-derniere-seance": "data",
};
const ALERT_ACTION_BY_KEY = {
  "surcharge-tsb": { label: "Voir Tendance", href: "/analytics" },
  "atl-superieur-ctl": { label: "Voir Tendance", href: "/analytics" },
  "monotonie-elevee": { label: "Voir Tendance", href: "/analytics" },
  "acwr-pic": { label: "Voir Tendance", href: "/analytics" },
  detraining: { label: "Voir Tendance", href: "/analytics" },
  "aucune-activite-7j": { label: "Lancer la synchro Strava", href: "sync-strava" },
  "aucune-activite-14j": { label: "Lancer la synchro Strava", href: "sync-strava" },
  "course-imminente-tsb-bas": { label: "Voir Performance", href: "/performance" },
  "forme-ideale": null,
  "strain-monotonie-cumules": { label: "Voir Tendance", href: "/analytics" },
  "chute-fraicheur-brutale": { label: "Voir Tendance", href: "/analytics" },
  "progression-ctl-trop-rapide": { label: "Voir Tendance", href: "/analytics" },
  "polarisation-zone-grise": { label: "Voir l'intensite", href: "/analytics" },
  "pas-de-qualite-21j": { label: "Voir Tendance", href: "/analytics" },
  "volume-sans-intensite": { label: "Voir Tendance", href: "/analytics" },
  "saut-de-monotonie": { label: "Voir Tendance", href: "/analytics" },
  "polarisation-ideale": null,
  "volume-hebdo-casse": { label: "Voir Tendance", href: "/analytics" },
  "pas-de-sortie-longue": null,
  "streak-long-sans-repos": null,
  "plateau-efficience": { label: "Voir Tendance", href: "/analytics" },
  "regression-efficience": { label: "Voir Tendance", href: "/analytics" },
  "progression-ctl-saine": null,
  "vdot-en-hausse": { label: "Voir Performance", href: "/performance" },
  "vdot-en-baisse": { label: "Voir Performance", href: "/performance" },
  "nouveau-record": { label: "Voir Performance", href: "/performance" },
  "fc-repos-non-renseignee": { label: "Aller en Reglages", href: "/admin" },
  "fc-max-non-renseignee": { label: "Aller en Reglages", href: "/admin" },
  "cardio-absent-derniere-seance": null,
};

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value) {
  const date = toDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(value, amount) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function getActivityDate(activity = {}) {
  return toDate(activity.startDateLocal || activity.startDate || activity.date);
}

function getActivityId(activity = {}) {
  return getActivityPublicId(activity) || activity.activityId || "";
}

function getActivityDurationMinutes(activity = {}) {
  const movingTime = toNumber(activity.movingTime ?? activity.movingSeconds);
  if (movingTime > 0) {
    return movingTime / 60;
  }

  const movingHours = toNumber(activity.movingHours);
  return movingHours > 0 ? movingHours * 60 : 0;
}

function isWithinDays(activity = {}, referenceDate, days) {
  const activityDate = getActivityDate(activity);
  if (!activityDate) {
    return false;
  }

  const reference = startOfDay(referenceDate);
  const lowerBound = addDays(reference, -Math.max(0, days - 1));
  const activityDay = startOfDay(activityDate);
  return activityDay >= lowerBound && activityDay <= reference;
}

function countActiveDays(activities = [], referenceDate, limitDays = 30) {
  const activeDays = new Set(
    activities
      .map(getActivityDate)
      .filter(Boolean)
      .map((date) => startOfDay(date).getTime()),
  );

  let streak = 0;
  for (let offset = 0; offset < limitDays; offset += 1) {
    const day = addDays(referenceDate, -offset).getTime();
    if (!activeDays.has(day)) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function getTimeline(loadModel = {}) {
  return Array.isArray(loadModel.chartData) ? loadModel.chartData : [];
}

function getRecentTimeline(loadModel = {}, days = 7) {
  return getTimeline(loadModel).slice(-days);
}

function sumBy(items = [], getter) {
  return items.reduce((sum, item) => sum + toNumber(getter(item)), 0);
}

function mean(values = []) {
  const safeValues = values.map(toNumber).filter((value) => Number.isFinite(value));
  return safeValues.length ? sumBy(safeValues, (value) => value) / safeValues.length : 0;
}

function standardDeviation(values = []) {
  const average = mean(values);
  if (!values.length) {
    return 0;
  }
  const variance = values.reduce((sum, value) => sum + ((toNumber(value) - average) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function buildAlert({
  key,
  family,
  severity = "info",
  title,
  message,
  action = null,
  order = 0,
}) {
  const resolvedFamily = ALERT_FAMILY_BY_KEY[key] || family || "data";
  let resolvedAction = action;

  if (key === "derive-cardiaque-excessive") {
    resolvedAction = action?.href ? { label: "Voir la fiche", href: action.href } : null;
  } else if (Object.prototype.hasOwnProperty.call(ALERT_ACTION_BY_KEY, key)) {
    resolvedAction = ALERT_ACTION_BY_KEY[key];
  }

  return {
    key,
    family: resolvedFamily,
    familyOrder: FAMILY_ORDER[resolvedFamily] || 99,
    severity,
    severityOrder: SEVERITY_ORDER[severity] ?? SEVERITY_ORDER.neutral,
    title,
    message,
    action: resolvedAction,
    order,
  };
}

function getRaceDaysUntil(activeRace = {}, referenceDate) {
  const raceDate = toDate(activeRace?.raceDate || activeRace?.date);
  if (!raceDate) {
    return null;
  }

  return Math.round((startOfDay(raceDate) - startOfDay(referenceDate)) / DAY_MS);
}

function getRecentLongRun(activities = [], referenceDate) {
  return activities.find(
    (activity) =>
      isRunLikeActivity(activity)
      && isWithinDays(activity, referenceDate, 14)
      && getActivityDurationMinutes(activity) >= 90,
  );
}

function hasRecentQuality(activities = [], referenceDate) {
  return activities.some((activity) => {
    if (!isRunLikeActivity(activity) || !isWithinDays(activity, referenceDate, 21)) {
      return false;
    }

    const tags = [
      activity.estimatedSessionLabel,
      activity.dominantIntensityLabel,
      activity.primaryTag,
      ...(Array.isArray(activity.tags) ? activity.tags : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return tags.includes("z4")
      || tags.includes("z5")
      || tags.includes("seuil")
      || tags.includes("vma")
      || tags.includes("intensite")
      || tags.includes("rappel");
  });
}

function getLatestRunLikeActivity(activities = []) {
  return [...activities]
    .filter(isRunLikeActivity)
    .sort((left, right) => (getActivityDate(right)?.getTime() || 0) - (getActivityDate(left)?.getTime() || 0))[0] || null;
}

function getMonotonyFromLoads(points = []) {
  const loads = points.map((point) => toNumber(point.load));
  const average = mean(loads);
  const deviation = standardDeviation(loads);
  return deviation > 0 ? average / deviation : average > 0 ? 7 : 0;
}

function hasRecordInLastDays(records = [], referenceDate, days = 7) {
  return records.find((record) => {
    const activity = record?.activity || {};
    return record?.isAvailable && isWithinDays(activity, referenceDate, days);
  }) || null;
}

function getSettingNumber(settings = {}, keys = []) {
  const found = keys
    .map((key) => toNumber(settings[key]))
    .find((value) => value > 0);
  return found || 0;
}

function buildRecentNoActivityAlerts(activities = [], referenceDate) {
  const hasSevenDays = activities.some((activity) => isWithinDays(activity, referenceDate, 7));
  const hasFourteenDays = activities.some((activity) => isWithinDays(activity, referenceDate, 14));

  if (!hasFourteenDays) {
    return buildAlert({
      key: "aucune-activite-14j",
      family: "load",
      severity: "warning",
      title: "Pause longue detectee",
      message: "Aucune activite n'est visible sur les 14 derniers jours. Reprends par une sortie facile avant toute seance intense.",
      order: 7,
    });
  }

  if (!hasSevenDays) {
    return buildAlert({
      key: "aucune-activite-7j",
      family: "load",
      severity: "info",
      title: "Semaine sans sortie",
      message: "Aucune activite n'est visible sur les 7 derniers jours. Une reprise courte suffit pour relancer la dynamique.",
      order: 6,
    });
  }

  return null;
}

export function buildTodayAlerts(context = {}) {
  const referenceDate = startOfDay(context.referenceDate || new Date());
  const loadModel = context.loadModel || {};
  const loadDynamics = context.loadDynamicsProfile || {};
  const loadVariance = context.loadVarianceModel || {};
  const polarization = context.polarizationModel || {};
  const vdotProfile = context.vdotProfile || {};
  const previousVdotProfile = context.vdotProfilePrevious || {};
  const activities = Array.isArray(context.recentActivities) ? context.recentActivities : [];
  const allActivities = Array.isArray(context.allActivities) ? context.allActivities : activities;
  const records = Array.isArray(context.bestEffortRecords) ? context.bestEffortRecords : [];
  const weeklySeries = Array.isArray(context.weeklySummary?.weeklySeries)
    ? context.weeklySummary.weeklySeries
    : [];
  const settings = context.trainingAnalyticsSettings || {};
  const summary = loadModel.summary || {};
  const timeline = getTimeline(loadModel);
  const lastPoint = timeline[timeline.length - 1] || {};
  const recentPoints = getRecentTimeline(loadModel, 7);
  const previousPoints = timeline.slice(-14, -7);
  const alerts = [];
  const tsb = toNumber(summary.tsb ?? lastPoint.tsb);
  const ctl = toNumber(summary.ctl ?? lastPoint.ctl);
  const atl = toNumber(summary.atl ?? lastPoint.atl);
  const recentLoad = sumBy(recentPoints, (point) => point.load);
  const previousLoad = sumBy(previousPoints, (point) => point.load);
  const acwr = loadDynamics.acwrEwma || {};
  const detraining = loadDynamics.detraining || {};
  const progression = loadDynamics.ctlProgression || {};
  const efficiency = loadDynamics.efficiencyPlateau || {};
  const raceDaysUntil = getRaceDaysUntil(context.activeRace, referenceDate);

  if (tsb <= -20) {
    alerts.push(buildAlert({
      key: "surcharge-tsb",
      family: "load",
      severity: "danger",
      title: "Surcharge probable",
      message: "Ta fraicheur est tres basse. Garde au moins 24 a 48 h faciles avant de remettre de l'intensite.",
      order: 1,
    }));
  }

  if (ctl > 0 && atl >= ctl * 1.25) {
    alerts.push(buildAlert({
      key: "atl-superieur-ctl",
      family: "load",
      severity: "warning",
      title: "Fatigue recente elevee",
      message: "Ta charge recente depasse nettement ta base de fond. Laisse le bloc se digerer avant d'empiler une grosse seance.",
      order: 2,
    }));
  }

  if (toNumber(loadVariance.monotony) >= 2) {
    alerts.push(buildAlert({
      key: "monotonie-elevee",
      family: "load",
      severity: "warning",
      title: "Charge trop uniforme",
      message: "Les derniers jours se ressemblent beaucoup. Alterne plus franchement jours faciles, repos et seances cles.",
      order: 3,
    }));
  }

  if (toNumber(acwr.ratio) >= 1.4) {
    alerts.push(buildAlert({
      key: "acwr-pic",
      family: "load",
      severity: acwr.ratio >= 1.55 ? "danger" : "warning",
      title: "Pic de charge",
      message: "La pression aigue grimpe vite par rapport au fond recent. Le risque vient surtout de l'accumulation.",
      order: 4,
    }));
  }

  if (detraining.hasData && detraining.isLosingFitness) {
    alerts.push(buildAlert({
      key: "detraining",
      family: "load",
      severity: detraining.tone === "danger" ? "danger" : "warning",
      title: "Base en recul",
      message: "Ton socle baisse depuis plusieurs semaines. Relance par du volume facile et progressif.",
      order: 5,
    }));
  }

  const noActivityAlert = buildRecentNoActivityAlerts(allActivities, referenceDate);
  if (noActivityAlert) {
    alerts.push(noActivityAlert);
  }

  if (raceDaysUntil === 7 && tsb < 5) {
    alerts.push(buildAlert({
      key: "course-imminente-tsb-bas",
      family: "load",
      severity: "warning",
      title: "Course proche, fraicheur basse",
      message: "Tu es a 7 jours de l'objectif avec peu de marge de fraicheur. Priorise l'allegement et le sommeil.",
      order: 8,
    }));
  }

  if (tsb >= 5 && tsb <= 20 && ctl >= 30 && toNumber(loadVariance.monotony) < 2) {
    alerts.push(buildAlert({
      key: "forme-ideale",
      family: "load",
      severity: "positive",
      title: "Fenetre favorable",
      message: "Ta fraicheur est positive et ta base tient. Une seance qualitative est possible si les sensations suivent.",
      order: 9,
    }));
  }

  if (toNumber(loadVariance.monotony) >= 1.8 && toNumber(loadVariance.strain) >= 900) {
    alerts.push(buildAlert({
      key: "strain-monotonie-cumules",
      family: "load",
      severity: "warning",
      title: "Accumulation monotone",
      message: "La charge et sa repetition sont elevees ensemble. Cherche une vraie respiration dans la semaine.",
      order: 10,
    }));
  }

  if (timeline.length >= 8) {
    const currentFreshness = toNumber(timeline[timeline.length - 1]?.tsb);
    const previousFreshness = toNumber(timeline[timeline.length - 8]?.tsb);
    if (previousFreshness - currentFreshness >= 15) {
      alerts.push(buildAlert({
        key: "chute-fraicheur-brutale",
        family: "load",
        severity: "warning",
        title: "Fraicheur en chute rapide",
        message: "La marge de forme a baisse fortement en une semaine. Surveille le ressenti avant d'ajouter une charge dure.",
        order: 11,
      }));
    }
  }

  const latestRun = getLatestRunLikeActivity(activities);
  if (latestRun && getActivityDurationMinutes(latestRun) >= 60) {
    const drift = buildAerobicDecouplingProfile(latestRun, { settings });
    if (drift?.hasData && toNumber(drift.decouplingPercent) >= 8) {
      const activityId = getActivityId(latestRun);
      alerts.push(buildAlert({
        key: "derive-cardiaque-excessive",
        family: "load",
        severity: "warning",
        title: "Derive cardiaque elevee",
        message: "La derniere sortie longue montre une derive nette. La chaleur, la fatigue ou l'hydratation peuvent expliquer l'ecart.",
        action: activityId ? { label: "Voir la sortie", href: `/activities/${activityId}` } : null,
        order: 12,
      }));
    }
  }

  if (progression.hasData && toNumber(progression.weeklyPercent) >= 10) {
    alerts.push(buildAlert({
      key: "progression-ctl-trop-rapide",
      family: "load",
      severity: "warning",
      title: "Progression trop rapide",
      message: "Ton socle monte plus vite qu'une progression prudente. Stabilise quelques jours pour encaisser.",
      order: 13,
    }));
  }

  if (polarization.hasData && toNumber(polarization.moderateShare) >= 25) {
    alerts.push(buildAlert({
      key: "polarisation-zone-grise",
      family: "intensity",
      severity: "warning",
      title: "Trop de zone intermediaire",
      message: "Une part importante du temps est ni vraiment facile ni vraiment intense. Reclarifie les objectifs de seance.",
      order: 1,
    }));
  }

  if (!hasRecentQuality(activities, referenceDate)) {
    alerts.push(buildAlert({
      key: "pas-de-qualite-21j",
      family: "intensity",
      severity: "info",
      title: "Peu de qualite recente",
      message: "Aucune seance intense nette n'apparait sur 21 jours. Tu peux garder une touche courte si la fatigue est basse.",
      order: 2,
    }));
  }

  if (recentLoad > previousLoad * 1.15 && previousLoad > 0 && toNumber(polarization.highShare) <= 2) {
    alerts.push(buildAlert({
      key: "volume-sans-intensite",
      family: "intensity",
      severity: "info",
      title: "Volume sans intensite",
      message: "La charge monte surtout par le volume facile. C'est utile en base, moins specifique si une course approche.",
      order: 3,
    }));
  }

  if (recentPoints.length === 7 && previousPoints.length === 7) {
    const recentMonotony = getMonotonyFromLoads(recentPoints);
    const previousMonotony = getMonotonyFromLoads(previousPoints);
    if (recentMonotony - previousMonotony >= 0.5 && recentMonotony >= 1.7) {
      alerts.push(buildAlert({
        key: "saut-de-monotonie",
        family: "intensity",
        severity: "warning",
        title: "Semaine plus monotone",
        message: "La repartition quotidienne s'est refermee cette semaine. Ajoute un jour vraiment facile ou off.",
        order: 4,
      }));
    }
  }

  if (
    polarization.hasData
    && toNumber(polarization.lowShare) >= 75
    && toNumber(polarization.lowShare) <= 85
    && toNumber(polarization.moderateShare) <= 10
    && toNumber(polarization.highShare) >= 8
    && toNumber(polarization.highShare) <= 20
  ) {
    alerts.push(buildAlert({
      key: "polarisation-ideale",
      family: "intensity",
      severity: "positive",
      title: "Structure bien lisible",
      message: "Le bloc combine beaucoup de facile et une exposition intense mesuree. La structure est propre.",
      order: 5,
    }));
  }

  const currentWeek = weeklySeries[weeklySeries.length - 1] || {};
  const previousWeeks = weeklySeries.slice(Math.max(0, weeklySeries.length - 5), -1);
  const previousDistanceAverage = mean(previousWeeks.map((week) => toNumber(week.distanceKm)));
  if (previousDistanceAverage > 0 && toNumber(currentWeek.distanceKm) <= previousDistanceAverage * 0.5 && recentLoad > 0) {
    alerts.push(buildAlert({
      key: "volume-hebdo-casse",
      family: "volume",
      severity: "info",
      title: "Volume en retrait",
      message: "Le kilometrage de la semaine est nettement sous la moyenne recente. C'est coherent si tu allegeres volontairement.",
      order: 1,
    }));
  }

  if (!getRecentLongRun(activities, referenceDate)) {
    alerts.push(buildAlert({
      key: "pas-de-sortie-longue",
      family: "volume",
      severity: "info",
      title: "Pas de sortie longue recente",
      message: "Aucune sortie d'au moins 90 minutes n'apparait sur 14 jours. A reprogrammer si tu prepares du long.",
      order: 2,
    }));
  }

  if (countActiveDays(allActivities, referenceDate, 30) >= 14) {
    alerts.push(buildAlert({
      key: "streak-long-sans-repos",
      family: "volume",
      severity: "warning",
      title: "Long enchainement sans repos",
      message: "Tu enchaines beaucoup de jours actifs. Un vrai jour facile peut valoir plus qu'une seance moyenne.",
      order: 3,
    }));
  }

  if (efficiency.hasData && efficiency.label === "Plateau") {
    alerts.push(buildAlert({
      key: "plateau-efficience",
      family: "progress",
      severity: "info",
      title: "Efficience en plateau",
      message: "Les sorties comparables ne progressent plus franchement. Varie les stimulations avant d'ajouter du volume.",
      order: 1,
    }));
  }

  if (efficiency.hasData && toNumber(efficiency.slopePercentPerWeek) <= -0.7) {
    alerts.push(buildAlert({
      key: "regression-efficience",
      family: "progress",
      severity: "warning",
      title: "Efficience en recul",
      message: "A allure et cardio comparables, la tendance baisse. Cherche d'abord fatigue, chaleur ou terrain.",
      order: 2,
    }));
  }

  if (progression.hasData && toNumber(progression.weeklyPercent) >= 5 && toNumber(progression.weeklyPercent) <= 8) {
    alerts.push(buildAlert({
      key: "progression-ctl-saine",
      family: "progress",
      severity: "positive",
      title: "Progression saine",
      message: "Ton socle progresse dans une zone prudente. Continue sans forcer le rythme de hausse.",
      order: 3,
    }));
  }

  if (vdotProfile.hasData && previousVdotProfile.hasData) {
    const deltaVdot = toNumber(vdotProfile.vdot) - toNumber(previousVdotProfile.vdot);
    if (deltaVdot >= 1) {
      alerts.push(buildAlert({
        key: "vdot-en-hausse",
        family: "progress",
        severity: "positive",
        title: "Potentiel route en hausse",
        message: "Tes records recents font monter l'estimation de potentiel. Bon signal, surtout si la charge reste maitrisee.",
        order: 4,
      }));
    } else if (deltaVdot <= -1) {
      alerts.push(buildAlert({
        key: "vdot-en-baisse",
        family: "progress",
        severity: "info",
        title: "Potentiel route en retrait",
        message: "L'estimation route baisse legerement. Verifie surtout la fraicheur et la specificite des seances recentes.",
        order: 5,
      }));
    }
  }

  const recentRecord = hasRecordInLastDays(records, referenceDate, 7);
  if (recentRecord) {
    alerts.push(buildAlert({
      key: "nouveau-record",
      family: "milestone",
      severity: "positive",
      title: "Record recent",
      message: `Nouveau repere detecte sur ${recentRecord.recordLabel || "route"}. Garde-le comme reference, sans en faire une obligation a chaque sortie.`,
      action: getActivityId(recentRecord.activity)
        ? { label: "Voir l'activite", href: `/activities/${getActivityId(recentRecord.activity)}` }
        : null,
      order: 1,
    }));
  }

  if (!getSettingNumber(settings, ["restingHeartrate", "restingHeartRate", "heartRateRest"])) {
    alerts.push(buildAlert({
      key: "fc-repos-non-renseignee",
      family: "data",
      severity: "info",
      title: "Frequence cardiaque au repos a renseigner",
      message: "La frequence cardiaque de repos affine la charge cardio. Ajoute-la dans l'administration si tu la connais.",
      action: { label: "Ouvrir l'administration", href: "/admin" },
      order: 1,
    }));
  }

  if (!getSettingNumber(settings, ["maxHeartrate", "maxHeartRate", "heartRateMax"])) {
    alerts.push(buildAlert({
      key: "fc-max-non-renseignee",
      family: "data",
      severity: "info",
      title: "Frequence cardiaque maximale a verifier",
      message: "Une frequence cardiaque max fiable rend les zones et la charge plus stables.",
      action: { label: "Ouvrir l'administration", href: "/admin" },
      order: 2,
    }));
  }

  const latestActivity = activities[0] || null;
  if (latestActivity && toNumber(latestActivity.averageHeartrate) <= 0 && getActivityDurationMinutes(latestActivity) >= 20) {
    alerts.push(buildAlert({
      key: "cardio-absent-derniere-seance",
      family: "data",
      severity: "info",
      title: "Cardio absente sur la derniere seance",
      message: "La charge reste estimee, mais elle sera moins precise sans frequence cardiaque exploitable.",
      order: 3,
    }));
  }

  const hasHardAlert = alerts.some((alert) => ["danger", "warning"].includes(alert.severity));

  return alerts
    .filter((alert) => !(hasHardAlert && alert.severity === "positive"))
    .sort(
      (left, right) =>
        left.severityOrder - right.severityOrder
        || left.familyOrder - right.familyOrder
        || left.order - right.order
        || left.key.localeCompare(right.key),
    );
}
