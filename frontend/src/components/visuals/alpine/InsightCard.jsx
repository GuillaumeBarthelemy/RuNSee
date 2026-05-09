import { memo } from "react";

/**
 * InsightCard — Alpine Light (Lot 1).
 *
 * Carte de lecture/conseil avec icône et tone.
 * Pour : « Charge maitrisée. Surveille la récupération. », « Bloc standard », etc.
 *
 * Tone :
 * - "info" (bleu doux) — par défaut
 * - "success" (vert)
 * - "warning" (orange)
 * - "alert" (rouge)
 * - "neutral" (gris)
 *
 * Props :
 * - tone : "info" | "success" | "warning" | "alert" | "neutral"
 * - title : string optionnel (kicker court)
 * - children : contenu (texte principal)
 * - icon : ReactNode optionnel (icône à gauche)
 */
function InsightCard({
  tone = "info",
  title = "",
  children = null,
  icon = null,
}) {
  const safeTone = ["info", "success", "warning", "alert", "neutral"].includes(tone) ? tone : "info";

  return (
    <aside className={`alpine-insight-card alpine-insight-${safeTone}`} role="note">
      {icon ? <span className="alpine-insight-icon" aria-hidden="true">{icon}</span> : null}
      <div className="alpine-insight-body">
        {title ? <span className="alpine-insight-title">{title}</span> : null}
        <div className="alpine-insight-text">{children}</div>
      </div>
    </aside>
  );
}

export default memo(InsightCard);
