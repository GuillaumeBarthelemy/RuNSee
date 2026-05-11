/**
 * analyticsFocus.js
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
 * Extrait la valeur EPOC depuis une activité Strava enrichie Garmin.
 * Cherche dans providerEnrichments le bloc Garmin et son champ epoc.
 */
function extractEpocFromActivity(activity) {
  if (!activity) return null;
  // Champ direct si déjà mappé
  if (Number.isFinite(Number(activity?.epoc))) return Number(activity.epoc);
  if (Number.isFinite(Number(activity?.epocMlKg))) return Number(activity.epocMlKg);
  // Provider enrichments
  if (Array.isArray(activity?.providerEnrichments)) {
    for (const enr of activity.providerEnrichments) {
      const v = Number(enr?.epoc ?? enr?.payload?.epoc);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

/**
 * Agrège la distribution EPOC sur la période. Pondère par durée d'activité.
 *
 * @returns {{
 *   hasData: boolean,
 *   averageMlKg: number|null,    // moyenne pondérée durée — valeur centrale donut
 *   distribution: Array<{        // tranches du donut
 *     level: "Léger"|"Modéré"|"Élevé"|"Très élevé",
 *     tone: 1|2|3|4|5,
 *     count: number,             // nb activités du niveau
 *     totalDurationSeconds: number,
 *     pct: number,               // % du niveau dans la période (pondéré durée)
 *   }>,
 *   sampleSize: number,
 *   tone: 1|2|3|4|5,             // tone global = tone du niveau majoritaire
 *   label: string,
 * }}
 */
export function buildPeriodEpocSummary(activities = []) {
  const buckets = new Map(); // level → { count, totalDuration, tone }
  let weightedSum = 0;
  let weightTotal = 0;
  let sampleSize = 0;

  for (const a of activities) {
    const epoc = extractEpocFromActivity(a);
    const duration = toFiniteNumber(a?.movingTime);
    if (epoc == null || duration <= 0) continue;
    const cls = classifyEpoc(epoc);
    if (!cls.hasData) continue;

    weightedSum += epoc * duration;
    weightTotal += duration;
    sampleSize += 1;

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
      averageMlKg: null,
      distribution: [],
      sampleSize: 0,
      tone: 3,
      label: "Donnée Garmin non disponible",
    };
  }

  const averageMlKg = Math.round(weightedSum / weightTotal);
  // Ordre canonique des niveaux
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

  // Tone global = celui du niveau de majorité (par durée)
  const majority = [...distribution].sort((x, y) => y.totalDurationSeconds - x.totalDurationSeconds)[0];

  return {
    hasData: true,
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
