import { memo } from "react";

/**
 * PerformanceMiniTrend — Alpine Light.
 *
 * Sparkline lissee alignee sur le style des cards Analyse > Tendances
 * (RecoveryKpiCard.MiniLine) : courbe bezier cubique monotone, trait 2px,
 * gradient lineaire propre, pas de pastilles parasites.
 *
 * viewBox 280x56 (ratio 5:1) repris d'Analyse pour eviter la distorsion X/Y
 * quand la card change de largeur. preserveAspectRatio="none" pour stretch.
 */

const VB_W = 280;
const VB_H = 56;

const TONE_COLOR = {
  positive: "#16a34a",
  warning: "#f97316",
  danger: "#dc2626",
  neutral: "#64748b",
};

// Interpolation monotone-cubique (style Recharts type="monotone").
// Genere un path SVG lisse passant par tous les points sans overshoot.
function buildMonotonePath(points) {
  if (points.length < 2) return "";
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const n = points.length;
  const dx = []; const dy = []; const m = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(xs[i + 1] - xs[i]);
    dy.push(ys[i + 1] - ys[i]);
    m.push(dy[i] / (dx[i] || 1));
  }
  const tangents = new Array(n).fill(0);
  tangents[0] = m[0];
  tangents[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (m[i - 1] * m[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (m[i - 1] + m[i]) / 2;
    }
  }
  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const cp1x = xs[i] + dx[i] / 3;
    const cp1y = ys[i] + (tangents[i] * dx[i]) / 3;
    const cp2x = xs[i + 1] - dx[i] / 3;
    const cp2y = ys[i + 1] - (tangents[i + 1] * dx[i]) / 3;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return d;
}

function normalizePoints(points = [], invert = false) {
  const values = points
    .map((point) => Number(point?.value))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return [];

  if (values.length === 1) {
    const yMid = VB_H / 2;
    return [
      { x: 0, y: yMid },
      { x: VB_W, y: yMid },
    ];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const value = Number(point?.value);
      if (!Number.isFinite(value)) return null;
      const x = (index / Math.max(1, points.length - 1)) * VB_W;
      // Ratio 0..1 de la valeur dans la plage. `invert` (ex: allure, plus bas =
      // meilleur) place la meilleure valeur EN HAUT — aligné sur la grande
      // courbe Tendances (YAxis reversed) pour un rendu identique.
      const ratio = (value - min) / spread;
      const placed = invert ? 1 - ratio : ratio;
      // 10% de marge haut/bas pour ne pas coller la courbe aux bords.
      const y = VB_H - 6 - placed * (VB_H - 12);
      return { x, y };
    })
    .filter(Boolean);
}

function PerformanceMiniTrend({ points = [], tone = "neutral", label = "Tendance", invert = false }) {
  const normalized = normalizePoints(points, invert);

  if (normalized.length < 2) return null;

  const color = TONE_COLOR[tone] || TONE_COLOR.neutral;
  const linePath = buildMonotonePath(normalized);
  const areaPath = `${linePath} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`;
  const gradId = `perf-mini-trend-${tone}`;

  return (
    <svg
      className={`performance-mini-trend performance-mini-trend-${tone}`}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default memo(PerformanceMiniTrend);
