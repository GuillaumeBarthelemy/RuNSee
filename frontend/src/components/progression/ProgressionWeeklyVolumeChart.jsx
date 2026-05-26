import { memo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionWeeklyVolumeChart — Mockup p.17 Row 2 gauche.
 *
 * Line chart Volume hebdo + moyenne glissante 4 sem, avec overlay valeur semaine
 * courante.
 */
function ProgressionWeeklyVolumeChart({ data = {} }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const current = data?.current || null;
  return (
    <section className="progression-panel progression-weekly-volume-card">
      <div className="progression-panel-head">
        <h3>Volume hebdomadaire</h3>
        <span className="progression-panel-sub">Volume (km) · Moyenne glissante 4 sem.</span>
      </div>
      <div className="progression-weekly-volume-body">
        <div className="progression-weekly-volume-chart">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e5edf7" }}
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
                formatter={(value, name) => [
                  `${Number(value).toFixed(1).replace(".", ",")} km`,
                  name === "value" ? "Volume" : "Moy 4 sem.",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(name) => (name === "value" ? "Volume (km)" : "Moyenne glissante 4 sem.")} />
              <Line type="monotone" dataKey="value" stroke="#1268f3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rolling" stroke="#0f172a" strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {current ? (
          <aside className="progression-weekly-volume-current">
            <small>Semaine {current.weekIndex} ({current.weekLabel})</small>
            <div>
              <span>Volume</span>
              <strong>{current.formattedValue}</strong>
            </div>
            <div>
              <span>Moy. glissante 4 sem.</span>
              <strong>{current.formattedRolling}</strong>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

export default memo(ProgressionWeeklyVolumeChart);
