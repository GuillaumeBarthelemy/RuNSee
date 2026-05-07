import InfoTooltip from "./InfoTooltip.jsx";

/**
 * DashboardDecisionSummaryCard — refonte Phase F2.
 *
 * Changements vs version pré-Phase F :
 * - Plus de section "Récupération Garmin détaillée" : déplacée dans TodayReadinessCard
 * - Verdict descriptif (au lieu de "Recommandation" prescriptive)
 * - 3 pills concises (Forme / Fatigue / Charge) au lieu de 4 + section
 * - Chips de facteurs sous le verdict (max 4)
 *
 * Prop `model` inchangée pour rétrocompat avec buildDashboardDecisionSummary.
 */

function DecisionPill({ label, value, detail, tone = "neutral" }) {
  return (
    <div className={`decision-pill decision-pill-${tone}`.trim()}>
      <span className="decision-pill-label">{label}</span>
      <strong className="decision-pill-value">{value}</strong>
      <span className="decision-pill-detail">{detail}</span>
    </div>
  );
}

function VerdictChip({ label }) {
  return <span className="verdict-chip">{label}</span>;
}

export default function DashboardDecisionSummaryCard({
  model = {},
  title = "Lecture du jour",
  subtitle = "Forme, fatigue récente et sens de charge — à lire avant de choisir ta prochaine séance.",
  info = [],
  trailContext = null,
}) {
  const safeModel = model || {};
  const decisionMeta = safeModel.decisionMeta || {};
  const decisionFactors = Array.isArray(decisionMeta.factors) ? decisionMeta.factors : [];

  // Verdict descriptif : on privilégie l'insight (déjà descriptif) plutôt que
  // la recommandation prescriptive. Fallback sur recommandation si absent.
  const verdictText = safeModel.insight
    || safeModel.recommendation?.label
    || "Pas assez de données pour produire une lecture du jour.";
  const verdictTone = safeModel.recommendation?.tone || "neutral";

  // Chips : facteurs synthétiques (max 4)
  const visibleChips = decisionFactors.slice(0, 4);

  return (
    <section className="card dashboard-decision-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} compact />
          </div>
          <p className="card-subtitle">{subtitle}</p>
          {safeModel.horizonLabel ? <p className="small-text">{safeModel.horizonLabel}</p> : null}
        </div>
      </div>

      {/* Verdict descriptif + chips */}
      <div className={`dashboard-verdict dashboard-verdict-${verdictTone}`.trim()}>
        <span className="dashboard-verdict-kicker">Verdict du jour</span>
        <strong className="dashboard-verdict-text">{verdictText}</strong>
        {visibleChips.length > 0 ? (
          <div className="dashboard-verdict-chips">
            {visibleChips.map((factor, idx) => (
              <VerdictChip key={`${factor}-${idx}`} label={factor} />
            ))}
          </div>
        ) : null}
        {decisionMeta.confidence?.label || decisionMeta.limitingFactor ? (
          <div className="dashboard-verdict-meta">
            {decisionMeta.confidence?.label ? (
              <span><strong>Confiance</strong> {decisionMeta.confidence.label}</span>
            ) : null}
            {decisionMeta.limitingFactor ? (
              <span><strong>Point limitant</strong> {decisionMeta.limitingFactor}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 3 pills Forme / Fatigue / Charge (sans Recovery, géré par TodayReadinessCard) */}
      {trailContext?.shouldShow ? (
        <div className={`dashboard-trail-context dashboard-trail-context-${trailContext.tone || "neutral"}`.trim()}>
          <span className="dashboard-trail-context-label">Contexte trail</span>
          <strong>{trailContext.context}</strong>
          {trailContext.vigilance ? <span>{trailContext.vigilance}</span> : null}
        </div>
      ) : null}

      <div className="decision-pill-grid">
        <DecisionPill
          label="Forme du moment"
          value={safeModel.form?.label || "Indéterminée"}
          detail={safeModel.form?.detail || "Pas assez de données"}
          tone={safeModel.form?.tone}
        />
        <DecisionPill
          label="Fatigue récente"
          value={safeModel.fatigue?.label || "Indéterminée"}
          detail={safeModel.fatigue?.detail || "Pas assez de données"}
          tone={safeModel.fatigue?.tone}
        />
        <DecisionPill
          label="Charge"
          value={safeModel.charge?.label || "À lire"}
          detail={safeModel.charge?.detail || "Pas assez de données"}
          tone={safeModel.charge?.tone}
        />
      </div>
    </section>
  );
}
