import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DistanceDistributionChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data.filter((entry) => entry?.label) : [];

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Profil des distances de sorties</h2>
          <p className="card-subtitle">Repère la place des sorties courtes, intermédiaires et longues dans ton entraînement.</p>
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-medium">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}`, "Nombre d'activités"]} />
              <Legend />
              <Bar dataKey="value" name="Nombre d'activités" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty-state">Aucune activité disponible pour répartir les distances.</div>}
    </section>
  );
}
