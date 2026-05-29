import { memo } from "react";
import InfoTooltip from "../InfoTooltip.jsx";
import PerformanceMiniTrend from "./PerformanceMiniTrend.jsx";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

/**
 * PerformanceMetricCard — Alpine Light (Lot Performance V5).
 *
 * Layout 2 colonnes inspire des cartes Analyse > Tendances (KpiChartCard) :
 *   - colonne gauche : label + valeur + hint + delta pill
 *   - colonne droite : sparkline pleine hauteur
 *
 * Meilleure optimisation verticale que l'ancien layout en pile.
 */
function PerformanceMetricCard({ metric = {} }) {
  const tone = metric.tone || "neutral";

  return (
    <article className={`performance-metric-card performance-tone-${tone}`}>
      <header className="performance-metric-card-head">
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
        <div className="performance-metric-card-body">
          {/* Colonne gauche : valeur + hint + delta */}
          <div className="performance-metric-card-info">
            <div className="performance-metric-value-row">
              <strong>{metric.formattedValue}</strong>
              {metric.unit ? <span>{metric.unit}</span> : null}
            </div>
            {metric.sourceLabel ? (
              <em className="performance-metric-source-inline">via {metric.sourceLabel}</em>
            ) : null}
            <p className="performance-metric-hint">{metric.hint}</p>
            {metric.trendLabel ? (
              <span className={`performance-metric-delta performance-delta-${metric.trendDirection || "neutral"}`}>
                {metric.trendLabel}
              </span>
            ) : null}
          </div>

          {/* Colonne droite : sparkline pleine hauteur */}
          <div className="performance-metric-card-chart">
            <PerformanceMiniTrend
              points={metric.series || []}
              tone={tone}
              invert={metric.key === "adjustedPace"}
              label={`Tendance ${metric.label}`}
            />
          </div>
        </div>
      ) : (
        <PerformanceEmptyState message={metric.emptyReason} />
      )}
    </article>
  );
}

export default memo(PerformanceMetricCard);
