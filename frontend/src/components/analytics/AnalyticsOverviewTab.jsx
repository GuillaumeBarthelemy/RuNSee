import { memo } from "react";
import AnalysisConfidenceBadge from "../AnalysisConfidenceBadge.jsx";
import TrainingSummaryKpiGrid from "../TrainingSummaryKpiGrid.jsx";
import AnalyticsTakeawayCard from "./AnalyticsTakeawayCard.jsx";

/**
 * AnalyticsOverviewTab — onglet "Vue d'ensemble" (Lot 04, plan §4).
 *
 * Affiche en 3 blocs :
 *   1. Carte "À retenir" avec score composite d'état d'entraînement (TSB+ACWR+Monotony+VFC).
 *   2. Badge de confiance d'analyse (`AnalysisConfidenceBadge`).
 *   3. Grille KPI synthèse (`TrainingSummaryKpiGrid`).
 *
 * Props :
 *  - trainingState : sortie de computeTrainingStateScore
 *  - confidence    : sortie de buildAnalyticsConfidence
 *  - loadModel     : trainingLoadModel
 *  - efficiencyModel
 *  - kpiInfoMap    : copy info pour les KPIs
 */
function AnalyticsOverviewTab({
  trainingState = null,
  confidence = null,
  loadModel = {},
  efficiencyModel = {},
  kpiInfoMap = {},
}) {
  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--overview">
      <AnalyticsTakeawayCard state={trainingState} />

      {confidence ? (
        <div className="alpine-analytics-tab-section">
          <AnalysisConfidenceBadge confidence={confidence} />
        </div>
      ) : null}

      <div className="alpine-analytics-tab-section">
        <TrainingSummaryKpiGrid
          loadModel={loadModel}
          efficiencyModel={efficiencyModel}
          infoMap={kpiInfoMap}
          includeEfficiency={false}
          className="kpi-grid kpi-grid-primary"
          showHints={false}
          showMeta={false}
        />
      </div>
    </div>
  );
}

export default memo(AnalyticsOverviewTab);
