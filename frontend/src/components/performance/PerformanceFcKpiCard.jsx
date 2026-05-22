import { memo } from "react";
import PerformanceMiniTrend from "./PerformanceMiniTrend.jsx";

/**
 * PerformanceFcKpiCard — Mockup p.15 : KPI compact FC (seuil/max/decoupling).
 * Layout 2 cols : valeur + hint + tone | sparkline.
 */
function PerformanceFcKpiCard({ label = "", icon = null, kpi = {} }) {
  const tone = kpi.tone || "neutral";
  return (
    <article className={`performance-metric-card performance-tone-${tone}`}>
      <header className="performance-metric-card-head">
        <span className="performance-metric-label">
          {icon ? <span className="performance-fc-kpi-icon" aria-hidden="true">{icon}</span> : null}
          {label}
        </span>
      </header>
      <div className="performance-metric-card-body">
        <div className="performance-metric-card-info">
          <div className="performance-metric-value-row">
            <strong>{kpi.formattedValue || "—"}</strong>
            {kpi.unit ? <span>{kpi.unit}</span> : null}
          </div>
          {kpi.hint ? <p className="performance-metric-hint">{kpi.hint}</p> : null}
        </div>
        {Array.isArray(kpi.series) && kpi.series.length >= 2 ? (
          <div className="performance-metric-card-chart">
            <PerformanceMiniTrend points={kpi.series} tone={tone} label={`Tendance ${label}`} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default memo(PerformanceFcKpiCard);
