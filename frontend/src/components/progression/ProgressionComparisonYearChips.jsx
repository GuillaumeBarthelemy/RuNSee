import { memo } from "react";

/**
 * ProgressionComparisonYearChips — Chip group de selection d'annee de comparaison.
 *
 * Affiche un chip par offset disponible (N-1, N-2, ...) avec l'annee absolue
 * en libelle ("N-1 (2025)"). Le chip actif est mis en avant.
 */
function ProgressionComparisonYearChips({
  referenceYear = new Date().getFullYear(),
  offsets = [1],
  selectedOffset = 1,
  onSelect = () => {},
}) {
  return (
    <div className="progression-comparison-year-chips" role="tablist" aria-label="Année de comparaison">
      <span className="progression-comparison-year-chips-label">Comparer avec :</span>
      <div className="progression-comparison-year-chips-group">
        {offsets.map((offset) => {
          const year = referenceYear - offset;
          const active = offset === selectedOffset;
          return (
            <button
              key={offset}
              type="button"
              role="tab"
              aria-selected={active}
              className={`progression-comparison-year-chip ${active ? "is-active" : ""}`}
              onClick={() => onSelect(offset)}
            >
              <span className="progression-comparison-year-chip-offset">N-{offset}</span>
              <span className="progression-comparison-year-chip-year">{year}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ProgressionComparisonYearChips);
