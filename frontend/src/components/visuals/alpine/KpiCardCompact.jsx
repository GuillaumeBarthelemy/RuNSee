import { memo } from "react";
import KpiGaugeCircular from "./KpiGaugeCircular.jsx";
import InfoTooltip from "../../InfoTooltip.jsx";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * KpiCardCompact — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Carte KPI compacte pour la grille du haut Dashboard. Variante avec icône
 * colorée à gauche dans un chip arrondi (Charge / Fatigue / Volume / Dénivelé)
 * OU jauge circulaire à droite (Récupération / Disponibilité).
 *
 * Props :
 * - label : string (ex: "Charge (7 j)")
 * - value : string|number (ex: "68" ou "7h32")
 * - unit : string optionnel (ex: "/100", "m")
 * - hint : string optionnel (sous-label, ex: "Correcte")
 * - delta : string optionnel (ex: "+4 vs hier")
 * - tone : 1..5
 * - icon : ReactNode optionnel (icône à gauche)
 * - gauge : { value, tone } optionnel (jauge circulaire à droite)
 *   Si présent, l'icône à gauche est remplacée par le label seul
 */
function KpiCardCompact({
  label = "",
  value = "—",
  unit = "",
  hint = "",
  delta = "",
  tone = null,
  icon = null,
  gauge = null,
  glossaryKey = "",
  help = "",
}) {
  const toneClass = tone != null ? `alpine-kpi-compact-tone-${clampTone(tone)}` : "";

  return (
    <article className={`alpine-kpi-compact ${toneClass}`.trim()}>
      {icon && !gauge ? (
        <span className={`alpine-kpi-compact-icon tone-${clampTone(tone)}-bg`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="alpine-kpi-compact-body">
        {glossaryKey && help ? (
          <span className="title-with-info">
            <span className="alpine-kpi-compact-label">{label}</span>
            <InfoTooltip
              compact
              title={label}
              glossaryKey={glossaryKey}
              content={[{ text: help }]}
              label={`Afficher l'aide pour ${label}`}
            />
          </span>
        ) : (
          <span className="alpine-kpi-compact-label">{label}</span>
        )}
        <div className="alpine-kpi-compact-value-row">
          <strong className="alpine-kpi-compact-value">{value}</strong>
          {unit ? <span className="alpine-kpi-compact-unit">{unit}</span> : null}
        </div>
        {hint ? <span className={`alpine-kpi-compact-hint tone-${clampTone(tone)}`}>{hint}</span> : null}
        {delta ? <span className="alpine-kpi-compact-delta">{delta}</span> : null}
      </div>
      {gauge ? (
        <KpiGaugeCircular
          value={gauge.value}
          tone={gauge.tone ?? tone ?? 3}
          size="md"
          unit=""
        />
      ) : null}
    </article>
  );
}

export default memo(KpiCardCompact);
