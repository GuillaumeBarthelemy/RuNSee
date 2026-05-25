import { memo, useState } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

// Picto coureur (route) / montagne (trail)
function RunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="1.8" fill="currentColor" />
      <path d="M9 21l3-6 3 2 2-4M6 12l3-3 4 2 3 4 3-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MountainIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 19 9 8l4 7 2-3 6 7H3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * PerformanceBestTimesCard — Mockup p.16 col 1.
 * Filtre Route/Trail, table 8 lignes (Route 4 + Trail 4), pills RP/RC.
 */
function PerformanceBestTimesCard({ bestTimes = {} }) {
  const [filter, setFilter] = useState("route");

  const all = bestTimes.all || [];
  if (!all.length) {
    return (
      <section className="performance-panel performance-best-times-card">
        <div className="performance-panel-head">
          <h3>Meilleurs temps</h3>
        </div>
        <PerformanceEmptyState message="Pas encore de records exploitables." />
      </section>
    );
  }

  const filtered = filter === "all" ? all : (bestTimes[filter] || []);

  return (
    <section className="performance-panel performance-best-times-card">
      <div className="performance-panel-head">
        <h3>Meilleurs temps</h3>
      </div>
      <div className="performance-records-filter-pills">
        <button
          type="button"
          className={`performance-records-pill ${filter === "route" ? "is-active" : ""}`}
          onClick={() => setFilter("route")}
        >
          <RunIcon /> Route
        </button>
        <button
          type="button"
          className={`performance-records-pill ${filter === "trail" ? "is-active" : ""}`}
          onClick={() => setFilter("trail")}
        >
          <MountainIcon /> Trail
        </button>
      </div>
      <ul className="performance-best-times-list">
        {filtered.map((row) => (
          <li key={row.key} className="performance-best-times-row">
            <span className="performance-best-times-icon" aria-hidden="true">
              {row.category === "trail" ? <MountainIcon /> : <RunIcon />}
            </span>
            <span className="performance-best-times-label">
              <strong>{row.label}</strong>
              <small>{row.categoryLabel}</small>
            </span>
            <b className="performance-best-times-value">{row.formattedValue}</b>
            <span className="performance-best-times-date">{row.formattedDate}</span>
            <span className={`performance-best-times-pill tone-${row.pillType === "RC" ? "neutral" : "positive"}`}>
              {row.pillType}
            </span>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="performance-best-times-empty">
            <small>Aucun record {filter === "route" ? "route" : "trail"} encore exploitable.</small>
          </li>
        ) : null}
      </ul>
      <p className="performance-best-times-legend">
        <span className="performance-best-times-pill tone-positive">RP</span> Record personnel
        <span className="performance-best-times-pill tone-neutral">RC</span> Record du parcours
      </p>
    </section>
  );
}

export default memo(PerformanceBestTimesCard);
