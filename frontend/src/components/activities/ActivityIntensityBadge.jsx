import { memo } from "react";
import { INTENSITY_LABELS } from "../../utils/activitiesViewModel.js";

/**
 * ActivityIntensityBadge — Alpine Light (Lot 03).
 *
 * Affiche l'intensité d'une activité : Facile / Modérée / Intense.
 * Si la donnée est nulle, ne rend rien.
 */
function ActivityIntensityBadge({ intensity = null }) {
  if (!intensity || !INTENSITY_LABELS[intensity]) return null;
  return (
    <span className={`alpine-intensity-badge intensity-${intensity}`}>
      {INTENSITY_LABELS[intensity]}
    </span>
  );
}

export default memo(ActivityIntensityBadge);
