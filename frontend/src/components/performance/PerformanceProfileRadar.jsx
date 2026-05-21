import { memo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

const COLOR = "#1268f3";

function PerformanceProfileRadar({ axes = [] }) {
  const data = Array.isArray(axes)
    ? axes.map((a) => ({ axis: a.label, score: Math.round(Number(a.score) || 0) }))
    : [];

  if (data.length < 3) {
    return (
      <section className="performance-panel performance-profile-radar-card">
        <div className="performance-panel-head">
          <h3>Profil de performance indicatif</h3>
        </div>
        <PerformanceEmptyState message="Profil indicatif disponible dès que tu auras 5 axes exploitables." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-profile-radar-card">
      <div className="performance-panel-head">
        <h3>Profil de performance indicatif</h3>
        <span className="performance-panel-sub">(orientation entraînement, pas mesure laboratoire)</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarGrid stroke="#e5edf7" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#355886" }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#e5edf7" />
          <Radar
            name="Profil"
            dataKey="score"
            stroke={COLOR}
            strokeWidth={2}
            fill={COLOR}
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>
    </section>
  );
}

export default memo(PerformanceProfileRadar);
