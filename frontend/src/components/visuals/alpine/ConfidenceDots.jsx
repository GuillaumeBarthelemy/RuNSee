import { memo } from "react";

/**
 * ConfidenceDots — Alpine Light (Lot 3-bis).
 *
 * Indicateur visuel discret du niveau de confiance d'analyse.
 * 5 dots colorés selon le niveau (high → 5 verts, medium → 3 verts, low → 1 vert).
 *
 * Props :
 * - level : "high" | "medium" | "low" | "insufficient"
 * - showLabel : boolean (défaut true) — afficher le label "Confiance Élevée" etc.
 */

const LEVEL_META = {
  high: { dotsFilled: 5, label: "Élevée", color: "var(--al-success, #35a853)" },
  medium: { dotsFilled: 3, label: "Moyenne", color: "var(--al-warning, #f59e0b)" },
  low: { dotsFilled: 1, label: "Faible", color: "var(--al-alert, #ef4444)" },
  insufficient: { dotsFilled: 0, label: "Données insuffisantes", color: "var(--al-muted, #64748b)" },
};

function ConfidenceDots({ level = "insufficient", showLabel = true }) {
  const meta = LEVEL_META[level] || LEVEL_META.insufficient;

  return (
    <div className="alpine-confidence-dots" aria-label={`Confiance ${meta.label.toLowerCase()}`}>
      {showLabel ? (
        <div className="alpine-confidence-dots-text">
          <span className="alpine-confidence-dots-kicker">Confiance</span>
          <strong>{meta.label}</strong>
        </div>
      ) : null}
      <div className="alpine-confidence-dots-row">
        {[0, 1, 2, 3, 4].map((idx) => (
          <span
            key={idx}
            className={`alpine-confidence-dot ${idx < meta.dotsFilled ? "is-filled" : ""}`.trim()}
            style={idx < meta.dotsFilled ? { background: meta.color } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ConfidenceDots);
