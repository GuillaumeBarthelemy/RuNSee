import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function formatDurationHm(seconds) {
  const n = Math.max(0, Math.round(Number(seconds) || 0));
  if (n <= 0) return "—";
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m} min`;
}

/**
 * Dérive cardiaque stable (spec 10.3) : un exemple de sortie longue récente.
 * Affiche le % de dérive + contexte (durée, FC moyenne, date).
 */
function PerformanceFcDecouplingSampleCard({ sample = null }) {
  if (!sample) {
    return (
      <section className="performance-panel performance-fc-decoupling-sample-card">
        <div className="performance-panel-head">
          <h3>Exemple de dérive cardiaque</h3>
        </div>
        <PerformanceEmptyState message="Pas de sortie longue récente avec mesure de dérive." />
      </section>
    );
  }

  const dec = Number(sample.decouplingPercent) || 0;
  const tone = dec < 5 ? "positive" : dec < 8 ? "neutral" : "warning";

  return (
    <section className="performance-panel performance-fc-decoupling-sample-card">
      <div className="performance-panel-head">
        <h3>Exemple de dérive cardiaque</h3>
        <span className="performance-panel-sub">(sortie longue récente)</span>
      </div>
      <div className="performance-fc-decoupling-sample-body">
        <div>
          <small>{sample.name}</small>
          <small>{sample.date || ""} · {formatDurationHm(sample.durationSeconds)}</small>
        </div>
        <strong className={`performance-fc-decoupling-sample-value tone-${tone}`}>
          {dec.toFixed(1).replace(".", ",")} %
        </strong>
        <p className="performance-fc-decoupling-sample-comment">
          {dec < 5
            ? "Excellent contrôle cardiaque sur la durée. Base aérobie solide."
            : dec < 8
              ? "Dérive modérée. Marge de progression sur l'endurance fondamentale."
              : "Dérive marquée : l'effort excédait la capacité aérobie pour cette durée."}
        </p>
        {sample.averageHr ? (
          <small className="performance-fc-decoupling-sample-meta">
            FC moyenne : <b>{sample.averageHr} bpm</b>
          </small>
        ) : null}
      </div>
    </section>
  );
}

export default memo(PerformanceFcDecouplingSampleCard);
