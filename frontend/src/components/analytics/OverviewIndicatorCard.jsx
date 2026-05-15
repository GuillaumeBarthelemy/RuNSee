import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";
import OverviewRangeBar from "./OverviewRangeBar.jsx";

/**
 * OverviewIndicatorCard — Section INDICATEURS CLÉS (Vue d'ensemble, PDF page 7).
 *
 * Layout fidèle au mockup :
 *   label (uppercase) + ⓘ
 *   valeur grosse  unité
 *   hint coloré
 *   range bar horizontale graduée + curseur
 *   delta "+18 % vs 28 avr. - 4 mai"
 *
 * Props :
 *  - label, value, unit, hint, delta (string)
 *  - tone : 1..5
 *  - rangeBar : { value, min, max, ticks, gradient } — config OverviewRangeBar
 */
function OverviewIndicatorCard({
  label = "",
  value = "—",
  unit = "",
  hint = "",
  delta = "",
  tone = 3,
  rangeBar = null,
}) {
  const safeTone = clampTone(tone);

  return (
    <article className={`alpine-overview-indicator-card tone-${safeTone}`}>
      <span className="alpine-overview-indicator-label">{label}</span>
      <div className="alpine-overview-indicator-value-row">
        <strong className={`alpine-overview-indicator-value tone-${safeTone}`}>{value}</strong>
        {unit ? <span className="alpine-overview-indicator-unit">{unit}</span> : null}
      </div>
      {hint ? <span className={`alpine-overview-indicator-hint tone-${safeTone}`}>{hint}</span> : null}

      {rangeBar ? (
        <OverviewRangeBar
          value={rangeBar.value}
          min={rangeBar.min ?? 0}
          max={rangeBar.max ?? 100}
          ticks={rangeBar.ticks || []}
          gradient={rangeBar.gradient || "warm"}
          ariaLabel={label}
        />
      ) : null}

      {delta ? <span className="alpine-overview-indicator-delta">{delta}</span> : null}
    </article>
  );
}

export default memo(OverviewIndicatorCard);
