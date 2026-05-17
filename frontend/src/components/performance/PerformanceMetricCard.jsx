import { memo } from "react";
import InfoTooltip from "../InfoTooltip.jsx";
import PerformanceMiniTrend from "./PerformanceMiniTrend.jsx";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function PerformanceMetricCard({ metric = {} }) {
  const tone = metric.tone || "neutral";

  return (
    <article className={`performance-metric-card performance-tone-${tone}`}>
      <header className="performance-metric-card-head">
        <span className="performance-metric-label">{metric.label || "Indicateur"}</span>
        <InfoTooltip
          title={metric.label || "Indicateur"}
          content={metric.info || []}
          compact
          label={`Afficher l'aide ${metric.label || "indicateur"}`}
        />
      </header>

      {metric.hasData ? (
        <>
          <div className="performance-metric-value-row">
            <strong>{metric.formattedValue}</strong>
            {metric.unit ? <span>{metric.unit}</span> : null}
          </div>
          <p className="performance-metric-hint">{metric.hint}</p>
          {metric.trendLabel ? (
            <span className={`performance-metric-delta performance-delta-${metric.trendDirection || "neutral"}`}>
              {metric.trendLabel}
            </span>
          ) : null}
          <PerformanceMiniTrend
            points={metric.series || []}
            tone={tone}
            label={`Tendance ${metric.label}`}
          />
          {metric.activityCount ? (
            <span className="performance-metric-sample">
              {metric.activityCount} sortie{metric.activityCount > 1 ? "s" : ""} retenue{metric.activityCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </>
      ) : (
        <PerformanceEmptyState message={metric.emptyReason} />
      )}
    </article>
  );
}

export default memo(PerformanceMetricCard);
