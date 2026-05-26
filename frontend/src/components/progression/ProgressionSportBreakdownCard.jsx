import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

/**
 * ProgressionSportBreakdownCard — Mockup p.20 Row 3 gauche.
 *
 * 2 donuts cote a cote (annee courante vs N-1) + legendes + evolutions par sport.
 */
function Donut({ data, label, subLabel }) {
  return (
    <div className="progression-sport-donut">
      <div className="progression-sport-donut-chart">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={data.items.filter((it) => it.km > 0)}
              dataKey="km"
              innerRadius={40}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
            >
              {data.items.filter((it) => it.km > 0).map((it) => (
                <Cell key={it.key} fill={it.color} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="progression-sport-donut-center">
          <strong>{label}</strong>
          <small>{subLabel}</small>
        </div>
      </div>
      <ul className="progression-sport-donut-legend">
        {data.items.map((it) => (
          <li key={it.key}>
            <span className="progression-sport-dot" style={{ background: it.color }} />
            <span className="progression-sport-label">{it.label}</span>
            <span className="progression-sport-value">{it.percent} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressionSportBreakdownCard({ data = {} }) {
  const evolutions = Array.isArray(data?.evolutions) ? data.evolutions : [];
  return (
    <section className="progression-panel progression-sport-breakdown-card">
      <div className="progression-panel-head">
        <h3>Répartition par sport — Comparaison <small>(%)</small></h3>
      </div>
      <div className="progression-sport-donuts">
        {data?.current ? <Donut data={data.current} label={data.current.label} subLabel={data.current.subLabel} /> : null}
        {data?.previous ? <Donut data={data.previous} label={data.previous.label} subLabel={data.previous.subLabel} /> : null}
      </div>
      <div className="progression-sport-evolutions">
        {evolutions.slice(0, 2).map((ev) => (
          <div key={ev.key} className="progression-sport-evolution">
            <small>Évolution {ev.label.toLowerCase()}</small>
            <span className={`tone-${ev.tone}`}>{ev.formattedDelta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(ProgressionSportBreakdownCard);
