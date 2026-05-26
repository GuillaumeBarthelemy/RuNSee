import { memo } from "react";

/**
 * ProgressionCumulativeProgressCard — Mockup p.17 Row 2 centre.
 *
 * 3 progress bars Distance / Temps / D+ vs objectifs annuels.
 */
function ProgressionCumulativeProgressCard({ items = [] }) {
  return (
    <section className="progression-panel progression-cumulative-card">
      <div className="progression-panel-head">
        <h3>Cumulatif depuis le 1<sup>er</sup> janvier</h3>
      </div>
      <ul className="progression-cumulative-list">
        {items.map((it) => (
          <li key={it.key} className="progression-cumulative-item">
            <div className="progression-cumulative-row">
              <span className="progression-cumulative-label">{it.label}</span>
              <strong className="progression-cumulative-value">{it.formattedValue}</strong>
            </div>
            <div className="progression-cumulative-bar">
              <span
                className="progression-cumulative-bar-fill"
                style={{ width: `${Math.min(100, it.percent)}%`, background: it.color }}
              />
            </div>
            <div className="progression-cumulative-row progression-cumulative-row-foot">
              <span className="progression-cumulative-goal">{it.formattedGoal}</span>
              <span className="progression-cumulative-pct">{it.percent}%</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(ProgressionCumulativeProgressCard);
