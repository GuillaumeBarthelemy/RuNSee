import { memo } from "react";
import PerformanceMiniTrend from "./PerformanceMiniTrend.jsx";

/**
 * PerformanceFcKpiCard — Mockup p.15 : KPI compact FC.
 * Structure : icone label / valeur / hint tonal / sparkline / delta pill.
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
      <div className="performance-metric-value-row">
        <strong>{kpi.formattedValue || "—"}</strong>
        {kpi.unit ? <span>{kpi.unit}</span> : null}
      </div>
      {kpi.hint ? <p className={`performance-metric-hint tone-${tone}`}>{kpi.hint}</p> : null}
      {Array.isArray(kpi.series) && kpi.series.length >= 2 ? (
        <PerformanceMiniTrend points={kpi.series} tone={tone} label={`Tendance ${label}`} />
      ) : null}
      {kpi.deltaLabel ? (
        <span className={`performance-metric-delta performance-delta-${tone}`}>
          {kpi.deltaLabel}
        </span>
      ) : null}
    </article>
  );
}

export default memo(PerformanceFcKpiCard);
