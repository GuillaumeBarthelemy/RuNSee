/**
 * tonePicker.js
 *
 * Helper unique pour mapper une valeur numérique vers un niveau de tone (1..5)
 * selon la palette UX_CHARTE.md.
 *
 * Convention :
 * - tone 1 = très bon (vert vif)
 * - tone 2 = bon (vert pâle)
 * - tone 3 = neutre (gris/bleu)
 * - tone 4 = vigilance (orange)
 * - tone 5 = alerte (rouge)
 */

/**
 * Mappe une valeur numérique vers un tone à partir d'une liste de seuils.
 *
 * @param {number} value - valeur à classer
 * @param {Array<{ from: number, to: number, tone: number }>} thresholds
 *   Liste de zones. La première zone qui contient `value` (from <= v < to) gagne.
 * @param {number} fallbackTone - tone retourné si aucune zone ne matche (défaut 3 = neutre)
 * @returns {number} tone entre 1 et 5
 */
export function pickTone(value, thresholds = [], fallbackTone = 3) {
  if (value == null || !Number.isFinite(Number(value))) return fallbackTone;
  const v = Number(value);

  for (const zone of thresholds) {
    if (zone == null) continue;
    const from = zone.from ?? -Infinity;
    const to = zone.to ?? Infinity;
    if (v >= from && v < to) {
      return clampTone(zone.tone);
    }
  }

  return fallbackTone;
}

/**
 * Normalise un tone dans [1, 5].
 * Retourne 3 (neutre) pour les valeurs invalides (null, undefined, NaN).
 */
export function clampTone(tone) {
  if (tone == null) return 3;
  const numeric = Number(tone);
  if (!Number.isFinite(numeric)) return 3;
  const t = Math.round(numeric);
  return Math.min(5, Math.max(1, t));
}

/**
 * Helpers d'usage courant pour les indicateurs RuNSee.
 * Les seuils proviennent du GLOSSAIRE.md.
 */

/**
 * Score sommeil 0-100 : lower-is-worse.
 * < 50 → alerte ; 50-70 → vigilance ; 70-85 → bon ; > 85 → très bon
 */
export function sleepScoreTone(value) {
  return pickTone(value, [
    { from: 0, to: 50, tone: 5 },
    { from: 50, to: 70, tone: 4 },
    { from: 70, to: 85, tone: 2 },
    { from: 85, to: 101, tone: 1 },
  ]);
}

/**
 * Delta VFC vs baseline en pourcentage : higher-is-better.
 * < -8 % → alerte ; -8 à -3 → vigilance ; -3 à +5 → neutre ; > +5 → bon ; > +10 → très bon
 */
export function vfcDeltaTone(deltaPct) {
  return pickTone(deltaPct, [
    { from: -Infinity, to: -8, tone: 5 },
    { from: -8, to: -3, tone: 4 },
    { from: -3, to: 5, tone: 3 },
    { from: 5, to: 10, tone: 2 },
    { from: 10, to: Infinity, tone: 1 },
  ]);
}

/**
 * Delta FC repos vs baseline en pourcentage : lower-is-better (inversé).
 *
 * Une baisse de FC repos vs baseline = bonne récupération / progression
 * de la base aérobie (Buchheit 2014). Une hausse = vigilance (fatigue,
 * stress, début de maladie, dette de sommeil).
 *
 * > +6 % → alerte ; +3 à +6 → vigilance ; -3 à +3 → neutre ; -3 à -6 → bon ; < -6 → très bon
 *
 * Sur une FC repos de 50 bpm : 6 % = 3 bpm de variation, ce qui est notable.
 */
export function restingHrDeltaTone(deltaPct) {
  return pickTone(deltaPct, [
    { from: 6, to: Infinity, tone: 5 },
    { from: 3, to: 6, tone: 4 },
    { from: -3, to: 3, tone: 3 },
    { from: -6, to: -3, tone: 2 },
    { from: -Infinity, to: -6, tone: 1 },
  ]);
}

/**
 * Énergie / Body Battery 0-100 : higher-is-better.
 * < 30 → alerte ; 30-60 → vigilance ; 60-80 → bon ; > 80 → très bon
 */
export function energyLevelTone(value) {
  return pickTone(value, [
    { from: 0, to: 30, tone: 5 },
    { from: 30, to: 60, tone: 4 },
    { from: 60, to: 80, tone: 2 },
    { from: 80, to: 101, tone: 1 },
  ]);
}

/**
 * Aptitude / Readiness 0-100 : higher-is-better.
 * 0-25 → alerte ; 25-50 → vigilance ; 50-75 → neutre ; 75-100 → bon
 */
export function readinessTone(value) {
  return pickTone(value, [
    { from: 0, to: 25, tone: 5 },
    { from: 25, to: 50, tone: 4 },
    { from: 50, to: 75, tone: 3 },
    { from: 75, to: 101, tone: 1 },
  ]);
}

/**
 * Fraîcheur (TSB) en pts : zone optimale autour de 0.
 * < -30 → alerte (surcharge) ; -30 à -10 → vigilance ; -10 à +5 → neutre ;
 * +5 à +25 → optimum ; > +25 → désentraînement (vigilance)
 */
export function freshnessTone(value) {
  return pickTone(value, [
    { from: -Infinity, to: -30, tone: 5 },
    { from: -30, to: -10, tone: 4 },
    { from: -10, to: 5, tone: 3 },
    { from: 5, to: 25, tone: 1 },
    { from: 25, to: Infinity, tone: 4 },
  ]);
}

/**
 * Charge 7j en pts : selon GLOSSAIRE.md.
 * < 200 → léger (neutre) ; 200-400 → standard (bon) ; 400-600 → dense (vigilance) ;
 * > 600 → très chargé (alerte)
 */
export function load7dTone(value) {
  return pickTone(value, [
    { from: 0, to: 200, tone: 3 },
    { from: 200, to: 400, tone: 2 },
    { from: 400, to: 600, tone: 4 },
    { from: 600, to: Infinity, tone: 5 },
  ]);
}

/**
 * Stress moyen 0-100 : lower-is-better.
 * 0-25 → très bon (repos profond) ; 25-50 → bon ; 50-75 → vigilance ; 75-100 → alerte
 */
export function stressTone(value) {
  return pickTone(value, [
    { from: 0, to: 25, tone: 1 },
    { from: 25, to: 50, tone: 2 },
    { from: 50, to: 75, tone: 4 },
    { from: 75, to: 101, tone: 5 },
  ]);
}

/**
 * Dérive cardiaque (decoupling) en pourcentage : lower-is-better.
 * < 2 % → très bon ; 2-5 → bon ; 5-8 → vigilance ; > 8 → alerte
 */
export function decouplingTone(value) {
  return pickTone(value, [
    { from: -Infinity, to: 2, tone: 1 },
    { from: 2, to: 5, tone: 2 },
    { from: 5, to: 8, tone: 4 },
    { from: 8, to: Infinity, tone: 5 },
  ]);
}

/**
 * CSS variable name pour un tone donné (utilisé en inline style).
 */
export function toneCssVar(tone) {
  return `var(--tone-${clampTone(tone)})`;
}

export function toneCssBgVar(tone) {
  return `var(--tone-${clampTone(tone)}-bg)`;
}
