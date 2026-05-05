import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * TrendChip — Pill compact affichant un delta avec flèche colorée.
 *
 * Phase G — UX_CHARTE.md.
 *
 * Props :
 * - delta : number (signé)
 * - unit : string ("%", "ms", "bpm")
 * - direction : "up" | "down" | "neutral" — auto-détecté si non fourni
 * - tone : 1..5
 * - label : string optionnel (suffixe, ex: "vs repère")
 * - decimals : number — nombre de décimales pour l'affichage (défaut 1)
 */

function TrendChip({
  delta = null,
  unit = "",
  direction = null,
  tone = 3,
  label = "",
  decimals = 1,
}) {
  if (delta == null || !Number.isFinite(Number(delta))) {
    return null;
  }

  const numericDelta = Number(delta);
  const inferredDirection = direction
    || (numericDelta > 0.05 ? "up" : numericDelta < -0.05 ? "down" : "neutral");

  const arrow = inferredDirection === "up" ? "↗"
    : inferredDirection === "down" ? "↘"
    : "→";

  const sign = numericDelta > 0 ? "+" : "";
  const formatted = numericDelta.toFixed(decimals);
  const toneClass = `tone-${clampTone(tone)}`;

  return (
    <span className={`trend-chip ${toneClass}`}>
      <span className="trend-chip-arrow" aria-hidden="true">{arrow}</span>
      <span className="trend-chip-value">{sign}{formatted}{unit ? ` ${unit}` : ""}</span>
      {label ? <span className="trend-chip-label">{label}</span> : null}
    </span>
  );
}

export default memo(TrendChip);
