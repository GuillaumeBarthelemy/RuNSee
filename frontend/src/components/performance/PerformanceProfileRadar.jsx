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

const COLOR_PROFILE = "#1268f3";
const COLOR_REFERENCE = "#94a3b8";

// Wording axes enrichi mockup p.13
const AXIS_LABEL = {
  vo2max: "VO₂max (Puissance aérobie)",
  vitesse: "Vitesse (Courtes distances)",
  seuil: "Seuil (Tempo soutenu)",
  endurance: "Endurance (Longue durée)",
  muscular: "Endurance musculaire (Résistance en côte)",
};

function PerformanceProfileRadar({ axes = [], referenceVdot = null }) {
  if (!Array.isArray(axes) || axes.length < 3) {
    return (
      <section className="performance-panel performance-profile-radar-card">
        <div className="performance-panel-head">
          <h3>Profil de performance <span className="performance-panel-sub">(indicatif)</span></h3>
        </div>
        <PerformanceEmptyState message="Profil indicatif disponible dès que tu auras 5 axes exploitables." />
      </section>
    );
  }

  // Donnees : pour chaque axe, on cumule "Ton profil" et "Référence" (=50 partout = niveau attendu).
  const data = axes.map((a) => ({
    axis: AXIS_LABEL[a.key] || a.label,
    score: Math.round(Number(a.score) || 0),
    reference: 50,
  }));

  return (
    <section className="performance-panel performance-profile-radar-card">
      <div className="performance-panel-head">
        <h3>Profil de performance <span className="performance-panel-sub">(indicatif)</span></h3>
        {referenceVdot != null ? (
          <small className="performance-profile-radar-subtitle">
            Comparé à la référence (VDOT {Number(referenceVdot).toFixed(0)})
          </small>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <RadarChart data={data} margin={{ top: 16, right: 48, bottom: 16, left: 48 }}>
          <PolarGrid stroke="#e5edf7" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#355886" }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#e5edf7" />
          <Radar
            name="Référence (VDOT 54)"
            dataKey="reference"
            stroke={COLOR_REFERENCE}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill={COLOR_REFERENCE}
            fillOpacity={0}
          />
          <Radar
            name="Ton profil (estimé)"
            dataKey="score"
            stroke={COLOR_PROFILE}
            strokeWidth={2}
            fill={COLOR_PROFILE}
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="performance-profile-radar-legend">
        <span className="legend-item legend-profile">
          <span className="legend-swatch" /> Ton profil (estimé)
        </span>
        <span className="legend-item legend-reference">
          <span className="legend-swatch legend-swatch-dashed" /> Référence (VDOT {referenceVdot != null ? Number(referenceVdot).toFixed(0) : "—"})
        </span>
      </div>
    </section>
  );
}

export default memo(PerformanceProfileRadar);
