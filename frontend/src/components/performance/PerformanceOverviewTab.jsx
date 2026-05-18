import { memo } from "react";
import AnalysisConfidenceBadge from "../AnalysisConfidenceBadge.jsx";
import CoachAdviceBar from "../visuals/alpine/CoachAdviceBar.jsx";
import PerformanceMetricCard from "./PerformanceMetricCard.jsx";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function ZonePreview({ preview = {} }) {
  if (!preview?.hasData) {
    return (
      <section className="performance-panel">
        <h3>{preview.title || "Zones de fréquence cardiaque"}</h3>
        <PerformanceEmptyState message={preview.emptyReason} />
      </section>
    );
  }

  return (
    <section className="performance-panel">
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">{preview.sourceLabel}</span>
          <h3>Zones de fréquence cardiaque</h3>
        </div>
        <strong>{Math.round(preview.easyShare)} % facile</strong>
      </div>
      <div className="performance-zone-bars">
        {preview.zones.map((zone) => (
          <div className="performance-zone-row" key={zone.key}>
            <span>{zone.shortLabel || zone.label}</span>
            <div className="performance-zone-track">
              <span
                className={`performance-zone-fill performance-zone-${String(zone.key || "").toLowerCase()}`}
                style={{ width: `${Math.max(2, Math.min(100, zone.share))}%` }}
              />
            </div>
            <strong>{Math.round(zone.share)} %</strong>
          </div>
        ))}
      </div>
      <p className="performance-panel-note">{preview.summary}</p>
    </section>
  );
}

function PaceDistribution({ distribution = {} }) {
  if (!distribution?.hasData) {
    return (
      <section className="performance-panel">
        <h3>{distribution.title || "Distribution des allures"}</h3>
        <PerformanceEmptyState message={distribution.emptyReason} />
      </section>
    );
  }

  return (
    <section className="performance-panel">
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">Allures</span>
          <h3>Distribution des allures</h3>
        </div>
      </div>
      <div className="performance-pace-bars">
        {distribution.buckets.map((bucket) => (
          <div className="performance-pace-row" key={bucket.key}>
            <span>{bucket.label}</span>
            <div className="performance-pace-track">
              <span
                className={`performance-pace-fill performance-pace-${bucket.tone}`}
                style={{ width: `${Math.max(4, Math.min(100, bucket.share))}%` }}
              />
            </div>
            <strong>{bucket.share} %</strong>
          </div>
        ))}
      </div>
      <p className="performance-panel-note">{distribution.summary}</p>
    </section>
  );
}

function BestPerformancePreview({ preview = {} }) {
  return (
    <section className="performance-panel">
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">Repères</span>
          <h3>Meilleures performances</h3>
        </div>
      </div>
      {preview?.hasData ? (
        <div className="performance-best-list">
          {preview.rows.map((row) => (
            <div className="performance-best-row" key={row.key}>
              <div>
                <span>{row.label}</span>
                <strong>{row.title}</strong>
                {row.date ? <small>{row.date}</small> : null}
              </div>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
      ) : (
        <PerformanceEmptyState message={preview.emptyReason} />
      )}
    </section>
  );
}

function PerformanceTrendPanel({ trend = {} }) {
  if (!trend?.hasData) {
    return (
      <section className="performance-panel">
        <h3>Tendances de performance</h3>
        <PerformanceEmptyState message="Les tendances ont besoin de plusieurs signaux comparables." />
      </section>
    );
  }

  return (
    <section className={`performance-panel performance-trend-panel performance-tone-${trend.tone || "neutral"}`}>
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">Tendance</span>
          <h3>{trend.title}</h3>
        </div>
      </div>
      <p className="performance-panel-note">{trend.text}</p>
      <div className="performance-trend-list">
        {trend.rows.map((row) => (
          <div className="performance-trend-row" key={row.key}>
            <span>{row.label}</span>
            <strong className={`performance-delta-${row.direction || "neutral"}`}>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function TakeawayPanel({ takeaway = {}, confidence = null }) {
  return (
    <section className={`performance-takeaway performance-tone-${takeaway.tone || "neutral"}`}>
      <div>
        <span className="performance-panel-kicker">À retenir</span>
        <h3>{takeaway.title}</h3>
        <p>{takeaway.text}</p>
      </div>
      {confidence ? <AnalysisConfidenceBadge confidence={confidence} compact /> : null}
      {Array.isArray(takeaway.missingSignals) && takeaway.missingSignals.length ? (
        <small>
          À consolider : {takeaway.missingSignals.slice(0, 3).join(", ")}.
        </small>
      ) : null}
    </section>
  );
}

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
        <ZonePreview preview={model.zonePreview} />
        <PaceDistribution distribution={model.paceDistribution} />
        <BestPerformancePreview preview={model.bestPerformancePreview} />
        <PerformanceTrendPanel trend={model.trendSummary} />
        <TakeawayPanel takeaway={model.takeaway} confidence={model.confidence} />
      </div>

      <CoachAdviceBar tone={coachTone} icon={<span aria-hidden="true">i</span>}>
        {model.takeaway?.text || "Continue à consolider tes repères avec des sorties comparables."}
      </CoachAdviceBar>
    </div>
  );
}

export default memo(PerformanceOverviewTab);
