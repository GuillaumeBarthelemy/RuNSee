import InfoTooltip from "./InfoTooltip.jsx";

const GAUGE_EXPLANATIONS = {
  base: {
    summary: "La base de charge mesure le socle recent construit par l'entrainement sur plusieurs semaines.",
    calculation:
      "Pour chaque jour de la selection, on calcule une base a partir de la charge cumulee sur 42 jours glissants, puis on la ramene a une echelle hebdomadaire equivalente pour la comparer a la pression recente.",
    reading:
      "Plus la base est haute, plus le fond recent est solide. Le score 0-100 ne correspond pas a des points de charge : il situe simplement le niveau moyen de la selection dans sa propre distribution.",
  },
  pressure: {
    summary: "La pression recente mesure la contrainte la plus immediate imposee par l'entrainement.",
    calculation:
      "Pour chaque jour de la selection, on additionne la charge des 7 derniers jours glissants. La carte affiche ensuite la moyenne de ces niveaux quotidiens sur toute la selection.",
    reading:
      "Plus la pression est haute, plus le bloc recent est dense. Le score 0-100 est une lecture relative a la selection, pas une charge brute.",
  },
  balance: {
    summary: "La balance de charge lit l'equilibre entre ta base recente et la pression imposee par le bloc en cours.",
    calculation:
      "Pour chaque jour de la selection, on calcule balance = base de charge - pression recente. Une balance positive traduit plus de reserve, une balance proche de zero un equilibre neutre, une balance basse une pression plus forte que la base.",
    reading:
      "Le score 0-100 reste relatif a la selection. Un niveau plus haut signifie une balance plus favorable au sein du bloc observe.",
  },
};

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = end.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
}

function TrendIcon({ direction = "steady" }) {
  if (direction === "up") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 16l6-6 6 6" />
        <path d="M12 10v10" />
      </svg>
    );
  }

  if (direction === "down") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 8l6 6 6-6" />
        <path d="M12 14V4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M16 9l3 3-3 3" />
    </svg>
  );
}

function GaugeTooltipContent({ model }) {
  const safeScale = Array.isArray(model?.scale) ? model.scale : [];
  const explanation = GAUGE_EXPLANATIONS[model?.key] || {};
  const selectionLabel = formatDateRange(model?.selectionStartDate, model?.selectionEndDate);
  const comparisonLabel = formatDateRange(model?.comparisonStartDate, model?.comparisonEndDate);

  return (
    <div className="gauge-tooltip-shell">
      <p className="gauge-tooltip-intro">
        {explanation.summary}
      </p>
      <div className="gauge-tooltip-details">
        <div className="gauge-tooltip-detail">
          <strong>Calcul</strong>
          <span>{explanation.calculation}</span>
        </div>
        <div className="gauge-tooltip-detail">
          <strong>Periode</strong>
          <span>
            {selectionLabel ? `Selection analysee : ${selectionLabel}` : "Selection analysee : periode courante."}
            {model?.historyDays ? ` (${model.historyDays} j).` : ""}
            {" "}La carte affiche la moyenne des niveaux quotidiens calcules sur ce bloc.
          </span>
        </div>
        <div className="gauge-tooltip-detail">
          <strong>Lecture</strong>
          <span>{explanation.reading}</span>
        </div>
        <div className="gauge-tooltip-detail">
          <strong>Tendance</strong>
          <span>
            {comparisonLabel
              ? `Le badge de tendance compare la moyenne de cette selection a la periode precedente equivalente (${comparisonLabel}).`
              : "Le badge de tendance compare la moyenne de cette selection a la periode precedente equivalente."}
          </span>
        </div>
      </div>
      <div className="gauge-tooltip-scale">
        {safeScale.map((item) => {
          const isActive = item.label === model?.statusLabel;

          return (
            <div
              className={`gauge-tooltip-scale-item ${isActive ? "is-active" : ""}`.trim()}
              key={`${model?.key}-${item.range}`}
              style={{ "--gauge-scale-color": item.color }}
            >
              <strong>{item.range}</strong>
              <span className="gauge-tooltip-scale-dot" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className="gauge-tooltip-footer">
        <span>
          Niveau sur la selection : <strong>{model?.statusLabel}</strong>
        </span>
        <span>
          Score relatif : <strong>{model?.score} / 100</strong>
        </span>
        <span>
          Tendance : <strong>{model?.trendLabel}</strong>
        </span>
      </div>
    </div>
  );
}

export default function TrainingStateGaugeGrid({ models = [] }) {
  const safeModels = Array.isArray(models) ? models : [];

  if (!safeModels.length) {
    return (
      <div className="card empty-state">
        Pas assez de donnees pour calculer les jauges d'etat de charge.
      </div>
    );
  }

  return (
    <section className="grid training-gauge-grid">
      {safeModels.map((model) => (
        <article
          className="metric-card premium-metric training-gauge-card"
          key={model.key}
          style={{
            "--gauge-tone": model.toneColor,
            "--gauge-tone-soft": model.toneSoftColor,
            "--gauge-progress": `${model.score}%`,
          }}
        >
          <div className="metric-label-row">
            <span className="metric-label">{model.label}</span>
            <InfoTooltip
              title={model.label}
              label={`Afficher l'aide pour ${model.label}`}
              customContent={<GaugeTooltipContent model={model} />}
              contentClassName="gauge-tooltip-panel"
            />
          </div>

          <div className="training-gauge-ring" aria-hidden="true">
            <div className="training-gauge-ring-inner">
              <strong>{model.score}</strong>
              <span>/ 100</span>
            </div>
          </div>

          <div className="training-gauge-status">{model.statusLabel}</div>

          <div className="training-gauge-trend">
            <TrendIcon direction={model.trendDirection} />
            <strong>{model.trendLabel}</strong>
            <span>{model.trendNote}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
