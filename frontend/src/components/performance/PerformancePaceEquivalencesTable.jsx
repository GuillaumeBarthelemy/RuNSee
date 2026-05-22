import { memo } from "react";

/**
 * PerformancePaceEquivalencesTable — Mockup p.14 bottom gauche.
 *
 * Tableau : Épreuve | Distance | Allure équivalente /km (plage) | Temps équivalent (plage)
 * Footer warning sur la prudence des estimations.
 */
function PerformancePaceEquivalencesTable({ equivalences = [], warning = "" }) {
  return (
    <section className="performance-panel performance-pace-equivalences-card">
      <div className="performance-panel-head">
        <h3>Équivalences prudentes</h3>
        <span className="performance-panel-sub">
          Correspondances indicatives basées sur les modèles scientifiques moyens.
        </span>
      </div>
      <table className="performance-pace-equivalences-table">
        <thead>
          <tr>
            <th>Épreuve</th>
            <th>Distance</th>
            <th>Allure /km</th>
            <th>Temps</th>
          </tr>
        </thead>
        <tbody>
          {equivalences.map((row) => (
            <tr key={row.key}>
              <td><strong>{row.label}</strong></td>
              <td>{row.formattedDistance}</td>
              <td>{row.formattedPaceRange}</td>
              <td>{row.formattedTimeRange}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {warning ? (
        <p className="performance-pace-equivalences-warning">
          <span aria-hidden="true">ℹ️</span> {warning}
        </p>
      ) : null}
    </section>
  );
}

export default memo(PerformancePaceEquivalencesTable);
