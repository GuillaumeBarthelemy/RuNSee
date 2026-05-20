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
      return { x: Math.round(x), y: Math.round(y) };
    })
    .filter(Boolean);
}

function toPathString(coords = []) {
  return coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
}

function PerformanceMiniTrend({ points = [], tone = "neutral", label = "Tendance" }) {
  const normalized = normalizePoints(points);

  // Si pas assez de points, on n'affiche RIEN (au lieu d'un texte
  // 'Tendance a consolider' qui ajoute du bruit visuel et double le delta).
  if (normalized.length < 2) {
    return null;
  }

  const pathString = toPathString(normalized);
  const areaPoints = `0,34 ${pathString} 120,34`;

  return (
    <svg
      className={`performance-mini-trend performance-mini-trend-${tone}`}
      viewBox="0 0 120 34"
      role="img"
      aria-label={label}
    >
      <polygon points={areaPoints} className="performance-mini-trend-area" />
      <polyline points={pathString} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Mockup p.12 : points visibles sur chaque mesure */}
      {normalized.map((coord, index) => (
        <circle
          key={`mini-trend-dot-${index}`}
          cx={coord.x}
          cy={coord.y}
          r="2.2"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export default memo(PerformanceMiniTrend);
