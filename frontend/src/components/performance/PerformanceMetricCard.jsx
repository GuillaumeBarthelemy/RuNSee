import { memo } from "react";
import InfoTooltip from "../InfoTooltip.jsx";
import PerformanceMiniTrend from "./PerformanceMiniTrend.jsx";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function PerformanceMetricCard({ metric = {} }) {
  const tone = metric.tone || "neutral";

  return (
    <article className={`performance-metric-card performance-tone-${tone}`}>
      <header className="performance-metric-card-head">
        {/* Mockup p.12 : ⓘ inline collee au label (pas en flex space-between). */}
        <span className="performance-metric-label">
          {metric.label || "Indicateur"}
          <InfoTooltip
            title={metric.label || "Indicateur"}
            content={metric.info || []}
            compact
            label={`Afficher l'aide ${metric.label || "indicateur"}`}
          />
        </span>
      </header>

      {metric.hasData ? (
        <>
          <div className="performance-metric-value-row">
            <strong>{metric.formattedValue}</strong>
            {metric.unit ? <span>{metric.unit}</span> : null}
            {/* Source discret inline italique a cote de la valeur (mockup p.12). */}
            {metric.sourceLabel ? (
              <em className="performance-metric-source-inline">via {metric.sourceLabel}</em>
            ) : null}
          </div>
          <p className="performance-metric-hint">{metric.hint}</p>
          <PerformanceMiniTrend
            points={metric.series || []}
            tone={tone}
            label={`Tendance ${metric.label}`}
          />
          {/* Mockup p.12 : delta pill sous la sparkline */}
          {metric.trendLabel ? (
            <span className={`performance-metric-delta performance-delta-${metric.trendDirection || "neutral"}`}>
              {metric.trendLabel}
            </span>
          ) : null}
          {metric.activityCount && !metric.sourceLabel ? (
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
