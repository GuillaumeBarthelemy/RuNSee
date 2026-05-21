import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

const AXIS_COLOR = {
  vo2max: "#1268f3",
  vitesse: "#7c3aed",
  seuil: "#fb923c",
  endurance: "#22c55e",
  muscular: "#f59e0b",
};

function PerformanceProfileBars({ axes = [] }) {
  if (!Array.isArray(axes) || axes.length === 0) {
    return (
      <section className="performance-panel performance-profile-bars-card">
        <div className="performance-panel-head">
          <h3>Décomposition indicatrice du profil</h3>
        </div>
        <PerformanceEmptyState message="Décomposition disponible dès que les 5 axes sont calculables." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-profile-bars-card">
      <div className="performance-panel-head">
        <h3>Décomposition indicatrice du profil</h3>
        <span className="performance-panel-sub">(scores 0–100, indicatifs)</span>
      </div>
      <ul className="performance-profile-bars-list">
        {axes.map((axis) => {
          const score = Math.max(0, Math.min(100, Math.round(Number(axis.score) || 0)));
          const color = AXIS_COLOR[axis.key] || "#94a3b8";
          return (
            <li key={axis.key} className="performance-profile-bar-row">
              <span className="performance-profile-bar-label">{axis.label}</span>
              <div className="performance-profile-bar-track">
                <span
                  className="performance-profile-bar-fill"
                  style={{ width: `${Math.max(2, score)}%`, background: color }}
                />
              </div>
              <b className="performance-profile-bar-score">{score}</b>
              <small className="performance-profile-bar-detail">{axis.detail || ""}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default memo(PerformanceProfileBars);
