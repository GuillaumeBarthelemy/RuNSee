import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function formatPace(secondsPerKm) {
  const n = Math.max(0, Math.round(Number(secondsPerKm) || 0));
  if (n <= 0) return "—";
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

/**
 * PerformanceVdotKeyIndicators — Mockup p.13.
 *
 * 4 lignes specifiques (VO2max estimée retiree : c'est le meme chiffre que
 * la KPI VDOT en header — redondance signalee par l'utilisateur).
 *   - Allure au seuil (≈ lactate)         : T-pace Daniels
 *   - Allure 10 km (≈ performance)        : prediction race
 *   - Allure 5 km (≈ vitesse)             : prediction race
 *   - Économie de course                   : indice normalise base 100
 * CTA bas : "Voir les allures de référence"
 */
function PerformanceVdotKeyIndicators({ indicators = {} }) {
  const rows = [
    {
      key: "seuil",
      label: "Allure au seuil",
      sub: "≈ lactate",
      icon: "🩸",
      value: indicators.thresholdPaceSecondsPerKm
        ? `${formatPace(indicators.thresholdPaceSecondsPerKm)} /km`
        : "—",
    },
    {
      key: "10k",
      label: "Allure 10 km",
      sub: "≈ performance",
      icon: "⚡",
      value: indicators.tenKPaceSecondsPerKm
        ? `${formatPace(indicators.tenKPaceSecondsPerKm)} /km`
        : "—",
    },
    {
      key: "5k",
      label: "Allure 5 km",
      sub: "≈ vitesse",
      icon: "🏃",
      value: indicators.fiveKPaceSecondsPerKm
        ? `${formatPace(indicators.fiveKPaceSecondsPerKm)} /km`
        : "—",
    },
    {
      key: "economy",
      label: "Économie de course",
      sub: indicators.economyHint || null,
      icon: "⚙️",
      value: indicators.economyValue != null
        ? `${Math.round(Number(indicators.economyValue))} (base 100)`
        : "—",
    },
  ];

  const anyValue = rows.some((r) => r.value !== "—");

  return (
    <section className="performance-panel performance-vdot-key-indicators">
      <div className="performance-panel-head">
        <h3>Indicateurs clés <span className="performance-panel-sub">(estimés)</span></h3>
      </div>
      {anyValue ? (
        <ul className="performance-vdot-key-indicators-list">
          {rows.map((row) => (
            <li key={row.key}>
              <span className="performance-vdot-key-indicators-label">
                <span className="performance-vdot-key-indicators-icon" aria-hidden="true">{row.icon}</span>
                {row.label}
                {row.sub ? <small> ({row.sub})</small> : null}
              </span>
              <b>{row.value}</b>
            </li>
          ))}
        </ul>
      ) : (
        <PerformanceEmptyState message="Pas encore assez de records pour des prédictions stables." />
      )}
      <a className="performance-vdot-key-indicators-cta" href="#allures">Voir les allures de référence</a>
    </section>
  );
}

export default memo(PerformanceVdotKeyIndicators);
