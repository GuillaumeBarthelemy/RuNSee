/**
 * activityEnrichment.js
 *
 * Helpers de mapping pour les métriques Garmin par activité (Phase K — Option B).
 *
 * Source : bridge Python `fetch_activities` qui retourne les champs natifs
 * Garmin. On les transforme ici en structure stable, vulgarisée pour l'UI.
 */

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Niveau de Training Effect (0-5) → label vulgarisé.
 * Référence : Firstbeat Training Effect (Saalasti et al. 2007).
 *
 * Échelle Garmin :
 *  0.0 - 0.9 : Aucun effet
 *  1.0 - 1.9 : Effet mineur (récupération active)
 *  2.0 - 2.9 : Maintien
 *  3.0 - 3.9 : Amélioration
 *  4.0 - 4.9 : Forte amélioration
 *  5.0       : Surcharge
 */
export function classifyTrainingEffect(value) {
  const v = toNumber(value);
  if (v == null || v <= 0) return null;
  if (v < 1) return { label: "Aucun effet", tone: 3 };
  if (v < 2) return { label: "Récupération active", tone: 2 };
  if (v < 3) return { label: "Maintien", tone: 3 };
  if (v < 4) return { label: "Amélioration", tone: 1 };
  if (v < 5) return { label: "Forte amélioration", tone: 1 };
  return { label: "Surcharge", tone: 5 };
}

/**
 * Performance Condition Garmin (-20 à +20).
 * Indique comment l'athlète performe ce jour-là vs sa baseline.
 * Mesuré par Firstbeat dans les 6-20 premières minutes de séance.
 */
export function classifyPerformanceCondition(value) {
  const v = toNumber(value);
  if (v == null) return null;
  if (v <= -10) return { label: "Forme dégradée", tone: 5, valueLabel: `${v}` };
  if (v <= -3) return { label: "Forme limitée", tone: 4, valueLabel: `${v}` };
  if (v <= 3) return { label: "Forme normale", tone: 3, valueLabel: v >= 0 ? `+${v}` : `${v}` };
  if (v <= 10) return { label: "Bonne forme", tone: 2, valueLabel: `+${v}` };
  return { label: "Très bonne forme", tone: 1, valueLabel: `+${v}` };
}

/**
 * Recovery Time Garmin (heures).
 * Heures recommandées avant la prochaine séance intense.
 */
export function formatRecoveryTime(hours) {
  const h = toNumber(hours);
  if (h == null || h <= 0) return null;
  if (h < 24) return `${Math.round(h)} h`;
  const days = Math.round((h / 24) * 10) / 10;
  return `${days} j`;
}

/**
 * Mappe une activité Garmin brute (sortie du bridge Python) vers une structure
 * stable et vulgarisée prête à passer à GarminEnrichmentPanel.
 *
 * @param {Object} rawGarminActivity — sortie de fetch_activities
 * @returns {Object|null} structure normalisée ou null si pas exploitable
 */
export function buildActivityEnrichmentModel(rawGarminActivity) {
  if (!rawGarminActivity || typeof rawGarminActivity !== "object") return null;

  const aerobicTE = toNumber(rawGarminActivity.aerobicTrainingEffect);
  const anaerobicTE = toNumber(rawGarminActivity.anaerobicTrainingEffect);
  const vo2max = toNumber(rawGarminActivity.vO2MaxValue);
  const performanceCondition = toNumber(rawGarminActivity.performanceCondition);
  const recoveryHr = toNumber(rawGarminActivity.recoveryHeartRate);
  const recoveryTime = toNumber(rawGarminActivity.recoveryTime);
  const epoc = toNumber(rawGarminActivity.epoc);

  const hasAnyMetric = [aerobicTE, anaerobicTE, vo2max, performanceCondition, recoveryHr, recoveryTime, epoc]
    .some((v) => v != null);

  if (!hasAnyMetric) return null;

  return {
    activityId: rawGarminActivity.activityId,
    aerobicTrainingEffect: {
      value: aerobicTE,
      classification: classifyTrainingEffect(aerobicTE),
      message: rawGarminActivity.aerobicTrainingEffectMessage || null,
    },
    anaerobicTrainingEffect: {
      value: anaerobicTE,
      classification: classifyTrainingEffect(anaerobicTE),
      message: rawGarminActivity.anaerobicTrainingEffectMessage || null,
    },
    vo2max,
    performanceCondition: {
      value: performanceCondition,
      classification: classifyPerformanceCondition(performanceCondition),
    },
    recoveryHeartRate: recoveryHr,
    recoveryTime,
    epoc,
  };
}

/**
 * Matche une activité Strava avec une activité Garmin par timestamp.
 * Tolérance : ± `windowMinutes` (défaut 10) autour du startTime Strava.
 *
 * @param {string} stravaStartIso — startDateLocal Strava (ISO 8601)
 * @param {Array} garminActivities — liste raw de fetch_activities
 * @param {number} windowMinutes — fenêtre de tolérance
 * @returns {Object|null} activité Garmin matchée ou null
 */
export function matchActivityByTimestamp(stravaStartIso, garminActivities = [], windowMinutes = 10) {
  if (!stravaStartIso || !Array.isArray(garminActivities)) return null;
  const stravaTime = new Date(stravaStartIso).getTime();
  if (Number.isNaN(stravaTime)) return null;

  const windowMs = windowMinutes * 60 * 1000;
  let bestMatch = null;
  let bestDelta = Infinity;

  for (const activity of garminActivities) {
    const startTime = activity?.startTimeLocal || activity?.startTimeGMT;
    if (!startTime) continue;
    const garminTime = new Date(startTime).getTime();
    if (Number.isNaN(garminTime)) continue;

    const delta = Math.abs(garminTime - stravaTime);
    if (delta <= windowMs && delta < bestDelta) {
      bestMatch = activity;
      bestDelta = delta;
    }
  }

  return bestMatch;
}
