/**
 * analyticsFocus.js (rev. Lot 04 v2)
 *
 * Cf. mockup PDF page 7 — comparaisons "vs 28 avr. - 4 mai" = la semaine
 * référence située **4 semaines avant** la semaine courante.
 *
 * Agrégats période pour la section "FOCUS PERFORMANCE & EFFICIENCE" de
 * l'onglet Vue d'ensemble de la page Analyse (PDF page 7).
 *
 * 3 indicateurs :
 *   - Allure ajustée (GAP, Minetti 2002) — déjà fourni par efficiencyModel.summary
 *   - Dérive cardiaque (Pa:Hr decoupling, Allen & Coggan 2010)
 *   - Dette d'oxygène (EPOC, Børsheim & Bahr 2003)
 *
 * Refs scientifiques :
 *   - Minetti AE et al. (2002), "Energy cost of walking and running at extreme
 *     uphill and downhill slopes", J Appl Physiol 93(3):1039-1046.
 *   - Allen H, Coggan AR (2010), Training and Racing with a Power Meter (2nd ed),
 *     VeloPress — chapter on Aerobic Decoupling.
 *   - Børsheim E, Bahr R (2003), "Effect of exercise intensity, duration and
 *     mode on post-exercise oxygen consumption", Sports Med 33(14):1037-1060.
 *
 * Règles V5 :
 *  - Aucun signal n'est inventé. Si la donnée est indisponible (ex. EPOC sans
 *    enrichissement Garmin, decoupling sans splits chargés), on retourne
 *    `{ hasData: false }` et l'UI affiche un état vide propre.
 *  - Pondération EPOC par DURÉE d'activité (décision utilisateur) : une longue
 *    sortie EPOC élevé compte plus qu'une courte sortie EPOC faible.
 */

import { classifyEpoc } from "./epocLevel.js";

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Comparaison "4 semaines précédentes" (décision utilisateur)
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Renvoie la fenêtre référence = la semaine située 4 semaines (28 jours)
 * avant la fenêtre courante. Mockup attend : "vs 28 avr. - 4 mai".
 *
 * @param {Date} currentStart - début de la fenêtre courante (lundi)
 * @param {number} windowDays - largeur de la fenêtre (default 7)
 */
export function buildFourWeeksBackRange(currentStart, windowDays = 7) {
  if (!(currentStart instanceof Date) || Number.isNaN(currentStart.getTime())) return null;
  const refEnd = new Date(currentStart.getTime() - 28 * MS_PER_DAY + (windowDays - 1) * MS_PER_DAY);
  const refStart = new Date(currentStart.getTime() - 28 * MS_PER_DAY);
  return {
    startDate: startOfDay(refStart),
    endDate: startOfDay(refEnd),
  };
}

/**
 * Formate "28 avr. - 4 mai" en français court.
 */
export function formatComparisonRange(range) {
  if (!range || !range.startDate || !range.endDate) return "";
  const opts = { day: "numeric", month: "short" };
  const s = range.startDate.toLocaleDateString("fr-FR", opts).replace(".", "");
  const e = range.endDate.toLocaleDateString("fr-FR", opts).replace(".", "");
  return `${s} - ${e}`;
}

/**
 * Calcule pour Charge / Fatigue / Volume la somme sur la fenêtre référence
 * 4 semaines avant et renvoie le delta vs valeur courante + label dates.
 *
 * @param {Object} input
 * @param {Array} input.chartData      - trainingLoadModel.chartData (daily)
 * @param {Array} input.weeklySeries   - weeklySummary.weeklySeries
 * @param {Date}  input.currentEnd     - fin période courante
 * @returns {{
 *   chargeRef: number, chargeDelta: number, chargeDeltaPct: number,
 *   atlRef: number, atlDelta: number, atlDeltaPct: number,
 *   volumeRefHours: number, volumeDeltaHours: number, volumeDeltaPct: number,
 *   rangeLabel: string,
 * }}
 */
export function buildFourWeeksBackComparison({ chartData = [], weeklySeries = [], currentEnd = new Date() } = {}) {
  const end = startOfDay(currentEnd);
  const currentStart = new Date(end.getTime() - 6 * MS_PER_DAY);
  const refRange = buildFourWeeksBackRange(currentStart, 7);
  const rangeLabel = refRange ? formatComparisonRange(refRange) : "";

  // Calculs sur la fenêtre référence
  let chargeRef = 0;
  let atlRefValues = [];

  for (const point of chartData) {
    const d = point?.date instanceof Date ? startOfDay(point.date) : null;
    if (!d) continue;
    if (refRange && d >= refRange.startDate && d <= refRange.endDate) {
      chargeRef += Number(point?.load) || 0;
      const a = Number(point?.atl);
      if (Number.isFinite(a)) atlRefValues.push(a);
    }
  }
  const atlRef = atlRefValues.length
    ? atlRefValues.reduce((s, v) => s + v, 0) / atlRefValues.length
    : 0;

  // Volume référence sur la fenêtre 4 semaines avant
  let volumeRefHours = 0;
  for (const w of weeklySeries) {
    const d = w?.date instanceof Date ? startOfDay(w.date) : null;
    if (!d || !refRange) continue;
    if (d >= refRange.startDate && d <= refRange.endDate) {
      volumeRefHours += Number(w?.hours) || 0;
    }
  }

  return {
    chargeRef,
    atlRef,
    volumeRefHours,
    rangeLabel,
  };
}

/**
 * Format delta absolu + label "vs XX-YY" pour les indicateurs.
 *
 * @param {number} current
 * @param {number} reference
 * @param {string} rangeLabel - ex "28 avr - 4 mai"
 * @param {Object} opts
 * @param {boolean} opts.usePercent - affiche en % au lieu de absolu
 * @param {string} opts.unit        - unité absolue (ex "UA")
 * @param {Function} opts.formatAbs - formateur custom valeur absolue
 */
export function formatFourWeekDelta(current, reference, rangeLabel, opts = {}) {
  const c = Number(current);
  const r = Number(reference);
  if (!Number.isFinite(c) || !Number.isFinite(r) || r === 0) return "";
  const diff = c - r;
  const pct = (diff / Math.abs(r)) * 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
  let value;
  if (opts.usePercent) {
    value = `${sign}${Math.abs(Math.round(pct))} %`;
  } else if (typeof opts.formatAbs === "function") {
    value = `${sign}${opts.formatAbs(Math.abs(diff))}`;
  } else {
    value = `${sign}${Math.round(Math.abs(diff))}${opts.unit ? ` ${opts.unit}` : ""}`;
  }
  return rangeLabel ? `${value} vs ${rangeLabel}` : value;
}

// ---------------------------------------------------------------------------
// 1. Allure ajustée (Minetti 2002)
// ---------------------------------------------------------------------------

/**
 * Wrapper pour la section Focus. Consomme directement `efficiencyModel.summary`.
 * Aucun recalcul — délègue au modèle existant trainingMetrics.buildEfficiencyHistoryModel.
 *
 * @param {Object} efficiencyModel
 * @returns {{
 *   hasData: boolean,
 *   deltaPercent: number|null,    // ex: +7.2 (en %)
 *   currentValue: number|null,    // valeur EF actuelle (vitesse/FC)
 *   previousValue: number|null,
 *   activityCount: number,
 *   tone: 1|2|3|4|5,
 *   label: string,
 * }}
 */
export function buildPeriodPaceAdjustedSummary(efficiencyModel = {}) {
  const summary = efficiencyModel?.summary;
  if (!summary || !Number.isFinite(summary.deltaPercent)) {
    return {
      hasData: false,
      deltaPercent: null,
      currentValue: null,
      previousValue: null,
      activityCount: 0,
      tone: 3,
      label: "Données insuffisantes",
    };
  }

  const dp = Number(summary.deltaPercent);
  let tone = 3;
  let label = "Stable";
  if (dp >= 5) { tone = 1; label = "En nette amélioration"; }
  else if (dp >= 2) { tone = 2; label = "En amélioration"; }
  else if (dp >= -2) { tone = 3; label = "Stable"; }
  else if (dp >= -5) { tone = 4; label = "Léger recul"; }
  else { tone = 5; label = "Recul marqué"; }

  return {
    hasData: true,
    deltaPercent: Math.round(dp * 10) / 10,
    currentValue: summary.value ?? null,
    previousValue: summary.previousValue ?? null,
    activityCount: summary.activityCount || 0,
    tone,
    label,
  };
}

// ---------------------------------------------------------------------------
// 2. Dérive cardiaque (Allen & Coggan 2010)
// ---------------------------------------------------------------------------

/**
 * Agrège la dérive cardiaque sur la période. Cherche un champ
 * `cardiacDecouplingPercent` ou `decouplingPercent` éventuellement précalculé
 * sur l'activité. À ce stade, ces champs ne sont PAS stockés en base donc
 * `hasData: false` quasi systématiquement — l'UI affichera un état vide
 * pédagogique avec lien vers la fiche détail.
 *
 * @returns {{
 *   hasData: boolean,
 *   averagePercent: number|null,  // % moyen pondéré par durée
 *   sampleSize: number,           // nb activités avec donnée exploitable
 *   tone: 1|2|3|4|5,
 *   label: string,
 * }}
 */
export function buildPeriodDecouplingSummary(activities = []) {
  let weightedSum = 0;
  let weightTotal = 0;
  let sampleSize = 0;

  for (const a of activities) {
    const decoupling = Number(a?.cardiacDecouplingPercent ?? a?.decouplingPercent);
    const duration = toFiniteNumber(a?.movingTime);
    if (!Number.isFinite(decoupling) || duration <= 0) continue;
    weightedSum += decoupling * duration;
    weightTotal += duration;
    sampleSize += 1;
  }

  if (sampleSize === 0 || weightTotal === 0) {
    return {
      hasData: false,
      averagePercent: null,
      sampleSize: 0,
      tone: 3,
      label: "Donnée disponible par activité",
    };
  }

  const avg = weightedSum / weightTotal;
  const rounded = Math.round(avg * 10) / 10;

  // Classification (Allen & Coggan : seuil 5 % pour foncier stable)
  let tone = 3;
  let label = "Stable";
  if (rounded < 2)      { tone = 1; label = "Très bonne endurance"; }
  else if (rounded < 5) { tone = 2; label = "Endurance correcte"; }
  else if (rounded < 8) { tone = 4; label = "Dérive marquée"; }
  else                  { tone = 5; label = "Dérive élevée"; }

  return {
    hasData: true,
    averagePercent: rounded,
    sampleSize,
    tone,
    label,
  };
}

// ---------------------------------------------------------------------------
// 3. EPOC (Børsheim & Bahr 2003) — distribution par niveau, pondérée durée
// ---------------------------------------------------------------------------

/**
 * Extrait la valeur EPOC (mlO₂/kg) depuis une activité Strava enrichie Garmin.
 *
 * Sources cherchées dans l'ordre :
 *  1. Champ direct `activity.epoc` ou `activity.epocMlKg` (rare)
 *  2. `activity.garminActivityEnrichment.normalized.epoc` (chemin API liste &
 *     fiche détail depuis le serializer backend `buildPublicGarminActivityEnrichment`)
 *  3. `activity.providerEnrichments[].epoc` (legacy, conservé en fallback)
 */
function extractEpocFromActivity(activity) {
  if (!activity) return null;
  if (Number.isFinite(Number(activity?.epoc))) return Number(activity.epoc);
  if (Number.isFinite(Number(activity?.epocMlKg))) return Number(activity.epocMlKg);
  // Chemin canonique API : garminActivityEnrichment.normalized.epoc
  const fromEnrichment = Number(activity?.garminActivityEnrichment?.normalized?.epoc);
  if (Number.isFinite(fromEnrichment) && fromEnrichment > 0) return fromEnrichment;
  // Legacy fallback
  if (Array.isArray(activity?.providerEnrichments)) {
    for (const enr of activity.providerEnrichments) {
      const v = Number(enr?.epoc ?? enr?.payload?.epoc);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

/**
 * Extrait le temps de récupération Garmin (secondes) — champ natif Garmin
 * dérivé de l'EPOC. Décision utilisateur §3 : afficher ce champ au lieu de
 * recalculer une heuristique.
 *
 * Note : Garmin expose recoveryTime tantôt en heures, tantôt en secondes.
 * Le serializer backend normalise en HEURES (cf. garminActivityEnrichment.service
 * `getGarminRecoveryTimeHours`). On convertit en secondes pour la cohérence
 * de l'affichage.
 */
function extractRecoveryTimeFromActivity(activity) {
  if (!activity) return null;

  // Champ direct activity.recoveryTimeSeconds (rare)
  if (Number.isFinite(Number(activity?.recoveryTimeSeconds))) {
    return Number(activity.recoveryTimeSeconds);
  }

  // Champ direct activity.recoveryTime (interprété en heures par défaut Garmin)
  if (Number.isFinite(Number(activity?.recoveryTime))) {
    const v = Number(activity.recoveryTime);
    return v > 0 && v < 200 ? v * 3600 : v; // si valeur petite (< 200), probablement heures
  }

  // Chemin canonique API : garminActivityEnrichment.normalized.recoveryTime (en heures)
  const fromEnrichment = Number(activity?.garminActivityEnrichment?.normalized?.recoveryTime);
  if (Number.isFinite(fromEnrichment) && fromEnrichment > 0) {
    return fromEnrichment < 200 ? fromEnrichment * 3600 : fromEnrichment;
  }

  // Legacy fallback
  if (Array.isArray(activity?.providerEnrichments)) {
    for (const enr of activity.providerEnrichments) {
      const v = Number(enr?.recoveryTime ?? enr?.payload?.recoveryTime);
      if (Number.isFinite(v) && v > 0) return v < 200 ? v * 3600 : v;
    }
  }
  return null;
}

/**
 * Formate un nombre de secondes Garmin recoveryTime en label court.
 * "28 min" si < 1h, "2h 30" si < 24h, sinon "Xj YYh".
 */
export function formatRecoveryTime(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return null;
  const s = Number(seconds);
  if (s < 3600) {
    return `${Math.round(s / 60)} min`;
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s - h * 3600) / 60);
    if (m === 0) return `${h} h`;
    return `${h}h ${String(m).padStart(2, "0")}`;
  }
  const days = Math.floor(s / 86400);
  const h = Math.round((s - days * 86400) / 3600);
  return `${days} j ${h} h`;
}

/**
 * Agrège la distribution EPOC sur la période + temps de récupération moyen.
 *
 * Décision utilisateur §3 : valeur centrale du donut = **temps de récupération
 * Garmin moyen** (champ recoveryTime, pas EPOC brut mlO₂/kg).
 * Classification niveaux : reste basée sur EPOC mlO₂/kg (Børsheim & Bahr 2003).
 *
 * Légende : comptes absolus (14, 9, 4, 1) + % entre parenthèses (décision §10).
 *
 * Tous les agrégats sont pondérés par durée d'activité.
 *
 * @returns {{
 *   hasData: boolean,
 *   averageRecoverySeconds: number|null,   // valeur centrale donut (sec.)
 *   averageRecoveryLabel: string|null,     // ex "28h 30"
 *   averageMlKg: number|null,              // EPOC moyen mlO₂/kg (info secondaire)
 *   distribution: Array<{
 *     level, tone, count, totalDurationSeconds, pct
 *   }>,
 *   sampleSize, tone, label,
 * }}
 */
export function buildPeriodEpocSummary(activities = []) {
  const buckets = new Map();
  let weightedSumEpoc = 0;
  let weightedSumRecovery = 0;
  let weightTotal = 0;
  let sampleSize = 0;
  let recoverySampleCount = 0;

  for (const a of activities) {
    const epoc = extractEpocFromActivity(a);
    const recoveryTime = extractRecoveryTimeFromActivity(a);
    const duration = toFiniteNumber(a?.movingTime);
    if (epoc == null || duration <= 0) continue;
    const cls = classifyEpoc(epoc);
    if (!cls.hasData) continue;

    weightedSumEpoc += epoc * duration;
    weightTotal += duration;
    sampleSize += 1;

    if (Number.isFinite(recoveryTime) && recoveryTime > 0) {
      weightedSumRecovery += recoveryTime * duration;
      recoverySampleCount += 1;
    }

    if (!buckets.has(cls.level)) {
      buckets.set(cls.level, { level: cls.level, tone: cls.tone, count: 0, totalDurationSeconds: 0 });
    }
    const b = buckets.get(cls.level);
    b.count += 1;
    b.totalDurationSeconds += duration;
  }

  if (sampleSize === 0 || weightTotal === 0) {
    return {
      hasData: false,
      averageRecoverySeconds: null,
      averageRecoveryLabel: null,
      averageMlKg: null,
      distribution: [],
      sampleSize: 0,
      tone: 3,
      label: "Donnée Garmin non disponible",
    };
  }

  const averageMlKg = Math.round(weightedSumEpoc / weightTotal);
  const averageRecoverySeconds = recoverySampleCount > 0
    ? Math.round(weightedSumRecovery / weightTotal)
    : null;
  const averageRecoveryLabel = formatRecoveryTime(averageRecoverySeconds);

  const order = ["Léger", "Modéré", "Élevé", "Très élevé"];
  const distribution = order
    .filter((lvl) => buckets.has(lvl))
    .map((lvl) => {
      const b = buckets.get(lvl);
      return {
        level: b.level,
        tone: b.tone,
        count: b.count,
        totalDurationSeconds: b.totalDurationSeconds,
        pct: Math.round((b.totalDurationSeconds / weightTotal) * 100),
      };
    });

  const majority = [...distribution].sort((x, y) => y.totalDurationSeconds - x.totalDurationSeconds)[0];

  return {
    hasData: true,
    averageRecoverySeconds,
    averageRecoveryLabel,
    averageMlKg,
    distribution,
    sampleSize,
    tone: majority?.tone ?? 3,
    label: classifyEpoc(averageMlKg).level || "—",
  };
}

// ---------------------------------------------------------------------------
// 4. "À retenir" — 3 puces narratives (right rail)
// ---------------------------------------------------------------------------

/**
 * Génère 3 puces narratives synthétiques :
 *   - Charge
 *   - Fatigue
 *   - Volume
 *
 * Règles validées :
 *   - Charge : tone load7d (très bon/bon/neutre/vigilance/alerte)
 *   - Fatigue : >60 alerte, >35 vigilance, sinon ok
 *   - Volume : tone selon delta vs semaine précédente
 *
 * @returns Array<{ key, tone, title, text }>
 */
export function buildOverviewTakeaways({
  charge7d = 0,
  chargeDelta = null,
  fatigueValue = 0,
  fatigueDelta = null,
  volumeHours = 0,
  volumeHoursDelta = 0,
} = {}) {
  // volumeHours influe sur le label "stable" lorsque le delta est négligeable.
  const volumeHasContent = Number.isFinite(volumeHours) && volumeHours > 0;
  const bullets = [];

  // Charge
  let chargeTone = 3;
  let chargeTitle = "Charge à construire";
  let chargeText = "Continue d'accumuler progressivement pour bâtir ta base aérobie.";
  if (charge7d >= 600) {
    chargeTone = 5;
    chargeTitle = "Charge très élevée";
    chargeText = "Surveille la fatigue cumulée et la qualité du sommeil cette semaine.";
  } else if (charge7d >= 400) {
    chargeTone = 4;
    chargeTitle = "Charge dense";
    chargeText = "Le volume est conséquent — pense à intercaler des journées plus calmes.";
  } else if (charge7d >= 200) {
    chargeTone = 2;
    chargeTitle = "Charge maîtrisée";
    chargeText = "Ta charge progresse de manière régulière, sans pic brutal.";
  }
  bullets.push({
    key: "charge",
    tone: chargeTone,
    title: chargeTitle,
    text: chargeText + (Number.isFinite(chargeDelta) && chargeDelta !== 0
      ? ` (${chargeDelta > 0 ? "+" : ""}${Math.round(chargeDelta)} vs semaine passée)`
      : ""),
  });

  // Fatigue
  let fatigueTone = 2;
  let fatigueTitle = "Fatigue basse";
  let fatigueText = "Marge de progression, tu peux solliciter ton organisme.";
  if (fatigueValue >= 60) {
    fatigueTone = 4;
    fatigueTitle = "Fatigue élevée";
    fatigueText = "Surveille la qualité du sommeil et privilégie des sorties souples.";
  } else if (fatigueValue >= 35) {
    fatigueTone = 3;
    fatigueTitle = "Fatigue modérée";
    fatigueText = "Niveau attendu pour une charge active, à équilibrer avec récupération.";
  }
  bullets.push({
    key: "fatigue",
    tone: fatigueTone,
    title: fatigueTitle,
    text: fatigueText + (Number.isFinite(fatigueDelta) && fatigueDelta !== 0
      ? ` (${fatigueDelta > 0 ? "+" : ""}${Math.round(fatigueDelta)} vs hier)`
      : ""),
  });

  // Volume
  let volumeTone = 3;
  let volumeTitle = volumeHasContent ? "Volume stable" : "Volume à construire";
  let volumeText = volumeHasContent
    ? "Volume conservé d'une semaine à l'autre."
    : "Aucune sortie significative sur la dernière semaine.";
  if (volumeHoursDelta > 0.25) {
    volumeTone = 1;
    volumeTitle = "Volume en hausse";
    const deltaTxt = volumeHoursDelta > 1
      ? `+${Math.round(volumeHoursDelta)}h sur les 7 derniers jours`
      : `+${Math.round(volumeHoursDelta * 60)} min sur les 7 derniers jours`;
    volumeText = `Progression franche du temps d'entraînement (${deltaTxt}).`;
  } else if (volumeHoursDelta < -0.25) {
    volumeTone = 4;
    volumeTitle = "Volume en baisse";
    volumeText = "Semaine plus calme — assure-toi que c'est voulu (récupération, fatigue, agenda).";
  }
  bullets.push({
    key: "volume",
    tone: volumeTone,
    title: volumeTitle,
    text: volumeText,
  });

  return bullets;
}
