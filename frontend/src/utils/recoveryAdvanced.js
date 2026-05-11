/**
 * recoveryAdvanced.js
 *
 * Indicateurs avancés de récupération basés sur la VFC.
 *
 * Refs scientifiques principales :
 *   - Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M (2013).
 *     "Training adaptation and heart rate variability in elite endurance
 *     athletes: opening the door to effective monitoring",
 *     Sports Med 43(9):773–781.
 *   - Plews DJ, Laursen PB, Kilding AE, Buchheit M (2014).
 *     "Heart-rate variability and training-intensity distribution in
 *     elite rowers", Int J Sports Physiol Perform 9(6):1026–1032.
 *   - Buchheit M (2014).
 *     "Monitoring training status with HR measures: do all roads lead
 *     to Rome?", Front Physiol 5:73.
 *
 * Règle V5 : aucun signal n'est inventé. Si la série VFC est trop courte
 * ou bruitée, on retourne `null` plutôt qu'une valeur fictive.
 */

const MIN_SERIES_LENGTH = 5; // < 5 valeurs valides → résultat non fiable

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function takeLastValid(series, n) {
  if (!Array.isArray(series)) return [];
  const sliced = series.slice(-n);
  return sliced.map(toFiniteNumber).filter((v) => v != null);
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function standardDeviation(arr, mu) {
  if (arr.length < 2) return null;
  const variance = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Coefficient de variation de la VFC (CV-HRV) sur fenêtre N jours.
 *
 * CV (%) = (SD HRV / mean HRV) × 100
 *
 * Interprétation (Plews & Laursen 2014, Buchheit 2014) :
 *   - CV faible (< 6 %)         : stable, bonne adaptation parasympathique
 *   - CV modéré (6–10 %)        : normal pour amateur entraîné
 *   - CV élevé (> 10 %)         : instabilité, stress accumulé, à surveiller
 *   - CV très élevé (> 15 %)    : signal d'alerte (overreaching/maladie)
 *
 * @param {Array<number>} hrvSeries - série quotidienne VFC (rMSSD en ms typiquement)
 * @param {number} windowDays       - fenêtre d'analyse (défaut 7)
 * @returns {{
 *   cv: number|null,        // CV en %, arrondi 0.1
 *   mean: number|null,      // VFC moyenne ms
 *   sd: number|null,        // écart-type ms
 *   nValid: number,         // nb valeurs valides utilisées
 *   tone: 1|2|3|4|5,
 *   label: string,
 * }}
 */
export function computeHrvCv(hrvSeries = [], windowDays = 7) {
  const valid = takeLastValid(hrvSeries, windowDays);

  if (valid.length < MIN_SERIES_LENGTH) {
    return {
      cv: null,
      mean: null,
      sd: null,
      nValid: valid.length,
      tone: 3,
      label: "Données insuffisantes",
    };
  }

  const mu = mean(valid);
  const sd = standardDeviation(valid, mu);
  if (mu == null || sd == null || mu === 0) {
    return {
      cv: null,
      mean: null,
      sd: null,
      nValid: valid.length,
      tone: 3,
      label: "Données insuffisantes",
    };
  }

  const cv = (sd / mu) * 100;
  const cvRounded = Math.round(cv * 10) / 10;

  // Classification Plews / Buchheit
  let tone = 3;
  let label = "Normal";
  if (cvRounded < 6) {
    tone = 1;
    label = "Stable";
  } else if (cvRounded < 10) {
    tone = 2;
    label = "Modéré";
  } else if (cvRounded < 15) {
    tone = 4;
    label = "Instable — à surveiller";
  } else {
    tone = 5;
    label = "Très instable — alerte";
  }

  return {
    cv: cvRounded,
    mean: Math.round(mu * 10) / 10,
    sd: Math.round(sd * 10) / 10,
    nValid: valid.length,
    tone,
    label,
  };
}
