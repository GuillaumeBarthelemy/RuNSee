// Detection automatique de la phase d'entrainement courante (base / specifique /
// pic / recuperation), heuristique inspiree de Issurin (2008) et Bompa.
//
// L'idee : sur les 28 derniers jours, croiser le volume (charge cumulee) avec la
// part d'intensite haute. Quatre patterns dominent :
//   - Base       : volume eleve, intensite basse.
//   - Specifique : volume modere, intensite tempo/seuil dominante.
//   - Pic        : volume bas, intensite VO2max/courte importante, monotonie basse.
//   - Recuperation : volume bas, intensite basse, charge en chute.
//
// On compare aussi la fenetre 28 j a la fenetre 28-56 j precedente pour
// exprimer la dynamique (volume en hausse vs baisse, intensite en hausse vs baisse).

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundValue(value, decimals = 1) {
  return Number(toFiniteNumber(value).toFixed(decimals));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getTimelinePoints(loadModel = {}) {
  return Array.isArray(loadModel?.chartData) ? loadModel.chartData : [];
}

function sumLoadOverWindow(points = [], startDate, endDate) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  return points.reduce((sum, point) => {
    if (!point?.date) return sum;
    const day = startOfDay(point.date);
    if (day >= start && day <= end) {
      return sum + toFiniteNumber(point.load);
    }
    return sum;
  }, 0);
}

function getHighIntensityShare(intensityModel = {}) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];
  return zones
    .filter((zone) => zone?.key === "z4" || zone?.key === "z5")
    .reduce((sum, zone) => sum + toFiniteNumber(zone?.loadShare ?? zone?.durationShare), 0);
}

function getModerateShare(intensityModel = {}) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];
  return zones
    .filter((zone) => zone?.key === "z3")
    .reduce((sum, zone) => sum + toFiniteNumber(zone?.loadShare ?? zone?.durationShare), 0);
}

function getEasyShare(intensityModel = {}) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];
  return zones
    .filter((zone) => zone?.key === "z1" || zone?.key === "z2")
    .reduce((sum, zone) => sum + toFiniteNumber(zone?.loadShare ?? zone?.durationShare), 0);
}

// Reference : phase determinee par regles, avec confiance attachee.
function classifyPhase({
  volumeDeltaPercent,
  highIntensityShare,
  moderateShare,
  easyShare,
  acwrEwma,
}) {
  // Recuperation : volume en chute marquee + ACWR < 0.85.
  if (volumeDeltaPercent <= -20 && acwrEwma > 0 && acwrEwma <= 0.85) {
    return {
      key: "recovery",
      label: "Recuperation / decharge",
      tone: "neutral",
      summary: "Ton volume a fortement baisse et ta charge aigue est sous la chronique : phase d'absorption ou retour de blessure.",
    };
  }

  // Pic / affutage : volume en chute mais intensite haute conservee.
  if (volumeDeltaPercent <= -10 && highIntensityShare >= 12 && acwrEwma > 0 && acwrEwma <= 1.05) {
    return {
      key: "peak",
      label: "Affutage / pic",
      tone: "positive",
      summary: "Volume en baisse contrôlée et part d'intensite preservee : tu es en logique de tapering vers une echeance.",
    };
  }

  // Specifique : intensite tempo/seuil ou intense dominante (>= 25 % cumule), volume modere.
  if ((moderateShare + highIntensityShare) >= 25 && Math.abs(volumeDeltaPercent) < 15) {
    return {
      key: "specific",
      label: "Phase specifique",
      tone: "warning",
      summary: "Repartition orientee tempo / seuil / intense : phase de bloc qualitatif, surveille la fatigue.",
    };
  }

  // Base : volume en hausse ou maintenu, dominante facile, < 20 % intensite haute.
  if (volumeDeltaPercent >= -5 && easyShare >= 70 && highIntensityShare < 18) {
    return {
      key: "base",
      label: "Phase de base",
      tone: "positive",
      summary: "Dominante d'endurance fondamentale et volume stable a la hausse : tu construis ton socle aerobie.",
    };
  }

  // Sinon : phase mixte / non identifiee.
  return {
    key: "mixed",
    label: "Phase mixte",
    tone: "neutral",
    summary: "Pas de pattern majoritaire detecte sur les 28 derniers jours. Continue a varier ou clarifie ton intention.",
  };
}

// Construit le profil de phase courant.
//
// Inputs :
//   - loadModel        : sortie de buildTrainingLoadStateModel (chartData journaliere)
//   - intensityModel   : sortie de buildConsolidatedIntensityDistributionModel
//   - acwrEwmaProfile  : sortie de buildAcwrEwmaProfile (ratio recent)
//   - referenceDate    : date de reference (par defaut : derniere date de la timeline)
export function buildTrainingPhaseProfile({
  loadModel = {},
  intensityModel = {},
  acwrEwmaProfile = {},
  referenceDate = null,
} = {}) {
  const points = getTimelinePoints(loadModel);

  if (points.length < 28) {
    return {
      hasData: false,
      message: "Au moins 28 jours d'historique sont necessaires pour identifier une phase d'entrainement.",
    };
  }

  const lastDate = referenceDate
    ? new Date(referenceDate)
    : points[points.length - 1]?.date instanceof Date
      ? points[points.length - 1].date
      : new Date();
  const currentEnd = startOfDay(lastDate);
  const currentStart = addDays(currentEnd, -27);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -27);

  const currentLoad = sumLoadOverWindow(points, currentStart, currentEnd);
  const previousLoad = sumLoadOverWindow(points, previousStart, previousEnd);
  const volumeDeltaPercent = previousLoad > 0
    ? ((currentLoad - previousLoad) / previousLoad) * 100
    : 0;

  const highIntensityShare = getHighIntensityShare(intensityModel);
  const moderateShare = getModerateShare(intensityModel);
  const easyShare = getEasyShare(intensityModel);
  const acwrEwma = toFiniteNumber(acwrEwmaProfile?.ratio);

  const classification = classifyPhase({
    volumeDeltaPercent,
    highIntensityShare,
    moderateShare,
    easyShare,
    acwrEwma,
  });

  // Confiance : plus l'intensite ou le delta volume est franc, plus on est confiant.
  const intensityClarity = Math.min(1, Math.max(0, (Math.abs(volumeDeltaPercent) / 30)
    + (highIntensityShare / 50)
    + (Math.abs(easyShare - 70) / 70)) / 3);
  const confidenceScore = Math.round(40 + (intensityClarity * 50));

  return {
    hasData: true,
    phase: classification.key,
    label: classification.label,
    tone: classification.tone,
    summary: classification.summary,
    metrics: {
      currentLoad: roundValue(currentLoad, 1),
      previousLoad: roundValue(previousLoad, 1),
      volumeDeltaPercent: roundValue(volumeDeltaPercent, 1),
      easyShare: Math.round(easyShare),
      moderateShare: Math.round(moderateShare),
      highIntensityShare: Math.round(highIntensityShare),
      acwrEwma: roundValue(acwrEwma, 2),
    },
    confidence: {
      score: confidenceScore,
      label: confidenceScore >= 75 ? "Bonne" : confidenceScore >= 55 ? "Moyenne" : "A confirmer",
      tone: confidenceScore >= 75 ? "positive" : confidenceScore >= 55 ? "neutral" : "warning",
    },
  };
}
