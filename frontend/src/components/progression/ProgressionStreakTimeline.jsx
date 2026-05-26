import { memo } from "react";

/**
 * ProgressionStreakTimeline — Mockup p.19 bas "Série de régularité".
 *
 * Timeline cells (dots) representant les semaines actives/pauses sur la
 * periode, avec labels date + duree pour chaque streak.
 */
function ProgressionStreakTimeline({ data = {} }) {
  const cells = Array.isArray(data?.cells) ? data.cells : [];
  const streaks = Array.isArray(data?.streaks) ? data.streaks : [];
  return (
    <section className="progression-panel progression-streak-timeline">
      <div className="progression-panel-head">
        <h3>Série de régularité</h3>
        <div className="progression-streak-legend">
          <span className="progression-streak-legend-item">
            <span className="progression-streak-dot is-active" /> Semaine active
          </span>
          <span className="progression-streak-legend-item">
            <span className="progression-streak-dot" /> Pause
          </span>
        </div>
      </div>
      <div className="progression-streak-cells">
        {cells.map((c, i) => (
          <span
            key={i}
            className={`progression-streak-dot ${c.active ? "is-active" : ""}`}
            title={`Semaine du ${c.start.toLocaleDateString("fr-FR")}`}
          />
        ))}
      </div>
      <div className="progression-streak-labels">
        {streaks.map((s, i) => (
          <div key={i} className="progression-streak-label-item">
            <strong>{s.label}</strong>
            <small>{s.formattedDuration}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(ProgressionStreakTimeline);
