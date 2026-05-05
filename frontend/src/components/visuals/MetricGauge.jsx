import { memo } from "react";
import { clampTone, toneCssVar } from "../../utils/tonePicker.js";

/**
 * MetricGauge — Jauge demi-cercle pour score 0-100.
 *
 * Phase G2 — UX_CHARTE.md.
 *
 * Props :
 * - value : number — valeur à afficher (peut être null si donnée manquante)
 * - min, max : number — bornes (défaut 0, 100)
 * - tone : 1..5 — niveau qualitatif (défaut 3 = neutre)
 * - unit : string — ex: "/ 100"
 * - label : string — ex: "SOMMEIL"
 * - showValue : boolean — afficher la valeur centrée (défaut true)
 * - size : "sm" | "md" — taille (défaut "md")
 */

const SIZES = {
  sm: { width: 120, height: 70, strokeWidth: 8, fontSize: 18 },
  md: { width: 160, height: 90, strokeWidth: 10, fontSize: 24 },
};

function MetricGauge({
  value = null,
  min = 0,
  max = 100,
  tone = 3,
  unit = "",
  label = "",
  showValue = true,
  size = "md",
}) {
  const dim = SIZES[size] || SIZES.md;
  const { width, height, strokeWidth, fontSize } = dim;
  const cx = width / 2;
  const cy = height - strokeWidth / 2;
  const radius = (width - strokeWidth * 2) / 2;
  const circumference = Math.PI * radius;

  const safeValue = value == null ? null : Math.min(Math.max(Number(value), min), max);
  const ratio = safeValue == null ? 0 : (safeValue - min) / (max - min);
  const dashOffset = circumference * (1 - ratio);

  const toneClass = `tone-${clampTone(tone)}`;
  const fillColor = toneCssVar(tone);

  return (
    <div className={`metric-gauge metric-gauge--${size} ${toneClass}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label ? `${label} ${safeValue ?? "non disponible"}` : undefined}
      >
        {/* Track (arc complet en gris) */}
        <path
          d={`M ${strokeWidth} ${cy} A ${radius} ${radius} 0 0 1 ${width - strokeWidth} ${cy}`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill (arc rempli selon valeur) */}
        {safeValue != null ? (
          <path
            d={`M ${strokeWidth} ${cy} A ${radius} ${radius} 0 0 1 ${width - strokeWidth} ${cy}`}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        ) : null}
        {showValue && safeValue != null ? (
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="700"
            fill="var(--color-text-primary)"
          >
            {Math.round(safeValue)}
          </text>
        ) : null}
        {showValue && safeValue == null ? (
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize={fontSize}
            fill="var(--color-text-muted)"
          >
            —
          </text>
        ) : null}
      </svg>
      {(label || unit) ? (
        <div className="metric-gauge-meta">
          {label ? <span className="metric-gauge-label">{label}</span> : null}
          {unit ? <span className="metric-gauge-unit">{unit}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(MetricGauge);
