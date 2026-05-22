/**
 * vdotConsolidation.js — Resolution unique du VDOT consolide dans RunNSee.
 *
 * Source de verite cote frontend pour TOUS les usages du VDOT estime
 * (Vue d'ensemble, VDOT&profil, Allures de reference, etc.).
 *
 * ## Principe scientifique
 *
 * Le VDOT a 2 sources possibles avec des semantiques differentes :
 *   - Garmin VO2max (Firstbeat) : capacite aerobie courante, derivee de HR +
 *     allures + EPOC. Sur-estime souvent la performance race chez les coureurs
 *     entraines qui ne courent pas en competition (capacite > race ability).
 *   - Daniels VDOT (records) : derive de records concrets, calibre sur la
 *     performance race. Sous-estime parfois la capacite courante si records
 *     anciens.
 *
 * ### Regle 70/30
 *
 * Si les 2 sources sont dispo :
 *   masterVdot = 0.7 × Daniels + 0.3 × Garmin
 *
 * Justification :
 *   - 70 % Daniels : ancrage sur la performance race (terrain, motivation,
 *     economie de course en fatigue).
 *   - 30 % Garmin : credit modere pour la capacite courante (potentiel,
 *     fitness recente).
 *   - Reduit le gap Garmin/Daniels (typique 3-6 pts) sans le supprimer.
 *   - Coherent avec la recommandation Daniels 2014 : viser un VDOT ~3 pts
 *     au-dessus des records pour les paces d'entrainement.
 *
 * Si une seule source dispo : on prend cette source.
 */

const WEIGHT_DANIELS = 0.7;
const WEIGHT_GARMIN = 0.3;

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Extrait le VDOT Garmin de la latestSnapshot si source = 'garmin'.
 */
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
 * Resolution du master VDOT a utiliser partout dans l'app.
 *
 * @param {Object} options
 * @param {Object} options.vdotProfile - Output buildVdotProfile (records Daniels)
 * @param {Object} options.vdotHistory - Output getVdotHistory (snapshots Garmin)
 * @returns {{ value, source, sourceLabel, danielsVdot, garminVdot, weighting }}
 *
 * source codes :
 *   - 'weighted'         : Garmin AND Daniels dispos -> 70/30 applique
 *   - 'garmin'           : Garmin seul disponible
 *   - 'daniels_internal' : Daniels seul disponible
 *   - 'unavailable'      : aucune source -> value = 0
 */
export function resolveMasterVdot({ vdotProfile = null, vdotHistory = null } = {}) {
  const danielsVdot = vdotProfile?.hasData && toFiniteNumber(vdotProfile.vdot) > 0
    ? toFiniteNumber(vdotProfile.vdot)
    : null;
  const garminVdot = extractGarminVdot(vdotHistory);

  if (danielsVdot != null && garminVdot != null) {
    const blended = WEIGHT_DANIELS * danielsVdot + WEIGHT_GARMIN * garminVdot;
    return {
      value: Number(blended.toFixed(1)),
      source: "weighted",
      sourceLabel: "Consolidé (Daniels + Garmin)",
      danielsVdot,
      garminVdot,
      weighting: { daniels: WEIGHT_DANIELS, garmin: WEIGHT_GARMIN },
    };
  }

  if (garminVdot != null) {
    return {
      value: garminVdot,
      source: "garmin",
      sourceLabel: "Garmin",
      danielsVdot: null,
      garminVdot,
      weighting: null,
    };
  }

  if (danielsVdot != null) {
    return {
      value: danielsVdot,
      source: "daniels_internal",
      sourceLabel: "Estimation interne",
      danielsVdot,
      garminVdot: null,
      weighting: null,
    };
  }

  return {
    value: 0,
    source: "unavailable",
    sourceLabel: "",
    danielsVdot: null,
    garminVdot: null,
    weighting: null,
  };
}

/**
 * Variante : retourne juste la valeur (sans metadata).
 */
export function resolveMasterVdotValue(options) {
  return resolveMasterVdot(options).value;
}
