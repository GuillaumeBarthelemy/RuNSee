export default function ActivityFilters({ filters, options, availableSports, filteredCount, totalCount, onChange, onReset, onOptionChange }) {
  return (
    <section className="card filter-card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Filtres d'analyse</h2>
          <p className="card-subtitle">Affinez la sélection, choisissez la logique de regroupement et conserve ta vue entre les pages.</p>
        </div>
        <div className="filter-chip">{filteredCount} / {totalCount} activités</div>
      </div>

      <div className="filters-grid">
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
          <span className="field-label">Sport affiché</span>
          <select className="field-input" value={filters.sportGroup} onChange={(event) => onChange("sportGroup", event.target.value)}>
            <option value="all">Tous les sports</option>
            {availableSports.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </label>

        <label className="field toggle-field">
          <span className="field-label">Regroupement intelligent</span>
          <button
            type="button"
            className={`toggle-pill ${options.groupSports ? "is-active" : ""}`}
            onClick={() => onOptionChange("groupSports", !options.groupSports)}
          >
            {options.groupSports ? "Activé" : "Désactivé"}
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

      <div className="actions-row top-gap-sm">
        <button className="button button-outline" onClick={onReset}>Réinitialiser les filtres</button>
      </div>
    </section>
  );
}
