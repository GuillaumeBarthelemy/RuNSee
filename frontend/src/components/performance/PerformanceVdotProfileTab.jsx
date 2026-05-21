import { memo } from "react";
import CoachAdviceBar from "../visuals/alpine/CoachAdviceBar.jsx";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import PerformanceVdotKpiCard from "./PerformanceVdotKpiCard.jsx";
import PerformanceProfileRadar from "./PerformanceProfileRadar.jsx";
import PerformanceProfileIndicatifCard from "./PerformanceProfileIndicatifCard.jsx";
import PerformanceConfidenceGauge from "./PerformanceConfidenceGauge.jsx";
import PerformanceProfileBars from "./PerformanceProfileBars.jsx";
import PerformanceVdotKeyIndicators from "./PerformanceVdotKeyIndicators.jsx";
import PerformanceLimitsCard from "./PerformanceLimitsCard.jsx";
import PerformanceTakeawayCard from "./PerformanceTakeawayCard.jsx";

/**
 * PerformanceVdotProfileTab — Onglet `Performance > VDOT & profil` (mockup p.13).
 *
 * Layout :
 *   Row 1 (3 cols) : VDOT KPI+histo | Radar | Profil indicatif + Confiance empilés
 *   Row 2 (3 cols) : Décomposition bars | Indicateurs clés | Limites + À retenir empilés
 *   Row 3         : Conseil du jour (full width)
 */
function PerformanceVdotProfileTab({ model = {}, coachAdvice = null }) {
  if (!model?.hasData) {
    return (
      <div className="performance-vdot-profile-tab">
        <PerformanceEmptyState message={model.emptyReason || "Estimation indisponible. Plus d'activités récentes sont nécessaires."} />
      </div>
    );
  }

  return (
    <div className="performance-vdot-profile-tab">
      <div className="performance-vdot-row-top">
        <PerformanceVdotKpiCard
          kpi={model.kpi}
          history={model.history}
          deltaLabel={model.delta90Days?.label || ""}
          deltaTone={model.delta90Days?.tone || "neutral"}
        />
        <PerformanceProfileRadar axes={model.profile5D} referenceVdot={model.referenceVdot} />
        <div className="performance-vdot-row-top-rail">
          <PerformanceProfileIndicatifCard />
          <PerformanceConfidenceGauge confidence={model.confidence} />
        </div>
      </div>

      <div className="performance-vdot-row-middle">
        <PerformanceProfileBars axes={model.profile5D} referenceVdot={model.referenceVdot} />
        <PerformanceVdotKeyIndicators indicators={model.indicators} />
        <div className="performance-vdot-row-middle-rail">
          <PerformanceLimitsCard limits={model.limits} />
          <PerformanceTakeawayCard takeaway={model.takeaway} confidence={null} />
        </div>
      </div>

      {coachAdvice ? (
        <div className="performance-vdot-coach-bar">
          <CoachAdviceBar
            tone="info"
            icon={(
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M3 19 9 8l4 7 2-3 6 7H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            )}
          >
            {coachAdvice}
          </CoachAdviceBar>
          <a className="performance-vdot-coach-bar-link" href="#allures">Voir tous les conseils</a>
        </div>
      ) : null}
    </div>
  );
}

export default memo(PerformanceVdotProfileTab);
