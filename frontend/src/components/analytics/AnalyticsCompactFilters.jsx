import { memo } from "react";

/**
 * AnalyticsCompactFilters — Alpine Light.
 *
 * Barre de filtres COMPACTE pour Analyse / Performance / Progression.
 * Alignée visuellement avec ActivitiesFilterBar (mini-lot 14 + refonte) :
 *   - recherche + Sport + Période sur une ligne
 *   - chip retirable pour le filtre Sport actif
 *   - bouton Réinitialiser conditionnel (visible uniquement si un filtre est actif)
 *
 * Pas de filtre Source / Intensité — non pertinents pour l'analyse globale
 * (ces filtres sont scope page Activités).
 */

const PERIOD_OPTIONS = [
  { key: "7d",  label: "7 j" },
  { key: "90d", label: "90 j" },
  { key: "6m",  label: "6 mois" },
  { key: "12m", label: "12 mois" },
  { key: "all", label: "Tout" },
];

function FilterChip({ label, onClear }) {
  return (
    <span className="alpine-activities-chip">
      {label}
      <button type="button" onClick={onClear} aria-label={`Retirer le filtre ${label}`}>
        ×
      </button>
    </span>
  );
}

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
  const sportActive = sportGroup !== "all";
  const hasActiveFilters = sportActive || Boolean(search?.trim()) || preset !== "90d";

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

        <label className="alpine-activities-filter alpine-activities-filter--period">
          <span className="alpine-activities-filter-label">Période</span>
          <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        <span className="alpine-activities-filterbar-meta">
          {filteredCount} sur {totalCount} {totalCount > 1 ? "sorties" : "sortie"}
          {periodLabel ? ` · ${periodLabel}` : ""}
        </span>

        {hasActiveFilters ? (
          <button
            type="button"
            className="alpine-activities-filterbar-reset"
            onClick={onReset}
            title="Réinitialiser les filtres"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {sportActive ? (
        <div className="alpine-activities-chips">
          <FilterChip label={`Sport : ${sportGroup}`} onClear={() => onSportChange("all")} />
        </div>
      ) : null}
    </section>
  );
}

export default memo(AnalyticsCompactFilters);
