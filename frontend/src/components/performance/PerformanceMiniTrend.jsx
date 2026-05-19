import { memo } from "react";

function normalizePoints(points = []) {
  const values = points
    .map((point) => Number(point?.value))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  const width = 120;
  const height = 34;

  return points
    .map((point, index) => {
      const value = Number(point?.value);
      if (!Number.isFinite(value)) return null;
      const x = values.length === 1 ? width : (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((value - min) / spread) * height;
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .filter(Boolean);
}

function PerformanceMiniTrend({ points = [], tone = "neutral", label = "Tendance" }) {
  const normalized = normalizePoints(points);

  if (normalized.length < 2) {
    return (
      <span className="performance-mini-trend-empty">
        Tendance à consolider
      </span>
    );
  }

  const areaPoints = `0,34 ${normalized.join(" ")} 120,34`;

  return (
    <svg
      className={`performance-mini-trend performance-mini-trend-${tone}`}
      viewBox="0 0 120 34"
      role="img"
      aria-label={label}
    >
      <polygon points={areaPoints} className="performance-mini-trend-area" />
      <polyline points={normalized.join(" ")} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default memo(PerformanceMiniTrend);
