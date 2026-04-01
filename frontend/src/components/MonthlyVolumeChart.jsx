import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMetricLabel } from "../utils/activityAggregations.js";

const PERIOD_OPTIONS = [
  { value: 6, label: "6 mois" },
  { value: 12, label: "12 mois" },
  { value: 24, label: "24 mois" },
  { value: 36, label: "36 mois" },
  { value: "all", label: "Tout" },
];

const METRIC_OPTIONS = [
  { value: "distanceKm", label: "Distance (km)" },
  { value: "elevationGain", label: "D+ (m)" },
  { value: "movingHours", label: "Temps (h)" },
  { value: "count", label: "Activités" },
];

function formatTooltipValue(value, name) {
  return [value, name];
}

export default function MonthlyVolumeChart({
  data,
  chartType,
  metricKey,
  periodMonths,
  onChartTypeChange,
  onMetricChange,
  onPeriodChange,
}) {
  const metricLabel = getMetricLabel(metricKey);

  return (
    <section className="card chart-card chart-card-tall">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Analyse mensuelle</h2>
          <p className="card-subtitle">Tous les mois de la période sélectionnée sont visibles, même à 0.</p>
        </div>
        <div className="chart-toolbar">
          <label className="inline-field">
            <span className="field-label inline-label">Affichage</span>
            <select className="field-input field-input-small" value={chartType} onChange={(event) => onChartTypeChange(event.target.value)}>
              <option value="line">Courbe</option>
              <option value="bar">Barres</option>
            </select>
          </label>
          <label className="inline-field">
            <span className="field-label inline-label">Métrique</span>
            <select className="field-input field-input-small" value={metricKey} onChange={(event) => onMetricChange(event.target.value)}>
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span className="field-label inline-label">Période</span>
            <select className="field-input field-input-small" value={String(periodMonths)} onChange={(event) => onPeriodChange(event.target.value === "all" ? "all" : Number(event.target.value))}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {data?.length ? (
        <div className="chart-box chart-box-tall">
          <ResponsiveContainer>
            {chartType === "bar" ? (
              <BarChart data={data} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                <XAxis dataKey="period" interval={0} tick={{ fontSize: 11 }} height={56} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} width={70} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Bar dataKey="value" name={metricLabel} fill="#0b5fff" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                <XAxis dataKey="period" interval={0} tick={{ fontSize: 11 }} height={56} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} width={70} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Line type="monotone" dataKey="value" name={metricLabel} stroke="#0b5fff" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
