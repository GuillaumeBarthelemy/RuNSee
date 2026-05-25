/**
 * vdotConsolidation.js — Resolution unique du VDOT consolide dans RunNSee.
 *
 * Source de verite pour TOUS les usages du VDOT/VO2max (Vue d'ensemble,
 * VDOT&profil, Allures de reference, FC de performance, Records, etc.).
 *
 * ## Principe scientifique (revise 2026-05-22)
 *
 * Deux concepts distincts mais lies :
 *   - Garmin VO2max (Firstbeat) : capacite aerobie courante, derivee de HR +
 *     allures + EPOC. Sur-estime souvent la performance race chez les coureurs
 *     entraines (capacite > race ability).
 *   - Daniels VDOT (records) : derive de records concrets, calibre sur la
 *     performance race. Sous-estime parfois la capacite courante si records
 *     anciens.
 *
 * ### Regle 'affichage prioritaire + calculs ponderes'
 *
 * Decision utilisateur 2026-05-22 :
 *
 * 1. **AFFICHAGE (displayValue)** : on prend la VO2max Garmin en priorite
 *    (vision instantanee de la capacite actuelle, ce que le coureur voit
 *    sur sa montre). Fallback Daniels si Garmin indispo.
 *
 * 2. **CALCULS (calculationValue)** : on utilise le mix 70/30 :
 *      calculationValue = 0.7 × Daniels + 0.3 × Garmin
 *    Utilise pour les paces d'entrainement (Allures), les axes 5D, les %,
 *    etc. — toute valeur qui doit etre calibree sur la performance
 *    realisable et non la capacite theorique.
 *
 * Cela combine :
 *   - une vision honnete et motivante (Garmin courant en headline)
 *   - des calculs realistes (paces atteignables, comparaisons cohérentes
 *     avec les records).
 *
 * Documentation de la formule a ajouter en tooltip ⓘ (prochaine iteration).
 */

const WEIGHT_DANIELS = 0.7;
const WEIGHT_GARMIN = 0.3;

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractGarminVdot(vdotHistory) {
  const latest = vdotHistory?.latestSnapshot
    || (Array.isArray(vdotHistory?.snapshots) && vdotHistory.snapshots.length
      ? vdotHistory.snapshots[vdotHistory.snapshots.length - 1]
      : null);
  if (!latest) return null;
  if (latest.source !== "garmin") return null;
  const v = toFiniteNumber(latest.vdotValue);
  return v > 0 ? v : null;
}

/**
 * Resolution du VDOT/VO2max consolide.
 *
 * @returns {Object} {
 *   // === AFFICHAGE (priorite Garmin) ===
 *   displayValue: number,
 *   displaySource: 'garmin' | 'daniels_internal' | 'unavailable',
 *   displaySourceLabel: 'Garmin' | 'Estimation interne' | '',
 *
 *   // === CALCULS DERIVES (mix 70/30 si possible) ===
 *   calculationValue: number,
 *   calculationSource: 'weighted' | 'garmin' | 'daniels_internal' | 'unavailable',
 *   calculationSourceLabel: string,
 *
 *   // === Compatibilite (alias) ===
 *   value: number,         // alias de calculationValue (back-compat)
 *   source: string,        // alias de calculationSource
 *   sourceLabel: string,   // alias de calculationSourceLabel
 *
 *   // === Composantes brutes ===
 *   danielsVdot: number | null,
 *   garminVdot: number | null,
 *   weighting: { daniels, garmin } | null,
 * }
 */
export function resolveMasterVdot({ vdotProfile = null, vdotHistory = null } = {}) {
  const danielsVdot = vdotProfile?.hasData && toFiniteNumber(vdotProfile.vdot) > 0
    ? toFiniteNumber(vdotProfile.vdot)
    : null;
  const garminVdot = extractGarminVdot(vdotHistory);

  // === Affichage : priorite Garmin ===
  let displayValue = 0;
  let displaySource = "unavailable";
  let displaySourceLabel = "";
  if (garminVdot != null) {
    displayValue = garminVdot;
    displaySource = "garmin";
    displaySourceLabel = "Garmin";
  } else if (danielsVdot != null) {
    displayValue = danielsVdot;
    displaySource = "daniels_internal";
    displaySourceLabel = "Estimation interne";
  }

  // === Calculs : mix 70/30 si les 2 dispos, sinon fallback ===
  let calculationValue = 0;
  let calculationSource = "unavailable";
  let calculationSourceLabel = "";
  let weighting = null;
  if (danielsVdot != null && garminVdot != null) {
    calculationValue = Number((WEIGHT_DANIELS * danielsVdot + WEIGHT_GARMIN * garminVdot).toFixed(1));
    calculationSource = "weighted";
    calculationSourceLabel = "70 % Daniels + 30 % Garmin";
    weighting = { daniels: WEIGHT_DANIELS, garmin: WEIGHT_GARMIN };
  } else if (garminVdot != null) {
    calculationValue = garminVdot;
    calculationSource = "garmin";
    calculationSourceLabel = "Garmin";
  } else if (danielsVdot != null) {
    calculationValue = danielsVdot;
    calculationSource = "daniels_internal";
    calculationSourceLabel = "Estimation interne";
  }

  return {
    // Affichage prioritaire
    displayValue,
    displaySource,
    displaySourceLabel,
    // Calculs ponderes
    calculationValue,
    calculationSource,
    calculationSourceLabel,
    // Alias retro-compatibilite (anciens consommateurs utilisent ces noms)
    value: calculationValue,
    source: calculationSource,
    sourceLabel: calculationSourceLabel,
    // Composantes brutes
    danielsVdot,
    garminVdot,
    weighting,
  };
}

export function resolveMasterVdotValue(options) {
  return resolveMasterVdot(options).calculationValue;
}
