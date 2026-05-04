// Indicateurs avances de dynamique de charge / forme :
//   - ACWR EWMA (Williams 2017)
//   - Detraining warning
//   - Time-to-recover (jours estimes pour atteindre TSB cible)
//   - Indice de progression CTL (%/sem)
//   - Plateau d'efficience (regression lineaire sur 8 semaines)
//
// Tous les calculs operent sur les modeles deja produits par
// buildTrainingLoadStateModel (chartData = timeline journaliere) et
// buildEfficiencyHistoryModel (chartData = points d'efficience).
//
// References :
//   - Williams S, West S, Cross MJ, Stokes KA (2017). Better way to determine
//     the acute:chronic workload ratio? Br J Sports Med 51(3):209-210.
//   - Coyle EF (1984). Time course of loss of adaptations after stopping
//     prolonged intense endurance training. J Appl Physiol 57(6):1857-1864.
//   - Coggan & Allen (2019). Performance Management Chart, TrainingPeaks.

const ACWR_ACUTE_DAYS = 7;
const ACWR_CHRONIC_DAYS = 28;

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundValue(value, decimals = 1) {
  const safe = toFiniteNumber(value);
  return Number(safe.toFixed(decimals));
}

function getTimelinePoints(loadModel = {}) {
  return Array.isArray(loadModel?.chartData) ? loadModel.chartData : [];
}

// ============================================================================
// 7.1 ACWR EWMA
// ============================================================================
//
// Williams 2017 propose un EWMA pondere : pour un jour t,
//   EWMA_t = lambda * load_t + (1 - lambda) * EWMA_{t-1}, avec
//   lambda_acute   = 2 / (N_acute + 1)   = 2 / 8  = 0.25
//   lambda_chronic = 2 / (N_chronic + 1) = 2 / 29 ~ 0.0690
// Le ratio EWMA acute / EWMA chronique remplace le ratio rolling.
// Plus stable face aux pics ponctuels que le ACWR rolling de Gabbett 2016.
function computeEwmaSeries(values = [], lambda = 0.25) {
  if (!values.length) return [];

  const series = new Array(values.length);
  let previous = values[0];

  for (let i = 0; i < values.length; i += 1) {
    const value = toFiniteNumber(values[i]);
    previous = i === 0 ? value : (lambda * value) + ((1 - lambda) * previous);
    series[i] = previous;
  }

  return series;
}

export function buildAcwrEwmaProfile(loadModel = {}) {
  const points = getTimelinePoints(loadModel);

  if (points.length < ACWR_CHRONIC_DAYS) {
    return {
      hasData: false,
      message: "Au moins 28 jours d'historique sont necessaires pour estimer un ACWR EWMA fiable.",
    };
  }

  const loads = points.map((point) => toFiniteNumber(point.load));
  const acuteLambda = 2 / (ACWR_ACUTE_DAYS + 1);
  const chronicLambda = 2 / (ACWR_CHRONIC_DAYS + 1);
  const acuteSeries = computeEwmaSeries(loads, acuteLambda);
  const chronicSeries = computeEwmaSeries(loads, chronicLambda);

  const lastAcute = acuteSeries[acuteSeries.length - 1] || 0;
  const lastChronic = chronicSeries[chronicSeries.length - 1] || 0;
  const ratio = lastChronic > 0 ? lastAcute / lastChronic : 0;

  let tone = "neutral";
  let label = "Ratio neutre";
  if (ratio >= 1.5) {
    tone = "danger";
    label = "Pression aigue elevee";
  } else if (ratio >= 1.3) {
    tone = "warning";
    label = "Charge en hausse rapide";
  } else if (ratio >= 0.8) {
    tone = "positive";
    label = "Zone equilibree";
  } else if (ratio > 0) {
    tone = "neutral";
    label = "Decharge ou reprise";
  }

  return {
    hasData: ratio > 0,
    ratio: roundValue(ratio, 2),
    acuteLoad: roundValue(lastAcute, 1),
    chronicLoad: roundValue(lastChronic, 1),
    label,
    tone,
    message: ratio > 0
      ? "ACWR EWMA pondere (Williams 2017) : plus stable que le ACWR rolling, surtout sur les retours de blessure ou reprises."
      : "Pas assez de charge recente pour calculer un ratio.",
  };
}

// ============================================================================
// 7.2 Detraining warning
// ============================================================================
//
// On repere une chute > 10 % du CTL sur les 14 derniers jours par rapport au
// CTL d'il y a 28 jours. Coyle (1984) montre qu'une perte de fitness aerobie
// commence vers 2-3 semaines d'arret ; on la signale tot pour donner le temps
// de relancer.
export function buildDetrainingProfile(loadModel = {}) {
  const points = getTimelinePoints(loadModel);

  if (points.length < 28) {
    return {
      hasData: false,
      message: "Au moins 28 jours d'historique sont necessaires pour detecter un detraining.",
    };
  }

  const lastIndex = points.length - 1;
  const currentCtl = toFiniteNumber(points[lastIndex]?.ctl);
  const referenceIndex = Math.max(0, lastIndex - 28);
  const referenceCtl = toFiniteNumber(points[referenceIndex]?.ctl);
  const recentReferenceIndex = Math.max(0, lastIndex - 14);
  const recentCtl = toFiniteNumber(points[recentReferenceIndex]?.ctl);

  if (referenceCtl <= 0) {
    return {
      hasData: false,
      message: "CTL trop faible il y a 28 jours pour calculer une perte relative.",
    };
  }

  const dropFromReference = ((currentCtl - referenceCtl) / referenceCtl) * 100;
  const dropFromRecent = recentCtl > 0
    ? ((currentCtl - recentCtl) / recentCtl) * 100
    : 0;
  const isLosingFitness = dropFromReference <= -10 || dropFromRecent <= -8;

  let tone = "positive";
  let label = "Pas de detraining";
  if (dropFromReference <= -20) {
    tone = "danger";
    label = "Perte de fitness marquee";
  } else if (isLosingFitness) {
    tone = "warning";
    label = "Detraining en cours";
  } else if (dropFromReference <= -5) {
    tone = "neutral";
    label = "Charge en baisse";
  }

  // Estimation grossiere : retrouver le CTL d'il y a 28 j prend ~ autant de
  // semaines que la perte cumulee divisee par 5 % par semaine (progression
  // saine). Borne haute fixee pour eviter des nombres absurdes.
  const recoverWeeks = isLosingFitness && dropFromReference < 0
    ? Math.min(12, Math.max(1, Math.round(Math.abs(dropFromReference) / 5)))
    : 0;

  return {
    hasData: true,
    currentCtl: roundValue(currentCtl, 1),
    referenceCtl: roundValue(referenceCtl, 1),
    dropPercent: roundValue(dropFromReference, 1),
    isLosingFitness,
    recoverWeeks,
    label,
    tone,
    message: isLosingFitness
      ? `Pour retrouver ton CTL d'il y a 28 jours, compte environ ${recoverWeeks} semaine(s) de relance progressive (+5 %/sem).`
      : "Ton socle de charge tient. Continue d'entretenir le minimum vital pour eviter le decrochage.",
  };
}

// ============================================================================
// 7.3 Time-to-recover (TSB target)
// ============================================================================
//
// Estimation du nombre de jours pour atteindre un TSB cible (par defaut +5),
// en supposant 0 charge sur les jours a venir : l'ATL retombe vers 0 a la
// constante de temps 7 j ; le CTL baisse aussi mais beaucoup moins vite (42 j).
//
// TSB(t) = CTL(t) - ATL(t)
// Si load = 0 pour tous les jours futurs :
//   ATL(t+n) = ATL(t) * (1 - 1/7)^n
//   CTL(t+n) = CTL(t) * (1 - 1/42)^n
//
// On itere jusqu'a atteindre tsbTarget ou un plafond de 21 jours.
export function buildTimeToRecoverProfile(loadModel = {}, options = {}) {
  const points = getTimelinePoints(loadModel);

  if (!points.length) {
    return { hasData: false, message: "Pas de donnees de charge recente." };
  }

  const lastPoint = points[points.length - 1];
  const tsbTarget = toFiniteNumber(options.tsbTarget ?? 5);
  let ctl = toFiniteNumber(lastPoint?.ctl);
  let atl = toFiniteNumber(lastPoint?.atl);
  let tsb = ctl - atl;

  if (tsb >= tsbTarget) {
    return {
      hasData: true,
      currentTsb: roundValue(tsb, 1),
      tsbTarget,
      daysToTarget: 0,
      tone: "positive",
      label: "Deja frais",
      message: `Tu es deja a ou au-dessus du TSB cible (+${tsbTarget}). Garde un volume leger pour preserver ta base.`,
    };
  }

  const ctlDecay = 1 - (1 / 42);
  const atlDecay = 1 - (1 / 7);
  let days = 0;
  while (days < 21) {
    days += 1;
    ctl *= ctlDecay;
    atl *= atlDecay;
    tsb = ctl - atl;

    if (tsb >= tsbTarget) {
      break;
    }
  }

  // Estimation alternative : n jours faciles (charge ~ 30 % de l'ATL actuel)
  // pour donner une option plus realiste qu'un repos total.
  let lightCtl = toFiniteNumber(lastPoint?.ctl);
  let lightAtl = toFiniteNumber(lastPoint?.atl);
  const lightLoad = lightAtl * 0.30;
  let lightTsb = lightCtl - lightAtl;
  let lightDays = 0;
  while (lightDays < 21 && lightTsb < tsbTarget) {
    lightDays += 1;
    lightCtl = lightCtl + ((lightLoad - lightCtl) / 42);
    lightAtl = lightAtl + ((lightLoad - lightAtl) / 7);
    lightTsb = lightCtl - lightAtl;
  }

  const reachedTarget = tsb >= tsbTarget;

  let tone = "neutral";
  let label = "Reserve a reconstruire";
  if (!reachedTarget) {
    tone = "warning";
    label = "Plus de 3 semaines necessaires";
  } else if (days <= 3) {
    tone = "positive";
    label = "Reserve proche";
  } else if (days <= 7) {
    tone = "neutral";
    label = "Quelques jours a prevoir";
  }

  return {
    hasData: true,
    currentTsb: roundValue(toFiniteNumber(lastPoint?.tsb ?? lastPoint?.ctl - lastPoint?.atl), 1),
    tsbTarget,
    daysToTarget: reachedTarget ? days : null,
    daysToTargetWithLightTraining: lightTsb >= tsbTarget ? lightDays : null,
    tone,
    label,
    message: reachedTarget
      ? `Avec 0 charge tu atteins TSB +${tsbTarget} en ${days} jour(s). Avec un volume tres leger (~ 30 % de ton ATL), compte ${lightTsb >= tsbTarget ? lightDays : "plus de 21"} jour(s).`
      : `Plus de 21 jours seraient necessaires pour atteindre TSB +${tsbTarget}. Ta charge aigue est tres haute, planifie une coupure structuree.`,
  };
}

// ============================================================================
// 7.4 Indice de progression CTL
// ============================================================================
//
// Pente du CTL sur les 28 derniers jours, exprimee en %/semaine par rapport
// au CTL d'il y a 28 jours. Cible saine selon Coggan : 5 a 8 %/semaine sur un
// bloc constructif. Au-dela, surveiller la fatigue (ATL).
export function buildCtlProgressionProfile(loadModel = {}) {
  const points = getTimelinePoints(loadModel);

  if (points.length < 14) {
    return {
      hasData: false,
      message: "Au moins 14 jours d'historique sont necessaires pour mesurer une progression de CTL.",
    };
  }

  const lastIndex = points.length - 1;
  const referenceIndex = Math.max(0, lastIndex - 28);
  const currentCtl = toFiniteNumber(points[lastIndex]?.ctl);
  const referenceCtl = toFiniteNumber(points[referenceIndex]?.ctl);

  if (referenceCtl <= 0) {
    return {
      hasData: false,
      message: "CTL initial trop faible pour mesurer une progression relative.",
    };
  }

  const totalDeltaPercent = ((currentCtl - referenceCtl) / referenceCtl) * 100;
  const days = Math.min(28, lastIndex - referenceIndex);
  const weeklyPercent = days > 0 ? (totalDeltaPercent * 7) / days : 0;

  let tone = "neutral";
  let label = "Progression neutre";
  if (weeklyPercent >= 10) {
    tone = "danger";
    label = "Progression tres rapide";
  } else if (weeklyPercent >= 5 && weeklyPercent < 10) {
    tone = "positive";
    label = "Progression saine";
  } else if (weeklyPercent >= 0 && weeklyPercent < 5) {
    tone = "neutral";
    label = "Progression lente";
  } else if (weeklyPercent >= -5) {
    tone = "neutral";
    label = "Charge stable a baisse";
  } else {
    tone = "warning";
    label = "Decharge marquee";
  }

  return {
    hasData: true,
    weeklyPercent: roundValue(weeklyPercent, 1),
    totalDeltaPercent: roundValue(totalDeltaPercent, 1),
    referenceCtl: roundValue(referenceCtl, 1),
    currentCtl: roundValue(currentCtl, 1),
    tone,
    label,
    message: weeklyPercent >= 5 && weeklyPercent < 10
      ? "Pente saine de progression du CTL : entre +5 et +8 %/sem (recommandation Coggan)."
      : weeklyPercent >= 10
        ? "Progression du CTL tres au-dessus de la zone confort. Surveille ton ATL et ta monotonie."
        : weeklyPercent < 0
          ? "Ton CTL baisse : phase de relachement ou debut de detraining a confirmer."
          : "CTL en faible progression : utile en phase de stabilisation.",
  };
}

// ============================================================================
// 7.5 Plateau d'efficience
// ============================================================================
//
// Regression lineaire ponderee sur les 8 dernieres semaines d'efficience :
//   - pente proche de 0 sur la duree -> plateau
//   - pente positive -> progression
//   - pente negative -> regression
//
// L'efficience est en (km/h)/bpm donc tres petite ; on travaille en pourcent
// du niveau median pour rester intuitif.
function getRecentEfficiencyPoints(efficiencyModel = {}, weeksBack = 8) {
  const points = Array.isArray(efficiencyModel?.chartData) ? efficiencyModel.chartData : [];
  return points
    .filter((point) => Number.isFinite(Number(point?.efficiency)) && Number(point.efficiency) > 0)
    .slice(-Math.max(3, weeksBack));
}

function linearRegression(values = []) {
  // values : [{ x, y }] avec x temporel (index) et y la valeur observee.
  if (values.length < 3) {
    return { slope: 0, intercept: 0 };
  }

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const point of values) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const denominator = (n * sumXX) - (sumX * sumX);
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = ((n * sumXY) - (sumX * sumY)) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function buildEfficiencyPlateauProfile(efficiencyModel = {}) {
  const recentPoints = getRecentEfficiencyPoints(efficiencyModel, 8);

  if (recentPoints.length < 3) {
    return {
      hasData: false,
      message: "Pas assez de points d'efficience comparables sur 8 semaines pour qualifier la tendance.",
    };
  }

  const values = recentPoints.map((point, index) => ({ x: index, y: Number(point.efficiency) }));
  const median = [...values].sort((left, right) => left.y - right.y)[Math.floor(values.length / 2)].y;
  const { slope } = linearRegression(values);
  const slopePercentPerStep = median > 0 ? (slope / median) * 100 : 0;
  // Si la granularite est weekly, chaque step = 1 semaine. Si daily, on
  // divise par 7 pour obtenir un equivalent hebdomadaire.
  const granularity = efficiencyModel?.granularity === "weekly" ? "weekly" : "daily";
  const slopePercentPerWeek = granularity === "weekly" ? slopePercentPerStep : slopePercentPerStep * 7;

  let tone = "neutral";
  let label = "Tendance neutre";
  if (slopePercentPerWeek >= 0.7) {
    tone = "positive";
    label = "Progression nette";
  } else if (slopePercentPerWeek >= 0.2) {
    tone = "positive";
    label = "Progression legere";
  } else if (slopePercentPerWeek <= -0.7) {
    tone = "warning";
    label = "Regression marquee";
  } else if (slopePercentPerWeek <= -0.2) {
    tone = "neutral";
    label = "Tendance baissiere";
  } else {
    tone = "neutral";
    label = "Plateau";
  }

  return {
    hasData: true,
    slopePercentPerWeek: roundValue(slopePercentPerWeek, 2),
    sampleSize: recentPoints.length,
    granularity,
    tone,
    label,
    message: tone === "positive"
      ? "Ton efficience progresse : ton bloc paie ou les conditions de tes sorties sont plus favorables."
      : label === "Plateau"
        ? "Pente d'efficience proche de zero sur 8 semaines : plateau probable. Varie les stimulations (fartlek, cotes, bloc seuil) pour relancer."
        : "Pente baissiere : cherche une cause (chaleur, fatigue, semaines monotones) avant d'augmenter l'intensite.",
  };
}

// ============================================================================
// Contexte de récupération biologique (HRV, sommeil, FC repos)
// ============================================================================
//
// Enrichissement optionnel de buildLoadDynamicsProfile avec les snapshots
// Garmin recovery. Fournit une lecture de l'état biologique indépendante
// de la charge calculée (CTL/ATL/TSB).
//
// Références :
//   - Plews DJ et al. (2013). Heart rate variability in elite triathletes.
//   - Buchheit M (2014). Monitoring training status with HR measures.

function averageOptionalValues(values = []) {
  const finite = values.filter((v) => v != null && Number.isFinite(Number(v)));
  if (!finite.length) return null;
  return finite.reduce((sum, v) => sum + Number(v), 0) / finite.length;
}

export function buildRecoveryContextProfile(recoverySnapshots = []) {
  const snapshots = Array.isArray(recoverySnapshots) ? recoverySnapshots : [];

  if (snapshots.length < 2) {
    return { hasData: false, message: "Pas assez de donnees de recuperation (minimum 2 jours)." };
  }

  // Snapshots sont triés asc — le plus récent est le dernier
  const recent = snapshots.slice(-3);
  const baseline = snapshots.slice(0, Math.max(snapshots.length - 3, 1));
  const latest = snapshots[snapshots.length - 1];

  const latestSleepScore = latest?.sleepScore != null ? roundValue(latest.sleepScore, 0) : null;
  const latestHrvMs = latest?.hrvAvgMs != null ? roundValue(latest.hrvAvgMs, 1) : null;
  const latestRestingHr = latest?.restingHr != null ? Math.round(latest.restingHr) : null;
  const latestBodyBattery = latest?.bodyBatteryMorning ?? latest?.bodyBatteryEnd ?? null;

  const avgSleepScore = averageOptionalValues(snapshots.map((s) => s.sleepScore));
  const avgHrvRecent = averageOptionalValues(recent.map((s) => s.hrvAvgMs));
  const avgHrvBaseline = averageOptionalValues(baseline.map((s) => s.hrvAvgMs));
  const avgRestingHrRecent = averageOptionalValues(recent.map((s) => s.restingHr));
  const avgRestingHrBaseline = averageOptionalValues(baseline.map((s) => s.restingHr));

  // Signaux de vigilance
  const sleepWarning = avgSleepScore != null && avgSleepScore < 60;
  const hrvDeclineFlag = avgHrvRecent != null && avgHrvBaseline != null
    && avgHrvRecent < avgHrvBaseline * 0.93; // baisse > 7 %
  const restingHrElevatedFlag = avgRestingHrRecent != null && avgRestingHrBaseline != null
    && avgRestingHrRecent > avgRestingHrBaseline + 4; // hausse > 4 bpm

  const warningCount = [sleepWarning, hrvDeclineFlag, restingHrElevatedFlag].filter(Boolean).length;

  let tone;
  let label;
  let message;

  if (warningCount >= 2) {
    tone = "danger";
    label = "Récupération dégradée";
    message = "Plusieurs signaux biologiques convergent vers une fatigue accumulée. Priorise le repos avant d'augmenter la charge.";
  } else if (warningCount === 1) {
    tone = "warning";
    label = "Signal de vigilance";
    message = sleepWarning
      ? "Qualité de sommeil en baisse sur la période : vérifier la charge et le stress extra-sportif."
      : hrvDeclineFlag
        ? "HRV en recul par rapport à la semaine : probable fatigue systémique naissante."
        : "FC de repos au-dessus du repère : surveiller la récupération les prochains jours.";
  } else {
    tone = "positive";
    label = "Récupération correcte";
    message = "Les indicateurs biologiques sont stables. La charge actuelle semble bien absorbée.";
  }

  return {
    hasData: true,
    tone,
    label,
    message,
    latestSleepScore,
    latestHrvMs,
    latestRestingHr,
    latestBodyBattery: latestBodyBattery != null ? Math.round(latestBodyBattery) : null,
    avgSleepScore: avgSleepScore != null ? roundValue(avgSleepScore, 0) : null,
    avgHrvMs: avgHrvRecent != null ? roundValue(avgHrvRecent, 1) : null,
    sleepWarning,
    hrvDeclineFlag,
    restingHrElevatedFlag,
    sampleDays: snapshots.length,
  };
}

// ============================================================================
// Profil global : agrege les indicateurs de charge + contexte biologique.
// ============================================================================
export function buildLoadDynamicsProfile({ loadModel = {}, efficiencyModel = {}, recoverySnapshots = [] } = {}) {
  return {
    acwrEwma: buildAcwrEwmaProfile(loadModel),
    detraining: buildDetrainingProfile(loadModel),
    timeToRecover: buildTimeToRecoverProfile(loadModel),
    ctlProgression: buildCtlProgressionProfile(loadModel),
    efficiencyPlateau: buildEfficiencyPlateauProfile(efficiencyModel),
    recoveryContext: buildRecoveryContextProfile(recoverySnapshots),
  };
}
