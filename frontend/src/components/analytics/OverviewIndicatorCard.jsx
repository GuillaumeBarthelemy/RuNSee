import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * OverviewIndicatorCard — Vue d'ensemble PDF page 7, section INDICATEURS CLÉS.
 *
 * Carte horizontale : label + valeur grosse + unit + hint + delta + mini bar chart.
 *
 * Props :
 *  - label, value, unit, hint, delta (string)
 *  - tone : 1..5
 *  - series : number[] (mini bar chart, 7-14 valeurs)
 *  - seriesMax : number optionnel (échelle Y forcée)
 */
function OverviewIndicatorCard({
  label = "",
  value = "—",
  unit = "",
  hint = "",
  delta = "",
  tone = 3,
  series = [],
  seriesMax = null,
}) {
  const safeTone = clampTone(tone);
  const valid = series.filter((v) => v != null && Number.isFinite(v));
  const max = seriesMax ?? (valid.length ? Math.max(...valid) * 1.1 : 1);

  return (
    <article className={`alpine-overview-indicator-card tone-${safeTone}`}>
      <span className="alpine-overview-indicator-label">{label}</span>
      <div className="alpine-overview-indicator-value-row">
        <strong className={`alpine-overview-indicator-value tone-${safeTone}`}>{value}</strong>
        {unit ? <span className="alpine-overview-indicator-unit">{unit}</span> : null}
      </div>
      {hint ? <span className={`alpine-overview-indicator-hint tone-${safeTone}`}>{hint}</span> : null}
      {delta ? <span className="alpine-overview-indicator-delta">{delta}</span> : null}

      {valid.length >= 2 ? (
        <div className="alpine-overview-indicator-bars" aria-hidden="true">
          {series.map((v, idx) => {
            const isLast = idx === series.length - 1;
            if (v == null || !Number.isFinite(v) || v <= 0) {
              return <span key={idx} className="alpine-overview-indicator-bar is-empty" />;
            }
            const h = Math.max(8, (v / Math.max(1, max)) * 100);
            return (
              <span
                key={idx}
                className={`alpine-overview-indicator-bar tone-${safeTone} ${isLast ? "is-last" : ""}`.trim()}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

export default memo(OverviewIndicatorCard);
