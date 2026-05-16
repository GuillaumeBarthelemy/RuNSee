import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * TrendsRegularityHeatmap — Carte "Régularité & constance" (PDF page 9).
 *
 * Heatmap calendrier 4 niveaux WCAG-compliant :
 *   - 0 : aucune       (gris  #f1f5f9)
 *   - 1 : légère       (#bbf7d0)  — 1 sortie < 30 min
 *   - 2 : 1 sortie     (#4ade80)  — 1 sortie ≥ 30 min
 *   - 3 : 2+ sorties   (#15803d)  — vert foncé
 *
 * Optimisations (2026-05) :
 *   - Cellules dimensionnées dynamiquement pour remplir tout l'espace
 *     disponible quelle que soit la période (6 / 12 mois).
 *   - Tooltip HTML enrichi au survol : date + nb activités + km + temps.
 *   - Marqueur "aujourd'hui" : cercle blanc autour de la cellule du jour.
 *   - Palette WCAG : 4 niveaux clairement distinguables y compris en
 *     deutéranopie (vert clair → vert foncé avec contraste).
 */

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_LABELS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const COLORS = {
  0: "#f1f5f9",
  1: "#bbf7d0",
  2: "#4ade80",
  3: "#15803d",
};

// Bornes de cellule (px) — les cellules grandissent pour remplir la
// largeur disponible. Cap haut généreux pour que les périodes courtes
// (6 mois ≈ 26 col.) ne laissent pas trop de blanc à droite tout en
// gardant des cellules carrées (pas d'étirement horizontal).
const CELL_MIN = 9;
const CELL_MAX = 26;
const CELL_GAP = 2;
const DAY_LABEL_COL_WIDTH = 22;
const MONTHS_HEADER_HEIGHT = 18;
const LEGEND_WIDTH = 110;

function formatDuration(min) {
  if (!Number.isFinite(min) || min <= 0) return "0 min";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}` : `${m} min`;
}

function isSameLocalDay(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function TrendsRegularityHeatmap({ matrix = { months: [], columns: [] } }) {
  const { months = [], columns = [] } = matrix;
  const wrapperRef = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [hover, setHover] = useState(null); // { x, y, day }
  const today = new Date();

  // Observe la largeur dispo pour dimensionner les cellules dynamiquement
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const update = () => setAvailableWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Si pas de données, on rend quand même un placeholder avec ref pour mesurer
  if (!columns.length) {
    return (
      <div className="alpine-trends-heatmap" ref={wrapperRef}>
        <p className="alpine-overview-focus-empty">Pas assez de données pour la heatmap.</p>
      </div>
    );
  }

  // Largeur dispo pour la grille (hors colonne day-labels et légende)
  const gridAvailable = Math.max(0, availableWidth - DAY_LABEL_COL_WIDTH - LEGEND_WIDTH - 24);
  const ideal = columns.length > 0
    ? (gridAvailable - CELL_GAP) / columns.length
    : CELL_MIN + CELL_GAP;
  const colWidth = Math.max(CELL_MIN + CELL_GAP, Math.min(CELL_MAX + CELL_GAP, ideal));
  const cellSize = colWidth - CELL_GAP;
  // En unités de viewBox SVG — cellules toujours carrées
  const totalWidth = columns.length * colWidth;
  const totalHeight = 7 * colWidth;
  // SVG width fixée (px) pour éviter l'étirement horizontal de la viewBox.
  // Le conteneur parent ajuste sa largeur — la grille fait totalWidth, point.
  const svgPixelWidth = totalWidth;
  const svgPixelHeight = totalHeight;

  return (
    <div className="alpine-trends-heatmap" ref={wrapperRef}>
      <div className="alpine-trends-heatmap-grid" style={{ minWidth: 0 }}>
        {/* En-têtes mois */}
        <div
          className="alpine-trends-heatmap-months"
          style={{ paddingLeft: DAY_LABEL_COL_WIDTH, height: MONTHS_HEADER_HEIGHT, position: "relative" }}
        >
          {months.map((m, idx) => (
            <span
              key={`${m.label}-${m.year}-${idx}`}
              className="alpine-trends-heatmap-month"
              style={{
                left: `${m.startCol * colWidth + DAY_LABEL_COL_WIDTH}px`,
                width: `${(m.endCol - m.startCol + 1) * colWidth}px`,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="alpine-trends-heatmap-body">
          {/* Étiquettes jours à gauche */}
          <div className="alpine-trends-heatmap-day-labels" aria-hidden="true" style={{ width: DAY_LABEL_COL_WIDTH }}>
            {DAY_LABELS.map((d, idx) => (
              <span
                key={idx}
                style={{ height: `${cellSize}px`, marginBottom: `${CELL_GAP}px`, fontSize: 10 }}
              >
                {d}
              </span>
            ))}
          </div>

          <svg
            width={svgPixelWidth}
            height={svgPixelHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Heatmap calendrier régularité"
            onMouseLeave={() => setHover(null)}
            style={{ display: "block" }}
          >
            {columns.map((col, cIdx) => (
              col.days.map((day, dIdx) => {
                if (day.level < 0) return null;
                const x = cIdx * colWidth;
                const y = dIdx * colWidth;
                const isToday = isSameLocalDay(day.date, today);
                return (
                  <g key={`${cIdx}-${dIdx}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={2}
                      fill={COLORS[day.level] || COLORS[0]}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHover({
                          left: rect.left + rect.width / 2,
                          top: rect.top,
                          day,
                          dayName: DAY_LABELS_FULL[dIdx],
                        });
                      }}
                    />
                    {isToday ? (
                      <rect
                        x={x - 0.5}
                        y={y - 0.5}
                        width={cellSize + 1}
                        height={cellSize + 1}
                        rx={3}
                        fill="none"
                        stroke="#0f2147"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    ) : null}
                  </g>
                );
              })
            ))}
          </svg>
        </div>
      </div>

      {/* Légende verticale */}
      <div className="alpine-trends-heatmap-legend alpine-trends-heatmap-legend--vertical">
        <span><i style={{ background: COLORS[3] }} /> 2+ sorties</span>
        <span><i style={{ background: COLORS[2] }} /> 1 sortie</span>
        <span><i style={{ background: COLORS[1] }} /> Activité légère</span>
        <span><i style={{ background: COLORS[0] }} /> Aucune</span>
      </div>

      {/* Tooltip HTML enrichi */}
      {hover ? (
        <HeatmapTooltip left={hover.left} top={hover.top} day={hover.day} dayName={hover.dayName} />
      ) : null}
    </div>
  );
}

function HeatmapTooltip({ left, top, day, dayName }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left, top: top - 8 });
  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nextLeft = Math.max(8, Math.min(window.innerWidth - r.width - 8, left - r.width / 2));
    const nextTop = top - r.height - 6 < 8 ? top + 16 : top - r.height - 6;
    setPos({ left: nextLeft, top: nextTop });
  }, [left, top]);

  const dateStr = day.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div
      ref={ref}
      className="alpine-trends-heatmap-tooltip"
      style={{ left: pos.left, top: pos.top }}
      role="tooltip"
    >
      <div className="alpine-trends-heatmap-tooltip-head">
        <strong>{dayName} {dateStr}</strong>
      </div>
      {day.count > 0 ? (
        <ul className="alpine-trends-heatmap-tooltip-list">
          <li><span>Sorties</span><strong>{day.count}</strong></li>
          {day.distanceKm > 0 ? <li><span>Distance</span><strong>{day.distanceKm.toLocaleString("fr-FR")} km</strong></li> : null}
          {day.durationMinutes > 0 ? <li><span>Durée</span><strong>{formatDuration(day.durationMinutes)}</strong></li> : null}
        </ul>
      ) : (
        <p className="alpine-trends-heatmap-tooltip-empty">Aucune activité</p>
      )}
    </div>
  );
}

export default memo(TrendsRegularityHeatmap);
