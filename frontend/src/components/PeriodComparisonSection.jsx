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
} from 'recharts';
import { formatMetricValue, getMetricConfig } from '../utils/activityAggregations.js';
import { buildPeriodComparisonModel, getComparisonControlOptions } from '../utils/periodComparison.js';

const MODE_OPTIONS = [
  { value: 'yearToDate', label: 'Année à date' },
  { value: 'fullMonths', label: 'Mois complets' },
  { value: 'fullYears', label: 'Années complètes' },
];

function DeltaCell({ value, metric }) {
  if (value === null || value === undefined) return <span>—</span>;
  const positive = value >= 0;
  return <span className={positive ? 'delta-positive' : 'delta-negative'}>{positive ? '+' : ''}{formatMetricValue(value, metric)}</span>;
}

function PercentCell({ value }) {
  if (value === null || value === undefined) return <span>—</span>;
  const positive = value >= 0;
  return <span className={positive ? 'delta-positive' : 'delta-negative'}>{positive ? '+' : ''}{value.toFixed(1)} %</span>;
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
  activities,
  mode,
  metric,
  reference,
  display,
  periods,
  onModeChange,
  onMetricChange,
  onReferenceChange,
  onDisplayChange,
  onPeriodsChange,
}) {
  const controls = getComparisonControlOptions(activities);
  const metricConfig = getMetricConfig(metric);
  const model = buildPeriodComparisonModel(activities, { mode, metric, reference, periods });
  const effectiveDisplay = mode === 'yearToDate' ? display : 'bar';

  return (
    <section className="card chart-card elevate-section">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <h2 className="card-title">Comparaison de périodes</h2>
          <p className="card-subtitle">Lecture plus claire inspirée d'Elevate : une référence, plusieurs périodes alignées et un résumé compact.</p>
        </div>
        <div className="chart-controls">
          <label className="inline-field"><span className="field-label inline-label">Mode</span>
            <select className="field-input field-input-small" value={mode} onChange={(e) => onModeChange(e.target.value)}>
              {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="inline-field"><span className="field-label inline-label">Métrique</span>
            <select className="field-input field-input-small" value={metric} onChange={(e) => onMetricChange(e.target.value)}>
              <option value="distanceKm">Distance (km)</option>
              <option value="elevationGain">Dénivelé positif</option>
              <option value="movingHours">Temps de déplacement</option>
              <option value="count">Activités</option>
            </select>
          </label>
          {mode === 'yearToDate' ? (
            <label className="inline-field"><span className="field-label inline-label">Affichage</span>
              <select className="field-input field-input-small" value={effectiveDisplay} onChange={(e) => onDisplayChange(e.target.value)}>
                <option value="line">Courbe</option>
                <option value="bar">Barres</option>
              </select>
            </label>
          ) : null}
          <label className="inline-field"><span className="field-label inline-label">Périodes</span>
            <select className="field-input field-input-small" value={periods} onChange={(e) => onPeriodsChange(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          {model.controlType === 'date' ? (
            <label className="inline-field"><span className="field-label inline-label">Date de référence</span>
              <input className="field-input field-input-small" type="date" value={model.referenceValue} onChange={(e) => onReferenceChange(e.target.value)} />
            </label>
          ) : null}
          {model.controlType === 'month' ? (
            <label className="inline-field"><span className="field-label inline-label">Mois de référence</span>
              <input className="field-input field-input-small" type="month" value={model.referenceValue} onChange={(e) => onReferenceChange(e.target.value)} />
            </label>
          ) : null}
          {model.controlType === 'year' ? (
            <label className="inline-field"><span className="field-label inline-label">Année de référence</span>
              <select className="field-input field-input-small" value={model.referenceValue} onChange={(e) => onReferenceChange(e.target.value)}>
                {controls.years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {model.insight ? <div className="alert alert-info section-sm">{model.insight}</div> : null}

      <div className="elevate-layout">
        <div className="chart-box large-chart elevate-main-chart">
          <ResponsiveContainer>
            {effectiveDisplay === 'bar' ? (
              <BarChart data={model.mode === 'yearToDate' ? model.rows.map((row) => ({ label: row.label, value: row.value, fill: row.color })) : model.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip metric={metric} />} />
                <Legend />
                <Bar dataKey="value" name={metricConfig.label} radius={[10, 10, 0, 0]}>
                  {(model.mode === 'yearToDate' ? model.rows : model.chartData).map((entry) => <Cell key={entry.label} fill={entry.color || entry.fill} />)}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={model.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip metric={metric} />} />
                <Legend />
                {model.rows.map((row) => (
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
                {model.rows.map((row) => (
                  <tr key={row.key} className={row.isBest ? 'comparison-best-row' : ''}>
                    <td>
                      <div className="comparison-label-cell">
                        <strong>{row.label}</strong>
                        <span className="small-text">{row.description}</span>
                      </div>
                    </td>
                    <td>{formatMetricValue(row.value, metric)}</td>
                    <td><DeltaCell value={row.deltaPrevious} metric={metric} /></td>
                    <td><PercentCell value={row.deltaPercent} /></td>
                    <td><DeltaCell value={row.deltaReference} metric={metric} /></td>
                    <td>
                      {row.isReference ? <span className="filter-chip">Référence</span> : row.isBest ? <span className="best-badge">Meilleure</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
