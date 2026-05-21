import { memo } from "react";

/**
 * PerformanceLimitsCard — Mockup p.13.
 *
 * 3 puces courtes (bullet list) sur les limites pratiques de lecture du VDOT.
 */
const DEFAULT_LIMITS = [
  "Les allures en côte technique ou en altitude peuvent biaiser certaines zones.",
  "Les séances très courtes (< 5 min) apportent moins d'information.",
  "Ta forme du jour (fatigue, stress, sommeil) influence les résultats.",
];

function PerformanceLimitsCard({ limits = DEFAULT_LIMITS }) {
  // Si on recoit le format ancien { title, text }, on extrait le text.
  const items = (Array.isArray(limits) ? limits : DEFAULT_LIMITS).map((l) => {
    if (typeof l === "string") return l;
    return l?.text || "";
  }).filter(Boolean);

  return (
    <section className="performance-panel performance-limits-card">
      <div className="performance-panel-head">
        <h3 className="performance-limits-title">
          <span className="performance-limits-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M12 2.5 4 5v6.2c0 4.6 3.2 8.6 8 10.3 4.8-1.7 8-5.7 8-10.3V5l-8-2.5Z"
                stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          Limites de lecture
        </h3>
      </div>
      <ul className="performance-limits-list">
        {items.map((text, idx) => (
          <li key={`limit-${idx}`}>{text}</li>
        ))}
      </ul>
    </section>
  );
}

export default memo(PerformanceLimitsCard);
