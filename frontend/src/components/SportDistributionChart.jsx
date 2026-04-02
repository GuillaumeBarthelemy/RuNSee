import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0b5fff", "#22c55e", "#f97316", "#8b5cf6", "#06b6d4", "#f43f5e", "#64748b", "#84cc16", "#14b8a6", "#f59e0b"];

export default function SportDistributionChart({ data, groupSports }) {
  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Répartition par sport</h2>
          <p className="card-subtitle">
            {groupSports
              ? "Les sports sont regroupés intelligemment pour une lecture synthétique."
              : "Affichage détaillé sport par sport avec traduction en français."}
          </p>
        </div>
      </div>
      {data?.length ? (
        <div className="chart-box large-chart">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={120} innerRadius={65} paddingAngle={2} label>
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
