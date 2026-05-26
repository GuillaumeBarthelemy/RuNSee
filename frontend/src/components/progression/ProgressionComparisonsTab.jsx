import { memo } from "react";
import EmptyState from "../visuals/alpine/EmptyState.jsx";
import ProgressionComparisonsKpiCard from "./ProgressionComparisonsKpiCard.jsx";
import ProgressionMonthlyComparisonChart from "./ProgressionMonthlyComparisonChart.jsx";
import ProgressionTwelveWeeksChart from "./ProgressionTwelveWeeksChart.jsx";
import ProgressionSportBreakdownCard from "./ProgressionSportBreakdownCard.jsx";
import ProgressionTerrainElevationCard from "./ProgressionTerrainElevationCard.jsx";
import ProgressionInsightsCards from "./ProgressionInsightsCards.jsx";

/**
 * ProgressionComparisonsTab — Mockup p.20.
 *
 * Layout :
 *   Row 1 : 4 KPI cards
 *   Row 2 : Volume mensuel YoY | 12 semaines comparison
 *   Row 3 : Repartition sport | Terrain & denivele
 *   Row 4 : Ce qui progresse | À surveiller
 *   Footer: Conseil du coach
 */
function ProgressionComparisonsTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="progression-comparisons-tab">
        <EmptyState
          icon="🏔️"
          title="Pas encore assez de données"
          description={model?.emptyReason || "Ajoute des sorties pour comparer tes périodes."}
        />
      </div>
    );
  }

  return (
    <div className="progression-comparisons-tab">
      <div className="progression-comparisons-kpi-row">
        {(model.kpi || []).map((k) => (
          <ProgressionComparisonsKpiCard key={k.key} kpi={k} />
        ))}
      </div>

      <div className="progression-comparisons-row-2">
        <ProgressionMonthlyComparisonChart data={model.monthlyComparison || {}} />
        <ProgressionTwelveWeeksChart data={model.twelveWeeksComparison || {}} />
      </div>

      <div className="progression-comparisons-row-3">
        <ProgressionSportBreakdownCard data={model.sportBreakdown || {}} />
        <ProgressionTerrainElevationCard data={model.terrainElevation || {}} />
      </div>

      <ProgressionInsightsCards
        progressItems={model.progressItems || []}
        watchItems={model.watchItems || []}
      />

      {model.coachAdvice ? (
        <div className="progression-overview-tip">
          <span className="progression-overview-tip-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="m3 19 6-11 4 7 2-3 6 7H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span><strong>Conseil du coach</strong> · {model.coachAdvice}</span>
          <a className="progression-overview-tip-link" href="#conseils">Voir tous les conseils</a>
        </div>
      ) : null}
    </div>
  );
}

export default memo(ProgressionComparisonsTab);
