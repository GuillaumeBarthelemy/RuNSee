import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import { formatPercentFr } from "../../utils/frenchFormatters.js";

// Couleurs alignees sur les zones FC (Z1 bleu, Z2 vert, Z3 orange, Z4 ambre, Z5 rouge).
// Mapping pace bucket -> zone FC : tres-facile = Z1, facile = Z2, moderee = Z3,
// soutenue = Z4, rapide = Z5. Voir PerformanceZoneDonut.ZONE_COLORS.
const PACE_BUCKET_COLORS = {
  "tres-facile": "#3b82f6", // Z1
  "facile": "#22c55e",      // Z2
  "moderee": "#fb923c",     // Z3
  "soutenue": "#f59e0b",    // Z4
  "rapide": "#ef4444",      // Z5
};

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
          <h3>Distribution des allures <span className="performance-panel-sub">(durée estimée)</span></h3>
        </div>
      </div>

      <div className="performance-pace-distribution-list">
        {buckets.map((bucket) => {
          const barColor = PACE_BUCKET_COLORS[String(bucket.key || "").toLowerCase()] || "#94a3b8";
          return (
            <div className="performance-pace-distribution-row" key={bucket.key}>
              <span>{bucket.label}</span>
              <small>{bucket.rangeLabel}</small>
              <div className="performance-pace-track">
                <span
                  className="performance-pace-fill"
                  style={{
                    width: `${Math.max(2, Math.min(100, Number(bucket.share) || 0))}%`,
                    background: barColor,
                  }}
                />
              </div>
              <b>{bucket.durationLabel}</b>
              <strong>{formatPercentFr(bucket.share || 0, 0)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default memo(PerformancePaceDistribution);
