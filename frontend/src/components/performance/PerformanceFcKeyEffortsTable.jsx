import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

// Pictos SVG par type d'effort (mockup p.15)
const TYPE_ICONS = {
  mountain: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 19 9 8l4 7 2-3 6 7H3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  tempo: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M13 2 4 14h6l-2 8 10-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  flash: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 17h6M10 17l1-4h2l1 4M8 21h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/**
 * FC dans efforts cles — mockup p.15.
 * Categorisation par TYPE D'EFFORT (et plus par distance race) :
 *   Montee longue / Seuil (tempo) / Intervalles longs / Intervalles courts / Competition
 * Indicateur affiche : % FC seuil.
 */
function PerformanceFcKeyEffortsTable({ rows = [] }) {
  const usable = (Array.isArray(rows) ? rows : []).filter((r) => r?.averageHr != null);
  const hasAnyData = usable.length > 0;

  // Max % FC seuil pour normaliser les barres
  const maxPct = hasAnyData ? Math.max(...usable.map((r) => r.pctFcSeuil || 0), 110) : 110;

  return (
    <section className="performance-panel performance-fc-key-efforts-card">
      <div className="performance-panel-head">
        <h3>FC dans les efforts clés <span className="performance-panel-sub">(moyenne)</span></h3>
      </div>
      {hasAnyData ? (
        <table className="performance-fc-key-efforts-table">
          <thead>
            <tr>
              <th>Effort</th>
              <th>Durée</th>
              <th>FC moyenne</th>
              <th>% FC seuil</th>
              <th aria-label="Bar charge" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const widthPct = row.pctFcSeuil != null
                ? Math.max(2, Math.min(100, (row.pctFcSeuil / maxPct) * 100))
                : 0;
              return (
                <tr key={row.key} className={row.averageHr == null ? "is-empty" : ""}>
                  <td>
                    <span className="performance-fc-effort-label">
                      <span className="performance-fc-effort-icon" style={{ color: row.color }} aria-hidden="true">
                        {TYPE_ICONS[row.iconKey] || TYPE_ICONS.tempo}
                      </span>
                      <strong>{row.label}</strong>
                    </span>
                  </td>
                  <td><small>{row.durationRange}</small></td>
                  <td>{row.averageHr != null ? <b>{row.averageHr} bpm</b> : <em className="performance-fc-empty-cell">—</em>}</td>
                  <td>{row.pctFcSeuil != null ? <b>{row.pctFcSeuil} %</b> : <em className="performance-fc-empty-cell">—</em>}</td>
                  <td>
                    {row.averageHr != null ? (
                      <div className="performance-fc-effort-track">
                        <span className="performance-fc-effort-fill" style={{ width: `${widthPct}%`, background: row.color }} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <PerformanceEmptyState message="Pas encore assez de sorties catégorisables par type d'effort." />
      )}
    </section>
  );
}

export default memo(PerformanceFcKeyEffortsTable);
