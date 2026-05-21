import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import PerformanceVdotHistoryChart from "./PerformanceVdotHistoryChart.jsx";
import PerformanceProfileRadar from "./PerformanceProfileRadar.jsx";
import PerformanceProfileBars from "./PerformanceProfileBars.jsx";
import PerformanceConfidenceGauge from "./PerformanceConfidenceGauge.jsx";
import PerformanceLimitsCard from "./PerformanceLimitsCard.jsx";
import PerformanceTakeawayCard from "./PerformanceTakeawayCard.jsx";

/**
 * PerformanceVdotProfileTab — Onglet `Performance > VDOT & profil` (page 13 du plan).
 * Layout aligne mockup p.13.
 */
function PerformanceVdotProfileTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="performance-vdot-profile-tab">
        <PerformanceEmptyState message={model.emptyReason || "Estimation indisponible. Plus d'activités récentes sont nécessaires."} />
      </div>
    );
  }

  return (
    <div className="performance-vdot-profile-tab">
      {/* Row 1 : VDOT KPI (1/3) + Évolution 90j (2/3) */}
      <div className="performance-vdot-grid-row-1">
        <section className="performance-panel performance-vdot-kpi-card">
          <div className="performance-panel-head">
            <h3>VDOT estimé</h3>
            <span className="performance-panel-sub">(Daniels 1979)</span>
          </div>
          <strong className="performance-vdot-kpi-value">{model.kpi.formattedVdot}</strong>
          <span className={`performance-vdot-kpi-hint tone-${model.kpi.level?.tone || "neutral"}`}>
            {model.kpi.level?.label || "Profil estimé"}
          </span>
          <div className="performance-vdot-kpi-meta">
            <small>Score profil global</small>
            <strong>{model.kpi.profileScore}/100</strong>
          </div>
        </section>

        <PerformanceVdotHistoryChart history={model.history} />
      </div>

      {/* Row 2 : Radar (1/2) + Bars (1/2) */}
      <div className="performance-vdot-grid-row-2">
        <PerformanceProfileRadar axes={model.profile5D} />
        <PerformanceProfileBars axes={model.profile5D} />
      </div>

      {/* Row 3 : Indicateurs clés (1/3) + Confiance gauge (1/3) + Limites (1/3) */}
      <div className="performance-vdot-grid-row-3">
        <section className="performance-panel performance-vdot-key-indicators">
          <div className="performance-panel-head">
            <h3>Indicateurs clés estimés</h3>
            <span className="performance-panel-sub">(allures prudentes)</span>
          </div>
          {Array.isArray(model.keyIndicators) && model.keyIndicators.length ? (
            <ul className="performance-vdot-key-indicators-list">
              {model.keyIndicators.map((row) => (
                <li key={row.distanceLabel || row.label || row.key}>
                  <span>{row.distanceLabel || row.label || ""}</span>
                  <b>{row.timeLabel || row.value || "—"}</b>
                </li>
              ))}
            </ul>
          ) : (
            <PerformanceEmptyState message="Pas encore assez de records pour des prédictions stables." />
          )}
        </section>

        <PerformanceConfidenceGauge confidence={model.confidence} />
        <PerformanceLimitsCard limits={model.limits} />
      </div>

      {/* Row 4 : À retenir (full width) */}
      <PerformanceTakeawayCard takeaway={model.takeaway} confidence={model.confidence} />
    </div>
  );
}

export default memo(PerformanceVdotProfileTab);
