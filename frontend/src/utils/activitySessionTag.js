import { getSessionTypeDef } from "../constants/sessionTaxonomy.js";

// Mappe le ton taxonomie (success/warning/danger/neutral) vers les classes
// de tag du composant RecentActivitiesCard (positive/warning/neutral).
const TONE_MAP = { success: "positive", warning: "warning", danger: "warning", neutral: "neutral" };

/**
 * Resout le tag de seance a afficher pour une activite, en priorisant la
 * classification utilisateur (userSessionType) sur le label auto-estime
 * (estimatedSessionLabel).
 *
 * @param {Object} activity
 * @returns {{ source: "user"|"auto"|null, label: string, tone: string, isAuto: boolean } | null}
 */
export function resolveActivitySessionTag(activity = {}) {
  const typeDef = getSessionTypeDef(activity?.userSessionType);
  if (typeDef) {
    const isAuto = !activity?.userClassifiedAt;
    return {
      source: "user",
      label: `${typeDef.icon} ${typeDef.label}${isAuto ? " ·auto" : ""}`,
      tone: TONE_MAP[typeDef.tone] || "neutral",
      isAuto,
    };
  }
  if (activity?.estimatedSessionLabel) {
    return {
      source: "auto",
      label: activity.estimatedSessionLabel,
      tone: activity?.sessionTypeTone || "neutral",
      isAuto: true,
    };
  }
  return null;
}
