import InfoTooltip from "./InfoTooltip.jsx";
import {
  ANALYTICS_PERIOD_PRESETS,
  getAnalyticsPresetLabel,
} from "../utils/analyticsPeriods.js";

const noop = () => {};

export default function AnalyticsFiltersBar({
  title = "Periode globale",
  subtitle = "Une seule periode pilote l'etat d'entrainement, le graphe principal, la comparaison et les analyses secondaires.",
  infoTitle = "Periode globale",
  infoContent = [
    "Mesure : cadre unique de dates pour toute la page d'analyses.",
    "Calcul : tous les KPI, graphiques et comparaisons sont recalcules sur cette meme selection.",
    "Interpretation : evite les lectures contradictoires entre blocs.",
    "Perimetre : la comparaison de periodes reutilise exactement cette fenetre.",
  ],
  resetLabel = "Reinitialiser la vue",
  customDateFromOptionName = "analyticsCustomDateFrom",
  customDateToOptionName = "analyticsCustomDateTo",
  preset = "90d",
  rangeLabel = "",
  customDateFrom = "",
  customDateTo = "",
  search = "",
  sportGroup = "all",
  groupSports = true,
  availableSports = [],
  filteredCount = 0,
  totalCount = 0,
  onPresetChange = noop,
  onCustomDateChange = noop,
  onSearchChange = noop,
  onSportChange = noop,
  onGroupSportsChange = noop,
  onReset = noop,
  scopeNote = "",
}) {
  const sports = Array.isArray(availableSports) ? availableSports : [];

  return (
    <section className="card filter-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip
              title={infoTitle}
              content={infoContent}
            />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>

        <div className="actions-row filter-summary-row">
          <div className="filter-chip">{getAnalyticsPresetLabel(preset)}</div>
          {rangeLabel ? <div className="filter-chip">{rangeLabel}</div> : null}
          <div className="filter-chip">{filteredCount} / {totalCount} activites</div>
        </div>
      </div>

      <div className="period-pill-row">
        {ANALYTICS_PERIOD_PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`period-pill ${preset === option.value ? "is-active" : ""}`.trim()}
            onClick={() => onPresetChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {preset === "custom" ? (
        <div className="filters-grid analytics-range-grid top-gap-sm">
          <label className="field">
            <span className="field-label">Date de debut</span>
            <input
              className="field-input"
              type="date"
              value={customDateFrom}
              onChange={(event) => onCustomDateChange(customDateFromOptionName, event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Date de fin</span>
            <input
              className="field-input"
              type="date"
              value={customDateTo}
              onChange={(event) => onCustomDateChange(customDateToOptionName, event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <div className="filters-grid analytics-filters-grid top-gap-sm">
        <label className="field field-span-2">
          <span className="field-label">Recherche</span>
          <input
            className="field-input"
            type="text"
            value={search}
            placeholder="Nom, description, sport..."
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Type de sport</span>
          <select className="field-input" value={sportGroup} onChange={(event) => onSportChange(event.target.value)}>
            <option value="all">Tous les sports</option>
            {sports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </label>

        <label className="field toggle-field">
          <span className="field-label">Regroupement intelligent</span>
          <button
            type="button"
            className={`toggle-pill ${groupSports ? "is-active" : ""}`.trim()}
            onClick={() => onGroupSportsChange(!groupSports)}
          >
            {groupSports ? "Active" : "Desactive"}
          </button>
        </label>
      </div>

      {scopeNote ? (
        <div className="alert alert-info top-gap-sm">{scopeNote}</div>
      ) : null}

      <div className="actions-row filter-footer-actions top-gap-sm">
        <button type="button" className="button button-outline" onClick={onReset}>
          {resetLabel}
        </button>
      </div>
    </section>
  );
}
