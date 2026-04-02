import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatTooltipValue(value, name) {
  if (name === "Distance (km)") return [`${value} km`, name];
  return [value, name];
}

export default function WeeklyVolumeChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Volume hebdomadaire</h2>
          <p className="card-subtitle">Toutes les semaines de la période affichée sont conservées, même à 0.</p>
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
              <XAxis dataKey="period" interval={0} angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              <Bar dataKey="distanceKm" name="Distance (km)" fill="#5b7fff" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
