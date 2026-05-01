import { memo } from "react";
import InfoTooltip from "./InfoTooltip.jsx";

function AlertScoreBadge({
  score = 100,
  tone = "positive",
  tooltipContent = "",
}) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const safeTone = ["positive", "neutral", "warning", "danger"].includes(tone) ? tone : "neutral";

  return (
    <div className={`alert-score-badge alert-score-badge-${safeTone}`}>
      <div className="alert-score-meter" aria-hidden="true">
        <span style={{ width: `${safeScore}%` }} />
      </div>
      <div className="alert-score-copy">
        <strong>{safeScore}</strong>
        <span>/100</span>
        {tooltipContent ? (
          <InfoTooltip
            title="Score d'attention"
            content={tooltipContent}
            label="Afficher l'aide pour le score d'attention"
          />
        ) : null}
      </div>
    </div>
  );
}

export default memo(AlertScoreBadge);
