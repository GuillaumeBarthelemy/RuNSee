import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";
import { formatPace } from "../utils/activityInsights.js";
import { buildPeriodComparisonModel } from "../utils/periodComparison.js";
import InfoTooltip from "./InfoTooltip.jsx";

const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };
const noop = () => {};

function formatComparisonValue(rowKey, value) {
  if (rowKey === "referencePaceSecondsPerKm") {
    return value > 0 ? formatPace(value) : "-";
  }

  return formatMetricValue(value, rowKey);
}

function PercentCell({ value, invert = false }) {
  if (value === null || value === undefined) return <span className="comparison-empty-value">-</span>;
  const positive = invert ? value <= 0 : value >= 0;

  return (
    <span className={positive ? "delta-positive" : "delta-negative"}>
      {value > 0 ? "+" : ""}
      {value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
    </span>
  );
}

function ComparisonTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip comparison-tooltip">
      <strong>{label}</strong>
      <div className="comparison-tooltip-list">
        {payload.map((item) => (
          <div key={item.dataKey} className="comparison-tooltip-item">
            <span className="comparison-tooltip-dot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <strong>{formatMetricValue(item.value || 0, metric)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PeriodComparisonSection({
  activities = [],
  currentRange = null,
  chartMetric = "distanceKm",
  allowRunOnlyMetrics = false,
  scopeText = "",
  info = [],
  referencePaceInfo = [],
  onChartMetricChange = noop,
}) {
  const model = useMemo(
    () => buildPeriodComparisonModel(activities, {
      currentRange,
      chartMetric,
      allowRunOnlyMetrics,
    }),
    [activities, allowRunOnlyMetrics, chartMetric, currentRange],
  );

  const chartConfig = getMetricConfig(model.chartMetric);
  const currentLabel = model.periods[0]?.label || "Periode selectionnee";
  const previousLabel = model.periods[1]?.label || "Periode precedente";
  const yearLabel = model.periods[2]?.label || "Meme periode N-1";
  const hasData = model.metrics.length > 0;

  return (
    <section className="card chart-card comparison-card-shell">
      <div className="card-header-row wrap-on-mobile comparison-header-row">
        <div className="comparison-header-copy">
          <div className="title-with-info">
            <h2 className="card-title">Comparaison de periodes</h2>
            <InfoTooltip title="Comparaison de periodes" content={info} label="Afficher l'aide pour la comparaison de periodes" />
          </div>
          <p className="card-subtitle">
            Tableau prioritaire sur la periode selectionnee, la periode precedente equivalente et, si disponible, la meme fenetre N-1.
          </p>
          {scopeText ? <p className="comparison-scope">{scopeText}</p> : null}
        </div>

        <div className="chart-controls comparison-controls">
          <label className="inline-field">
            <span className="field-label inline-label">Graphe cumule</span>
            <select className="field-input field-input-small" value={chartMetric} onChange={(event) => onChartMetricChange(event.target.value)}>
              <option value="distanceKm">Distance</option>
              <option value="movingHours">Temps</option>
              <option value="elevationGain">D+</option>
              <option value="load">Charge</option>
              <option value="count">Seances</option>
            </select>
          </label>
        </div>
      </div>

      {model.insight ? <div className="alert alert-info comparison-insight-banner">{model.insight}</div> : null}

      {!hasData ? (
        <div className="empty-state">Aucune donnee exploitable pour comparer des periodes sur cette selection.</div>
      ) : (
        <div className="comparison-stack">
          <div className="comparison-panel comparison-summary-panel">
            <div className="comparison-panel-head">
              <div>
                <h3 className="subcard-title">Tableau de comparaison</h3>
                <p className="card-subtitle">
                  Lecture directe des ecarts de volume, de charge, de structure et d'allure de reference.
                </p>
              </div>
            </div>

            <div className="table-wrapper comparison-table-shell">
              <table className="table compact-table comparison-table comparison-table-summary">
                <thead>
                  <tr>
                    <th>Metrique</th>
                    <th>{currentLabel}</th>
                    <th>{previousLabel}</th>
                    <th>Delta %</th>
                    {model.hasYearComparison ? <th>{yearLabel}</th> : null}
                    {model.hasYearComparison ? <th>Delta N-1</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {model.metrics.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <div className="comparison-label-cell">
                          <div className="title-with-info">
                            <strong>{row.label}</strong>
                            {row.key === "referencePaceSecondsPerKm" ? (
                              <InfoTooltip
                                title="Allure de reference"
                                content={referencePaceInfo}
                                label="Afficher l'aide pour l'allure de reference"
                              />
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{formatComparisonValue(row.key, row.currentValue)}</td>
                      <td>{formatComparisonValue(row.key, row.previousValue)}</td>
                      <td><PercentCell value={row.deltaPercent} invert={row.key === "referencePaceSecondsPerKm"} /></td>
                      {model.hasYearComparison ? <td>{formatComparisonValue(row.key, row.yearValue)}</td> : null}
                      {model.hasYearComparison ? (
                        <td><PercentCell value={row.yearDeltaPercent} invert={row.key === "referencePaceSecondsPerKm"} /></td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="comparison-mobile-cards">
              {model.metrics.map((row) => (
                <article key={row.key} className="comparison-mobile-card">
                  <div className="comparison-mobile-header">
                    <div className="title-with-info">
                      <strong>{row.label}</strong>
                      {row.key === "referencePaceSecondsPerKm" ? (
                        <InfoTooltip
                          title="Allure de reference"
                          content={referencePaceInfo}
                          label="Afficher l'aide pour l'allure de reference"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="comparison-mobile-grid">
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">{currentLabel}</span>
                      <strong>{formatComparisonValue(row.key, row.currentValue)}</strong>
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">{previousLabel}</span>
                      <strong>{formatComparisonValue(row.key, row.previousValue)}</strong>
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Delta %</span>
                      <PercentCell value={row.deltaPercent} invert={row.key === "referencePaceSecondsPerKm"} />
                    </div>
                    {model.hasYearComparison ? (
                      <div className="comparison-mobile-item">
                        <span className="comparison-mobile-label">{yearLabel}</span>
                        <strong>{formatComparisonValue(row.key, row.yearValue)}</strong>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="comparison-panel comparison-chart-panel">
            <div className="comparison-panel-head">
              <div>
                <h3 className="subcard-title">Graphe cumule</h3>
                <p className="card-subtitle">
                  {chartConfig.label} cumulee, alignee sur la duree de la periode selectionnee.
                </p>
              </div>
            </div>

            <div className="chart-box large-chart comparison-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={model.chartData}>
                  <CartesianGrid strokeDasharray="4 7" vertical={false} stroke="rgba(123, 140, 163, 0.16)" />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={18} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={64} />
                  <Tooltip content={<ComparisonTooltip metric={model.chartMetric} />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 18 }} />
                  {model.periods.map((period) => (
                    <Line
                      key={period.key}
                      type="monotone"
                      dataKey={period.key}
                      name={period.label}
                      stroke={period.color}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
