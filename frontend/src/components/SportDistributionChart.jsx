import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0b5fff", "#22c55e", "#f97316", "#8b5cf6", "#06b6d4", "#f43f5e", "#64748b", "#84cc16", "#f59e0b", "#14b8a6"];

export default function SportDistributionChart({ data, useGrouping }) {
  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Répartition par sport</h2>
          <p className="card-subtitle">
            {useGrouping
              ? "Les sports proches sont fusionnés pour simplifier la lecture (trail inclus dans la course à pied)."
              : "Affichage détaillé des sports traduits en français, sans regroupement automatique."}
          </p>
        </div>
      </div>
      {data?.length ? (
        <div className="chart-box large-chart">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={118} innerRadius={68} paddingAngle={2} labelLine={false}>
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
