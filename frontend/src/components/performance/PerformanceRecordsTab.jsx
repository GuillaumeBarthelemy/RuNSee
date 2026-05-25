import { memo } from "react";
import CoachAdviceBar from "../visuals/alpine/CoachAdviceBar.jsx";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import PerformanceBestTimesCard from "./PerformanceBestTimesCard.jsx";
import PerformanceBestSegmentsCard from "./PerformanceBestSegmentsCard.jsx";
import PerformanceRecordsProgressionCard from "./PerformanceRecordsProgressionCard.jsx";
import PerformanceRecordsHistoryTable from "./PerformanceRecordsHistoryTable.jsx";

/**
 * PerformanceRecordsTab — Mockup p.16.
 *
 * Layout 3 rows :
 *   Row 1 : Meilleurs temps | Meilleurs segments | Progression des records
 *   Row 2 : Historique des records (full width)
 *   Row 3 : Conseil du jour
 */
function PerformanceRecordsTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="performance-records-tab">
        <PerformanceEmptyState message={model.emptyReason || "Records indisponibles : ajoute des sorties avec best efforts."} />
      </div>
    );
  }

  return (
    <div className="performance-records-tab">
      <div className="performance-records-row-top">
        <PerformanceBestTimesCard bestTimes={model.bestTimes} />
        <PerformanceBestSegmentsCard segments={model.bestSegments} />
        <PerformanceRecordsProgressionCard rows={model.progression} />
      </div>

      <PerformanceRecordsHistoryTable rows={model.history} />

      {model.coachAdvice ? (
        <div className="performance-records-coach-bar">
          <CoachAdviceBar
            tone="info"
            icon={(
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M3 19 9 8l4 7 2-3 6 7H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            )}
          >
            {model.coachAdvice}
          </CoachAdviceBar>
          <a className="performance-records-coach-link" href="#allures">Voir tous les conseils</a>
        </div>
      ) : null}
    </div>
  );
}

export default memo(PerformanceRecordsTab);
