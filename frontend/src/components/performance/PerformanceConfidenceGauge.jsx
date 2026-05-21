import { memo } from "react";
import KpiGaugeCircular from "../visuals/alpine/KpiGaugeCircular.jsx";

const TONE_TO_NUMERIC = {
  positive: 2,
  neutral: 3,
  warning: 4,
  negative: 5,
  danger: 5,
};

function explainConfidence(label) {
  if (!label) return "";
  if (/elev/i.test(label)) {
    return "De nombreuses données récentes et diversifiées permettent une estimation fiable de ton VDOT et de ton profil.";
  }
  if (/moyenne/i.test(label)) {
    return "Quelques données manquent ou sont datées. L'estimation reste exploitable mais à lire avec recul.";
  }
  if (/faible/i.test(label)) {
    return "Trop peu de données récentes pour fiabiliser l'estimation. Ajoute des sorties avec allure et FC.";
  }
  return "Lecture à confronter avec le contexte terrain et la forme du moment.";
}

function PerformanceConfidenceGauge({ confidence = null }) {
  const score = Math.max(0, Math.min(100, Math.round(Number(confidence?.score) || 0)));
  const rawLabel = confidence?.label || "Confiance à consolider";
  const label = rawLabel.replace(/^Confiance\s+/i, "").replace(/^./, (c) => c.toUpperCase());
  const tone = TONE_TO_NUMERIC[confidence?.tone] || 3;
  const explanation = confidence?.message || explainConfidence(label);

  return (
    <section className="performance-panel performance-confidence-gauge-card">
      <div className="performance-panel-head">
        <h3>Confiance de l'estimation</h3>
      </div>
      <div className="performance-confidence-gauge-body">
        <div className="performance-confidence-gauge-visual">
          <KpiGaugeCircular value={score} tone={tone} size="sm" unit="%" />
          <strong className={`performance-confidence-gauge-level tone-${confidence?.tone || "neutral"}`}>
            {label}
          </strong>
        </div>
        <p className="performance-confidence-gauge-message">{explanation}</p>
      </div>
    </section>
  );
}

export default memo(PerformanceConfidenceGauge);
