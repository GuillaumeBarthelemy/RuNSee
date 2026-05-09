import { memo } from "react";

/**
 * SourceBadge — Alpine Light (Lot 1).
 *
 * Badge compact identifiant la source d'une activité ou d'une métrique :
 * Strava, Garmin, ou source canonique RunSee.
 *
 * Props :
 * - source : "strava" | "garmin" | "runsee" | string (autre source future)
 * - label : string optionnel (override du label par défaut)
 * - title : string optionnel (info-bulle native HTML)
 *
 * Convention couleur :
 * - Strava : orange #fc4c02 contour, label sobre
 * - Garmin : bleu #007cc3 contour
 * - RunSee : bleu primaire Alpine Light
 */

const SOURCE_META = {
  strava: { label: "Strava", className: "alpine-source-strava" },
  garmin: { label: "Garmin", className: "alpine-source-garmin" },
  runsee: { label: "RunSee", className: "alpine-source-runsee" },
};

function SourceBadge({ source = "", label = "", title = "" }) {
  const key = String(source || "").toLowerCase();
  const meta = SOURCE_META[key] || { label: label || source || "Source", className: "alpine-source-other" };
  const displayLabel = label || meta.label;

  return (
    <span
      className={`alpine-source-badge ${meta.className}`.trim()}
      title={title || `Source : ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
}

export default memo(SourceBadge);
