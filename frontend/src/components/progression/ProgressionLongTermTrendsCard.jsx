import { memo } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

/**
 * ProgressionLongTermTrendsCard — Mockup p.17 Row 3 droite.
 *
 * 3 mini sparklines multi-annees (charge / volume / D+).
 */
function ProgressionLongTermTrendsCard({ items = [] }) {
  return (
    <aside className="progression-panel progression-trends-card">
      <div className="progression-panel-head">
        <h3>Tendances long terme</h3>
      </div>
      <ul className="progression-trends-list">
        {items.map((it) => (
          <li key={it.key} className="progression-trends-item">
            <div className="progression-trends-meta">
              <small>{it.label}</small>
              <strong>{it.formattedValue}</strong>
              <span className={`progression-trends-delta tone-${it.tone || "neutral"}`}>{it.formattedDelta}</span>
            </div>
            <div className="progression-trends-spark">
              <ResponsiveContainer width="100%" height={32}>
                <LineChart data={it.points || []} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <Line type="monotone" dataKey="y" stroke={it.color || "#1268f3"} strokeWidth={1.8} dot={{ r: 2, fill: it.color || "#1268f3" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default memo(ProgressionLongTermTrendsCard);
