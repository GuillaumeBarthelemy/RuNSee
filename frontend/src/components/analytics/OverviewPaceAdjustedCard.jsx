import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";
import OverviewRangeBar from "./OverviewRangeBar.jsx";

/**
 * OverviewPaceAdjustedCard — Section FOCUS, "Allure ajustée" (Lot 04 v2).
 *
 * Mockup PDF page 7 :
 *   - valeur centrale "+7,2 %"
 *   - hint "Excellent"
 *   - delta "+1,1 % vs 28 avr. - 4 mai"
 *   - explication courte
 *   - range bar gradient (centre vert = bon, bords rouges)
 *
 * Source : Minetti AE et al. (2002), GAP corrigée du dénivelé.
 */
function OverviewPaceAdjustedCard({ summary = {}, comparisonLabel = "" }) {
  const tone = clampTone(summary.tone || 3);
  const hasData = !!summary.hasData;
  const sign = summary.deltaPercent > 0 ? "+" : summary.deltaPercent < 0 ? "" : "";
  const deltaText = comparisonLabel && summary.compareDeltaPercent != null
    ? `${summary.compareDeltaPercent >= 0 ? "+" : ""}${summary.compareDeltaPercent.toFixed(1)} % vs ${comparisonLabel}`
    : "";

  return (
    <article className={`alpine-overview-focus-card tone-${tone}`}>
      <header className="alpine-overview-focus-head">
        <span className="alpine-overview-focus-kicker">Performance</span>
        <h3 className="alpine-overview-focus-title">Allure ajustée</h3>
      </header>

      <div className="alpine-overview-focus-body">
        {hasData ? (
          <>
            <div className="alpine-overview-focus-value-block">
              <strong className={`alpine-overview-focus-value tone-${tone}`}>
                {sign}{summary.deltaPercent}
              </strong>
              <span className="alpine-overview-focus-unit">%</span>
            </div>
            <span className={`alpine-overview-focus-label tone-${tone}`}>{summary.label}</span>
            {deltaText ? <span className="alpine-overview-focus-delta">{deltaText}</span> : null}

            {/* Range bar gradient polaire (centre = optimal) */}
            <OverviewRangeBar
              value={summary.deltaPercent}
              min={-10}
              max={10}
              ticks={[
                { value: -10, label: "-10%" },
                { value: 0, label: "0" },
                { value: 10, label: "+10%" },
              ]}
              gradient="polar"
              ariaLabel="Allure ajustée"
            />

            <p className="alpine-overview-focus-explain">
              Ton allure ajustée à la pente est{" "}
              {summary.deltaPercent > 0 ? "supérieure" : "inférieure"} à ton allure terrain
              {" "}de {Math.abs(summary.deltaPercent)} % en moyenne.
              <br />
              <span className="alpine-overview-focus-sample">
                {summary.activityCount} sortie{summary.activityCount > 1 ? "s" : ""} retenue{summary.activityCount > 1 ? "s" : ""}.
              </span>
            </p>
          </>
        ) : (
          <p className="alpine-overview-focus-empty">
            Pas encore assez de sorties exploitables sur la période.
          </p>
        )}
      </div>

      <p className="alpine-overview-focus-source">
        Méthode : Minetti AE et al. (2002), <i>J Appl Physiol</i> 93(3):1039–1046.
      </p>
    </article>
  );
}

export default memo(OverviewPaceAdjustedCard);
