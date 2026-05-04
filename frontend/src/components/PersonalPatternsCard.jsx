import { memo } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceTone(label) {
  switch (label) {
    case "Haute": return "tone-good";
    case "Moyenne": return "";
    default: return "tone-warning";
  }
}

function PatternBlock({ title, insight, confidence, sampleSize, sampleLabel = "séances" }) {
  if (!insight) return null;
  const tc = confidenceTone(confidence);
  return (
    <div className={`personal-pattern-block ${tc}`}>
      <span className="personal-pattern-title">{title}</span>
      <p className="personal-pattern-insight">{insight}</p>
      <span className="personal-pattern-meta">
        Confiance : {confidence}
        {sampleSize != null ? ` · ${sampleSize} ${sampleLabel} analysées` : ""}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

function PersonalPatternsCard({ patterns = null }) {
  if (!patterns) return null;

  const { qualityVsRecovery, chargeImpactOnSleep, monotonyVsHrv, hasMinimumData,
    daysAnalyzed = 0, activitiesAnalyzed = 0 } = patterns;

  const presentInsights = [
    qualityVsRecovery?.hasData ? qualityVsRecovery : null,
    chargeImpactOnSleep?.hasData ? chargeImpactOnSleep : null,
    monotonyVsHrv?.hasData ? monotonyVsHrv : null,
  ].filter(Boolean);

  // Si aucun insight n'est dispo, on ne montre pas la carte du tout.
  if (presentInsights.length === 0) return null;

  return (
    <section className="card personal-patterns-card">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Tes patterns personnels</h2>
          <p className="card-subtitle">
            Statistiques tirées du croisement de tes activités Strava et de tes
            signaux de récupération Garmin.
          </p>
        </div>
      </div>

      {!hasMinimumData ? (
        <div className="alert alert-info personal-patterns-warning">
          Tu as moins de 60 jours de croisement Strava + Garmin
          ({daysAnalyzed} j, {activitiesAnalyzed} activités).
          Les patterns détectés sont indicatifs et se renforceront avec plus de données.
        </div>
      ) : null}

      <div className="personal-patterns-blocks">
        <PatternBlock
          title="Qualité vs récupération"
          insight={qualityVsRecovery?.insight}
          confidence={qualityVsRecovery?.confidence}
          sampleSize={qualityVsRecovery?.qualitySessionsAnalyzed}
          sampleLabel="séances qualité"
        />
        <PatternBlock
          title="Impact de la charge sur le sommeil"
          insight={chargeImpactOnSleep?.insight}
          confidence={chargeImpactOnSleep?.confidence}
          sampleSize={chargeImpactOnSleep?.sampleSize}
          sampleLabel="séances"
        />
        <PatternBlock
          title="Monotonie et HRV"
          insight={monotonyVsHrv?.insight}
          confidence={monotonyVsHrv?.confidence}
          sampleSize={monotonyVsHrv?.sampleSize}
          sampleLabel="semaines"
        />
      </div>

      <p className="personal-patterns-disclaimer">
        Ces patterns affinent ta compréhension personnelle. Ils ne remplacent
        jamais ton ressenti.
      </p>
    </section>
  );
}

export default memo(PersonalPatternsCard);
