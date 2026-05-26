import { memo } from "react";
import EmptyState from "../visuals/alpine/EmptyState.jsx";
import ProgressionRegularityKpiCard from "./ProgressionRegularityKpiCard.jsx";
import ProgressionRegularityHeatmap from "./ProgressionRegularityHeatmap.jsx";
import ProgressionWeeklyFrequencyChart from "./ProgressionWeeklyFrequencyChart.jsx";
import ProgressionWeekdayBreakdown from "./ProgressionWeekdayBreakdown.jsx";
import ProgressionStreakTimeline from "./ProgressionStreakTimeline.jsx";
import ProgressionRegularityTakeawayCard from "./ProgressionRegularityTakeawayCard.jsx";

/**
 * ProgressionRegularityTab — Mockup p.19.
 *
 * Layout :
 *   Row 1 : 4 KPI cards
 *   Row 2 : Heatmap (large) | Rail droit "À retenir" (sticky)
 *   Row 3 : Frequence hebdo | Repartition par jour
 *   Row 4 : Timeline serie de regularite
 *   Footer: Conseil du coach
 */
function ProgressionRegularityTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="progression-regularity-tab">
        <EmptyState
          icon="🏔️"
          title="Pas encore assez de données"
          description={model?.emptyReason || "Ajoute des sorties pour évaluer ta régularité."}
        />
      </div>
    );
  }

  return (
    <div className="progression-regularity-tab">
      <div className="progression-regularity-kpi-row">
        {(model.kpi || []).map((k) => (
          <ProgressionRegularityKpiCard key={k.key} kpi={k} />
        ))}
      </div>

      <div className="progression-regularity-row-2">
        <div className="progression-regularity-row-2-main">
          <ProgressionRegularityHeatmap data={model.heatmap || {}} />
          <div className="progression-regularity-row-3">
            <ProgressionWeeklyFrequencyChart data={model.weeklyFrequency || []} />
            <ProgressionWeekdayBreakdown items={model.weekdayBreakdown || []} />
          </div>
          <ProgressionStreakTimeline data={model.streakTimeline || {}} />
        </div>
        <ProgressionRegularityTakeawayCard
          items={model.takeaways || []}
          tipCard={model.tipCard || null}
        />
      </div>

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

export default memo(ProgressionRegularityTab);
