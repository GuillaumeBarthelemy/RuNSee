import { memo } from "react";
import InfoTooltip from "../InfoTooltip.jsx";

/**
 * ProgressionPolarisationCard — Repartition des seances par intensite
 * (modele 80/20) sur 12 semaines, basee sur la classification utilisateur.
 *
 * Props :
 *   - polarisation : { hasData, total, weeks, buckets[], byType[], easyPct, hardPct }
 */
const POLAR_HELP = (
  <InfoTooltip
    compact
    title="Polarisation (80/20)"
    glossaryKey="polarization"
    content={[{ text: "Répartition de tes séances classées en facile / modéré / intense. On vise ~80 % de facile (Z1-Z2)." }]}
    label="Afficher l'aide pour la polarisation"
  />
);
function ProgressionPolarisationCard({ polarisation = {} }) {
  if (!polarisation?.hasData) {
    return (
      <section className="progression-panel progression-polarisation-card">
        <div className="progression-panel-head">
          <span className="title-with-info">
            <h3>Polarisation de l'entraînement</h3>
            {POLAR_HELP}
          </span>
        </div>
        <p className="progression-panel-empty">
          Classifie tes séances (type d'effort) pour visualiser ta répartition facile / intense.
        </p>
      </section>
    );
  }

  const { buckets = [], byType = [], easyPct, total, weeks, periodLabel } = polarisation;
  const windowLabel = periodLabel || `${weeks} dernières semaines`;

  // Insight 80/20 : un bon ratio endurance est >= 75% facile.
  const insightTone = easyPct >= 75 ? "positive" : easyPct >= 60 ? "neutral" : "warning";
  const insightText = easyPct >= 75
    ? `Bonne polarisation : ${easyPct}% de tes séances sont faciles (modèle 80/20 respecté).`
    : easyPct >= 60
      ? `Polarisation correcte (${easyPct}% facile). Vise ~80% pour optimiser la récupération.`
      : `Charge intense élevée : seulement ${easyPct}% de séances faciles. Risque de surmenage.`;

  return (
    <section className="progression-panel progression-polarisation-card">
      <div className="progression-panel-head">
        <h3>Polarisation de l'entraînement</h3>
        <span className="progression-panel-sub">{total} séances classées · {windowLabel} · par nombre de séances</span>
      </div>

      {/* Barre empilee low/mid/high */}
      <div className="progression-polar-bar" role="img" aria-label="Répartition par intensité">
        {buckets.map((b) => (
          b.pct > 0 ? (
            <span
              key={b.key}
              className="progression-polar-segment"
              style={{ width: `${b.pct}%`, background: b.color }}
              title={`${b.label} : ${b.pct}% (${b.count})`}
            >
              {b.pct >= 10 ? `${b.pct}%` : ""}
            </span>
          ) : null
        ))}
      </div>
      <div className="progression-polar-legend">
        {buckets.map((b) => (
          <span key={b.key} className="progression-polar-legend-item">
            <i style={{ background: b.color }} aria-hidden="true" />
            {b.label} · {b.count}
          </span>
        ))}
      </div>

      <div className={`progression-polar-insight progression-polar-insight-${insightTone}`}>
        {insightText}
      </div>

      {/* Detail par type */}
      <div className="progression-polar-types">
        {byType.map((t) => (
          <div key={t.key} className="progression-polar-type-row">
            <span className="progression-polar-type-label">{t.icon} {t.label}</span>
            <span className="progression-polar-type-bar">
              <span className="progression-polar-type-fill" style={{ width: `${t.pct}%` }} />
            </span>
            <span className="progression-polar-type-count">{t.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(ProgressionPolarisationCard);
