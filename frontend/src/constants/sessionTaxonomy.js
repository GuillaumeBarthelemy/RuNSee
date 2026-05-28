/**
 * Taxonomie des types de seance — mirror du backend
 * `activityClassification.service.js`.
 *
 * intensity : low | mid | high | none — pilote la couleur du pill.
 * tone      : classe CSS Alpine (vert / ambre / rouge / neutre).
 */

export const SESSION_TYPES = [
  { key: "endurance_fond", label: "Endurance fond.",     intensity: "low",  tone: "success", icon: "🟢" },
  { key: "sortie_longue",  label: "Sortie longue",        intensity: "low",  tone: "success", icon: "🛤" },
  { key: "recuperation",   label: "Récupération",         intensity: "low",  tone: "success", icon: "💚" },
  { key: "tempo",          label: "Tempo",                intensity: "mid",  tone: "warning", icon: "🟡" },
  { key: "seuil",          label: "Seuil",                intensity: "high", tone: "warning", icon: "🟠" },
  { key: "vma_courte",     label: "VMA courte",           intensity: "high", tone: "danger",  icon: "🔥" },
  { key: "vma_longue",     label: "VMA longue",           intensity: "high", tone: "danger",  icon: "⚡" },
  { key: "fartlek",        label: "Fartlek",              intensity: "mid",  tone: "warning", icon: "🎲" },
  { key: "cote",           label: "Côtes",                intensity: "mid",  tone: "warning", icon: "⛰" },
  { key: "competition",    label: "Compétition",          intensity: "high", tone: "danger",  icon: "🏁" },
  { key: "test",           label: "Test",                 intensity: "high", tone: "danger",  icon: "📊" },
  { key: "decouverte",     label: "Découverte",           intensity: "none", tone: "neutral", icon: "🌍" },
  { key: "autre",          label: "Autre",                intensity: "none", tone: "neutral", icon: "•" },
];

export const SESSION_MARKERS = [
  { key: "difficile_meteo",  label: "Météo difficile",      icon: "🌧" },
  { key: "specifique",       label: "Spécifique",            icon: "🎯" },
  { key: "club",             label: "Club",                  icon: "👥" },
  { key: "trail",            label: "Trail",                 icon: "⛰" },
  { key: "altitude",         label: "Altitude",              icon: "🏔" },
  { key: "retour_blessure",  label: "Retour blessure",       icon: "🩹" },
  { key: "forme_excellente", label: "Forme excellente",      icon: "💪" },
  { key: "fatigue",          label: "Fatigue",               icon: "😣" },
];

export const MAX_MARKERS = 4;
export const MAX_NOTES_LENGTH = 500;

/**
 * Suggestion heuristique cote frontend (mirror backend
 * activityClassification.service.js suggestSessionType).
 * @param {Object} activity
 * @param {Object} ctx — { fcMax }
 * @returns {string|null}
 */
export function suggestSessionType(activity = {}, ctx = {}) {
  const movingTime = Number(activity.movingTime) || 0;
  const distance = Number(activity.distance) || 0;
  const elevGain = Number(activity.totalElevationGain) || 0;
  const avgHr = Number(activity.averageHeartrate) || 0;
  const maxHr = Number(activity.maxHeartrate) || 0;
  const fcMax = Number(ctx.fcMax) || 0;
  const workoutType = Number(activity.workoutType);

  if (workoutType === 1 || workoutType === 11) return "competition";
  if (movingTime >= 90 * 60 && distance >= 18000) return "sortie_longue";
  if (distance > 0 && elevGain / (distance / 1000) > 50) return "cote";

  if (avgHr > 0 && fcMax > 0) {
    const hrPct = avgHr / fcMax;
    if (maxHr > 0 && maxHr / fcMax > 0.92 && hrPct >= 0.85) {
      return movingTime < 40 * 60 ? "vma_courte" : "vma_longue";
    }
    if (hrPct < 0.68 && movingTime < 45 * 60) return "recuperation";
    if (hrPct < 0.78) return "endurance_fond";
    if (hrPct < 0.88) return "tempo";
    return "seuil";
  }

  if (movingTime >= 60 * 60) return "endurance_fond";
  if (movingTime > 0) return "autre";
  return null;
}

export function getSessionTypeDef(key) {
  return SESSION_TYPES.find((t) => t.key === key) || null;
}

export function getMarkerDef(key) {
  return SESSION_MARKERS.find((m) => m.key === key) || null;
}
