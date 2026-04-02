import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMetricValue, getMetricConfig } from '../utils/activityAggregations.js';

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>{item.name} : {formatMetricValue(item.value, metric)}</div>
      ))}
    </div>
  );
}

export default function RollingLoadChart({ data, metric = 'distanceKm' }) {
  const config = getMetricConfig(metric);
  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Charge glissante 7 j / 28 j</h2>
          <p className="card-subtitle">Visualise la dynamique récente et la progression de ta charge d'entraînement.</p>
        </div>
      </div>
      {data?.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
              <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip metric={metric} />} />
              <Legend />
              <Line type="monotone" dataKey="load7" name={`Charge 7 j · ${config.label}`} stroke="#0b5fff" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="load28" name={`Charge 28 j · ${config.label}`} stroke="#12b76a" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty-state">Pas assez de données pour calculer une charge glissante.</div>}
    </section>
  );
}
