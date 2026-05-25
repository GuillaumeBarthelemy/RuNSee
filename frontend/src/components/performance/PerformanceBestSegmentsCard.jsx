import { memo, useState } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function RunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="1.8" fill="currentColor" />
      <path d="M9 21l3-6 3 2 2-4M6 12l3-3 4 2 3 4 3-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MountainIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
      <path d="M3 19 9 8l4 7 2-3 6 7H3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * PerformanceBestSegmentsCard — Mockup p.16 col 2.
 * Top 5 segments (Route + Trail) avec filtre.
 */
function PerformanceBestSegmentsCard({ segments = [] }) {
  const [filter, setFilter] = useState("all");

  if (!Array.isArray(segments) || segments.length === 0) {
    return (
      <section className="performance-panel performance-best-segments-card">
        <div className="performance-panel-head">
          <h3>Meilleurs segments</h3>
        </div>
        <PerformanceEmptyState message="Pas encore de segments PR Strava exploitables." />
      </section>
    );
  }

  const filtered = filter === "all" ? segments : segments.filter((s) => s.category === filter);

  return (
    <section className="performance-panel performance-best-segments-card">
      <div className="performance-panel-head">
        <h3>Meilleurs segments</h3>
        <a className="performance-records-link" href="#segments">Voir tout</a>
      </div>
      <div className="performance-records-filter-pills">
        <button type="button" className={`performance-records-pill ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
          Tous
        </button>
        <button type="button" className={`performance-records-pill ${filter === "route" ? "is-active" : ""}`} onClick={() => setFilter("route")}>
          <RunIcon /> Route
        </button>
        <button type="button" className={`performance-records-pill ${filter === "trail" ? "is-active" : ""}`} onClick={() => setFilter("trail")}>
          <MountainIcon /> Trail
        </button>
      </div>
      <ol className="performance-best-segments-list">
        {filtered.map((seg) => (
          <li key={`seg-${seg.rank}-${seg.name}`}>
            <span className="performance-best-segments-rank">{seg.rank}</span>
            <span className="performance-best-segments-icon" aria-hidden="true">
              {seg.category === "trail" ? <MountainIcon /> : <RunIcon />}
            </span>
            <div className="performance-best-segments-info">
              <strong>{seg.name}</strong>
              <small>
                {seg.formattedDistance}
                {seg.formattedElevation ? ` · ${seg.formattedElevation}` : ""}
              </small>
            </div>
            <b className="performance-best-segments-time">{seg.formattedElapsed}</b>
            <span className="performance-best-times-pill tone-positive">{seg.pillType}</span>
          </li>
        ))}
      </ol>
      <p className="performance-best-segments-legend">
        <RunIcon /> Route &nbsp; <MountainIcon /> Trail
      </p>
    </section>
  );
}

export default memo(PerformanceBestSegmentsCard);
