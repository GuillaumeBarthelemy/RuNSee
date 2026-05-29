import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

// Wording labels enrichis mockup p.13 + icones colorees.
const AXIS_META = {
  endurance: { label: "Endurance", sub: "Longue durée", color: "#22c55e" },
  seuil: { label: "Seuil", sub: "Tempo soutenu", color: "#1268f3" },
  vitesse: { label: "Vitesse", sub: "Courtes distances", color: "#7c3aed" },
  vo2max: { label: "VO₂max", sub: "Puissance aérobie", color: "#ef4444" },
  muscular: { label: "Endurance musculaire", sub: "Côtes", color: "#fb923c" },
};

// Ordre mockup p.13 : Endurance / Seuil / Vitesse / VO2max / Endurance musculaire.
const ORDER = ["endurance", "seuil", "vitesse", "vo2max", "muscular"];

function qualificatif(score) {
  if (score >= 65) return { label: "Solide", tone: "positive" };
  if (score >= 50) return { label: "Correct", tone: "neutral" };
  return { label: "À développer", tone: "warning" };
}

function PerformanceProfileBars({ axes = [], referenceVdot = null }) {
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

  const sortedAxes = ORDER
    .map((key) => axes.find((a) => a.key === key))
    .filter(Boolean);

  return (
    <section className="performance-panel performance-profile-bars-card">
      <div className="performance-panel-head">
        <h3>Décomposition indicatrice du profil</h3>
      </div>
      <ul className="performance-profile-bars-list">
        {sortedAxes.map((axis) => {
          const score = Math.max(0, Math.min(100, Math.round(Number(axis.score) || 0)));
          const meta = AXIS_META[axis.key] || { label: axis.label, sub: "", color: "#94a3b8" };
          const qual = qualificatif(score);
          return (
            <li key={axis.key} className="performance-profile-bar-row" title={meta.sub ? `${meta.label} (${meta.sub})` : meta.label}>
              <span className="performance-profile-bar-icon" style={{ background: meta.color }} aria-hidden="true" />
              <div className="performance-profile-bar-label-block">
                <strong className="performance-profile-bar-label">{meta.label}</strong>
                {meta.sub ? <small className="performance-profile-bar-sublabel">{meta.sub}</small> : null}
              </div>
              <div className="performance-profile-bar-track">
                <span
                  className="performance-profile-bar-fill"
                  style={{ width: `${Math.max(2, score)}%`, background: meta.color }}
                />
              </div>
              <b className="performance-profile-bar-score">
                {score}<small> /100</small>
              </b>
              <span className={`performance-profile-bar-qual tone-${qual.tone}`}>{qual.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="performance-profile-bars-footer">
        Scores centrés sur ton VO2max consolidé{referenceVdot != null ? ` (${Number(referenceVdot).toFixed(0)})` : ""}.
        50 = équilibre attendu, &gt; 50 = axe en avance, &lt; 50 = à développer.
      </p>
    </section>
  );
}

export default memo(PerformanceProfileBars);
