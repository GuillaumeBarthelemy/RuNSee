const DEFAULT_FILTERS = {
  search: "",
  sportGroup: "all",
  dateFrom: "",
  dateTo: "",
};

const DEFAULT_OPTIONS = {
  groupSports: true,
};

const noop = () => {};

export default function ActivityFilters({
  filters = DEFAULT_FILTERS,
  options = DEFAULT_OPTIONS,
  availableSports = [],
  filteredCount = 0,
  totalCount = 0,
  onChange = noop,
  onReset = noop,
  onOptionChange = noop,
}) {
  const safeFilters = { ...DEFAULT_FILTERS, ...(filters || {}) };
  const safeOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };
  const sports = Array.isArray(availableSports) ? availableSports : [];

  return (
    <section className="card filter-card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Filtres d'analyse</h2>
          <p className="card-subtitle">
            Affinez la selection, choisissez la logique de regroupement et conservez votre vue entre les pages.
          </p>
        </div>
        <div className="filter-chip filter-summary-chip">{filteredCount} / {totalCount} activites</div>
      </div>

      <div className="filters-grid">
        <label className="field field-span-2">
          <span className="field-label">Recherche</span>
          <input
            className="field-input"
            type="text"
            value={safeFilters.search}
            placeholder="Nom, description, sport..."
            onChange={(event) => onChange("search", event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Type de sport</span>
          <select className="field-input" value={safeFilters.sportGroup} onChange={(event) => onChange("sportGroup", event.target.value)}>
            <option value="all">Tous les sports</option>
            {sports.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </label>

        <label className="field toggle-field">
          <span className="field-label">Regroupement intelligent</span>
          <button
            type="button"
            className={`toggle-pill ${safeOptions.groupSports ? "is-active" : ""}`}
            onClick={() => onOptionChange("groupSports", !safeOptions.groupSports)}
          >
            {safeOptions.groupSports ? "Active" : "Desactive"}
          </button>
        </label>

        <label className="field">
          <span className="field-label">Date de debut</span>
          <input className="field-input" type="date" value={safeFilters.dateFrom} onChange={(event) => onChange("dateFrom", event.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Date de fin</span>
          <input className="field-input" type="date" value={safeFilters.dateTo} onChange={(event) => onChange("dateTo", event.target.value)} />
        </label>
      </div>

      <div className="actions-row filter-footer-actions top-gap-sm">
        <button type="button" className="button button-outline" onClick={onReset}>Reinitialiser les filtres</button>
      </div>
    </section>
  );
}
