import { memo } from "react";
import EmptyState from "../visuals/alpine/EmptyState.jsx";
import ProgressionAnnualKpiCard from "./ProgressionAnnualKpiCard.jsx";
import ProgressionWeeklyVolumeChart from "./ProgressionWeeklyVolumeChart.jsx";
import ProgressionCumulativeProgressCard from "./ProgressionCumulativeProgressCard.jsx";
import ProgressionHighlightsCard from "./ProgressionHighlightsCard.jsx";
import ProgressionMonthlyChart from "./ProgressionMonthlyChart.jsx";
import ProgressionRegularityCard from "./ProgressionRegularityCard.jsx";
import ProgressionYoyChartsRow from "./ProgressionYoyChartsRow.jsx";

/**
 * ProgressionOverviewTab — Mockup p.17 Progression > Vue d'ensemble.
 *
 * Layout 5 rows :
 *   Row 1 : Cumul annuel (6 KPI cards)
 *   Row 2 : Volume hebdo (2 col) | Cumulatif | Faits marquants
 *   Row 3 : Progression mensuelle | Régularité | Tendances long terme
 *   Row 4 : Évolution YoY (3 charts cumules)
 *   Footer: Conseil du jour
 */
function ProgressionOverviewTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="progression-overview-tab">
        <EmptyState
          icon="🏔️"
          title="Pas encore assez de données"
          description={model?.emptyReason || "Ajoute des sorties pour construire ta vue d'ensemble."}
        />
      </div>
    );
  }

  return (
    <div className="progression-overview-tab">
      {/* Row 1 — Cumul annuel (6 KPIs) */}
      <div className="progression-overview-annual-row">
        <h3 className="progression-overview-row-title">Cumul annuel</h3>
        <div className="progression-overview-annual-grid">
          {(model.cumulAnnuel || []).map((k) => (
            <ProgressionAnnualKpiCard key={k.key} kpi={k} />
          ))}
        </div>
      </div>

      {/* Row 2 — Volume hebdo | Cumulatif | Faits marquants */}
      <div className="progression-overview-row-2">
        <ProgressionWeeklyVolumeChart data={model.weeklyVolume || {}} />
        <ProgressionCumulativeProgressCard items={model.cumulativeProgress || []} />
        <ProgressionHighlightsCard items={model.highlights || []} />
      </div>

      {/* Row 3 — Progression mensuelle | Régularité */}
      <div className="progression-overview-row-3">
        <ProgressionMonthlyChart data={model.monthlyProgression || {}} />
        <ProgressionRegularityCard data={model.regularity || {}} />
      </div>

      {/* Row 4 — Évolution YoY */}
      <ProgressionYoyChartsRow charts={model.yearOverYearCharts || []} />

      {/* Footer — Conseil */}
      {model.tip ? (
        <div className="progression-overview-tip">
          <span className="progression-overview-tip-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="m3 19 6-11 4 7 2-3 6 7H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span><strong>Conseil du jour</strong> · {model.tip}</span>
          <a className="progression-overview-tip-link" href="#conseils">Voir tous les conseils</a>
        </div>
      ) : null}
    </div>
  );
}

export default memo(ProgressionOverviewTab);
