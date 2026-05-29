import { memo } from "react";
import { Link } from "react-router-dom";

/**
 * ActivitiesFilterBar — Alpine Light (mini-lot 14, mockup PDF page 6).
 *
 * Barre de filtres COMPACTE dédiée à la page Activités. Contrairement à
 * `AnalyticsFiltersBar` (utilisée par Analyse, plus volumineuse), cette barre
 * tient sur une seule ligne en desktop : recherche + sport + source +
 * intensité + période + tri à droite.
 *
 * Anti-régression :
 *  - Aucun calcul métier modifié.
 *  - `AnalyticsFiltersBar` n'est PAS modifié (toujours utilisé par Analyse).
 *  - Si l'utilisateur n'a pas configuré ses zones FC, le filtre Intensité
 *    affiche un état désactivé avec un lien vers Réglages > Entraînement
 *    (option pédagogique, jamais de seuil bpm absolu inventé).
 *
 * Type : Correction PDF + changement fonctionnel (ajout filtres Source / Intensité / Tri).
 *
 * Props :
 *  - search, sportGroup, source, intensity, sort, preset, periodLabel
 *  - availableSports (string[])
 *  - intensityAvailable (boolean) — si true, filtre intensité actif
 *  - filteredCount, totalCount (info compteur)
 *  - on*Change handlers
 *  - onReset
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
// Toute valeur non listée ici n'est pas reconnue par le hook → période non
// rafraîchie. Cf. utils/analyticsPeriods.js getAnalyticsPresetLabel.
const PERIOD_OPTIONS = [
  { key: "7d",  label: "7 j" },
  { key: "90d", label: "90 j" },
  { key: "6m",  label: "6 mois" },
  { key: "12m", label: "12 mois" },
  { key: "all", label: "Tout" },
];

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

        {/* Sport */}
        <label className="alpine-activities-filter">
          <span className="alpine-activities-filter-label">Sport</span>
          <select value={sportGroup} onChange={(e) => onSportChange(e.target.value)}>
            <option value="all">Tous</option>
            {availableSports.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        {/* Source */}
        <label className="alpine-activities-filter">
          <span className="alpine-activities-filter-label">Source</span>
          <select value={source} onChange={(e) => onSourceChange(e.target.value)}>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Intensité — état désactivé pédagogique si zones FC non configurées */}
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

        {/* Période */}
        <label className="alpine-activities-filter">
          <span className="alpine-activities-filter-label">Période</span>
          <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Tri à droite */}
        <label className="alpine-activities-filter alpine-activities-filter--sort">
          <span className="alpine-activities-filter-label">Trier par</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Reset */}
        <button
          type="button"
          className="alpine-activities-filterbar-reset"
          onClick={onReset}
          title="Réinitialiser les filtres"
        >
          Réinitialiser
        </button>
      </div>

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
