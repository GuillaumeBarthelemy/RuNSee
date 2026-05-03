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

function toOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function averageOptional(values = []) {
  const safeValues = values
    .map((value) => toOptionalNumber(value))
    .filter((value) => value !== null);

  if (!safeValues.length) {
    return null;
  }

  return safeValues.reduce((total, value) => total + value, 0) / safeValues.length;
}

function sum(values = []) {
  return values.reduce((total, value) => total + toNumber(value), 0);
}

function formatCompactRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }

  return `${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - ${endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
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
  const loadValues = chartData.map((point) => toNumber(point?.load));
  const recentDays = loadValues.slice(-7);
  const previousDays = loadValues.slice(-14, -7);
  const contextDays = loadValues.slice(-28);
  const previousContextDays = loadValues.slice(-56, -28);
  const activeRecentDays = recentDays.filter((value) => value > 0);
  const averageRecentLoad = recentDays.length ? sum(recentDays) / recentDays.length : 0;
  const averagePreviousLoad = previousDays.length ? sum(previousDays) / previousDays.length : 0;
  const averageContextLoad = contextDays.length ? sum(contextDays) / contextDays.length : 0;
  const maxRecentLoad = recentDays.length ? Math.max(...recentDays) : 0;
  const recentDeltaPercent = averagePreviousLoad > 0
    ? ((averageRecentLoad - averagePreviousLoad) / averagePreviousLoad) * 100
    : null;
  const recentVsContextPercent = averageContextLoad > 0
    ? ((averageRecentLoad - averageContextLoad) / averageContextLoad) * 100
    : null;

  return {
    activeDays: activeRecentDays.length,
    averageRecentLoad,
    averagePreviousLoad,
    averageContextLoad,
    maxRecentLoad,
    recentLoad: roundValue(sum(recentDays), 1),
    previousLoad: roundValue(sum(previousDays), 1),
    contextLoad: roundValue(sum(contextDays), 1),
    previousContextLoad: roundValue(sum(previousContextDays), 1),
    recentDeltaPercent,
    recentVsContextPercent,
    hasRecentSpike: averageRecentLoad > 0 && maxRecentLoad >= Math.max(averageRecentLoad * 1.8, averageRecentLoad + 25),
  };
}

function buildDecisionHorizonMeta(loadModel = {}, contextLoadModel = {}) {
  const contextChartData = Array.isArray(contextLoadModel?.chartData) ? contextLoadModel.chartData : [];
  const contextDays = contextChartData.slice(-28);
  const contextStart = contextDays[0]?.date || null;
  const contextEnd = contextDays[contextDays.length - 1]?.date || null;
  const decisionRange = loadModel?.range?.label || "7 jours";
  const contextRange = formatCompactRange(contextStart, contextEnd);

  return {
    decisionRange,
    contextRange,
    label: contextRange
      ? `Decision : ${decisionRange} · contexte : ${contextRange} · socle : 6 sem.`
      : `Decision : ${decisionRange} · contexte : 4 a 6 sem.`,
  };
}

function buildDecisionInsight(form = {}, fatigue = {}, charge = {}, pattern = {}) {
  const contextDelta = pattern.recentVsContextPercent;

  if (fatigue.tone === "negative") {
    return "Fatigue recente au-dessus du socle : priorite a l'absorption du bloc.";
  }

  if (pattern.hasRecentSpike) {
    return "Pic recent detecte : la decision reste prudente meme si le socle est correct.";
  }

  if (Number.isFinite(contextDelta) && contextDelta >= 20) {
    return "Les 7 derniers jours sont plus denses que la tendance du mois.";
  }

  if (Number.isFinite(contextDelta) && contextDelta <= -20) {
    return "Les 7 derniers jours sont plus legers que la tendance du mois.";
  }

  return `${form.detail} ${fatigue.detail} ${charge.detail}`.trim();
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
    || toNumber(pattern.recentDeltaPercent) >= 25
    || toNumber(pattern.recentVsContextPercent) >= 25;
  const loadDroppingFast = loadDeltaPercent <= -15 && toNumber(pattern.recentVsContextPercent) <= -10;
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

function getRecoverySignalCount(snapshot = {}) {
  return [
    snapshot.sleepDurationSeconds,
    snapshot.sleepScore,
    snapshot.hrvAvgMs,
    snapshot.restingHr,
    snapshot.stressAvg,
    snapshot.bodyBatteryMorning ?? snapshot.bodyBatteryEnd,
  ].filter((value) => toOptionalNumber(value) !== null).length;
}

function getRecoverySnapshotDate(snapshot = {}) {
  const parsed = new Date(snapshot.date || snapshot.snapshotDate || snapshot.syncedAt || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSortedRecoverySnapshots(snapshots = []) {
  return (Array.isArray(snapshots) ? snapshots : [])
    .map((snapshot) => ({
      ...snapshot,
      __date: getRecoverySnapshotDate(snapshot),
      __signalCount: getRecoverySignalCount(snapshot),
    }))
    .filter((snapshot) => snapshot.__date && snapshot.__signalCount > 0)
    .sort((first, second) => first.__date - second.__date);
}

function formatSignedPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "";
  }

  const rounded = roundValue(value, 0);
  return `${rounded > 0 ? "+" : ""}${rounded} %`;
}

function formatSleepDuration(seconds) {
  const minutes = Math.round(toNumber(seconds) / 60);

  if (minutes <= 0) {
    return "";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} h ${String(remainingMinutes).padStart(2, "0")}`;
}

// Mapping du statut HRV Garmin natif (BALANCED, LOW, UNBALANCED, POOR) vers
// l'effet decisionnel RunNSee. Lorsqu'il est disponible, ce statut prime sur
// le delta HRV % calcule en interne, car Garmin compare deja la HRV a une
// baseline personnelle adaptative que nous ne pouvons pas reproduire.
function summarizeHrvStatusValues(snapshots = []) {
  if (!Array.isArray(snapshots) || !snapshots.length) {
    return null;
  }

  const counts = { balanced: 0, low: 0, unbalanced: 0, poor: 0, other: 0 };
  let total = 0;

  for (const snapshot of snapshots) {
    const status = String(snapshot?.hrvStatus || "").trim().toUpperCase();
    if (!status) continue;

    total += 1;
    if (status === "BALANCED") counts.balanced += 1;
    else if (status === "LOW") counts.low += 1;
    else if (status === "POOR") counts.poor += 1;
    else if (status.startsWith("UNBALANCED")) counts.unbalanced += 1;
    else counts.other += 1;
  }

  if (total === 0) {
    return null;
  }

  return { ...counts, total };
}

export function buildRecoveryDecisionProfile(snapshots = []) {
  const sortedSnapshots = getSortedRecoverySnapshots(snapshots);

  if (!sortedSnapshots.length) {
    return {
      label: "Non disponible",
      detail: "Aucun signal Garmin exploitable.",
      tone: "neutral",
      confidence: { label: "Standard", tone: "neutral" },
      limitingFactor: "Charge uniquement",
      factors: ["Pas encore de donnees de recuperation Garmin."],
      score: 0,
      hasData: false,
    };
  }

  // Fenetre recente : 7 jours (au lieu de 3) pour rester proche de la lecture
  // 7-day Garmin et lisser les outliers ponctuels (Stanley et al., 2013).
  const recentSnapshots = sortedSnapshots.slice(-7);
  // Baseline : 28 jours qui precedent les 7 derniers (au lieu de 35), plus
  // proche de la baseline glissante Garmin et exigeant 21 jours minimum
  // pour qu'un delta % soit considere fiable.
  const baselineSnapshots = sortedSnapshots.slice(0, Math.max(0, sortedSnapshots.length - 7)).slice(-28);
  const baselineLength = baselineSnapshots.length;
  const hasReliableBaseline = baselineLength >= 21;
  const coverage = recentSnapshots.length / 7;
  const recentSignalCount = recentSnapshots.reduce((total, snapshot) => total + snapshot.__signalCount, 0);
  const expectedSignalCount = Math.max(1, recentSnapshots.length * 5);
  const signalCoverage = Math.min(1, recentSignalCount / expectedSignalCount);
  // HRV / FC repos lus sur 7 jours (et non plus 3) : moyenne plus stable.
  const hrvRecent = averageOptional(recentSnapshots.map((snapshot) => snapshot.hrvAvgMs));
  const hrvBaseline = averageOptional(baselineSnapshots.map((snapshot) => snapshot.hrvAvgMs));
  const restingHrRecent = averageOptional(recentSnapshots.map((snapshot) => snapshot.restingHr));
  const restingHrBaseline = averageOptional(baselineSnapshots.map((snapshot) => snapshot.restingHr));
  const sleepScoreRecent = averageOptional(recentSnapshots.map((snapshot) => snapshot.sleepScore));
  const sleepDurationRecent = averageOptional(recentSnapshots.map((snapshot) => snapshot.sleepDurationSeconds));
  const stressRecent = averageOptional(recentSnapshots.map((snapshot) => snapshot.stressAvg));
  const bodyBatteryRecent = averageOptional(
    recentSnapshots.map((snapshot) => snapshot.bodyBatteryMorning ?? snapshot.bodyBatteryEnd),
  );
  const hrvDeltaPercent = hasReliableBaseline && hrvRecent !== null && hrvBaseline
    ? ((hrvRecent - hrvBaseline) / hrvBaseline) * 100
    : null;
  const restingHrDelta = hasReliableBaseline && restingHrRecent !== null && restingHrBaseline !== null
    ? restingHrRecent - restingHrBaseline
    : null;
  const factors = [];
  let score = 0;
  let limitingFactor = "";
  let hasCriticalRecoverySignal = false;

  if (!hasReliableBaseline) {
    factors.push(`Baseline en cours de constitution (${baselineLength}/21 jours).`);
  }

  const hasAbsoluteSignal = [
    sleepScoreRecent,
    sleepDurationRecent,
    stressRecent,
    bodyBatteryRecent,
  ].some((value) => value !== null);

  if (!hasReliableBaseline && !hasAbsoluteSignal) {
    return {
      label: "Non disponible",
      detail: "Donnees Garmin trop recentes pour produire une lecture fiable.",
      tone: "neutral",
      confidence: { label: "Faible", tone: "neutral" },
      limitingFactor: "Baseline Garmin incomplete",
      factors: factors.slice(0, 4),
      score: 0,
      hasData: false,
    };
  }

  // PRIORITE 1 : statut HRV Garmin natif.
  // Garmin compare deja la HRV a une baseline personnelle adaptative et
  // marque BALANCED quand la valeur reste dans la zone normale (zone grise
  // affichee dans Garmin Connect). Quand ce statut est disponible et
  // majoritairement BALANCED sur 7 jours, on neutralise le calcul delta %
  // qui peut faussement alerter sur des variations naturelles.
  const hrvStatusSummary = summarizeHrvStatusValues(recentSnapshots);
  const hasHrvStatusMajority = hrvStatusSummary && hrvStatusSummary.total >= 4;
  let hrvHandledByStatus = false;

  if (hasHrvStatusMajority) {
    const { balanced, low, unbalanced, poor, total } = hrvStatusSummary;
    const balancedRatio = balanced / total;
    const adverseRatio = (low + poor) / total;

    if (poor >= 2) {
      factors.push(`HRV signalee POOR par Garmin sur ${poor}/${total} jours.`);
      score -= 3;
      limitingFactor ||= "Variabilite cardiaque tres basse";
      hasCriticalRecoverySignal = true;
      hrvHandledByStatus = true;
    } else if (adverseRatio >= 0.5) {
      factors.push(`HRV basse selon Garmin sur ${low + poor}/${total} jours.`);
      score -= 2;
      limitingFactor ||= "Variabilite cardiaque basse selon Garmin";
      hrvHandledByStatus = true;
    } else if (balancedRatio >= 0.6) {
      factors.push(`HRV equilibree selon Garmin sur ${balanced}/${total} jours.`);
      // Pas de bonus arbitraire, juste neutralisation : on respecte le verdict
      // Garmin et on ignore le calcul delta % derriere.
      hrvHandledByStatus = true;
    } else if (unbalanced >= 2) {
      factors.push(`HRV en zone instable selon Garmin sur ${unbalanced}/${total} jours.`);
      score -= 1;
      limitingFactor ||= "Variabilite cardiaque instable";
      hrvHandledByStatus = true;
    }
  }

  // FALLBACK : delta HRV % avec seuils elargis (-15/-10/+8) pour rester
  // tolerant a la variabilite naturelle (Stanley et al., 2013).
  if (!hrvHandledByStatus && hrvDeltaPercent !== null) {
    factors.push(`Variabilite cardiaque ${formatSignedPercent(hrvDeltaPercent)} vs repere.`);
    if (hrvDeltaPercent <= -15) {
      score -= 3;
      limitingFactor ||= "Variabilite cardiaque basse";
      hasCriticalRecoverySignal = true;
    } else if (hrvDeltaPercent <= -10) {
      score -= 2;
      limitingFactor ||= "Variabilite cardiaque en retrait";
    } else if (hrvDeltaPercent >= 8) {
      score += 1;
    }
  }

  // FC repos : seuils legerement elargis et exception pour les FC repos
  // tres basses ou +5 bpm reste dans le bruit naturel.
  if (restingHrDelta !== null) {
    const restingHrAbsolute = restingHrRecent;
    const isLowAbsoluteHr = restingHrAbsolute !== null && restingHrAbsolute < 55;
    factors.push(`FC repos ${restingHrDelta >= 0 ? "+" : ""}${roundValue(restingHrDelta, 0)} bpm vs repere.`);

    if (restingHrDelta >= 7) {
      score -= 3;
      limitingFactor ||= "FC repos elevee";
      hasCriticalRecoverySignal = true;
    } else if (restingHrDelta >= 5 && !isLowAbsoluteHr) {
      score -= 2;
      limitingFactor ||= "FC repos en hausse";
    } else if (restingHrDelta <= -3) {
      score += 1;
    }
  }

  // Sommeil score : palier intermediaire (70 = neutre, 80 = positif).
  if (sleepScoreRecent !== null) {
    factors.push(`Sommeil score moyen ${roundValue(sleepScoreRecent, 0)}.`);
    if (sleepScoreRecent < 50) {
      score -= 2;
      limitingFactor ||= "Sommeil faible";
    } else if (sleepScoreRecent >= 80) {
      score += 1;
    }
    // Plage 50-80 = neutre, pas de pénalité ni de bonus.
  } else if (sleepDurationRecent !== null) {
    factors.push(`Sommeil moyen ${formatSleepDuration(sleepDurationRecent)}.`);
    if (sleepDurationRecent < 6.5 * 3600) {
      score -= 2;
      limitingFactor ||= "Sommeil court";
    } else if (sleepDurationRecent >= 7.5 * 3600) {
      score += 1;
    }
  }

  // Stress : palier eleve (Garmin considere 50-75 comme "modere").
  if (stressRecent !== null) {
    factors.push(`Stress moyen ${roundValue(stressRecent, 0)}.`);
    if (stressRecent >= 75) {
      score -= 3;
      limitingFactor ||= "Stress tres eleve";
      hasCriticalRecoverySignal = true;
    } else if (stressRecent >= 60) {
      score -= 2;
      limitingFactor ||= "Stress eleve";
    } else if (stressRecent <= 30) {
      score += 1;
    }
  }

  if (bodyBatteryRecent !== null) {
    factors.push(`Body Battery moyen ${roundValue(bodyBatteryRecent, 0)}.`);
    if (bodyBatteryRecent < 35) {
      score -= 2;
      limitingFactor ||= "Reserve energetique basse";
    } else if (bodyBatteryRecent >= 70) {
      score += 1;
    }
  }

  const confidenceScore = (coverage * 0.45) + (signalCoverage * 0.55);
  const confidence = confidenceScore >= 0.72
    ? { label: "Haute", tone: "positive" }
    : confidenceScore >= 0.42
      ? { label: "Moyenne", tone: "warning" }
      : { label: "Faible", tone: "neutral" };

  if (score <= -5 || (hasCriticalRecoverySignal && score <= -3)) {
    return {
      label: "Fragile",
      detail: "Plusieurs signaux de recuperation sont defavorables.",
      tone: "negative",
      confidence,
      limitingFactor: limitingFactor || "Recuperation basse",
      factors: factors.slice(0, 4),
      score,
      hasData: true,
    };
  }

  if (score <= -2) {
    return {
      label: "A surveiller",
      detail: "La recuperation invite a rester prudent.",
      tone: "warning",
      confidence,
      limitingFactor: limitingFactor || "Recuperation inegale",
      factors: factors.slice(0, 4),
      score,
      hasData: true,
    };
  }

  if (score >= 2) {
    return {
      label: "Solide",
      detail: "Les signaux de recuperation soutiennent la decision.",
      tone: "positive",
      confidence,
      limitingFactor: "Aucun signal bloquant",
      factors: factors.slice(0, 4),
      score,
      hasData: true,
    };
  }

  return {
    label: "Neutre",
    detail: "Les signaux Garmin ne changent pas fortement la lecture.",
    tone: "neutral",
    confidence,
    limitingFactor: limitingFactor || "Aucun signal dominant",
    factors: factors.slice(0, 4),
    score,
    hasData: true,
  };
}

export function adjustRecommendationWithRecovery(recommendation = {}, recovery = {}, context = {}) {
  if (!recovery?.hasData) {
    return recommendation;
  }

  const limitingFactor = String(recovery.limitingFactor || "");
  const tsb = toNumber(context?.summary?.tsb);

  if (recovery.tone === "negative") {
    if (/Sommeil/.test(limitingFactor)) {
      return {
        label: "Sommeil defavorable : eviter la qualite, viser repos actif ou endurance tres facile.",
        tone: "negative",
      };
    }

    if (/Variabilite cardiaque/.test(limitingFactor)) {
      return {
        label: "Variabilite cardiaque en retrait : reduire l'intensite et privilegier une seance facile.",
        tone: "negative",
      };
    }

    if (/Stress/.test(limitingFactor)) {
      return {
        label: "Stress eleve : garder une contrainte basse et reporter la qualite si les sensations confirment.",
        tone: "negative",
      };
    }

    return {
      label: "Recuperation fragile : eviter la qualite, privilegier repos actif ou endurance tres facile.",
      tone: "negative",
    };
  }

  if (recovery.tone === "warning" && recommendation.tone === "negative") {
    return {
      label: "Charge deja exigeante et recuperation inegale : rester facile jusqu'a retrouver des signaux plus stables.",
      tone: "negative",
    };
  }

  if (recovery.tone === "warning" && recommendation.tone !== "negative") {
    return {
      label: "Recuperation a surveiller : garder la seance facile ou reduire l'intensite prevue.",
      tone: "warning",
    };
  }

  if (recovery.tone === "positive" && tsb > 5) {
    return {
      label: "Fraicheur et recuperation favorables : seance structuree possible si elle reste dans le plan.",
      tone: "positive",
    };
  }

  if (recovery.tone === "positive" && recommendation.tone === "neutral") {
    return {
      label: "Recuperation favorable : seance structuree possible si la charge du plan reste maitrisee.",
      tone: "positive",
    };
  }

  return recommendation;
}

export function buildDashboardDecisionSummary(loadModel = {}, contextLoadModel = loadModel, options = {}) {
  const summary = loadModel?.summary;
  const horizonMeta = buildDecisionHorizonMeta(loadModel, contextLoadModel);
  const recovery = buildRecoveryDecisionProfile(options.recoverySnapshots);

  if (!summary) {
    return {
      form: { label: "Indeterminee", detail: "Pas assez de donnees pour conclure.", tone: "neutral" },
      fatigue: { label: "Indeterminee", detail: "Pas assez de donnees pour conclure.", tone: "neutral" },
      charge: { label: "A lire", detail: "Le bloc recent manque encore d'historique.", tone: "neutral" },
      recovery,
      recommendation: { label: "Accumuler quelques seances avant de piloter la charge.", tone: "neutral" },
      rangeLabel: horizonMeta.decisionRange,
      horizonLabel: horizonMeta.label,
      decisionMeta: {
        confidence: recovery.confidence,
        limitingFactor: recovery.limitingFactor,
        factors: recovery.factors,
      },
      insight: "Les indicateurs de forme se stabilisent apres quelques jours de pratique tracee.",
    };
  }

  const form = resolveLoadStateLabel(summary.tsb);
  const fatigue = resolveFatigueLabel(summary.ctl, summary.atl, summary.tsb);
  const charge = resolveChargeTrendLabel(summary.loadDeltaPercent, summary.loadDeltaValue);
  const recentLoadPattern = buildRecentLoadPattern(contextLoadModel);
  const recommendation = adjustRecommendationWithRecovery(
    buildDecisionRecommendation(summary, form, fatigue, charge, recentLoadPattern),
    recovery,
    { summary },
  );

  return {
    form,
    fatigue,
    charge,
    recovery,
    recommendation,
    rangeLabel: horizonMeta.decisionRange,
    horizonLabel: horizonMeta.label,
    decisionMeta: {
      confidence: recovery.confidence,
      limitingFactor: recovery.limitingFactor,
      factors: recovery.factors,
    },
    insight: buildDecisionInsight(form, fatigue, charge, recentLoadPattern),
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
