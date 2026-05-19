import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function PerformancePaceDistribution({ distribution = {} }) {
  if (!distribution?.hasData) {
    return (
      <section className="performance-panel performance-pace-distribution-card">
        <h3>{distribution.title || "Distribution des allures"}</h3>
        <PerformanceEmptyState message={distribution.emptyReason} />
      </section>
    );
  }

  const buckets = Array.isArray(distribution.buckets) ? distribution.buckets : [];

  return (
    <section className="performance-panel performance-pace-distribution-card">
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">Allures</span>
          <h3>Distribution des allures</h3>
        </div>
      </div>

      <div className="performance-pace-distribution-list">
        {buckets.map((bucket) => (
          <div className="performance-pace-distribution-row" key={bucket.key}>
            <span>{bucket.label}</span>
            <small>{bucket.rangeLabel}</small>
            <div className="performance-pace-track">
              <span
                className={`performance-pace-fill performance-pace-${bucket.tone}`}
                style={{ width: `${Math.max(2, Math.min(100, Number(bucket.share) || 0))}%` }}
              />
            </div>
            <b>{bucket.durationLabel}</b>
            <strong>{Math.round(bucket.share || 0)}%</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(PerformancePaceDistribution);
