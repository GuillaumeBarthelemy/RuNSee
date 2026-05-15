import { memo } from "react";
import { Link } from "react-router-dom";
import { clampTone } from "../../utils/tonePicker.js";
import OverviewRangeBar from "./OverviewRangeBar.jsx";

/**
 * OverviewDecouplingCard — Section FOCUS, "Dérive cardiaque" (Lot 04 v2).
 *
 * Mockup PDF page 7 :
 *   - valeur centrale "+3,1 %"
 *   - unité "/10 km"
 *   - hint "Bonne"
 *   - delta "-0,4 % vs 28 avr. - 4 mai"
 *   - texte explicatif
 *   - range bar gradient (0% vert = excellent, 10% rouge = dérive marquée)
 *
 * Si pas de splits disponibles (Vue d'ensemble agrégée), empty state pédagogique.
 *
 * Source : Allen & Coggan (2010), Training and Racing with a Power Meter.
 */
function OverviewDecouplingCard({ summary = {}, comparisonLabel = "" }) {
  const tone = clampTone(summary.tone || 3);
  const hasData = !!summary.hasData;
  const sign = summary.averagePercent > 0 ? "+" : summary.averagePercent < 0 ? "" : "";
  const deltaText = comparisonLabel && summary.compareDeltaPercent != null
    ? `${summary.compareDeltaPercent >= 0 ? "+" : ""}${summary.compareDeltaPercent.toFixed(1)} % vs ${comparisonLabel}`
    : "";

  return (
    <article className={`alpine-overview-focus-card tone-${tone}`}>
      <header className="alpine-overview-focus-head">
        <span className="alpine-overview-focus-kicker">Endurance</span>
        <h3 className="alpine-overview-focus-title">Dérive cardiaque</h3>
      </header>

      <div className="alpine-overview-focus-body">
        {hasData ? (
          <>
            <div className="alpine-overview-focus-value-block">
              <strong className={`alpine-overview-focus-value tone-${tone}`}>
                {sign}{summary.averagePercent}
              </strong>
              <span className="alpine-overview-focus-unit">% /10 km</span>
            </div>
            <span className={`alpine-overview-focus-label tone-${tone}`}>{summary.label}</span>
            {deltaText ? <span className="alpine-overview-focus-delta">{deltaText}</span> : null}

            {/* Range bar gradient warm (0% vert, 10% rouge) */}
            <OverviewRangeBar
              value={summary.averagePercent}
              min={0}
              max={10}
              ticks={[
                { value: 0, label: "0%" },
                { value: 5, label: "5%" },
                { value: 10, label: "10%" },
              ]}
              gradient="warm"
              ariaLabel="Dérive cardiaque"
            />

            <p className="alpine-overview-focus-explain">
              Ta FC augmente {summary.averagePercent < 2 ? "très peu" : summary.averagePercent < 5 ? "modérément" : "nettement"}
              {" "}pour une même allure. {summary.averagePercent < 5 ? "Bonne gestion de l'effort." : "Marge à reconquérir sur la durée."}
              <br />
              <span className="alpine-overview-focus-sample">
                {summary.sampleSize} sortie{summary.sampleSize > 1 ? "s" : ""} avec splits exploitables.
              </span>
            </p>
          </>
        ) : (
          <div className="alpine-overview-focus-empty-block">
            <p className="alpine-overview-focus-empty">
              Aucune activité avec dérive précalculée sur la période. Le calcul
              s'effectue automatiquement à chaque sortie détaillée.
            </p>
            <Link to="/activities" className="alpine-overview-focus-link">
              Voir le détail par sortie →
            </Link>
          </div>
        )}
      </div>

      <p className="alpine-overview-focus-source">
        Méthode : Allen H, Coggan AR (2010), <i>Training and Racing with a Power Meter</i>, 2ᵉ éd.
      </p>
    </article>
  );
}

export default memo(OverviewDecouplingCard);
