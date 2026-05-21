import { memo } from "react";
import KpiGaugeCircular from "../visuals/alpine/KpiGaugeCircular.jsx";

const TONE_TO_NUMERIC = {
  positive: 2,
  neutral: 3,
  warning: 4,
  negative: 5,
  danger: 5,
};

function PerformanceConfidenceGauge({ confidence = null }) {
  const score = Math.max(0, Math.min(100, Math.round(Number(confidence?.score) || 0)));
  const label = (confidence?.label || "Confiance à consolider")
    .replace(/^Confiance\s+/i, "")
    .replace(/^./, (c) => c.toUpperCase());
  const tone = TONE_TO_NUMERIC[confidence?.tone] || 3;

  return (
    <section className="performance-panel performance-confidence-gauge-card">
      <div className="performance-panel-head">
        <h3>Confiance de l'estimation</h3>
      </div>
      <div className="performance-confidence-gauge-body">
        <KpiGaugeCircular value={score} tone={tone} size="md" unit="%" />
        <strong className={`performance-confidence-gauge-level tone-${confidence?.tone || "neutral"}`}>
          {label}
        </strong>
        {confidence?.message ? (
          <p className="performance-confidence-gauge-message">{confidence.message}</p>
        ) : null}
      </div>
    </section>
  );
}

export default memo(PerformanceConfidenceGauge);
