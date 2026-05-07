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

function VerdictChip({ label }) {
  return <span className="verdict-chip">{label}</span>;
}

function buildTodayAction(model = {}, trailContext = null) {
  const recommendationLabel = model.recommendation?.label || "";
  const recommendationTone = model.recommendation?.tone || "neutral";
  const fatigueTone = model.fatigue?.tone || "neutral";
  const chargeTone = model.charge?.tone || "neutral";

  if (!model.form && !model.fatigue && !model.charge) {
    return "Lecture prudente : accumule quelques séances avant de piloter finement.";
  }

  if (fatigueTone === "negative" || recommendationTone === "negative") {
    return "Privilégie une sortie facile, du repos actif ou une journée très légère.";
  }

  if (chargeTone === "warning") {
    return "Garde une intensité basse malgré une forme correcte.";
  }

  if (trailContext?.shouldShow && trailContext?.tone !== "danger") {
    return "Endurance, trail facile ou montée contrôlée.";
  }

  return recommendationLabel || "Endurance ou séance structurée modérée selon le plan.";
}

function buildCaution(model = {}, trailContext = null) {
  if (trailContext?.vigilance) {
    return trailContext.vigilance.replace(/^Vigilance\s*:\s*/i, "");
  }

  if (model.fatigue?.tone === "negative") {
    return "Fatigue récente élevée : évite d'ajouter une intensité forte.";
  }

  if (model.charge?.tone === "warning") {
    return "Charge récente soutenue : surveille les pics rapprochés.";
  }

  return "Pas de vigilance majeure détectée sur les signaux disponibles.";
}

function buildEvidence(model = {}, trailContext = null) {
  const decisionMeta = model.decisionMeta || {};
  const factors = Array.isArray(decisionMeta.factors) ? decisionMeta.factors : [];
  const evidence = [...factors];

  if (model.charge?.label) {
    evidence.push(`Charge ${String(model.charge.label).toLowerCase()}`);
  }

  if (trailContext?.shouldShow) {
    if (trailContext.elevationGain7d || trailContext.elevationLoss7d) {
      evidence.push(`Trail ${trailContext.elevationGain7d || 0} m D+`);
    } else if (trailContext.context) {
      evidence.push("Contexte trail actif");
    }
  }

  return [...new Set(evidence.filter(Boolean))].slice(0, 5);
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
  const verdictText = safeModel.insight
    || safeModel.recommendation?.label
    || "Pas assez de données pour produire une lecture du jour.";
  const verdictTone = safeModel.recommendation?.tone || "neutral";
  const todayAction = buildTodayAction(safeModel, trailContext);
  const caution = buildCaution(safeModel, trailContext);
  const visibleChips = buildEvidence(safeModel, trailContext);

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

      <div className="dashboard-decision-layout">
        <div className={`dashboard-verdict dashboard-verdict-${verdictTone}`.trim()}>
          <span className="dashboard-verdict-kicker">Verdict</span>
          <strong className="dashboard-verdict-text">{verdictText}</strong>

          <div className="dashboard-today-action">
            <span className="dashboard-verdict-kicker">Aujourd'hui</span>
            <strong>{todayAction}</strong>
          </div>

          <div className="dashboard-caution">
            <span className="dashboard-verdict-kicker">Vigilance</span>
            <span>{caution}</span>
          </div>
        </div>

        <aside className="dashboard-signal-panel">
          <span className="dashboard-verdict-kicker">Signaux clés</span>
          {visibleChips.length > 0 ? (
            <div className="dashboard-verdict-chips">
              {visibleChips.map((factor, idx) => (
                <VerdictChip key={`${factor}-${idx}`} label={factor} />
              ))}
            </div>
          ) : (
            <p className="small-text">Données encore incomplètes.</p>
          )}
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
        </aside>
      </div>

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
