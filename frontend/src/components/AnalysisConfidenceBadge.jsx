import { memo } from "react";
import InfoTooltip from "./InfoTooltip.jsx";

function buildTooltipContent(confidence = {}) {
  const items = [];

  if (confidence.summary) {
    items.push({ label: "Lecture", text: confidence.summary });
  }

  if (Array.isArray(confidence.positiveSignals) && confidence.positiveSignals.length) {
    items.push({
      label: "Appuis",
      text: confidence.positiveSignals.slice(0, 3).join(" ; "),
    });
  }

  const limits = [
    ...(Array.isArray(confidence.warnings) ? confidence.warnings : []),
    ...(Array.isArray(confidence.missingData) ? confidence.missingData : []),
  ];

  if (limits.length) {
    items.push({
      label: "Limites",
      text: limits.slice(0, 3).join(" ; "),
    });
  }

  if (Array.isArray(confidence.recommendations) && confidence.recommendations.length) {
    items.push({
      label: "Action",
      text: confidence.recommendations.slice(0, 2).join(" ; "),
    });
  }

  return items;
}

function AnalysisConfidenceBadge({
  confidence = null,
  label = "",
  compact = false,
}) {
  if (!confidence?.level) {
    return null;
  }

  const tone = confidence.tone || "neutral";
  const title = label || confidence.title || confidence.label || "Confiance";
  const tooltipContent = buildTooltipContent(confidence);

  return (
    <div className={`analysis-confidence-badge analysis-confidence-${tone} ${compact ? "is-compact" : ""}`.trim()}>
      <div className="analysis-confidence-main">
        <span className="analysis-confidence-kicker">Confiance</span>
        <strong>{confidence.label || title}</strong>
      </div>
      {confidence.summary && !compact ? (
        <span className="analysis-confidence-summary">{confidence.summary}</span>
      ) : null}
      <InfoTooltip
        title={title}
        content={tooltipContent}
        label={`Afficher le detail de confiance ${title}`}
        compact={compact}
      />
    </div>
  );
}

export default memo(AnalysisConfidenceBadge);
