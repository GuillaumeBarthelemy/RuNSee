import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * MicroBars — Remplaçant des sparklines.
 * Barres verticales colorées par tone, plus lisibles qu'une courbe.
 *
 * Phase G3 — UX_CHARTE.md.
 *
 * Props :
 * - series : array de number (valeurs, peut contenir null pour données absentes)
 * - tones : array de 1..5 optionnel (par défaut 3 = neutre pour toutes les barres)
 * - height : "sm" | "md" (défaut "md" = 32 px desktop, 24 px mobile via CSS)
 * - showLast : boolean — souligner la dernière barre (défaut true)
 * - ariaLabel : string optionnel
 */

function MicroBars({
  series = [],
  tones = null,
  height = "md",
  showLast = true,
  ariaLabel = "",
}) {
  const valid = series.filter((v) => v != null && Number.isFinite(v));
  if (valid.length === 0) {
    return <div className={`micro-bars micro-bars--empty micro-bars--${height}`}>—</div>;
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = Math.max(1, max - min);

  return (
    <div
      className={`micro-bars micro-bars--${height}`}
      role="img"
      aria-label={ariaLabel || `Série de ${series.length} valeurs`}
    >
      {series.map((value, idx) => {
        if (value == null || !Number.isFinite(value)) {
          return <span key={idx} className="micro-bar micro-bar--empty" />;
        }
        // hauteur normalisée 20% à 100% pour qu'une barre minimale reste visible
        const heightPct = 20 + ((value - min) / range) * 80;
        const tone = tones && tones[idx] != null ? clampTone(tones[idx]) : 3;
        const isLast = showLast && idx === series.length - 1;
        return (
          <span
            key={idx}
            className={`micro-bar tone-${tone} ${isLast ? "is-last" : ""}`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}

export default memo(MicroBars);
