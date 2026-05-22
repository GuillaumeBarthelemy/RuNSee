import { memo } from "react";

/**
 * PerformancePaceCard — Mockup p.14 : carte allure compacte.
 *
 * Affiche dot couleur + label + valeur pace + zone Daniels + delta VMA.
 * Utilisee 7x dans la grille top de Allures de référence.
 */
function PerformancePaceCard({ card = {} }) {
  return (
    <article className="performance-pace-card">
      <header className="performance-pace-card-head">
        <span className="performance-pace-card-dot" style={{ background: card.color }} aria-hidden="true" />
        <span className="performance-pace-card-label">{card.label || ""}</span>
      </header>
      <div className="performance-pace-card-value-row">
        <strong className="performance-pace-card-value">{card.formattedPace || "—"}</strong>
        <span className="performance-pace-card-unit">/km</span>
      </div>
      <span className="performance-pace-card-zone">{card.zone || ""}</span>
      {card.formattedVmaDelta ? (
        <span className="performance-pace-card-vma">{card.formattedVmaDelta}</span>
      ) : null}
    </article>
  );
}

export default memo(PerformancePaceCard);
