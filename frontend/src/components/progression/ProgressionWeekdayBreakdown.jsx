import { memo } from "react";

/**
 * ProgressionWeekdayBreakdown — Mockup p.19 Row 3 droite.
 *
 * Barres horizontales : % sorties par jour de la semaine.
 */
function ProgressionWeekdayBreakdown({ items = [] }) {
  const max = items.reduce((m, it) => Math.max(m, it.percent), 100);
  return (
    <section className="progression-panel progression-weekday-breakdown">
      <div className="progression-panel-head">
        <h3>Répartition des jours</h3>
        <span className="progression-panel-sub">En % des sorties</span>
      </div>
      <ul className="progression-weekday-list">
        {items.map((it) => (
          <li key={it.label} className="progression-weekday-item">
            <span className="progression-weekday-label">{it.label}</span>
            <span className="progression-weekday-bar">
              <span
                className="progression-weekday-bar-fill"
                style={{ width: `${(it.percent / max) * 100}%` }}
              />
            </span>
            <span className="progression-weekday-value">{it.percent} %</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(ProgressionWeekdayBreakdown);
