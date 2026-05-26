import { memo } from "react";

function MetricBlock({ block }) {
  const max = Math.max(block.curr, block.prev) || 1;
  return (
    <div className="progression-terrain-metric">
      <div className="progression-terrain-metric-head">
        <span className="progression-terrain-metric-title">{block.title} <small>({block.unit})</small></span>
      </div>
      <div className="progression-terrain-metric-row">
        <span className="progression-terrain-metric-year">{block.yearCurr || new Date().getFullYear()}</span>
        <span className="progression-terrain-metric-bar">
          <span className="progression-terrain-metric-bar-fill is-current" style={{ width: `${(block.curr / max) * 100}%` }} />
        </span>
        <span className="progression-terrain-metric-value">{block.formattedCurr}</span>
      </div>
      <div className="progression-terrain-metric-row">
        <span className="progression-terrain-metric-year">{block.yearPrev || (new Date().getFullYear() - 1)}</span>
        <span className="progression-terrain-metric-bar">
          <span className="progression-terrain-metric-bar-fill is-previous" style={{ width: `${(block.prev / max) * 100}%` }} />
        </span>
        <span className="progression-terrain-metric-value">{block.formattedPrev}</span>
      </div>
      <div className="progression-terrain-metric-footer">
        <span className={`tone-${block.tone || "neutral"}`}>{block.formattedDelta}</span>
        <span className={`tone-${block.tone || "neutral"}`}>{block.formattedDeltaAbs}</span>
      </div>
    </div>
  );
}

/**
 * ProgressionTerrainElevationCard — Mockup p.20 Row 3 droite.
 *
 * Dénivelé positif + Dénivelé / km, annee courante vs N-1.
 */
function ProgressionTerrainElevationCard({ data = {} }) {
  const elev = data?.elevation || null;
  const elevPerKm = data?.elevationPerKm || null;
  return (
    <section className="progression-panel progression-terrain-card">
      <div className="progression-panel-head">
        <h3>Terrain & dénivelé — Comparaison</h3>
      </div>
      <div className="progression-terrain-grid">
        {elev ? <MetricBlock block={elev} /> : null}
        {elevPerKm ? <MetricBlock block={elevPerKm} /> : null}
      </div>
    </section>
  );
}

export default memo(ProgressionTerrainElevationCard);
