import { memo } from "react";
import CoachAdviceBar from "../visuals/alpine/CoachAdviceBar.jsx";
import PerformanceBestTable from "./PerformanceBestTable.jsx";
import PerformanceMetricCard from "./PerformanceMetricCard.jsx";
import PerformancePaceDistribution from "./PerformancePaceDistribution.jsx";
import PerformanceTakeawayCard from "./PerformanceTakeawayCard.jsx";
import PerformanceTrendChart from "./PerformanceTrendChart.jsx";
import PerformanceZoneDonut from "./PerformanceZoneDonut.jsx";

function PerformanceOverviewTab({ model = {} }) {
  const metrics = Array.isArray(model.metrics) ? model.metrics : [];
  const coachTone = model.takeaway?.tone === "warning" ? "warning" : model.takeaway?.tone === "positive" ? "success" : "info";

  return (
    <div className="performance-overview-tab">
      <section className="performance-metric-grid" aria-label="Indicateurs Performance">
        {metrics.map((metric) => (
          <PerformanceMetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      {/* Row 1 — Zones FC + Distribution allures (chacun 1/2) */}
      <div className="performance-overview-grid performance-overview-row-1">
        <PerformanceZoneDonut preview={model.zonePreview} />
        <PerformancePaceDistribution distribution={model.paceDistribution} />
      </div>

      {/* Row 2 — Meilleures perf + Tendances + À retenir (chacun 1/3) */}
      <div className="performance-overview-grid performance-overview-row-2">
        <PerformanceBestTable preview={model.bestPerformancePreview} />
        <PerformanceTrendChart trend={model.trendSummary} />
        <PerformanceTakeawayCard takeaway={model.takeaway} confidence={model.confidence} />
      </div>

      <div className="performance-coach-bar-with-link">
        <CoachAdviceBar
          tone={coachTone}
          icon={(
            // Pictogramme montagne Alpine Light (mockup p.12)
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M3 19 9 8l4 7 2-3 6 7H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          )}
        >
          {model.takeaway?.text || "Continue à consolider tes repères avec des sorties comparables."}
        </CoachAdviceBar>
        <button type="button" className="performance-coach-bar-cta">Voir tous les conseils</button>
      </div>
    </div>
  );
}

export default memo(PerformanceOverviewTab);
