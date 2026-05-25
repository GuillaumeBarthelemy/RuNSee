import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 17 10 10l4 4 7-7M14 7h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 7 10 14l4-4 7 7M14 17h7v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * PerformanceRecordsProgressionCard — Mockup p.16 col 3.
 * Table 8 rows : Distance/Segment | Évolution | Tendance % + flèche.
 */
function PerformanceRecordsProgressionCard({ rows = [] }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <section className="performance-panel performance-records-progression-card">
        <div className="performance-panel-head">
          <h3>Progression des records</h3>
        </div>
        <PerformanceEmptyState message="La progression s'affiche dès qu'un record bat son précédent." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-records-progression-card">
      <div className="performance-panel-head">
        <h3>Progression des records</h3>
      </div>
      <table className="performance-records-progression-table">
        <thead>
          <tr>
            <th>Distance / Segment</th>
            <th>Évolution</th>
            <th>Tendance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <strong>{row.label}</strong> <small>({row.categoryLabel})</small>
              </td>
              <td className={`tone-${row.tone}`}>
                <b>{row.formattedEvolution}</b>
              </td>
              <td className={`tone-${row.tone}`}>
                <span className="performance-records-progression-trend">
                  {row.formattedTrend}
                  {row.tone === "positive" ? <TrendUpIcon /> : row.tone === "warning" ? <TrendDownIcon /> : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="performance-records-progression-footer">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="m8 12 3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Progression calculée par rapport au record précédent de chaque distance.
      </p>
    </section>
  );
}

export default memo(PerformanceRecordsProgressionCard);
