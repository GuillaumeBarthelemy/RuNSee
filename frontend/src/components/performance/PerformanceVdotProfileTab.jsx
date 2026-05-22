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
 * Layout 2 colonnes :
 *   - Colonne centrale (2x2 grid) :
 *       Row 1 : VDOT KPI    | Radar (memes hauteurs via stretch)
 *       Row 2 : Decomposition | Indicateurs cles (memes hauteurs via stretch)
 *   - Colonne droite (rail vertical) : Profil indicatif / Confiance / Limites / À retenir
 *   - Footer : Conseil du jour (full width)
 *
 * Optimisation : align-items:stretch dans la grille centrale -> meme hauteur
 * par ligne. Cards rail = hauteur naturelle. Pas d'espace blanc force.
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
      <div className="performance-vdot-layout">
        <div className="performance-vdot-central">
          <PerformanceVdotKpiCard
            kpi={model.kpi}
            history={model.history}
            deltaLabel={model.delta90Days?.label || ""}
            deltaTone={model.delta90Days?.tone || "neutral"}
          />
          <PerformanceProfileRadar axes={model.profile5D} referenceVdot={model.referenceVdot} />
          <PerformanceProfileBars axes={model.profile5D} referenceVdot={model.referenceVdot} />
          <PerformanceVdotKeyIndicators indicators={model.indicators} />
        </div>

        <aside className="performance-vdot-right-rail">
          <PerformanceProfileIndicatifCard />
          <PerformanceConfidenceGauge confidence={model.confidence} />
          <PerformanceLimitsCard limits={model.limits} />
          <PerformanceTakeawayCard takeaway={model.takeaway} confidence={null} />
        </aside>
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
