import InfoTooltip from "./InfoTooltip.jsx";

function DecisionPill({ label, value, detail, tone = "neutral" }) {
  return (
    <div className={`decision-pill decision-pill-${tone}`.trim()}>
      <span className="decision-pill-label">{label}</span>
      <strong className="decision-pill-value">{value}</strong>
      <span className="decision-pill-detail">{detail}</span>
    </div>
  );
}

export default function DashboardDecisionSummaryCard({
  model = {},
  title = "Synthese decisionnelle",
  subtitle = "Lecture rapide de la forme du moment, de la fatigue recente et du sens de charge avant de choisir la suite.",
  info = [],
}) {
  const safeModel = model || {};

  return (
    <section className="card dashboard-decision-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
          {safeModel.rangeLabel ? <p className="small-text">Lecture sur {safeModel.rangeLabel}.</p> : null}
        </div>
        {safeModel.insight ? (
          <div className="decision-summary-note">
            <strong>Lecture</strong>
            <span>{safeModel.insight}</span>
          </div>
        ) : null}
      </div>

      <div className="decision-pill-grid">
        <DecisionPill
          label="Forme du moment"
          value={safeModel.form?.label || "Indeterminee"}
          detail={safeModel.form?.detail || "Pas assez de donnees"}
          tone={safeModel.form?.tone}
        />
        <DecisionPill
          label="Fatigue"
          value={safeModel.fatigue?.label || "Indeterminee"}
          detail={safeModel.fatigue?.detail || "Pas assez de donnees"}
          tone={safeModel.fatigue?.tone}
        />
        <DecisionPill
          label="Charge"
          value={safeModel.charge?.label || "A lire"}
          detail={safeModel.charge?.detail || "Pas assez de donnees"}
          tone={safeModel.charge?.tone}
        />
      </div>

      <div className={`dashboard-recommendation dashboard-recommendation-${safeModel.recommendation?.tone || "neutral"}`.trim()}>
        <span className="dashboard-recommendation-label">Recommandation</span>
        <strong>{safeModel.recommendation?.label || "Laisser davantage de donnees s'accumuler avant de trancher."}</strong>
      </div>
    </section>
  );
}
