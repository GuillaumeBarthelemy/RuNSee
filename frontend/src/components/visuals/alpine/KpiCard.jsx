import { memo } from "react";
import TrendChip from "../TrendChip.jsx";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * KpiCard — Alpine Light (Lot 1).
 *
 * Carte KPI pour les indicateurs principaux (Charge 7j, Fatigue, Volume, etc.).
 * Format : label / valeur / unité / sous-label / trend chip optionnel.
 *
 * Props :
 * - label : string (ex: "Charge (7 j)")
 * - value : string|number à afficher
 * - unit : string optionnel (ex: "pts", "km")
 * - hint : string optionnel (sous-label, ex: "Bloc standard")
 * - tone : 1..5 — applique une bordure latérale colorée
 * - trend : { delta, unit, direction?, tone?, label? } — TrendChip optionnel
 * - icon : ReactNode optionnel
 * - footer : ReactNode optionnel (mini-graphe ou autre)
 */
function KpiCard({
  label = "",
  value = "—",
  unit = "",
  hint = "",
  tone = null,
  trend = null,
  icon = null,
  footer = null,
}) {
  const toneClass = tone != null ? `alpine-kpi-card-tone-${clampTone(tone)}` : "";

  return (
    <article className={`alpine-kpi-card ${toneClass}`.trim()}>
      <header className="alpine-kpi-card-head">
        {icon ? <span className="alpine-kpi-card-icon" aria-hidden="true">{icon}</span> : null}
        <span className="alpine-kpi-card-label">{label}</span>
      </header>
      <div className="alpine-kpi-card-value-row">
        <strong className="alpine-kpi-card-value">{value}</strong>
        {unit ? <span className="alpine-kpi-card-unit">{unit}</span> : null}
      </div>
      <div className="alpine-kpi-card-meta">
        {hint ? <span className="alpine-kpi-card-hint">{hint}</span> : null}
        {trend ? (
          <TrendChip
            delta={trend.delta}
            unit={trend.unit ?? ""}
            direction={trend.direction}
            tone={trend.tone ?? tone ?? 3}
            label={trend.label ?? ""}
          />
        ) : null}
      </div>
      {footer ? <div className="alpine-kpi-card-footer">{footer}</div> : null}
    </article>
  );
}

export default memo(KpiCard);
