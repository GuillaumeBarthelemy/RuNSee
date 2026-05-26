import { memo } from "react";

const INTENSITY_COLORS = {
  0: "#e5edf7", // gris clair (aucune)
  1: "#bfdbfe", // bleu 200
  2: "#60a5fa", // bleu 400
  3: "#1268f3", // bleu primaire
};

/**
 * ProgressionRegularityHeatmap — Mockup p.19 Carte de régularité.
 *
 * Grille 7 lignes (Lun-Dim) × N colonnes (semaines de l'annee).
 * 4 niveaux d'intensite (aucune / legere / moderee / elevee).
 */
function ProgressionRegularityHeatmap({ data = {} }) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const monthLabels = Array.isArray(data?.monthLabels) ? data.monthLabels : [];
  const weekdayLabels = Array.isArray(data?.weekdayLabels) ? data.weekdayLabels : [];
  const legend = Array.isArray(data?.legend) ? data.legend : [];
  const columnsCount = rows[0]?.length || 0;

  return (
    <section className="progression-panel progression-regularity-heatmap">
      <div className="progression-panel-head">
        <h3>Carte de régularité — Activité par jour</h3>
        <span className="progression-panel-sub">{data?.year || ""}</span>
      </div>
      <div className="progression-regularity-heatmap-grid" role="grid" aria-label="Heatmap activite par jour">
        <div className="progression-regularity-heatmap-empty" />
        <div className="progression-regularity-heatmap-months">
          {monthLabels.map((label, idx) => (
            <span key={idx} className="progression-regularity-heatmap-month" style={{ gridColumn: idx + 1 }}>
              {label}
            </span>
          ))}
        </div>
        {weekdayLabels.map((wLabel, rowIdx) => (
          <div key={rowIdx} className="progression-regularity-heatmap-row" role="row">
            <span className="progression-regularity-heatmap-weekday">{wLabel}</span>
            <div className="progression-regularity-heatmap-cells" style={{ gridTemplateColumns: `repeat(${columnsCount}, 1fr)` }}>
              {(rows[rowIdx] || []).map((cell, colIdx) => (
                <span
                  key={colIdx}
                  className={`progression-regularity-heatmap-cell ${cell.future ? "is-future" : ""} ${!cell.inYear ? "is-out" : ""}`}
                  style={{ background: cell.inYear && !cell.future ? INTENSITY_COLORS[cell.intensity] : "#f8fafc" }}
                  title={cell.inYear && !cell.future ? `${cell.date.toLocaleDateString("fr-FR")} · ${cell.count} sortie${cell.count > 1 ? "s" : ""} · ${cell.distance.toFixed(1)} km` : ""}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="progression-regularity-heatmap-legend">
        {legend.map((it) => (
          <span key={it.level} className="progression-regularity-heatmap-legend-item">
            <span className="progression-regularity-heatmap-legend-dot" style={{ background: INTENSITY_COLORS[it.level] }} />
            {it.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export default memo(ProgressionRegularityHeatmap);
