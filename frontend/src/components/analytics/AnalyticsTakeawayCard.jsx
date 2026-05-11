import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * AnalyticsTakeawayCard — Alpine Light (Lot 04).
 *
 * Carte "À retenir" qui synthétise l'état d'entraînement. Affiche :
 *   - un score composite (0-100) calculé scientifiquement
 *   - le libellé qualitatif (Construction optimale / Bonne forme / Vigilance / …)
 *   - les contributions (TSB, ACWR, Monotony, VFC) avec leur poids relatif
 *   - les signaux manquants (transparence)
 *
 * Refs : voir utils/analyticsTrainingState.js
 *
 * Props :
 *  - state : { score, label, tone, contributions, missingSignals } (computeTrainingStateScore output)
 *  - kicker (str)
 *  - title (str)
 */

const MISSING_LABELS = {
  tsb: "Forme (TSB)",
  acwr: "Charge actuelle vs base (ACWR)",
  monotony: "Variabilité de charge",
  hrvDelta: "Tendance VFC",
};

function formatContributionValue(key, value) {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (key) {
    case "tsb":      return `${value > 0 ? "+" : ""}${Math.round(value)} pts`;
    case "acwr":     return value.toFixed(2);
    case "monotony": return value.toFixed(2);
    case "hrvDelta": return `${value > 0 ? "+" : ""}${Math.round(value)} %`;
    default:         return `${value}`;
  }
}

function AnalyticsTakeawayCard({
  state = null,
  kicker = "État d'entraînement",
  title = "À retenir",
}) {
  if (!state) return null;

  const tone = clampTone(state.tone || 3);
  const hasScore = Number.isFinite(state.score);

  return (
    <article className={`alpine-takeaway-card tone-${tone}`}>
      <header className="alpine-takeaway-card-head">
        <span className="alpine-takeaway-card-kicker">{kicker}</span>
        <h3 className="alpine-takeaway-card-title">{title}</h3>
      </header>

      <div className="alpine-takeaway-card-score">
        <div className="alpine-takeaway-card-score-value">
          {hasScore ? (
            <>
              <strong className={`alpine-takeaway-card-score-number tone-${tone}`}>
                {state.score}
              </strong>
              <span className="alpine-takeaway-card-score-unit">/100</span>
            </>
          ) : (
            <strong className="alpine-takeaway-card-score-number tone-3">—</strong>
          )}
        </div>
        <span className={`alpine-takeaway-card-score-label tone-${tone}`}>
          {state.label}
        </span>
      </div>

      {state.contributions && state.contributions.length > 0 ? (
        <div className="alpine-takeaway-card-contributions">
          <h4 className="alpine-takeaway-card-contributions-title">Composantes du score</h4>
          <ul>
            {state.contributions.map((c) => (
              <li key={c.key}>
                <div className="alpine-takeaway-card-contribution-row">
                  <span className="alpine-takeaway-card-contribution-label">{c.label}</span>
                  <span className="alpine-takeaway-card-contribution-weight">{c.weight} %</span>
                </div>
                <div className="alpine-takeaway-card-contribution-meta">
                  <span>Valeur : {formatContributionValue(c.key, c.value)}</span>
                  <span>Sous-score : {c.subScore}/100</span>
                </div>
                <div className="alpine-takeaway-card-contribution-source">{c.source}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.missingSignals && state.missingSignals.length > 0 ? (
        <p className="alpine-takeaway-card-missing">
          Signaux indisponibles :{" "}
          {state.missingSignals.map((k) => MISSING_LABELS[k] || k).join(", ")}.
          Les poids ont été renormalisés sur les signaux présents.
        </p>
      ) : null}
    </article>
  );
}

export default memo(AnalyticsTakeawayCard);
