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
  let ctlRefValues = [];
  let tsbRefValues = [];

  for (const point of chartData) {
    const d = point?.date instanceof Date ? startOfDay(point.date) : null;
    if (!d) continue;
    if (refRange && d >= refRange.startDate && d <= refRange.endDate) {
      chargeRef += Number(point?.load) || 0;
      const a = Number(point?.atl);
      if (Number.isFinite(a)) atlRefValues.push(a);
      const c = Number(point?.ctl);
      if (Number.isFinite(c)) ctlRefValues.push(c);
      const t = Number(point?.tsb);
      if (Number.isFinite(t)) tsbRefValues.push(t);
    }
  }
  const atlRef = atlRefValues.length
    ? atlRefValues.reduce((s, v) => s + v, 0) / atlRefValues.length
    : 0;
  const ctlRef = ctlRefValues.length
    ? ctlRefValues.reduce((s, v) => s + v, 0) / ctlRefValues.length
    : 0;
  const tsbRef = tsbRefValues.length
    ? tsbRefValues.reduce((s, v) => s + v, 0) / tsbRefValues.length
    : null;

  // Volume référence sur la fenêtre 4 semaines avant.
  // buildRegularitySummary expose `movingHours` (pas `hours`). On lit les deux
  // pour rester compatible avec d'éventuelles autres sources.
  let volumeRefHours = 0;
  for (const w of weeklySeries) {
    // Champ `date` ou `weekStart` selon la source
    const rawDate = w?.date ?? w?.weekStart;
    const d = rawDate instanceof Date
      ? startOfDay(rawDate)
      : (typeof rawDate === "string" || typeof rawDate === "number")
        ? startOfDay(new Date(rawDate))
        : null;
    if (!d || !refRange) continue;
    if (d >= refRange.startDate && d <= refRange.endDate) {
      volumeRefHours += Number(w?.movingHours ?? w?.hours) || 0;
    }
  }

  return {
    chargeRef,
    atlRef,
    ctlRef,
    tsbRef,
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
 * Agrège la dérive cardiaque sur la période, pondérée par durée.
 *
 * Source : champ `activity.cardiacDecouplingPercent` précalculé côté backend
 * (cardiacDecoupling.service.js) au moment du fetch détaillé Strava OU via
 * le script backfill scripts/maintenance/backfill-cardiac-decoupling.js.
 * Si la valeur est absente sur toutes les activités (activités jamais
 * détaillées), l'UI affichera un état vide pédagogique.
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

  // Dev logging discret pour diagnostic prod (uniquement mode dev)
  if (typeof window !== "undefined" && import.meta?.env?.DEV && activities.length > 0) {
    console.debug(
      `[analyticsFocus] decoupling: ${sampleSize}/${activities.length} activités avec cardiacDecouplingPercent`,
    );
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
 * Extrait le Garmin Activity Training Load (modèle Firstbeat 2014).
 * Successeur moderne de l'EPOC : l'API web Garmin n'expose plus l'EPOC brut.
 * Le Training Load est calculé à partir du même algorithme Firstbeat
 * (EPOC sous-jacent) mais exposé dans `summaryDTO.activityTrainingLoad`.
 *
 * Échelle indicative par séance (Firstbeat 2014, Garmin Connect docs) :
 *  - < 100         : faible
 *  - 100 - 200     : modéré
 *  - 200 - 350     : élevé
 *  - ≥ 350         : très élevé
 */
function extractTrainingLoadFromActivity(activity) {
  if (!activity) return null;
  const direct = Number(activity?.activityTrainingLoad);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fromEnrichment = Number(
    activity?.garminActivityEnrichment?.normalized?.activityTrainingLoad,
  );
  if (Number.isFinite(fromEnrichment) && fromEnrichment > 0) return fromEnrichment;
  if (Array.isArray(activity?.providerEnrichments)) {
    for (const enr of activity.providerEnrichments) {
      const v = Number(enr?.activityTrainingLoad ?? enr?.payload?.activityTrainingLoad);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

function classifyTrainingLoad(value) {
  if (!Number.isFinite(Number(value)) || value <= 0) {
    return { hasData: false, level: "—", tone: 3 };
  }
  if (value < 100)  return { hasData: true, level: "Léger",      tone: 1 };
  if (value < 200)  return { hasData: true, level: "Modéré",     tone: 2 };
  if (value < 350)  return { hasData: true, level: "Élevé",      tone: 4 };
  return                  { hasData: true, level: "Très élevé", tone: 5 };
}

/**
 * Extrait le temps de récupération Garmin (secondes) — champ natif Garmin
 * dérivé de l'EPOC. Décision utilisateur §3.
 *
 * Sources, par ordre de priorité :
 *  1. activity.recoveryTimeSeconds (rare, champ direct explicite)
 *  2. activity.garminActivityEnrichment.normalized.recoveryTime
 *     ← chemin canonique, normalisé en HEURES par le serializer backend
 *       getGarminRecoveryTimeHours (qui convertit tous les formats Garmin).
 *  3. activity.recoveryTime (legacy direct, heuristique heures<200 / secondes>=200)
 *  4. providerEnrichments[].recoveryTime (legacy fallback)
 *
 * On retourne TOUJOURS en SECONDES pour cohérence avec formatRecoveryTime.
 */
function extractRecoveryTimeFromActivity(activity) {
  if (!activity) return null;

  // 1. Secondes explicites
  const sec = Number(activity?.recoveryTimeSeconds);
  if (Number.isFinite(sec) && sec > 0) return sec;

  // 2. Chemin canonique enrichment (heures) → secondes
  const fromEnrichmentHours = Number(activity?.garminActivityEnrichment?.normalized?.recoveryTime);
  if (Number.isFinite(fromEnrichmentHours) && fromEnrichmentHours > 0) {
    return fromEnrichmentHours * 3600;
  }

  // 3. Champ direct activity.recoveryTime — heuristique :
  //    < 200 = heures (typique Garmin 0–96h) → * 3600
  //    ≥ 200 = secondes (legacy tests/fallback)
  const direct = Number(activity?.recoveryTime);
  if (Number.isFinite(direct) && direct > 0) {
    return direct < 200 ? direct * 3600 : direct;
  }

  // 4. Legacy fallback providerEnrichments[]
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
  let weightedSumLoad = 0;
  let weightedSumEpoc = 0;
  let weightedSumRecovery = 0;
  let weightTotal = 0;
  let weightTotalEpoc = 0;
  let sampleSize = 0;
  let recoverySampleCount = 0;
  let epocSampleCount = 0;

  for (const a of activities) {
    const trainingLoad = extractTrainingLoadFromActivity(a);
    const epoc = extractEpocFromActivity(a);
    const recoveryTime = extractRecoveryTimeFromActivity(a);
    const duration = toFiniteNumber(a?.movingTime);
    if (duration <= 0) continue;

    // Le Training Load Firstbeat est désormais la source primaire (l'EPOC
    // brut n'est plus exposé par l'API Garmin web). On agrège dessus si
    // disponible, et on garde l'EPOC comme info secondaire si présent.
    const cls = classifyTrainingLoad(trainingLoad);
    if (!cls.hasData) continue;

    weightedSumLoad += trainingLoad * duration;
    weightTotal += duration;
    sampleSize += 1;

    if (Number.isFinite(epoc) && epoc > 0) {
      weightedSumEpoc += epoc * duration;
      weightTotalEpoc += duration;
      epocSampleCount += 1;
    }

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

  // Dev logging discret pour diagnostic prod
  if (typeof window !== "undefined" && import.meta?.env?.DEV && activities.length > 0) {
    console.debug(
      `[analyticsFocus] trainingLoad: ${sampleSize}/${activities.length} activités, ` +
      `EPOC brut sur ${epocSampleCount}, recoveryTime sur ${recoverySampleCount}`,
    );
  }

  if (sampleSize === 0 || weightTotal === 0) {
    return {
      hasData: false,
      averageTrainingLoad: null,
      averageRecoverySeconds: null,
      averageRecoveryLabel: null,
      averageMlKg: null,
      distribution: [],
      sampleSize: 0,
      tone: 3,
      label: "Donnée Garmin non disponible",
    };
  }

  const averageTrainingLoad = Math.round(weightedSumLoad / weightTotal);
  const averageMlKg = epocSampleCount > 0 && weightTotalEpoc > 0
    ? Math.round(weightedSumEpoc / weightTotalEpoc)
    : null;
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
    averageTrainingLoad,
    averageRecoverySeconds,
    averageRecoveryLabel,
    averageMlKg,
    distribution,
    sampleSize,
    tone: majority?.tone ?? 3,
    label: classifyTrainingLoad(averageTrainingLoad).level || "—",
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
