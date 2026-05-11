import { memo } from "react";

/**
 * AnalyticsCompactFilters — Alpine Light (Lot 04).
 *
 * Barre de filtres COMPACTE pour la page Analyse. Cohérente visuellement avec
 * ActivitiesFilterBar (mini-lot 14) : recherche + sport + période.
 *
 * Pas de filtre Source / Intensité — non pertinents pour l'analyse globale
 * (ces filtres sont scope page Activités).
 *
 * Anti-régression :
 *  - Aucun calcul métier modifié.
 *  - Presets EXACTEMENT alignés avec analyticsPeriods.js (7d / 90d / 6m / 12m / all)
 *    pour que onPresetChange déclenche bien sharedRange.
 *
 * Props (mêmes signatures que ActivitiesFilterBar pour cohérence) :
 *  - search, sportGroup, preset, periodLabel, availableSports
 *  - filteredCount, totalCount
 *  - on*Change handlers
 *  - onReset
 */

const PERIOD_OPTIONS = [
  { key: "7d",  label: "7 j" },
  { key: "90d", label: "90 j" },
  { key: "6m",  label: "6 mois" },
  { key: "12m", label: "12 mois" },
  { key: "all", label: "Tout" },
];

function AnalyticsCompactFilters({
  search = "",
  sportGroup = "all",
  preset = "90d",
  periodLabel = "",
  availableSports = [],
  filteredCount = 0,
  totalCount = 0,
  onSearchChange = () => {},
  onSportChange = () => {},
  onPresetChange = () => {},
  onReset = () => {},
}) {
  return (
    <section className="alpine-activities-filterbar" aria-label="Filtres analyse">
      <div className="alpine-activities-filterbar-row">
        <label className="alpine-activities-filter alpine-activities-filter--search">
          <span className="visually-hidden">Recherche</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
            <line x1="16" y1="16" x2="20" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            placeholder="Rechercher une sortie…"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <label className="alpine-activities-filter">
          <span className="alpine-activities-filter-label">Sport</span>
          <select value={sportGroup} onChange={(e) => onSportChange(e.target.value)}>
            <option value="all">Tous</option>
            {availableSports.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="alpine-activities-filter alpine-activities-filter--sort">
          <span className="alpine-activities-filter-label">Période</span>
          <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="alpine-activities-filterbar-reset"
          onClick={onReset}
          title="Réinitialiser les filtres"
        >
          Réinitialiser
        </button>
      </div>

      <div className="alpine-activities-filterbar-meta">
        <span>
          {filteredCount} sur {totalCount} {totalCount > 1 ? "sorties" : "sortie"}
          {periodLabel ? ` · ${periodLabel}` : ""}
        </span>
      </div>
    </section>
  );
}

export default memo(AnalyticsCompactFilters);
