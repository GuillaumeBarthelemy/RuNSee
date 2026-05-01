import { formatMetricValue } from "./activityAggregations.js";
import {
  buildActivityItems,
  buildReferencePace,
  getReferenceMaxHeartrate,
  isRunLikeActivity,
} from "./activityInsights.js";
import { resolveHeartRateZoneConfig } from "./heartRatePreferences.js";
import { normalizeTrainingAnalyticsSettings } from "./trainingMetrics.js";

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function roundValue(value, decimals = 1) {
  return Number(toNumber(value).toFixed(decimals));
}

function average(values = []) {
  const safeValues = values.filter((value) => Number.isFinite(Number(value)));

  if (!safeValues.length) {
    return 0;
  }

  return safeValues.reduce((sum, value) => sum + Number(value), 0) / safeValues.length;
}

function buildStateTone(level) {
  switch (level) {
    case "positive":
      return "positive";
    case "warning":
      return "warning";
    case "negative":
      return "negative";
    default:
      return "neutral";
  }
}

function resolveWeeklyMetricInterpretation(label, currentValue, previousValue) {
  const delta = Number(currentValue || 0) - Number(previousValue || 0);
  const previous = Number(previousValue || 0);
  const deltaPercent = previous > 0 ? (delta / previous) * 100 : null;

  if (label === "Distance") {
    if (currentValue <= 0) return "Aucune sortie kilometrique sur ce bloc.";
    if (deltaPercent >= 12) return "Volume plus ambitieux que la semaine precedente.";
    if (deltaPercent <= -12) return "Volume plus leger que la semaine precedente.";
    return "Volume proche du rythme habituel.";
  }

  if (label === "Denivele") {
    if (currentValue <= 0) return "Bloc tres roulant ou sans denivele notable.";
    if (deltaPercent >= 18) return "Semaine plus orientee terrain vallonne.";
    if (deltaPercent <= -18) return "Moins de relief que la semaine precedente.";
    return "Exposition au denivele assez stable.";
  }

  if (label === "Duree") {
    if (currentValue <= 0) return "Temps actif nul sur le bloc hebdomadaire.";
    if (deltaPercent >= 12) return "Temps de pratique en hausse.";
    if (deltaPercent <= -12) return "Temps de pratique en retrait.";
    return "Temps actif globalement stable.";
  }

  if (currentValue <= 0) return "Aucune seance enregistree sur ce bloc.";
  if (delta >= 2) return "Frequence d'entrainement plus dense.";
  if (delta <= -2) return "Semaine plus aeree en nombre de seances.";
  return "Frequence proche du rythme recent.";
}

function resolveLoadStateLabel(tsb) {
  if (tsb >= 8) {
    return { label: "Bonne", detail: "Fenetre productive, marge de fraicheur disponible.", tone: "positive" };
  }

  if (tsb >= 0) {
    return { label: "Disponible", detail: "Equilibre correct entre fond et fatigue recente.", tone: "neutral" };
  }

  if (tsb >= -10) {
    return { label: "Sous tension", detail: "Charge recente presente, mais encore gerable.", tone: "warning" };
  }

  return { label: "Fatiguee", detail: "Pression recente dominante, reserve entamee.", tone: "negative" };
}

function resolveFatigueLabel(ctl, atl, tsb) {
  if (tsb <= -12 || atl >= ctl * 1.12) {
    return { label: "Elevee", detail: "La fatigue recente depasse nettement le socle.", tone: "negative" };
  }

  if (tsb <= -4 || atl >= ctl * 0.96) {
    return { label: "Moderee", detail: "Le bloc recent reste engage mais pas critique.", tone: "warning" };
  }

  return { label: "Faible", detail: "La pression recente reste contenue.", tone: "positive" };
}

function resolveChargeTrendLabel(loadDeltaPercent, loadDeltaValue) {
  if (!Number.isFinite(loadDeltaPercent)) {
    return { label: "Stable", detail: "Pas assez d'historique pour comparer.", tone: "neutral" };
  }

  if (loadDeltaPercent >= 15 || loadDeltaValue >= 20) {
    return { label: "En hausse", detail: "Montee de charge recente a lisser proprement.", tone: "warning" };
  }

  if (loadDeltaPercent <= -15 || loadDeltaValue <= -20) {
    return { label: "En baisse", detail: "Bloc recent plus leger que le precedent.", tone: "positive" };
  }

  return { label: "Stable", detail: "Variation recente mesuree et assez reguliere.", tone: "neutral" };
}

function buildRecentLoadPattern(loadModel = {}) {
  const chartData = Array.isArray(loadModel?.chartData) ? loadModel.chartData : [];
  const loadValues = chartData
    .map((point) => toNumber(point?.load))
    .filter((value) => Number.isFinite(value));
  const recentLoads = loadValues.slice(-7).filter((value) => value > 0);
  const previousLoads = loadValues.slice(-14, -7).filter((value) => value > 0);
  const averageRecentLoad = average(recentLoads);
  const averagePreviousLoad = average(previousLoads);
  const maxRecentLoad = recentLoads.length ? Math.max(...recentLoads) : 0;
  const recentDeltaPercent = averagePreviousLoad > 0
    ? ((averageRecentLoad - averagePreviousLoad) / averagePreviousLoad) * 100
    : null;

  return {
    activeDays: recentLoads.length,
    averageRecentLoad,
    averagePreviousLoad,
    maxRecentLoad,
    recentDeltaPercent,
    hasRecentSpike: averageRecentLoad > 0 && maxRecentLoad >= Math.max(averageRecentLoad * 1.8, averageRecentLoad + 25),
  };
}

function buildDecisionRecommendation(summary = {}, form = {}, fatigue = {}, charge = {}, pattern = {}) {
  const ctl = toNumber(summary.ctl);
  const atl = toNumber(summary.atl);
  const tsb = toNumber(summary.tsb);
  const load = toNumber(summary.load);
  const loadDeltaPercent = toNumber(summary.loadDeltaPercent);
  const atlCtlRatio = ctl > 0 ? atl / ctl : null;
  const acuteFatigueHigh = fatigue.tone === "negative"
    || tsb <= -10
    || (atlCtlRatio !== null && atlCtlRatio >= 1.12);
  const acuteFatigueModerate = fatigue.tone === "warning"
    || tsb <= -4
    || (atlCtlRatio !== null && atlCtlRatio >= 0.96);
  const loadRisingFast = charge.tone === "warning"
    || loadDeltaPercent >= 15
    || toNumber(pattern.recentDeltaPercent) >= 25;
  const loadDroppingFast = loadDeltaPercent <= -15;
  const recentSpike = Boolean(pattern.hasRecentSpike);

  if (load <= 0) {
    return {
      label: "Aucune charge recente consolidee : reprendre par une seance facile avant de juger la forme.",
      tone: "neutral",
    };
  }

  if (acuteFatigueHigh && (loadRisingFast || recentSpike)) {
    return {
      label: "Fatigue elevee et charge en hausse : eviter la qualite, privilegier 24 a 48 h faciles.",
      tone: "negative",
    };
  }

  if (acuteFatigueHigh) {
    return {
      label: "Fatigue aigue dominante : garder une seance facile ou du repos actif avant de remettre de l'intensite.",
      tone: "negative",
    };
  }

  if (recentSpike) {
    return {
      label: "Pic recent detecte : consolider en endurance facile avant d'ajouter une nouvelle contrainte.",
      tone: "warning",
    };
  }

  if (loadRisingFast && (form.tone === "warning" || tsb < 2)) {
    return {
      label: "Charge montee vite : rester sur une seance facile ou controlee pour absorber le bloc.",
      tone: "warning",
    };
  }

  if (acuteFatigueModerate) {
    return {
      label: "Fatigue moderee : qualite seulement si elle est planifiee et que les sensations confirment.",
      tone: "warning",
    };
  }

  if (tsb >= 8 && loadDroppingFast) {
    return {
      label: "Fraicheur haute apres allegement : relancer progressivement plutot que compenser d'un coup.",
      tone: "positive",
    };
  }

  if (tsb >= 4 && !loadRisingFast && !recentSpike) {
    return {
      label: "Fenetre favorable : une seance qualitative controlee est coherente si la recuperation est bonne.",
      tone: "positive",
    };
  }

  return {
    label: "Etat relativement stable : endurance ou seance structuree moderee selon le plan.",
    tone: "neutral",
  };
}

export function buildDashboardDecisionSummary(loadModel = {}) {
  const summary = loadModel?.summary;
  const rangeLabel = loadModel?.range?.label || "selection courante";

  if (!summary) {
    return {
      form: { label: "Indeterminee", detail: "Pas assez de donnees pour conclure.", tone: "neutral" },
      fatigue: { label: "Indeterminee", detail: "Pas assez de donnees pour conclure.", tone: "neutral" },
      charge: { label: "A lire", detail: "Le bloc recent manque encore d'historique.", tone: "neutral" },
      recommendation: { label: "Accumuler quelques seances avant de piloter la charge.", tone: "neutral" },
      rangeLabel,
      insight: "Les indicateurs de forme se stabilisent apres quelques jours de pratique tracee.",
    };
  }

  const form = resolveLoadStateLabel(summary.tsb);
  const fatigue = resolveFatigueLabel(summary.ctl, summary.atl, summary.tsb);
  const charge = resolveChargeTrendLabel(summary.loadDeltaPercent, summary.loadDeltaValue);
  const recentLoadPattern = buildRecentLoadPattern(loadModel);
  const recommendation = buildDecisionRecommendation(summary, form, fatigue, charge, recentLoadPattern);

  return {
    form,
    fatigue,
    charge,
    recommendation,
    rangeLabel,
    insight: `${form.detail} ${fatigue.detail}`.trim(),
  };
}

export function buildLoadKpiInterpretations(loadModel = {}) {
  const summary = loadModel?.summary;

  if (!summary) {
    return {
      load: "Pas assez d'historique pour qualifier la charge.",
      ctl: "Base encore insuffisante pour lire la tendance.",
      atl: "Fatigue recente non interpretable.",
      tsb: "Fraicheur non interpretable.",
    };
  }

  return {
    load: summary.loadDeltaPercent >= 12
      ? "Bloc recent nettement plus sollicitant."
      : summary.loadDeltaPercent <= -12
        ? "Bloc recent allege."
        : "Charge recente sous controle.",
    ctl: summary.ctlDeltaValue >= 2
      ? "Socle de charge en progression."
      : summary.ctlDeltaValue <= -2
        ? "Base recente en retrait."
        : "Base de fond assez stable.",
    atl: summary.atlDeltaValue >= 3
      ? "Fatigue recente bien presente."
      : summary.atlDeltaValue <= -3
        ? "Fatigue en recul."
        : "Pression recente contenue.",
    tsb: summary.tsb >= 8
      ? "Fenetre favorable pour la qualite."
      : summary.tsb >= 0
        ? "Fraicheur correcte."
        : summary.tsb >= -10
          ? "Reserve un peu entamee."
          : "Fraicheur basse a surveiller.",
  };
}

export function buildEfficiencyInterpretation(efficiencyModel = {}) {
  const summary = efficiencyModel?.summary;

  if (!summary) {
    return {
      headline: "Pas assez de sorties comparables pour lire une tendance fiable.",
      detail: "Elargissez la plage ou laissez plus d'activites course comparables dans le filtre.",
    };
  }

  if (summary.deltaValue >= 0.02) {
    return {
      headline: "Legere amelioration sur les sorties comparables.",
      detail: `${summary.activityCount || 0} activite(s) exploitees sur la selection.`,
    };
  }

  if (summary.deltaValue <= -0.02) {
    return {
      headline: "Baisse recente a surveiller.",
      detail: "A relire avec la fatigue recente, la chaleur ou le terrain.",
    };
  }

  return {
    headline: "Efficience stable sur la periode.",
    detail: `${summary.activityCount || 0} activite(s) comparables consolidees.`,
  };
}

export function buildLoadChartNarrative(loadModel = {}) {
  const summary = loadModel?.summary;
  const safeChartData = Array.isArray(loadModel?.chartData) ? loadModel.chartData : [];

  if (!summary || !safeChartData.length) {
    return "Pas assez de donnees pour lire une dynamique de charge robuste.";
  }

  const recentLoads = safeChartData
    .slice(-7)
    .map((point) => toNumber(point?.load))
    .filter((value) => value > 0);
  const averageLoad = average(recentLoads);
  const maxLoad = recentLoads.length ? Math.max(...recentLoads) : 0;
  const hasRecentSpike = averageLoad > 0 && maxLoad >= averageLoad * 1.8;

  if (hasRecentSpike && summary.tsb < 0) {
    return "Charge irreguliere avec un pic recent, alors que la fraicheur reste sous tension.";
  }

  if (summary.loadDeltaPercent >= 12 && summary.tsb < 0) {
    return "Montee de charge recente, fatigue courte en hausse et reserve de fraicheur en recul.";
  }

  if (summary.loadDeltaPercent <= -12 && summary.tsb >= 0) {
    return "Bloc recent plus leger, avec une fraicheur qui se reconstruit proprement.";
  }

  if (summary.tsb >= 5 && summary.atlDeltaValue <= 0) {
    return "Charge stable sur la selection, fatigue recente en baisse et fenetre plutot productive.";
  }

  return "Charge globalement lissee, avec un equilibre recent lisible entre base de fond, fatigue recente et fraicheur.";
}

export function buildIntensityNarrative(model = {}, metric = "load") {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const shareKey = metric === "duration" ? "durationShare" : "loadShare";
  const lowShare = zones
    .filter((zone) => ["z1", "z2"].includes(zone?.key))
    .reduce((sum, zone) => sum + toNumber(zone?.[shareKey]), 0);
  const moderateShare = zones
    .filter((zone) => zone?.key === "z3")
    .reduce((sum, zone) => sum + toNumber(zone?.[shareKey]), 0);
  const highShare = zones
    .filter((zone) => ["z4", "z5"].includes(zone?.key))
    .reduce((sum, zone) => sum + toNumber(zone?.[shareKey]), 0);
  const dominantZone = [...zones].sort((left, right) => toNumber(right?.[shareKey]) - toNumber(left?.[shareKey]))[0];

  if (!zones.length || !model?.hasData) {
    return "Pas assez de donnees pour decrire la structure d'intensite.";
  }

  if (highShare >= 35) {
    return "Repartition tres orientee Z3/Z4/Z5, attention a ne pas rogner l'endurance fondamentale.";
  }

  if (lowShare >= 65) {
    return "Volume Z1/Z2 coherent pour consolider l'endurance de fond.";
  }

  if (moderateShare >= 40) {
    return "Bloc centre sur l'endurance active, avec une part tempo assez marquee.";
  }

  if (toNumber(dominantZone?.[shareKey]) > 0) {
    return `La structure reste surtout dominee par ${dominantZone.shortLabel}, ce qui donne le ton du cycle recent.`;
  }

  return "Structure d'intensite lisible, sans desequilibre majeur sur la selection.";
}

function getTrendDirection(values = []) {
  const safeValues = values.filter((value) => Number.isFinite(Number(value)));

  if (safeValues.length < 2) {
    return 0;
  }

  return Number(safeValues[safeValues.length - 1]) - average(safeValues.slice(0, -1));
}

export function buildWeeklyVolumeNarrative(data = [], metric = "distanceKm", viewMode = "rolling") {
  const safeData = Array.isArray(data) ? data : [];
  const series = safeData.map((entry) => toNumber(entry?.[metric])).filter((value) => Number.isFinite(value));
  const cadenceLabel = viewMode === "calendar" ? "par semaine calendaire" : "sur blocs glissants ancres sur la date de fin";

  if (!series.length) {
    return "Pas assez de semaines consolidees pour lire une tendance.";
  }

  const direction = getTrendDirection(series.slice(-4));

  if (metric === "count") {
    if (direction >= 1) return `Frequence hebdomadaire en hausse ${cadenceLabel}.`;
    if (direction <= -1) return `Frequence hebdomadaire en baisse ${cadenceLabel}.`;
    return `Frequence hebdomadaire assez stable ${cadenceLabel}.`;
  }

  if (direction >= 6) return `Volume hebdomadaire en hausse ${cadenceLabel}.`;
  if (direction <= -6) return `Volume hebdomadaire en baisse ${cadenceLabel}.`;
  return `Volume hebdomadaire plutot stable ${cadenceLabel}.`;
}

export function buildMonthlyVolumeNarrative(data = [], metric = "distanceKm", viewMode = "calendar") {
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData.map((entry) => toNumber(entry?.value)).filter((value) => Number.isFinite(value));
  const cadenceLabel = viewMode === "calendar" ? "par mois calendrier" : "sur blocs mensuels glissants";

  if (!values.length) {
    return "Pas assez de recul mensuel pour lire le cycle.";
  }

  const direction = getTrendDirection(values.slice(-3));

  if (metric === "load") {
    if (direction >= 20) return `Charge mensuelle en reprise progressive ${cadenceLabel}.`;
    if (direction <= -20) return `Charge mensuelle en retrait ${cadenceLabel}.`;
    return `Stabilite mensuelle correcte ${cadenceLabel}.`;
  }

  if (direction >= 20) return `Kilometrage mensuel en progression reguliere ${cadenceLabel}.`;
  if (direction <= -20) return `Kilometrage mensuel en baisse recente ${cadenceLabel}.`;
  return `Lecture mensuelle plutot stable ${cadenceLabel}.`;
}

export function buildPeriodComparisonNarrative(model = {}) {
  const rows = Array.isArray(model?.rows) ? model.rows : [];
  const chartLabel = String(model?.chartLabel || "Metrique");
  const anchorYear = model?.anchorYear;

  if (!rows.length || !anchorYear) {
    return "";
  }

  const anchorRow = rows.find((row) => row.year === anchorYear);
  const sortedRows = [...rows].sort((left, right) => toNumber(right?.value) - toNumber(left?.value));
  const bestRow = sortedRows[0];
  const secondRow = sortedRows[1];

  if (bestRow?.year === anchorYear && secondRow) {
    const gap = anchorRow?.value - secondRow.value;
    return `${anchorYear} est actuellement l'annee la plus haute en ${chartLabel.toLowerCase()} a date, avec ${formatMetricValue(Math.abs(gap), model.chartMetric === "movingHours" ? "movingHours" : model.chartMetric === "load" ? "load" : model.chartMetric === "elevationGain" ? "elevationGain" : "distanceKm")} d'avance sur ${secondRow.year}.`;
  }

  if (anchorRow && bestRow && bestRow.year !== anchorYear) {
    const gap = bestRow.value - anchorRow.value;
    return `${bestRow.year} reste devant en ${chartLabel.toLowerCase()} a date, avec ${formatMetricValue(Math.abs(gap), model.chartMetric === "movingHours" ? "movingHours" : model.chartMetric === "load" ? "load" : model.chartMetric === "elevationGain" ? "elevationGain" : "distanceKm")} d'avance sur ${anchorYear}.`;
  }

  return model?.insight || "";
}

function classifyHeartRateZone(averageHeartrate, zones = []) {
  const heartrate = toNumber(averageHeartrate);

  if (heartrate <= 0 || !zones.length) {
    return null;
  }

  return zones.find((zone) => heartrate <= toNumber(zone?.maxHeartrate)) || zones[zones.length - 1] || null;
}

function classifyPaceZone(paceSecondsPerKm, referencePaceSecondsPerKm) {
  const pace = toNumber(paceSecondsPerKm);
  const reference = toNumber(referencePaceSecondsPerKm);

  if (pace <= 0 || reference <= 0) {
    return null;
  }

  if (pace >= reference * 1.12) return { shortLabel: "Z1", label: "Z1" };
  if (pace >= reference * 1.03) return { shortLabel: "Z2", label: "Z2" };
  if (pace >= reference * 0.96) return { shortLabel: "Z3", label: "Z3" };
  if (pace >= reference * 0.88) return { shortLabel: "Z4", label: "Z4" };
  return { shortLabel: "Z5", label: "Z5" };
}

function normalizeLookupText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseJsonSafe(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeSegment(segment = {}, source = "activity") {
  const distanceMeters = toNumber(segment?.distance);
  const distanceKm = distanceMeters > 0
    ? distanceMeters / 1000
    : toNumber(segment?.distanceKm);
  const durationSeconds = toNumber(
    segment?.moving_time
    ?? segment?.movingTime
    ?? segment?.elapsed_time
    ?? segment?.elapsedTime
    ?? segment?.durationSeconds,
  );
  const averageSpeedMetersPerSecond = toNumber(segment?.average_speed ?? segment?.averageSpeed);
  const speedKmh = averageSpeedMetersPerSecond > 0
    ? averageSpeedMetersPerSecond * 3.6
    : distanceKm > 0 && durationSeconds > 0
      ? (distanceKm / durationSeconds) * 3600
      : 0;
  const paceSecondsPerKm = distanceKm > 0
    ? durationSeconds / distanceKm
    : speedKmh > 0
      ? 3600 / speedKmh
      : 0;

  return {
    source,
    distanceMeters: roundValue(distanceKm * 1000, 0),
    durationSeconds,
    paceSecondsPerKm: roundValue(paceSecondsPerKm, 1),
    averageHeartrate: toNumber(segment?.average_heartrate ?? segment?.averageHeartrate),
    maxHeartrate: toNumber(segment?.max_heartrate ?? segment?.maxHeartrate),
  };
}

function getDetailedSegments(item = {}) {
  const payload = parseJsonSafe(item?.rawJson) || parseJsonSafe(item?.summaryJson) || {};

  return {
    laps: Array.isArray(payload?.laps)
      ? payload.laps.map((segment) => normalizeSegment(segment, "lap")).filter((segment) => segment.durationSeconds > 0)
      : [],
    splits: Array.isArray(payload?.splits_metric)
      ? payload.splits_metric.map((segment) => normalizeSegment(segment, "split")).filter((segment) => segment.durationSeconds > 0)
      : [],
  };
}

function extractWorkoutTextSignals(item = {}) {
  const text = normalizeLookupText([item?.name, item?.description].filter(Boolean).join(" "));
  const shortRepMatches = [...text.matchAll(/(\d+)\s*x\s*(\d{2,3})(?:\s*m)?/g)];
  const longRepMatches = [...text.matchAll(/(\d+)\s*x\s*(\d{4})(?:\s*m)?/g)];
  const minuteRepMatches = [...text.matchAll(/(\d+)\s*x\s*(\d{1,2})\s*(?:'|’|min)/g)];

  const shortRepDistance = shortRepMatches.length
    ? Math.min(...shortRepMatches.map((match) => Number(match[2])).filter((value) => Number.isFinite(value)))
    : 0;

  return {
    text,
    hasRecoveryKeyword: /\brecup|recuperation|retour au calme|cool|easy|facile|echauffement\b/.test(text),
    hasLongRunKeyword: /\bsl\b|sortie longue|longue\b/.test(text),
    hasTrailKeyword: /\btrail|montagne|sentier|col|crete\b/.test(text),
    hasThresholdKeyword: /\bseuil|tempo|allure 10|allure 21|allure semi\b/.test(text),
    hasShortIntervalText: /\b(?:30\/30|45\/15)\b/.test(text) || shortRepDistance > 0,
    hasLongIntervalText: longRepMatches.length > 0 || minuteRepMatches.some((match) => Number(match[2]) >= 4),
    shortRepDistance,
  };
}

function analyzeWorkoutProfile(item = {}, options = {}) {
  const textSignals = extractWorkoutTextSignals(item);
  const segments = getDetailedSegments(item);
  const referencePaceSecondsPerKm = toNumber(options.referencePaceSecondsPerKm);
  const estimatedMaxHeartrate = toNumber(options.estimatedMaxHeartrate);
  const fastRepPaceCap = referencePaceSecondsPerKm > 0
    ? Math.min(referencePaceSecondsPerKm * 0.88, 250)
    : 250;
  const thresholdPaceCap = referencePaceSecondsPerKm > 0
    ? referencePaceSecondsPerKm * 0.92
    : 280;
  const activityAvgHrRatio = estimatedMaxHeartrate > 0
    ? toNumber(item?.averageHeartrate) / estimatedMaxHeartrate
    : 1;
  const isLikelyEasyEffort = activityAvgHrRatio > 0 && activityAvgHrRatio < 0.78;
  const shortFastLaps = segments.laps.filter((segment) =>
    segment.distanceMeters >= 150
    && segment.distanceMeters <= 400
    && segment.durationSeconds >= 20
    && segment.durationSeconds <= 90
    && segment.paceSecondsPerKm > 0
    && segment.paceSecondsPerKm <= fastRepPaceCap);
  const recoveryLaps = segments.laps.filter((segment) =>
    segment.distanceMeters >= 20
    && segment.distanceMeters <= 120
    && segment.durationSeconds >= 20
    && segment.durationSeconds <= 120
    && segment.paceSecondsPerKm >= 330);
  const thresholdSegments = [...segments.laps, ...segments.splits].filter((segment) => {
    const hrRatio = estimatedMaxHeartrate > 0
      ? toNumber(segment.averageHeartrate || segment.maxHeartrate) / estimatedMaxHeartrate
      : 0;

    return segment.durationSeconds >= 150
      && segment.durationSeconds <= 900
      && (
        (segment.paceSecondsPerKm > 0 && segment.paceSecondsPerKm <= thresholdPaceCap)
        || hrRatio >= 0.88
      );
  });
  const maxHrRatio = estimatedMaxHeartrate > 0 ? toNumber(item?.maxHeartrate) / estimatedMaxHeartrate : 0;
  const averageHrRatio = estimatedMaxHeartrate > 0 ? toNumber(item?.averageHeartrate) / estimatedMaxHeartrate : 0;
  const hasShortIntervals = textSignals.hasShortIntervalText
    || (shortFastLaps.length >= 4 && recoveryLaps.length >= Math.max(2, Math.floor(shortFastLaps.length / 3)));
  const hasThresholdBlock = !hasShortIntervals
    && (
      textSignals.hasThresholdKeyword
      || textSignals.hasLongIntervalText
      || (!isLikelyEasyEffort && thresholdSegments.length >= 2)
    );

  return {
    textSignals,
    shortFastRepCount: shortFastLaps.length,
    recoveryRepCount: recoveryLaps.length,
    thresholdSegmentCount: thresholdSegments.length,
    maxHrRatio,
    averageHrRatio,
    hasShortIntervals,
    hasThresholdBlock,
    highIntensity: hasShortIntervals || maxHrRatio >= 0.95 || averageHrRatio >= 0.9,
  };
}

function buildLoadBand(value, loadThresholds = {}, workoutProfile = null) {
  let label = "charge faible";
  let tone = "positive";

  if (value >= toNumber(loadThresholds.high)) {
    label = "charge elevee";
    tone = "negative";
  } else if (value >= toNumber(loadThresholds.moderate)) {
    label = "charge soutenue";
    tone = "warning";
  }

  if (workoutProfile?.highIntensity && label === "charge faible") {
    return { label: "charge soutenue", tone: "warning" };
  }

  if (
    workoutProfile?.highIntensity
    && label === "charge soutenue"
    && (workoutProfile.shortFastRepCount >= 8 || workoutProfile.maxHrRatio >= 0.95)
  ) {
    return { label: "charge elevee", tone: "negative" };
  }

  return { label, tone };
}

function buildLoadThresholds(items = []) {
  const loads = items
    .map((item) => toNumber(item?.__load))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);

  if (!loads.length) {
    return { moderate: 25, high: 50 };
  }

  return {
    moderate: loads[Math.floor(loads.length * 0.45)] || loads[0] || 25,
    high: loads[Math.floor(loads.length * 0.8)] || loads[loads.length - 1] || 50,
  };
}

function isTrailLike(item = {}) {
  const sportType = String(item?.sportType || item?.type || "").toLowerCase();
  const text = normalizeLookupText(`${item?.name || ""} ${item?.description || ""}`);
  return sportType === "trailrun" || /trail|montagne|sentier|col|crete/.test(text);
}

function estimateSessionType(item = {}, dominantZone = null, workoutProfile = null) {
  const durationMinutes = Math.round(toNumber(item?.__movingSeconds) / 60);
  const distanceKm = toNumber(item?.__distanceKm);
  const elevationPerKm = distanceKm > 0 ? toNumber(item?.__elevationGain) / distanceKm : 0;
  const zone = dominantZone?.shortLabel || "";

  if (isTrailLike(item) || elevationPerKm >= 35 || toNumber(item?.__elevationGain) >= 350) {
    return "Trail vallonne";
  }

  if (durationMinutes >= 95 || distanceKm >= 18) {
    return "Sortie longue";
  }

  if (workoutProfile?.hasShortIntervals) {
    return "VMA / vitesse";
  }

  if (workoutProfile?.hasThresholdBlock) {
    return "Seuil";
  }

  if (workoutProfile?.textSignals?.hasRecoveryKeyword && durationMinutes <= 45) {
    return "Recuperation";
  }

  if (zone === "Z5" && distanceKm <= 10) {
    return "VMA / vitesse";
  }

  if (zone === "Z4") {
    return "Seuil";
  }

  if (zone === "Z1") {
    return "Recuperation";
  }

  if (zone === "Z2") {
    return "EF";
  }

  if (zone === "Z3") {
    return "Rythme controle";
  }

  return "Autre";
}

function buildMicroTag(item = {}, dominantZone = null, loadBand = {}, workoutProfile = null) {
  const durationMinutes = Math.round(toNumber(item?.__movingSeconds) / 60);
  const elevationGain = Math.round(toNumber(item?.__elevationGain));

  if (isTrailLike(item) || elevationGain >= 250) {
    return `${elevationGain.toLocaleString("fr-FR")} m D+`;
  }

  if (workoutProfile?.hasShortIntervals) {
    return workoutProfile.shortFastRepCount >= 6 || workoutProfile?.textSignals?.hasShortIntervalText
      ? "Intervalles courts"
      : "Rappel intensite";
  }

  if (workoutProfile?.hasThresholdBlock) {
    return "Bloc seuil";
  }

  if (durationMinutes >= 95) {
    return "Bloc endurance";
  }

  if (dominantZone?.shortLabel === "Z4" || dominantZone?.shortLabel === "Z5") {
    return "Rappel intensite";
  }

  if (loadBand?.label === "charge faible") {
    return "Relance douce";
  }

  return "Seance reguliere";
}

export function decorateRecentActivities(activities = [], options = {}) {
  const settings = normalizeTrainingAnalyticsSettings(options.settings || {});
  const sourceItems = buildActivityItems(options.scopeActivities || activities, { settings });
  const recentItems = buildActivityItems(activities, { settings });
  const estimatedMaxHeartrate = getReferenceMaxHeartrate(sourceItems, {
    endDate: options.endDate,
  }).maxHeartrate || 0;
  const heartRateConfig = resolveHeartRateZoneConfig({
    preferences: settings,
    estimatedMaxHeartrate,
  });
  const referencePaceSecondsPerKm = toNumber(options.referencePaceSecondsPerKm)
    || buildReferencePace(sourceItems, {
      endDate: options.endDate,
      lookbackDays: 120,
      percentile: 0.20,
    }).paceSecondsPerKm
    || 0;
  const loadThresholds = buildLoadThresholds(sourceItems.length ? sourceItems : recentItems);
  const itemMap = new Map(
    recentItems.map((item) => [
      String(item?.id || item?.stravaActivityId || item?.name || ""),
      item,
    ]),
  );

  return (Array.isArray(activities) ? activities : []).map((activity) => {
    const key = String(activity?.id || activity?.stravaActivityId || activity?.name || "");
    const item = itemMap.get(key) || buildActivityItems([activity], { settings })[0];

    if (!item) {
      return activity;
    }

    const heartRateZone = classifyHeartRateZone(item.averageHeartrate, heartRateConfig.zones);
    const paceZone = isRunLikeActivity(item)
      ? classifyPaceZone(item.__paceSecondsPerKm, referencePaceSecondsPerKm)
      : null;
    const workoutProfile = analyzeWorkoutProfile(item, {
      referencePaceSecondsPerKm,
      estimatedMaxHeartrate,
    });
    const dominantZone = workoutProfile.hasShortIntervals
      ? { shortLabel: "Z5", label: "Z5" }
      : workoutProfile.hasThresholdBlock
        ? { shortLabel: "Z4", label: "Z4" }
        : heartRateZone || paceZone;
    const loadBand = buildLoadBand(item.__load, loadThresholds, workoutProfile);
    const sessionType = estimateSessionType(item, dominantZone, workoutProfile);
    const microTag = buildMicroTag(item, dominantZone, loadBand, workoutProfile);

    return {
      ...activity,
      activityLoadLabel: formatMetricValue(item.__load, "load"),
      estimatedSessionLabel: sessionType,
      dominantIntensityLabel: dominantZone ? `dominante ${dominantZone.shortLabel}` : "intensite mixte",
      loadBandLabel: loadBand.label,
      loadBandTone: loadBand.tone,
      dominantIntensityTone: dominantZone?.shortLabel === "Z4" || dominantZone?.shortLabel === "Z5"
        ? "warning"
        : dominantZone?.shortLabel === "Z1" || dominantZone?.shortLabel === "Z2"
          ? "positive"
          : "neutral",
      sessionTypeTone: sessionType === "Recuperation"
        ? "positive"
        : sessionType === "Seuil" || sessionType === "VMA / vitesse"
          ? "warning"
          : sessionType === "Trail vallonne"
            ? "neutral"
            : "neutral",
      microTag,
      microTagTone: buildStateTone(loadBand.tone),
    };
  });
}

export function enhanceWeeklySnapshotItems(items = [], model = {}) {
  const currentSummary = model?.currentSummary || {};
  const previousSummary = model?.previousSummary || {};
  const periodLabel = model?.currentRange?.sliceEndDate
    ? `${model.currentRange.startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - ${model.currentRange.sliceEndDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
    : "";

  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    hint: resolveWeeklyMetricInterpretation(
      item.label,
      currentSummary[
        item.label === "Distance" ? "distanceKm" : item.label === "Denivele" ? "elevationGain" : item.label === "Duree" ? "movingHours" : "count"
      ],
      previousSummary[
        item.label === "Distance" ? "distanceKm" : item.label === "Denivele" ? "elevationGain" : item.label === "Duree" ? "movingHours" : "count"
      ],
    ),
    meta: periodLabel ? `Bloc compare : ${periodLabel}` : "",
  }));
}
