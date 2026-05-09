import { memo } from "react";

/**
 * CoachAdviceBar — Alpine Light (Lot 1).
 *
 * Bandeau bas de page « Conseil du jour » au ton coach.
 * Tutoiement, descriptif, prudent (cf. plan section 6).
 *
 * Props :
 * - title : string (ex: "Conseil du jour")
 * - children : texte du conseil (string ou ReactNode)
 * - tone : "info" | "success" | "warning" | "neutral" (défaut "info")
 * - icon : ReactNode optionnel
 * - action : { label, onClick } optionnel (CTA léger)
 */
function CoachAdviceBar({
  title = "Conseil du jour",
  children = null,
  tone = "info",
  icon = null,
  action = null,
}) {
  const safeTone = ["info", "success", "warning", "neutral"].includes(tone) ? tone : "info";

  return (
    <section className={`alpine-coach-bar alpine-coach-bar-${safeTone}`} aria-label={title}>
      <div className="alpine-coach-bar-icon" aria-hidden="true">
        {icon || "💡"}
      </div>
      <div className="alpine-coach-bar-text">
        <span className="alpine-coach-bar-title">{title}</span>
        <p className="alpine-coach-bar-message">{children}</p>
      </div>
      {action && action.label ? (
        <button
          type="button"
          className="alpine-coach-bar-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </section>
  );
}

export default memo(CoachAdviceBar);
