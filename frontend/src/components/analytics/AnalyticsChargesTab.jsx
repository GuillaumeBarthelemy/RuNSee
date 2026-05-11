import { memo } from "react";
import RollingLoadChart from "../RollingLoadChart.jsx";
import DynamicsGrid from "../DynamicsGrid.jsx";

/**
 * AnalyticsChargesTab — onglet "Charges" (Lot 04, plan §4).
 *
 * Concentre les indicateurs de charge :
 *   - RollingLoadChart : CTL (condition) + ATL (fatigue) + TSB (fraîcheur) + barres charge journalière.
 *   - DynamicsGrid : variance charge (Foster monotony+strain), polarisation,
 *     dynamiques charge (ACWR EWMA Gabbett 2016, détraining, time-to-recover),
 *     vitesse critique.
 *
 * Aucun calcul métier dans ce composant — il consomme uniquement les view
 * models déjà construits par utils/trainingMetrics.js, trainingIntelligence.js
 * et loadDynamics.js.
 */
function AnalyticsChargesTab({
  trainingLoadModel = {},
  loadVarianceModel = {},
  polarizationModel = {},
  loadDynamicsProfile = {},
  criticalSpeedModel = {},
  signalInfo = {},
  loadDynamicsInfo = {},
  dynamicsCardInfo = {},
  loadChartInfo = {},
  loadChartNarrative = "",
}) {
  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--charges">
      <div className="alpine-analytics-tab-section">
        <RollingLoadChart
          data={trainingLoadModel.chartData}
          metric="load"
          granularity={trainingLoadModel.granularity}
          title="Charge, condition, fatigue et fraîcheur"
          subtitle="Modèle Banister — CTL (condition), ATL (fatigue), TSB (fraîcheur)."
          info={loadChartInfo}
          shortKey="atl"
          longKey="ctl"
          freshnessKey="tsb"
          shortLabel="Fatigue (ATL)"
          longLabel="Condition (CTL)"
          freshnessLabel="Fraîcheur (TSB)"
          barKey="load"
          barLabel="Charge du jour"
          showFreshness
          showBar
          showFreshnessZones
          insight={loadChartNarrative}
        />
      </div>

      <div className="alpine-analytics-tab-section">
        <DynamicsGrid
          loadVarianceModel={loadVarianceModel}
          polarizationModel={polarizationModel}
          loadDynamicsProfile={loadDynamicsProfile}
          criticalSpeedModel={criticalSpeedModel}
          signalInfo={signalInfo}
          loadDynamicsInfo={loadDynamicsInfo}
          cardInfo={dynamicsCardInfo}
        />
      </div>
    </div>
  );
}

export default memo(AnalyticsChargesTab);
