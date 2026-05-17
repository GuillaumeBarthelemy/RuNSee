import { memo } from "react";

function PerformanceEmptyState({
  title = "Données insuffisantes",
  message = "Nous avons besoin de plus de sorties comparables pour afficher ce signal.",
}) {
  return (
    <div className="performance-empty-state" role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export default memo(PerformanceEmptyState);
