import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";
import { buildPeriodComparisonModel, getComparisonControlOptions } from "../utils/periodComparison.js";

const MODE_OPTIONS = [
  { value: "yearToDate", label: "Année à date" },
  { value: "fullMonths", label: "Mois complets" },
  { value: "fullYears", label: "Années complètes" },
];

const noop = () => {};

function DeltaCell({ value, metric }) {
  if (value === null || value === undefined) return <span>—</span>;
  const positive = value >= 0;
  return <span className={positive ? "delta-positive" : "delta-negative"}>{positive ? "+" : ""}{formatMetricValue(value, metric)}</span>;
}

function PercentCell({ value }) {
  if (value === null || value === undefined) return <span>—</span>;
  const positive = value >= 0;
  return <span className={positive ? "delta-positive" : "delta-negative"}>{positive ? "+" : ""}{value.toFixed(1)} %</span>;
}

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <div className="comparison-tooltip-list">
        {payload.map((item) => (
          <div key={item.dataKey || item.name} className="comparison-tooltip-item">
            <span className="comparison-tooltip-dot" style={{ background: item.color || item.fill }} />
            <span>{item.name}</span>
            <strong>{formatMetricValue(item.value, metric)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PeriodComparisonSection({
  activities = [],
  mode = "yearToDate",
  metric = "distanceKm",
  reference = "",
  display = "line",
  periods = 3,
  scopeText = "",
  onModeChange = noop,
  onMetricChange = noop,
  onReferenceChange = noop,
  onDisplayChange = noop,
  onPeriodsChange = noop,
}) {
  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeMode = mode || "yearToDate";
  const safeMetric = metric || "distanceKm";
  const safePeriods = Math.max(2, Math.min(4, Number(periods) || 3));
  const safeDisplay = display === "bar" ? "bar" : "line";
  const controls = getComparisonControlOptions(safeActivities);
  const model = buildPeriodComparisonModel(safeActivities, {
    mode: safeMode,
    metric: safeMetric,
    reference,
    periods: safePeriods,
  });
  const metricConfig = getMetricConfig(safeMetric);
  const effectiveDisplay = safeMode === "yearToDate" ? safeDisplay : "bar";
  const years = Array.isArray(controls?.years) && controls.years.length ? controls.years : [new Date().getFullYear()];
  const chartRows = Array.isArray(model?.rows) ? model.rows : [];
  const chartData = Array.isArray(model?.chartData) ? model.chartData : [];
  const hasData = chartRows.length > 0;

  return (
    <section className="card chart-card elevate-section">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <h2 className="card-title">Comparaison de périodes</h2>
          <p className="card-subtitle">Lecture plus claire inspirée d'Elevate : une référence, plusieurs périodes alignées et un résumé compact.</p>
          {scopeText ? <p className="comparison-scope">{scopeText}</p> : null}
        </div>
        <div className="chart-controls">
          <label className="inline-field"><span className="field-label inline-label">Mode</span>
            <select className="field-input field-input-small" value={safeMode} onChange={(event) => onModeChange(event.target.value)}>
              {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="inline-field"><span className="field-label inline-label">Métrique</span>
            <select className="field-input field-input-small" value={safeMetric} onChange={(event) => onMetricChange(event.target.value)}>
              <option value="distanceKm">Distance (km)</option>
              <option value="elevationGain">Dénivelé positif</option>
              <option value="movingHours">Temps de déplacement</option>
              <option value="count">Activités</option>
            </select>
          </label>
          {safeMode === "yearToDate" ? (
            <label className="inline-field"><span className="field-label inline-label">Affichage</span>
              <select className="field-input field-input-small" value={effectiveDisplay} onChange={(event) => onDisplayChange(event.target.value)}>
                <option value="line">Courbe</option>
                <option value="bar">Barres</option>
              </select>
            </label>
          ) : null}
          <label className="inline-field"><span className="field-label inline-label">Périodes</span>
            <select className="field-input field-input-small" value={safePeriods} onChange={(event) => onPeriodsChange(Number(event.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          {model.controlType === "date" ? (
            <label className="inline-field"><span className="field-label inline-label">Date de référence</span>
              <input className="field-input field-input-small" type="date" value={model.referenceValue || ""} onChange={(event) => onReferenceChange(event.target.value)} />
            </label>
          ) : null}
          {model.controlType === "month" ? (
            <label className="inline-field"><span className="field-label inline-label">Mois de référence</span>
              <input className="field-input field-input-small" type="month" value={model.referenceValue || ""} onChange={(event) => onReferenceChange(event.target.value)} />
            </label>
          ) : null}
          {model.controlType === "year" ? (
            <label className="inline-field"><span className="field-label inline-label">Année de référence</span>
              <select className="field-input field-input-small" value={model.referenceValue || String(years[0])} onChange={(event) => onReferenceChange(event.target.value)}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {model.insight ? <div className="alert alert-info section-sm">{model.insight}</div> : null}

      {!hasData ? (
        <div className="empty-state">Aucune donnée exploitable pour comparer des périodes sur cette sélection.</div>
      ) : (
        <div className="elevate-layout">
          <div className="chart-box large-chart elevate-main-chart">
            <ResponsiveContainer width="100%" height="100%">
              {effectiveDisplay === "bar" ? (
                <BarChart data={model.mode === "yearToDate" ? chartRows.map((row) => ({ label: row.label, value: row.value, fill: row.color })) : chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                  <Legend />
                  <Bar dataKey="value" name={metricConfig.label} radius={[10, 10, 0, 0]}>
                    {(model.mode === "yearToDate" ? chartRows : chartData).map((entry) => <Cell key={entry.label} fill={entry.color || entry.fill} />)}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                  <Legend />
                  {chartRows.map((row) => (
                    <Line key={row.key} type="monotone" dataKey={row.key} name={row.label} stroke={row.color} strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="card subcard elevate-side-table">
            <div className="table-wrapper comparison-table-shell">
              <table className="table compact-table comparison-table comparison-table-compact">
                <thead>
                  <tr>
                    <th>Période</th>
                    <th>Valeur</th>
                    <th>Δ préc.</th>
                    <th>Δ %</th>
                    <th>Δ réf.</th>
                    <th>Lecture</th>
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((row) => (
                    <tr key={row.key} className={row.isBest ? "comparison-best-row" : ""}>
                      <td>
                        <div className="comparison-label-cell">
                          <strong>{row.label}</strong>
                          <span className="small-text">{row.description}</span>
                        </div>
                      </td>
                      <td>{formatMetricValue(row.value, safeMetric)}</td>
                      <td><DeltaCell value={row.deltaPrevious} metric={safeMetric} /></td>
                      <td><PercentCell value={row.deltaPercent} /></td>
                      <td><DeltaCell value={row.deltaReference} metric={safeMetric} /></td>
                      <td>
                        {row.isReference ? <span className="filter-chip">Référence</span> : row.isBest ? <span className="best-badge">Meilleure</span> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="comparison-mobile-cards">
              {chartRows.map((row) => (
                <article key={row.key} className={`comparison-mobile-card ${row.isBest ? "comparison-best-row" : ""}`}>
                  <div className="comparison-mobile-header">
                    <div className="comparison-label-cell">
                      <strong>{row.label}</strong>
                      <span className="small-text">{row.description}</span>
                    </div>
                    <div className="comparison-mobile-badge">
                      {row.isReference ? <span className="filter-chip">Référence</span> : row.isBest ? <span className="best-badge">Meilleure</span> : null}
                    </div>
                  </div>

                  <div className="comparison-mobile-grid">
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Valeur</span>
                      <strong>{formatMetricValue(row.value, safeMetric)}</strong>
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Δ préc.</span>
                      <DeltaCell value={row.deltaPrevious} metric={safeMetric} />
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Δ %</span>
                      <PercentCell value={row.deltaPercent} />
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Δ réf.</span>
                      <DeltaCell value={row.deltaReference} metric={safeMetric} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
