import { memo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * ActivitiesFilterBar — Alpine Light (refonte visuelle).
 *
 * Barre compacte : recherche + Période (filtre principal) + bouton "Filtres"
 * (badge du nombre de filtres avancés actifs) + Tri à droite. Les filtres
 * avancés (Sport / Source / Intensité) vivent dans un panneau dépliable, et
 * chaque filtre actif est rappelé sous forme de chip retirable.
 *
 * Anti-régression : aucun calcul métier modifié, mêmes props/handlers que
 * la version précédente (le parent n'a rien à changer). `AnalyticsFiltersBar`
 * (page Analyse) n'est pas touché.
 */

const SORT_OPTIONS = [
  { key: "date_desc", label: "Plus récentes" },
  { key: "date_asc",  label: "Plus anciennes" },
  { key: "distance",  label: "Distance" },
  { key: "duration",  label: "Durée" },
];

const SOURCE_OPTIONS = [
  { key: "all",     label: "Toutes" },
  { key: "strava",  label: "Strava" },
  { key: "garmin",  label: "Garmin" },
  { key: "merged",  label: "Strava + Garmin" },
];

const INTENSITY_OPTIONS = [
  { key: "all",      label: "Toutes" },
  { key: "facile",   label: "Facile" },
  { key: "moderee",  label: "Modérée" },
  { key: "intense",  label: "Intense" },
];

// Presets EXACTEMENT alignés avec analyticsPeriods.js (buildAnalyticsDateRange).
const PERIOD_OPTIONS = [
  { key: "7d",  label: "7 j" },
  { key: "90d", label: "90 j" },
  { key: "6m",  label: "6 mois" },
  { key: "12m", label: "12 mois" },
  { key: "all", label: "Tout" },
];

function optionLabel(options, key) {
  return options.find((o) => o.key === key)?.label || key;
}

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

function ActivitiesFilterBar({
  search = "",
  sportGroup = "all",
  source = "all",
  intensity = "all",
  sort = "date_desc",
  preset = "90d",
  periodLabel = "",
  availableSports = [],
  intensityAvailable = false,
  filteredCount = 0,
  totalCount = 0,
  onSearchChange = () => {},
  onSportChange = () => {},
  onSourceChange = () => {},
  onIntensityChange = () => {},
  onSortChange = () => {},
  onPresetChange = () => {},
  onReset = () => {},
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  const sportActive = sportGroup !== "all";
  const sourceActive = source !== "all";
  const intensityActive = intensity !== "all";
  const advancedCount = [sportActive, sourceActive, intensityActive].filter(Boolean).length;
  const hasActiveFilters = advancedCount > 0 || Boolean(search?.trim()) || preset !== "90d";

  return (
    <section className="alpine-activities-filterbar" aria-label="Filtres activités">
      <div className="alpine-activities-filterbar-row">
        {/* Recherche texte */}
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

        {/* Période — filtre principal, toujours visible */}
        <label className="alpine-activities-filter alpine-activities-filter--period">
          <span className="alpine-activities-filter-label">Période</span>
          <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Bouton filtres avancés + badge */}
        <button
          type="button"
          className={`alpine-activities-filter-toggle ${panelOpen ? "is-open" : ""}`.trim()}
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Filtres
          {advancedCount > 0 ? <span className="alpine-activities-filter-badge">{advancedCount}</span> : null}
        </button>

        {/* Tri à droite */}
        <label className="alpine-activities-filter alpine-activities-filter--sort">
          <span className="alpine-activities-filter-label">Trier par</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Reset — visible uniquement si filtre actif */}
        {hasActiveFilters ? (
          <button
            type="button"
            className="alpine-activities-filterbar-reset"
            onClick={() => { onReset(); setPanelOpen(false); }}
            title="Réinitialiser les filtres"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {/* Chips des filtres avancés actifs */}
      {advancedCount > 0 ? (
        <div className="alpine-activities-chips">
          {sportActive ? (
            <FilterChip label={`Sport : ${sportGroup}`} onClear={() => onSportChange("all")} />
          ) : null}
          {sourceActive ? (
            <FilterChip label={`Source : ${optionLabel(SOURCE_OPTIONS, source)}`} onClear={() => onSourceChange("all")} />
          ) : null}
          {intensityActive ? (
            <FilterChip label={`Intensité : ${optionLabel(INTENSITY_OPTIONS, intensity)}`} onClear={() => onIntensityChange("all")} />
          ) : null}
        </div>
      ) : null}

      {/* Panneau filtres avancés */}
      {panelOpen ? (
        <div className="alpine-activities-filter-panel">
          <label className="alpine-activities-filter">
            <span className="alpine-activities-filter-label">Sport</span>
            <select value={sportGroup} onChange={(e) => onSportChange(e.target.value)}>
              <option value="all">Tous</option>
              {availableSports.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="alpine-activities-filter">
            <span className="alpine-activities-filter-label">Source</span>
            <select value={source} onChange={(e) => onSourceChange(e.target.value)}>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className={`alpine-activities-filter ${intensityAvailable ? "" : "is-disabled"}`.trim()}>
            <span className="alpine-activities-filter-label">Intensité</span>
            {intensityAvailable ? (
              <select value={intensity} onChange={(e) => onIntensityChange(e.target.value)}>
                {INTENSITY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            ) : (
              <span className="alpine-activities-filter-empty">
                <span>Toutes</span>
                <Link to="/reglages#entrainement" title="Configurer les zones FC personnelles">
                  Configurer
                </Link>
              </span>
            )}
          </label>
        </div>
      ) : null}

      {/* Footer info compteur + période active */}
      <div className="alpine-activities-filterbar-meta">
        <span>
          {filteredCount} sur {totalCount} {totalCount > 1 ? "sorties" : "sortie"}
          {periodLabel ? ` · ${periodLabel}` : ""}
        </span>
      </div>
    </section>
  );
}

export default memo(ActivitiesFilterBar);
