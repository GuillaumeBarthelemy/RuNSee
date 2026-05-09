import { memo } from "react";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * MetricRow — Alpine Light (Lot 1).
 *
 * Ligne label / valeur / contexte avec tone optionnel.
 * Idéal pour listes denses (FC repos / VFC / Sommeil...) sans création de
 * carte par item.
 *
 * Props :
 * - label : string (ex: "FC repos")
 * - value : string|number
 * - unit : string optionnel
 * - hint : string optionnel (à droite, sous-texte)
 * - tone : 1..5 — applique une couleur sur la valeur
 * - icon : ReactNode optionnel
 */
function MetricRow({
  label = "",
  value = "—",
  unit = "",
  hint = "",
  tone = null,
  icon = null,
}) {
  const toneClass = tone != null ? `tone-${clampTone(tone)}` : "";

  return (
    <div className="alpine-metric-row">
      <div className="alpine-metric-row-label">
        {icon ? <span className="alpine-metric-row-icon" aria-hidden="true">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="alpine-metric-row-value-block">
        <span className={`alpine-metric-row-value ${toneClass}`.trim()}>
          {value}
          {unit ? <span className="alpine-metric-row-unit">{unit}</span> : null}
        </span>
        {hint ? <span className="alpine-metric-row-hint">{hint}</span> : null}
      </div>
    </div>
  );
}

export default memo(MetricRow);
