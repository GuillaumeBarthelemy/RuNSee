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
  const periodLabel = model.range?.label || "";
  const excluded = model.canonicalCounts?.excludedMergedPeriod || 0;
  const coachTone = model.takeaway?.tone === "warning" ? "warning" : model.takeaway?.tone === "positive" ? "success" : "info";

  return (
    <div className="performance-overview-tab">
      <div className="performance-overview-context">
        <span>Performance actuelle sur {periodLabel || "la période active"}.</span>
        <strong>
          {model.canonicalCounts?.period || 0} sorties uniques
          {excluded ? ` · ${excluded} doublon${excluded > 1 ? "s" : ""} ignoré${excluded > 1 ? "s" : ""}` : ""}
        </strong>
      </div>
      <section className="performance-hero-card">
        <div>
          <span className="performance-eyebrow">Vue d'ensemble</span>
          <h2>Performance actuelle</h2>
          <p>
            Synthèse du niveau sportif sur {periodLabel || "la période active"}, à partir des sorties uniques et comparables.
          </p>
        </div>
        <div className="performance-scope-pill">
          <strong>{model.canonicalCounts?.period || 0}</strong>
          <span>sorties actives</span>
          {excluded ? <small>{excluded} doublon{excluded > 1 ? "s" : ""} ignoré{excluded > 1 ? "s" : ""}</small> : null}
        </div>
      </section>

      <section className="performance-metric-grid" aria-label="Indicateurs Performance">
        {metrics.map((metric) => (
          <PerformanceMetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <div className="performance-overview-grid">
        <PerformanceZoneDonut preview={model.zonePreview} />
        <PerformancePaceDistribution distribution={model.paceDistribution} />
        <PerformanceBestTable preview={model.bestPerformancePreview} />
        <PerformanceTrendChart trend={model.trendSummary} />
        <PerformanceTakeawayCard takeaway={model.takeaway} confidence={model.confidence} />
      </div>

      <CoachAdviceBar tone={coachTone} icon={<span aria-hidden="true">i</span>}>
        {model.takeaway?.text || "Continue à consolider tes repères avec des sorties comparables."}
      </CoachAdviceBar>
    </div>
  );
}

export default memo(PerformanceOverviewTab);
