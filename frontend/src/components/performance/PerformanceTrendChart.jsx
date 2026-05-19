import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function normalize(points = [], width = 248, height = 92) {
  const values = points
    .map((point) => Number(point?.value))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const value = Number(point?.value);
      if (!Number.isFinite(value)) return null;
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((value - min) / spread) * height;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        value,
        label: point.label,
      };
    })
    .filter(Boolean);
}

function PerformanceTrendChart({ trend = {} }) {
  const points = normalize(trend.series || []);
  if (!trend?.hasData || points.length < 2) {
    return (
      <section className="performance-panel performance-trend-chart-card">
        <h3>Tendances de performance</h3>
        <PerformanceEmptyState message="Les tendances ont besoin de plusieurs signaux comparables." />
      </section>
    );
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const lastPoint = points.at(-1);

  return (
    <section className="performance-panel performance-trend-chart-card">
      <div className="performance-trend-chart-head">
        <div>
          <span className="performance-panel-kicker">Tendance</span>
          <h3>Tendances de performance</h3>
        </div>
        <div>
          <small>{trend.primaryLabel || "Signal"}</small>
          <strong>{trend.primaryValue}</strong>
        </div>
      </div>

      <svg className="performance-trend-chart" viewBox="0 0 248 92" role="img" aria-label="Tendance de performance">
        <line x1="0" x2="248" y1="74" y2="74" />
        <line x1="0" x2="248" y1="46" y2="46" />
        <line x1="0" x2="248" y1="18" y2="18" />
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {lastPoint ? <circle cx={lastPoint.x} cy={lastPoint.y} r="4" /> : null}
      </svg>

      <span className="performance-trend-caption">
        {trend.rows?.[0]?.value || trend.text}
      </span>
    </section>
  );
}

export default memo(PerformanceTrendChart);
