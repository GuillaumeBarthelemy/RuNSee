import { memo } from "react";

/**
 * TrendsRegularityHeatmap — Carte "Régularité & constance" (PDF page 9).
 *
 * Heatmap calendrier 4 niveaux :
 *   - 0 : aucune (gris clair)
 *   - 1 : activité légère (vert très pâle) — 1 sortie < 30 min
 *   - 2 : 1 sortie standard (vert moyen) — 1 sortie ≥ 30 min
 *   - 3 : 2+ sorties (vert foncé)
 *
 * Layout : 7 lignes (L→D), N colonnes (1 colonne = 1 semaine).
 * Étiquettes mois alignées sur la 1re colonne de chaque mois.
 */

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// Palette WCAG-compliant — contraste suffisant pour daltoniens
const COLORS = {
  out: "transparent",
  0: "#f1f5f9",   // aucune
  1: "#dcfce7",   // légère
  2: "#86efac",   // 1 sortie standard
  3: "#16a34a",   // 2+ sorties
};

const CELL_SIZE = 11;
const CELL_GAP = 2;

function TrendsRegularityHeatmap({ matrix = { months: [], columns: [] } }) {
  const { months = [], columns = [] } = matrix;
  if (!columns.length) {
    return <p className="alpine-overview-focus-empty">Pas assez de données pour la heatmap.</p>;
  }

  const colWidth = CELL_SIZE + CELL_GAP;
  const totalWidth = columns.length * colWidth;
  const totalHeight = 7 * colWidth;

  return (
    <div className="alpine-trends-heatmap">
      <div className="alpine-trends-heatmap-grid">
        {/* En-têtes mois (alignés sur la grille SVG, label décalé de la colonne jour-labels) */}
        <div className="alpine-trends-heatmap-months" style={{ paddingLeft: 22 }}>
          {months.map((m, idx) => (
            <span
              key={`${m.label}-${m.year}-${idx}`}
              className="alpine-trends-heatmap-month"
              style={{
                left: `${m.startCol * colWidth + 22}px`,
                width: `${(m.endCol - m.startCol + 1) * colWidth}px`,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="alpine-trends-heatmap-body">
          {/* Étiquettes jours à gauche */}
          <div className="alpine-trends-heatmap-day-labels" aria-hidden="true">
            {DAY_LABELS.map((d, idx) => (
              <span key={idx} style={{ height: `${CELL_SIZE}px`, marginBottom: `${CELL_GAP}px` }}>
                {d}
              </span>
            ))}
          </div>
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            role="img"
            aria-label="Heatmap calendrier régularité"
          >
            {columns.map((col, cIdx) => (
              col.days.map((day, dIdx) => {
                if (day.level < 0) return null;
                const x = cIdx * colWidth;
                const y = dIdx * colWidth;
                return (
                  <rect
                    key={`${cIdx}-${dIdx}`}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    fill={COLORS[day.level] || COLORS[0]}
                  >
                    <title>
                      {day.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      {day.level === 0 ? " — aucune activité"
                        : day.level === 1 ? " — activité légère"
                        : day.level === 2 ? " — 1 sortie"
                        : " — 2 sorties ou plus"}
                    </title>
                  </rect>
                );
              })
            ))}
          </svg>
        </div>
      </div>

      {/* Légende verticale à droite (mockup PDF page 9) */}
      <div className="alpine-trends-heatmap-legend alpine-trends-heatmap-legend--vertical">
        <span><i style={{ background: COLORS[3] }} /> 2+ sorties</span>
        <span><i style={{ background: COLORS[2] }} /> 1 sortie</span>
        <span><i style={{ background: COLORS[1] }} /> Activité légère</span>
        <span><i style={{ background: COLORS[0] }} /> Aucune</span>
      </div>
    </div>
  );
}

export default memo(TrendsRegularityHeatmap);
