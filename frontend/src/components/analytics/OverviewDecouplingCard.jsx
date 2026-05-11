import { memo } from "react";
import { Link } from "react-router-dom";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * OverviewDecouplingCard — Section FOCUS, indicateur "Dérive cardiaque".
 *
 * Affiche le % moyen de Pa:Hr decoupling sur la période (pondéré durée).
 * État vide pédagogique si les splits ne sont pas chargés (calculé sur fiche
 * détail activité).
 *
 * Documentation : note + source Allen & Coggan 2010.
 */
function OverviewDecouplingCard({ summary = {} }) {
  const tone = clampTone(summary.tone || 3);
  const hasData = !!summary.hasData;
  const sign = summary.averagePercent > 0 ? "+" : "";

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
              <span className="alpine-overview-focus-unit">%</span>
            </div>
            <span className={`alpine-overview-focus-label tone-${tone}`}>{summary.label}</span>
            <p className="alpine-overview-focus-explain">
              Variation du ratio allure / FC entre la 1ʳᵉ et la 2ᵉ moitié
              de tes sorties. Plus c'est bas, mieux ton organisme tient la
              durée à FC stable.
              <br />
              <span className="alpine-overview-focus-sample">
                {summary.sampleSize} sortie{summary.sampleSize > 1 ? "s" : ""} avec splits exploitables.
              </span>
            </p>
          </>
        ) : (
          <div className="alpine-overview-focus-empty-block">
            <p className="alpine-overview-focus-empty">
              La dérive cardiaque est calculée par activité à partir des splits.
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
