import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COMPARISON_METRICS, COMPARISON_MODES } from "../utils/activityAggregations.js";

const COLORS = ["#0b5fff", "#60a5fa", "#a5b4fc"];

function formatDelta(value, unit) {
  const prefix = value > 0 ? "+" : "";
  if (unit === "act.") {
    return `${prefix}${Math.round(value)} ${unit}`;
  }
  return `${prefix}${value.toFixed(1)} ${unit}`;
}

function formatValue(value, unit) {
  if (unit === "act.") {
    return `${Math.round(value)} ${unit}`;
  }
  return `${value.toFixed(1)} ${unit}`;
}

function tooltipFormatter(value, _name, payload, unit) {
  return [formatValue(Number(value || 0), unit), payload?.payload?.compareLabel || payload?.payload?.label || "Période"];
}

export default function PeriodComparisonSection({
  comparison,
  comparisonMode,
  comparisonMetric,
  onModeChange,
  onMetricChange,
}) {
  const { series = [], summary, metricDefinition, modeDefinition, referenceDate } = comparison || {};

  return (
    <section className="card chart-card comparison-card">
      <div className="card-header-row wrap-on-mobile comparison-header">
        <div>
          <h2 className="card-title">Comparaison de périodes</h2>
          <p className="card-subtitle">
            Compare automatiquement tes blocs récents sur le périmètre filtré par recherche et famille de sport.
          </p>
        </div>
        <div className="comparison-controls">
          <label className="field field-compact comparison-field">
            <span className="field-label">Période</span>
            <select className="field-input" value={comparisonMode} onChange={(event) => onModeChange(event.target.value)}>
              {COMPARISON_MODES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="field field-compact comparison-field">
            <span className="field-label">Indicateur</span>
            <select className="field-input" value={comparisonMetric} onChange={(event) => onMetricChange(event.target.value)}>
              {COMPARISON_METRICS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="comparison-meta-row">
        <span className="filter-chip">Mode : {modeDefinition?.label}</span>
        <span className="comparison-reference">
          Référence : {referenceDate ? new Date(referenceDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
        </span>
      </div>

      <div className="grid comparison-summary-grid top-gap-sm">
        <div className="subcard comparison-summary-card">
          <span className="metric-label">Période courante</span>
          <div className="metric-value">{formatValue(summary?.currentValue || 0, metricDefinition?.unit || "")}</div>
          <div className="metric-secondary">{summary?.currentLabel || "-"}</div>
        </div>
        <div className="subcard comparison-summary-card">
          <span className="metric-label">Écart vs période précédente</span>
          <div className={`metric-value ${(summary?.delta || 0) >= 0 ? "positive-text" : "negative-text"}`}>
            {formatDelta(summary?.delta || 0, metricDefinition?.unit || "")}
          </div>
          <div className="metric-secondary">
            {summary?.deltaPercent === null
              ? "Pas de base de comparaison disponible"
              : `${summary.deltaPercent >= 0 ? "+" : ""}${summary.deltaPercent.toFixed(1)} % vs ${summary.previousLabel}`}
          </div>
        </div>
        <div className="subcard comparison-summary-card">
          <span className="metric-label">Meilleure période affichée</span>
          <div className="metric-value">{summary?.bestLabel || "-"}</div>
          <div className="metric-secondary">Moyenne : {formatValue(summary?.averageValue || 0, metricDefinition?.unit || "")}</div>
        </div>
      </div>

      {series.length ? (
        <div className="chart-box comparison-chart-box top-gap-sm">
          <ResponsiveContainer>
            <BarChart data={series} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name, payload) => tooltipFormatter(value, name, payload, metricDefinition?.unit || "")} />
              <Legend formatter={() => metricDefinition?.label || "Valeur"} />
              <Bar dataKey="value" name={metricDefinition?.label || "Valeur"} radius={[10, 10, 0, 0]}>
                {series.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state top-gap-sm">Aucune donnée disponible pour calculer une comparaison sur ce périmètre.</div>
      )}
    </section>
  );
}
