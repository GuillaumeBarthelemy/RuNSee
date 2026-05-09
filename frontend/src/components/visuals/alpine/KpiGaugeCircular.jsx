import { memo } from "react";
import { clampTone, toneCssVar } from "../../../utils/tonePicker.js";

/**
 * KpiGaugeCircular — Alpine Light (Lot 3-bis).
 *
 * Jauge circulaire 0-100% pour Récupération / Disponibilité.
 * Affiche un anneau coloré + valeur centrée.
 *
 * Props :
 * - value : number 0-100 (peut être null)
 * - tone : 1..5
 * - size : "sm" (44 px) | "md" (60 px) | "lg" (96 px)
 * - showLabel : boolean (défaut true) — afficher la valeur dans le centre
 * - unit : string ("%", "/100"...) défaut "%"
 */

const SIZES = {
  sm: { px: 44, stroke: 5, font: 11 },
  md: { px: 60, stroke: 6, font: 14 },
  lg: { px: 96, stroke: 8, font: 22 },
};

function KpiGaugeCircular({
  value = null,
  tone = 3,
  size = "md",
  showLabel = true,
  unit = "%",
}) {
  const dim = SIZES[size] || SIZES.md;
  const radius = (dim.px - dim.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeValue = value == null ? null : Math.min(100, Math.max(0, Number(value)));
  const offset = safeValue == null ? circumference : circumference * (1 - safeValue / 100);
  const fillColor = toneCssVar(tone);
  const cx = dim.px / 2;

  return (
    <div className={`alpine-gauge-circular alpine-gauge-circular--${size} tone-${clampTone(tone)}`}>
      <svg
        width={dim.px}
        height={dim.px}
        viewBox={`0 0 ${dim.px} ${dim.px}`}
        role="img"
        aria-label={`Jauge ${safeValue ?? "non disponible"} ${unit}`}
      >
        {/* Cercle de fond */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="var(--al-border, #dfe8f5)"
          strokeWidth={dim.stroke}
        />
        {/* Arc de progression */}
        {safeValue != null ? (
          <circle
            cx={cx}
            cy={cx}
            r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth={dim.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        ) : null}
        {showLabel ? (
          <text
            x={cx}
            y={cx}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={dim.font}
            fontWeight="700"
            fill={safeValue != null ? "var(--al-text, #0f2147)" : "var(--al-muted, #64748b)"}
          >
            {safeValue != null ? `${Math.round(safeValue)}${unit === "%" ? "%" : ""}` : "—"}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

export default memo(KpiGaugeCircular);
