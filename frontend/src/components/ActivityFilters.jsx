export default function ActivityFilters({
  filters,
  availableSports,
  filteredCount,
  totalCount,
  onChange,
  onReset,
}) {
  return (
    <section className="card filter-card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Filtres d'analyse</h2>
          <p className="card-subtitle">
            La sélection alimente la table, les KPI et les visualisations. L'état du tableau de bord est mémorisé quand tu ouvres une activité.
          </p>
        </div>
        <div className="filter-chip">{filteredCount} / {totalCount} activités affichées</div>
      </div>

      <div className="filters-grid filters-grid-wide">
        <label className="field field-span-2">
          <span className="field-label">Recherche</span>
          <input
            className="field-input"
            type="text"
            value={filters.search}
            placeholder="Nom, description, sport…"
            onChange={(event) => onChange("search", event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Filtre sport</span>
          <select className="field-input" value={filters.sportValue} onChange={(event) => onChange("sportValue", event.target.value)}>
            <option value="all">Tous les sports</option>
            {availableSports.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </label>

        <label className="field field-toggle">
          <span className="field-label">Regroupements intelligents</span>
          <button
            type="button"
            className={`toggle-switch ${filters.useGrouping ? "is-active" : ""}`}
            onClick={() => onChange("useGrouping", !filters.useGrouping)}
            aria-pressed={filters.useGrouping}
          >
            <span className="toggle-switch-handle" />
            <span className="toggle-switch-label">{filters.useGrouping ? "Activés" : "Désactivés"}</span>
          </button>
        </label>

        <label className="field">
          <span className="field-label">Date de début</span>
          <input className="field-input" type="date" value={filters.dateFrom} onChange={(event) => onChange("dateFrom", event.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Date de fin</span>
          <input className="field-input" type="date" value={filters.dateTo} onChange={(event) => onChange("dateTo", event.target.value)} />
        </label>
      </div>

      <div className="actions-row top-gap-sm wrap-on-mobile">
        <button className="button button-outline" onClick={onReset}>Réinitialiser les filtres</button>
        <div className="small-text">
          Mode sport actuel : <strong>{filters.useGrouping ? "familles regroupées" : "sports détaillés"}</strong>
        </div>
      </div>
    </section>
  );
}
