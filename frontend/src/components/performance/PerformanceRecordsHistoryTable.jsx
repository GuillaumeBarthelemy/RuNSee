import { memo, useState, useMemo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

const PAGE_SIZE = 5;

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
 * PerformanceRecordsHistoryTable — Mockup p.16 row 2 full width.
 * Filtres Route/Trail + pagination (5 par page).
 */
function PerformanceRecordsHistoryTable({ rows = [] }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return (rows || []).filter((r) => r.category === filter);
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <section className="performance-panel performance-records-history-card">
        <div className="performance-panel-head">
          <h3>Historique des records</h3>
        </div>
        <PerformanceEmptyState message="L'historique s'enrichit dès qu'un record bat un précédent." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-records-history-card">
      <div className="performance-panel-head performance-records-history-head">
        <h3>Historique des records</h3>
      </div>
      <div className="performance-records-filter-pills">
        <button type="button" className={`performance-records-pill ${filter === "all" ? "is-active" : ""}`} onClick={() => { setFilter("all"); setPage(1); }}>
          Tous
        </button>
        <button type="button" className={`performance-records-pill ${filter === "route" ? "is-active" : ""}`} onClick={() => { setFilter("route"); setPage(1); }}>
          <RunIcon /> Route
        </button>
        <button type="button" className={`performance-records-pill ${filter === "trail" ? "is-active" : ""}`} onClick={() => { setFilter("trail"); setPage(1); }}>
          <MountainIcon /> Trail
        </button>
      </div>
      <table className="performance-records-history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Distance / Segment</th>
            <th>Catégorie</th>
            <th>Nouveau record</th>
            <th>Record précédent</th>
            <th>Évolution</th>
            <th>Confiance</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr key={row.key}>
              <td>{row.formattedDate}</td>
              <td>
                <span className={`performance-records-type tone-${row.category === "trail" ? "trail" : "route"}`}>
                  {row.category === "trail" ? <MountainIcon /> : <RunIcon />}
                </span>
              </td>
              <td><strong>{row.label}</strong></td>
              <td><em>Record personnel</em></td>
              <td><b>{row.newRecord}</b></td>
              <td>
                {row.previousRecord} <small>({row.formattedPreviousDate})</small>
              </td>
              <td className={`tone-${row.tone}`}>
                <b>{row.formattedEvolution}</b> <small>({row.formattedTrend})</small>
              </td>
              <td>
                <span className={`performance-records-confidence tone-${row.confidence?.tone || "neutral"}`}>
                  {row.confidence?.label || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="performance-records-history-footer">
        <small>
          {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} sur {filtered.length} records
        </small>
        {totalPages > 1 ? (
          <nav className="performance-records-pagination">
            <button type="button" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`page-${p}`}
                type="button"
                className={p === safePage ? "is-active" : ""}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
          </nav>
        ) : null}
      </footer>
    </section>
  );
}

export default memo(PerformanceRecordsHistoryTable);
