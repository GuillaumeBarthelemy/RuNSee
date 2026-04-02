import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import InfoTooltip from "./InfoTooltip.jsx";

const COLORS = ["#F97316", "#FB923C", "#355886", "#2C4A73", "#54657D", "#7B8CA3", "#22C55E", "#F59E0B", "#EF4444"];

function defaultFormatter(value, unit = "") {
  return unit ? `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}` : `${value}`;
}

export default function SportDistributionChart({
  data = [],
  title = "Repartition par sport",
  subtitle = "Le volume est regroupe intelligemment pour une lecture synthese.",
  info = [],
  unit = "km",
  valueFormatter = null,
}) {
  const safeData = Array.isArray(data)
    ? data.filter((entry) => entry?.name && Number(entry?.value) > 0)
    : [];
  const formatter = valueFormatter || ((value) => defaultFormatter(value, unit));

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box large-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={safeData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={72} paddingAngle={2} label>
                {safeData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatter(value), "Volume"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnee disponible sur cette plage.</div>
      )}
    </section>
  );
}
