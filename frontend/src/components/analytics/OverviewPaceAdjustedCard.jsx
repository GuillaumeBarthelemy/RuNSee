import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * OverviewPaceAdjustedCard — Section FOCUS, indicateur "Allure ajustée".
 *
 * Affiche le delta % d'efficience allure/FC ajustée à la pente (GAP).
 * Conforme V5 §7 : vocabulaire canonique "Allure ajustée" (pas "GAP" en titre).
 *
 * Documentation inline (décision utilisateur §3) : note sous la carte +
 * référence scientifique Minetti 2002.
 */
function OverviewPaceAdjustedCard({ summary = {} }) {
  const tone = clampTone(summary.tone || 3);
  const hasData = !!summary.hasData;
  const sign = summary.deltaPercent > 0 ? "+" : "";

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
            <p className="alpine-overview-focus-explain">
              Variation de ton efficience allure / FC corrigée du dénivelé,
              comparée à la période précédente.
              <br />
              <span className="alpine-overview-focus-sample">
                {summary.activityCount} sortie{summary.activityCount > 1 ? "s" : ""} retenue
                {summary.activityCount > 1 ? "s" : ""}.
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
