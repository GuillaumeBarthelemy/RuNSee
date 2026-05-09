import { memo } from "react";
import InfoTooltip from "../../InfoTooltip.jsx";

/**
 * SectionHeader — Alpine Light (Lot 1).
 *
 * En-tête d'une section ou d'une carte. Pour les cartes simples, préférer
 * directement le titre de la KpiCard. SectionHeader est utilisé pour
 * regrouper plusieurs cartes sous un même thème.
 *
 * Props :
 * - kicker : petit label (ex: "Charges")
 * - title : string
 * - subtitle : string optionnel
 * - info : array d'items pour InfoTooltip (compact)
 * - actions : ReactNode optionnel
 */
function SectionHeader({
  kicker = "",
  title = "",
  subtitle = "",
  info = null,
  actions = null,
}) {
  return (
    <div className="alpine-section-header">
      <div className="alpine-section-header-text">
        {kicker ? <span className="alpine-section-header-kicker">{kicker}</span> : null}
        <div className="alpine-section-header-title-row">
          {title ? <h2 className="alpine-section-header-title">{title}</h2> : null}
          {info && info.length ? (
            <InfoTooltip
              title={title || kicker}
              content={info}
              label={`Afficher l'aide pour ${title || kicker}`}
              compact
            />
          ) : null}
        </div>
        {subtitle ? <p className="alpine-section-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="alpine-section-header-actions">{actions}</div> : null}
    </div>
  );
}

export default memo(SectionHeader);
